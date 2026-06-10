import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { Injectable, Logger } from "@nestjs/common";
import { tap } from "rxjs/operators";

/**
 * 가드 통과 이후 핸들러(컨트롤러+서비스+DB)에 걸린 시간을 측정해 느린 요청을 경고 로깅한다.
 * 인터셉터는 가드 다음, 핸들러를 감싸는 위치에서 실행되므로 여기서 잰 시간은
 * "인증 통과 후 실제 처리에 든 시간"이다. 느린 쿼리 로그(maxQueryExecutionTime)와 대조하면
 * 시간이 쿼리에서 났는지(쿼리 로그 존재) vs 쿼리 시작 전/사이에서 났는지(요청은 느린데 쿼리 로그 없음)를 가릴 수 있다.
 */
@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("RequestTiming");
  private static readonly SLOW_THRESHOLD_MS = 500;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, startedAt),
        error: () => this.log(req, startedAt),
      }),
    );
  }

  private log(req: Request, startedAt: number): void {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < RequestTimingInterceptor.SLOW_THRESHOLD_MS) return;
    this.logger.warn(`${req.method} ${req.originalUrl} — handler ${elapsedMs}ms`);
  }
}
