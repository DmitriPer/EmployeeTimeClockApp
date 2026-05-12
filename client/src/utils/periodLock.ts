export function isCurrentMonthEntry(clockInAt: string): boolean {
  const entry = new Date(clockInAt);
  const now = new Date();
  return entry.getMonth() === now.getMonth() && entry.getFullYear() === now.getFullYear();
}
