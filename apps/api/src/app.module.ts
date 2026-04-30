import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { DiagramsModule } from "./modules/diagrams/diagrams.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { ProjectModule } from "./modules/project/project.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    DiagramsModule,
    HealthModule
  ]
})
export class AppModule {}
