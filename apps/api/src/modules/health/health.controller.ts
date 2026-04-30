import { Controller, Get } from "@nestjs/common";

interface HealthResponse {
  status: "ok";
  service: "erdify-api";
}

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "erdify-api"
    };
  }
}
