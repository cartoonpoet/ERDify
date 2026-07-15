import { createTypeOrmOptions } from "@erdify/db";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        if (!databaseUrl) {
          throw new Error(
            "DATABASE_URL 환경변수가 설정되지 않았습니다. apps/api/.env.example을 참고해 .env를 작성하세요."
          );
        }
        return {
          ...createTypeOrmOptions({
            databaseUrl,
            // 1초 넘는 쿼리를 느린 쿼리로 경고 로깅 (7초 지연 진단용)
            slowQueryThresholdMs: 1000
          }),
          autoLoadEntities: true
        };
      }
    })
  ]
})
export class DatabaseModule {}
