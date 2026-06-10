function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** `YYYY-MM-DD HH:mm:ss` (結果見出しカード用) */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** `MM/DD HH:mm:ss` (履歴リスト用の短縮形) */
export function formatTimestampShort(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
