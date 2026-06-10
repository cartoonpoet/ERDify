import { createTypeOrmOptions } from "@erdify/db";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createTypeOrmOptions({
          databaseUrl:
            configService.get<string>("DATABASE_URL") ??
            "postgres://erdify:erdify@localhost:5432/erdify",
          // 1초 넘는 쿼리를 느린 쿼리로 경고 로깅 (7초 지연 진단용)
          slowQueryThresholdMs: 1000
        }),
        autoLoadEntities: true
      })
    })
  ]
})
export class DatabaseModule {}
