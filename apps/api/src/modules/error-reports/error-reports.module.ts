import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ErrorReport } from "@erdify/db";
import { ErrorReportsController } from "./error-reports.controller";
import { ErrorReportsService } from "./error-reports.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [TypeOrmModule.forFeature([ErrorReport]), EmailModule],
  controllers: [ErrorReportsController],
  providers: [ErrorReportsService],
})
export class ErrorReportsModule {}
