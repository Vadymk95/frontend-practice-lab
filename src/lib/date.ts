/**
 * Returns true if `dateStr` (ISO "YYYY-MM-DD") is the calendar day before `today`.
 */
export function isYesterday(dateStr: string, today: string): boolean {
    if (!dateStr) return false;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().slice(0, 10);
}
