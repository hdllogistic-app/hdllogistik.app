/**
 * Returns current business date in Asia/Jakarta timezone formatted as YYYY-MM-DD.
 */
export function getTodayJakartaStr(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}
