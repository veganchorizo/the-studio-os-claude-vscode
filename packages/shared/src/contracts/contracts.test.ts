import { describe, it, expect } from "vitest";
import { createEquipmentInputSchema } from "./equipment.js";
import { createSessionInputSchema } from "./sessions.js";
import { searchQuerySchema } from "./search.js";

describe("equipment contract", () => {
  it("applies defaults", () => {
    const parsed = createEquipmentInputSchema.parse({ manufacturer: "Neumann", model: "U87" });
    expect(parsed.category).toBe("OTHER");
    expect(parsed.status).toBe("OPERATIONAL");
    expect(parsed.favoriteUses).toEqual([]);
  });

  it("rejects empty manufacturer", () => {
    expect(() => createEquipmentInputSchema.parse({ manufacturer: "", model: "x" })).toThrow();
  });
});

describe("session contract", () => {
  it("requires a valid date", () => {
    expect(() =>
      createSessionInputSchema.parse({ title: "Tracking day", date: "not-a-date" }),
    ).toThrow();
    const ok = createSessionInputSchema.parse({
      title: "Tracking day",
      date: new Date().toISOString(),
    });
    expect(ok.status).toBe("SCHEDULED");
  });
});

describe("search contract", () => {
  it("defaults to hybrid mode", () => {
    expect(searchQuerySchema.parse({ q: "u87" }).mode).toBe("hybrid");
  });
});
