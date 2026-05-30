import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content, FunctionDeclaration, FunctionDeclarationSchema, Part } from "@google/generative-ai";
import type { Tool } from "@anthropic-ai/sdk/resources";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage, NormalizedToolCall } from "./provider.types";

// Anthropic-style JSON Schema → Gemini schema. SchemaType enum values are lowercase
// ("object"/"string"/...) so the `type` field passes through unchanged.
function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof schema["type"] === "string") out["type"] = schema["type"];
  if (typeof schema["description"] === "string") out["description"] = schema["description"];
  if (Array.isArray(schema["enum"])) {
    out["enum"] = schema["enum"];
    out["format"] = "enum"; // Gemini requires format:"enum" for string enums
  }
  if (schema["type"] === "object" && schema["properties"] && typeof schema["properties"] === "object") {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema["properties"] as Record<string, unknown>)) {
      props[k] = sanitizeSchema(v as Record<string, unknown>);
    }
    out["properties"] = props;
    if (Array.isArray(schema["required"])) out["required"] = schema["required"];
  }
  if (schema["type"] === "array" && schema["items"] && typeof schema["items"] === "object") {
    out["items"] = sanitizeSchema(schema["items"] as Record<string, unknown>);
  }
  return out;
}

export function toGeminiFunctionDeclarations(tools: Tool[]): FunctionDeclaration[] {
  return tools.map((t) => {
    const schema = t.input_schema as { properties?: Record<string, unknown> };
    const hasParams = !!schema.properties && Object.keys(schema.properties).length > 0;
    return {
      name: t.name,
      description: t.description ?? "",
      ...(hasParams ? { parameters: sanitizeSchema(t.input_schema as Record<string, unknown>) as unknown as FunctionDeclarationSchema } : {}),
    };
  });
}

function toGeminiContents(messages: ConvMessage[]): Content[] {
  return messages.map((m): Content => {
    if (m.role === "user") return { role: "user", parts: [{ text: m.content }] };
    if (m.role === "assistant") {
      const parts: Part[] = [];
      if (m.text) parts.push({ text: m.text });
      for (const tc of m.toolCalls) parts.push({ functionCall: { name: tc.name, args: tc.input } });
      if (parts.length === 0) parts.push({ text: " " });
      return { role: "model", parts };
    }
    return {
      role: "user",
      parts: m.results.map((r) => ({ functionResponse: { name: r.toolName, response: { result: r.content } } })),
    };
  });
}

@Injectable()
export class GeminiProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const genAI = new GoogleGenerativeAI(args.apiKey);
    const model = genAI.getGenerativeModel({
      model: args.model,
      systemInstruction: args.system,
      ...(args.tools.length ? { tools: [{ functionDeclarations: toGeminiFunctionDeclarations(args.tools) }] } : {}),
    });

    const result = await model.generateContentStream({
      contents: toGeminiContents(args.messages),
      generationConfig: { maxOutputTokens: args.maxTokens },
    });

    let text = "";
    for await (const chunk of result.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        if (p.text) {
          text += p.text;
          args.onText(p.text);
        }
      }
    }

    const response = await result.response;
    const fcs = response.functionCalls() ?? [];
    const toolCalls: NormalizedToolCall[] = fcs.map((fc, i) => ({
      id: `${fc.name}-${i}`,
      name: fc.name,
      input: (fc.args ?? {}) as Record<string, unknown>,
    }));

    return { text, toolCalls };
  }
}
