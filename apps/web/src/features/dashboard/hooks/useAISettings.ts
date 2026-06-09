import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrgAiSettings, setOrgProviderKey, removeOrgProviderKey, setEnabledModels } from "@/features/ai/api/ai.api";
import { AI_PROVIDERS, type AiProviderId } from "@/features/ai/models";
import { queryKeys } from "@/shared/lib/queryKeys";

export const useAISettings = (orgId: string) => {
  const [editingProvider, setEditingProvider] = useState<AiProviderId | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState<string[] | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.orgAiSettings(orgId),
    queryFn: () => getOrgAiSettings(orgId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.orgAiSettings(orgId) });

  const saveKey = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: AiProviderId; apiKey: string }) =>
      setOrgProviderKey(orgId, provider, apiKey),
    onSuccess: () => { void invalidate(); setEditingProvider(null); setApiKey(""); },
  });

  const removeKey = useMutation({
    mutationFn: (provider: AiProviderId) => removeOrgProviderKey(orgId, provider),
    onSuccess: () => { void invalidate(); },
  });

  const saveModels = useMutation({
    mutationFn: (models: string[]) => setEnabledModels(orgId, models),
    onSuccess: () => { void invalidate(); setEnabled(null); },
  });

  const providers = data?.providers ?? { anthropic: false, openai: false, gemini: false };
  const registered = AI_PROVIDERS.filter((p) => providers[p]);
  const enabledModels = enabled ?? data?.enabledModels ?? [];

  const toggleModel = (value: string) => {
    const base = enabled ?? data?.enabledModels ?? [];
    setEnabled(base.includes(value) ? base.filter((v) => v !== value) : [...base, value]);
  };

  const handleProviderEdit = (provider: AiProviderId) => () => { setEditingProvider(provider); setApiKey(""); };
  const handleProviderEditCancel = () => { setEditingProvider(null); setApiKey(""); };

  return {
    data,
    editingProvider,
    setEditingProvider,
    apiKey,
    setApiKey,
    enabled,
    setEnabled,
    providers,
    registered,
    enabledModels,
    saveKey,
    removeKey,
    saveModels,
    toggleModel,
    handleProviderEdit,
    handleProviderEditCancel,
  };
};
