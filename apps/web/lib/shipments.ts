// JSONB object enumeration is not a chronological ordering contract.
export function recentShipments<T extends { createdAt: string }>(shipments: readonly T[]): T[] {
  return [...shipments]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
}
