import { describe, it, expect } from "vitest";
import { SOURCE_SYSTEM } from "../index";

describe("scaffolding", () => {
  it("exports the source system identifier", () => {
    expect(SOURCE_SYSTEM).toBe("OMB NOFO IC");
  });
});
