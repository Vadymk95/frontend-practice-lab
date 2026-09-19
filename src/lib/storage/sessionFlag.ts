const FLAG_SET = '1';

/**
 * Session-scoped boolean flags (PWA toast dismissals).
 *
 * `sessionStorage` does not merely return null when site data is blocked — the property access
 * THROWS (Safari/Chrome with site data blocked for the origin, Firefox `dom.storage.enabled=false`,
 * a sandboxed iframe). These flags are read in a render-phase initializer, so an unguarded read
 * takes the whole app down through the ErrorBoundary instead of degrading. Same try/catch contract
 * as `readJson`/`writeJson` in `LocalStorageService`.
 */
export function readSessionFlag(key: string): boolean {
    try {
        return sessionStorage.getItem(key) === FLAG_SET;
    } catch {
        // Storage unavailable — treat the flag as unset so the feature still works this session
        return false;
    }
}

export function writeSessionFlag(key: string): void {
    try {
        sessionStorage.setItem(key, FLAG_SET);
    } catch {
        // Storage unavailable — the flag simply does not survive a reload
    }
}
