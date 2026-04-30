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
            "postgres://erdify:erdify@localhost:5432/erdify"
        }),
        autoLoadEntities: true
      })
    })
  ]
})
export class DatabaseModule {}
