import { IsEnum } from "class-validator";

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export class ShareDiagramDto {
  @IsEnum(["1h", "1d", "7d", "30d"])
  preset!: SharePreset;
}
