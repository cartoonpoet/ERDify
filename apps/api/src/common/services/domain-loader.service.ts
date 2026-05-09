import { Injectable } from "@nestjs/common";

type DomainModule = typeof import("@erdify/domain");

@Injectable()
export class DomainLoaderService {
  private modulePromise?: Promise<DomainModule>;

  load(): Promise<DomainModule> {
    this.modulePromise ??= (
      new Function("s", "return import(s)") as (s: string) => Promise<DomainModule>
    )("@erdify/domain");
    return this.modulePromise;
  }
}
