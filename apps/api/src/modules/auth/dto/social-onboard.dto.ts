import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SocialOnboardDto {
  @IsString()
  @IsNotEmpty()
  onboardToken!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
