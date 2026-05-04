import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { DiagramsModule } from "./modules/diagrams/diagrams.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { ProjectModule } from "./modules/project/project.module";
import { CollaborationModule } from "./modules/collaboration/collaboration.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 기본: 1분에 60요청. 로그인/회원가입은 @Throttle로 별도 엄격하게 제한
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    DiagramsModule,
    CollaborationModule,
    HealthModule,
  ],
  providers: [
    // 전역 Rate Limiting — ThrottlerModule 설정 기반
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
