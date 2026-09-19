/**
 * Local calendar day as "YYYY-MM-DD". The streak is a human day, so it must not be derived from
 * `toISOString()`: east of UTC an early-morning session and a late-evening session of the same day
 * land on two different UTC days, and a UTC-parsed date shifted by one day breaks at DST.
 */
export function toLocalDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returns true if `dateStr` ("YYYY-MM-DD", local) is the calendar day before `today`.
 */
export function isYesterday(dateStr: string, today: string): boolean {
    if (!dateStr) return false;

    const [year, month, day] = today.split('-').map(Number);
    if (year === undefined || month === undefined || day === undefined) return false;
    if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return false;

    // Local midnight minus one day — setDate() walks calendar days, so a DST shift does not move it
    const previous = new Date(year, month - 1, day);
    previous.setDate(previous.getDate() - 1);

    return dateStr === toLocalDayKey(previous);
}
