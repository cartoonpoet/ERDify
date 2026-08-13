interface TrustProxyApplication {
  set(setting: "trust proxy", value: number): unknown;
}

export function configureTrustProxy(app: TrustProxyApplication): void {
  app.set("trust proxy", 1);
}
