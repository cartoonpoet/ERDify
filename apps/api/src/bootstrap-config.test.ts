import { describe, expect, it, vi } from "vitest";
import { configureTrustProxy } from "./bootstrap-config";

describe("configureTrustProxy", () => {
  it("trusts exactly one reverse-proxy hop", () => {
    const set = vi.fn();

    configureTrustProxy({ set });

    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith("trust proxy", 1);
  });
});
