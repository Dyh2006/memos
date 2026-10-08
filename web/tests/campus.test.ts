import { describe, expect, it } from "vitest";
import { type CampusRecord, campusCsv, parseCampus, serializeCampus } from "../src/lib/campus";

const record: CampusRecord = {
  version: 1,
  kind: "拾到物品",
  title: "水杯",
  location: "图书馆",
  date: "2026-10-08",
  category: "其他",
  description: "蓝色",
  status: "待认领",
};
describe("campus records", () => {
  it("round trips multiline text and fenced input without corrupting metadata", () => {
    const input = { ...record, description: '多行\n```\n"引号"' };
    expect(parseCampus(serializeCampus(input))).toEqual(input);
  });
  it("ignores unrelated, malformed and unsupported records", () => {
    for (const content of [
      "ordinary memo",
      "```campus-v1\n{\n```",
      serializeCampus({ ...record, version: 2 } as unknown as CampusRecord),
      serializeCampus({ ...record, title: "" }),
    ])
      expect(parseCampus(content)).toBeNull();
  });
  it("neutralizes spreadsheet formulas and quotes cells", () => {
    const csv = campusCsv([{ ...record, title: '=HYPERLINK("bad")', location: "楼A,二层" }]);
    expect(csv).toContain(`"'=HYPERLINK(""bad"")"`);
    expect(csv).toContain('"楼A,二层"');
    expect(csv).not.toContain("蓝色");
  });
});
