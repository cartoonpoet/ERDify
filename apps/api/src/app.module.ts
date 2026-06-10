import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { DiagramsModule } from "./modules/diagrams/diagrams.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { ProjectModule } from "./modules/project/project.module";
import { CollaborationModule } from "./modules/collaboration/collaboration.module";
import { EmailModule } from "./modules/email/email.module";
import { ErrorReportsModule } from "./modules/error-reports/error-reports.module";
import { AiModule } from "./modules/ai/ai.module";
import { UsageModule } from "./modules/usage/usage.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import appConfig from "./common/config/app.config";
import { RequestTimingInterceptor } from "./common/interceptors/request-timing.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // 기본: 1분에 60요청. 로그인/회원가입은 @Throttle로 별도 엄격하게 제한
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    DiagramsModule,
    CollaborationModule,
    EmailModule,
    ErrorReportsModule,
    AiModule,
    UsageModule,
    AnnouncementsModule,
    HealthModule,
  ],
  providers: [
    // 전역 Rate Limiting — ThrottlerModule 설정 기반
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 느린 요청 진단 — 핸들러 처리 시간 경고 로깅
    { provide: APP_INTERCEPTOR, useClass: RequestTimingInterceptor },
  ],
})
export class AppModule {}
