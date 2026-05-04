import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Diagram } from "@erdify/db";
import { DiagramsModule } from "../diagrams/diagrams.module";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram]),
    DiagramsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET environment variable is required");
        return { secret };
      },
    })
  ],
  providers: [CollaborationService, CollaborationGateway]
})
export class CollaborationModule {}
