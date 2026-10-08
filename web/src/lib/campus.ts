/** Versioned campus records stored in ordinary Memos, preserving upstream permissions. */
export interface CampusRecord {
  version: 1;
  kind: "寻找失物" | "拾到物品";
  title: string;
  location: string;
  date: string;
  category: string;
  description: string;
  status: "待认领" | "认领中" | "已归还";
}
export const CAMPUS_TAG = "campus-lost-found";
export const CAMPUS_STATUSES = ["待认领", "认领中", "已归还"] as const;
export const CAMPUS_CATEGORIES = ["证件", "电子设备", "书籍文具", "衣物配饰", "其他"];
export function parseCampus(content: string): CampusRecord | null {
  const match = content.match(/```campus-v1\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const r = JSON.parse(match[1]);
    if (r.version !== 1 || !["寻找失物", "拾到物品"].includes(r.kind) || !CAMPUS_STATUSES.includes(r.status)) return null;
    for (const key of ["title", "location", "date", "category", "description"]) {
      if (typeof r[key] !== "string") return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !r.title.trim() || !r.location.trim()) return null;
    return r;
  } catch {
    return null;
  }
}
export function serializeCampus(record: CampusRecord): string {
  // Escape backticks inside JSON so user text cannot terminate the metadata fence.
  return `#${CAMPUS_TAG}\n\n\`\`\`campus-v1\n${JSON.stringify(record).replace(/`/g, "\\u0060")}\n\`\`\``;
}
export function campusCsv(records: CampusRecord[]): string {
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = records.map((r) => [r.kind, r.title, r.location, r.date, r.category, r.status]);
  return `\uFEFF${[["类型", "物品", "地点", "发生日期", "类别", "状态"], ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}
