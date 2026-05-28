import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique
} from "typeorm";
import type { User } from "./user.entity";

export type OAuthProvider = "kakao" | "naver" | "google";

@Entity("oauth_accounts")
@Unique(["provider", "providerId"])
export class OauthAccount {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 36 })
  userId!: string;

  @Column({
    type: "enum",
    enum: ["kakao", "naver", "google"]
  })
  provider!: OAuthProvider;

  @Column({ name: "provider_id", type: "varchar", length: 255 })
  providerId!: string;

  @Column({ name: "provider_email", type: "varchar", length: 255, nullable: true })
  providerEmail!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne("User", "oauthAccounts")
  @JoinColumn({ name: "user_id" })
  user!: User;
}
