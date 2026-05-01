import "reflect-metadata";
import { join } from "path";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: true,
    credentials: true
  });

  app.useStaticAssets(join(__dirname, "..", "uploads"), { prefix: "/uploads" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = Number(process.env["API_PORT"] ?? 4000);
  await app.listen(port);
}

void bootstrap();
