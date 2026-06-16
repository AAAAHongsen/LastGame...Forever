/**
 * 可設定掉落表 — 由敵人 registry `drops` 鍵引用。
 * entries: { item, count, chance } — chance 1 = 必定
 */
export const DROP_TABLES = Object.freeze({
  normal: {
    entries: [{ item: "energyball", count: 1, chance: 0.4 }],
  },
  flyboss: {
    entries: [{ item: "energyball", count: 5, chance: 1 }],
  },
  gorgon: {
    entries: [{ item: "energyball", count: 10, chance: 1 }],
  },
});

export function getDropTable(tableId) {
  return DROP_TABLES[tableId] ?? null;
}

/** @returns {{ item: string, count: number }[]} 掉落項目陣列 */
export function rollDropTable(tableId, rng = Math.random) {
  const table = getDropTable(tableId);
  if (!table?.entries?.length) return [];

  const drops = [];
  for (const entry of table.entries) {
    const chance = entry.chance ?? 1;
    if (rng() <= chance) {
      drops.push({ item: entry.item, count: Math.max(1, entry.count ?? 1) });
    }
  }
  return drops;
}
