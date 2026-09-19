// Blocking dependency audit. Ported from template-spa-pwa (scripts/audit-gate.mjs).
//
// Policy: high/critical advisories block unless allow-listed in audit-allowlist.json with a
// reason, an upstream link and an expiry. An allowance that expired, or whose advisory no
// longer appears, fails the gate — a stale allowance is removed in the same commit that
// installs the fix. When npm cannot complete the audit (registry down, offline) the gate
// fails CLOSED: a security gate that returns success when it cannot run is worse than none.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const GHSA_PATTERN = /GHSA-[\w-]+/i;

export interface AllowlistEntry {
    id: string;
    expires: string;
    reason: string;
    upstream: string;
}

export interface Advisory {
    id: string;
    packageName: string;
    severity?: string;
}

export interface AuditVerdict {
    ok: boolean;
    auditFailed: boolean;
    unexpected: Advisory[];
    expired: AllowlistEntry[];
    stale: AllowlistEntry[];
    allowlisted: Advisory[];
}

type Rec = Record<string, unknown>;

const isRecord = (value: unknown): value is Rec =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const severityRank = (severity?: string): number => (severity === 'critical' ? 2 : 1);

const readGhsaId = (url: unknown): string | null => {
    const match = typeof url === 'string' ? url.match(GHSA_PATTERN) : null;
    return match?.[0] ?? null;
};

const normalizeId = (id: string): string => id.toUpperCase();

const isValidAuditPayload = (audit: unknown): audit is Rec =>
    isRecord(audit) &&
    !Object.hasOwn(audit, 'error') &&
    isRecord(audit.metadata) &&
    isRecord(audit.metadata.vulnerabilities) &&
    isRecord(audit.vulnerabilities);

function resolveRootAdvisories(
    audit: Rec,
    packageName: string,
    seen: Set<string> = new Set()
): Advisory[] {
    if (seen.has(packageName)) return [];

    const vulnerabilities = audit.vulnerabilities as Rec;
    const vulnerability = vulnerabilities[packageName];
    if (!isRecord(vulnerability) || !Array.isArray(vulnerability.via)) return [];

    const nextSeen = new Set(seen);
    nextSeen.add(packageName);
    const roots = new Map<string, Advisory>();

    for (const entry of vulnerability.via as unknown[]) {
        if (typeof entry === 'string') {
            for (const root of resolveRootAdvisories(audit, entry, nextSeen)) {
                roots.set(normalizeId(root.id), root);
            }
            continue;
        }
        if (!isRecord(entry)) continue;
        const id = readGhsaId(entry.url);
        if (id) roots.set(normalizeId(id), { id, packageName });
    }

    return [...roots.values()];
}

function collectAdvisories(audit: Rec): Advisory[] {
    const advisories = new Map<string, Advisory>();
    const vulnerabilities = audit.vulnerabilities as Rec;

    for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
        if (!isRecord(vulnerability)) continue;
        const severity =
            typeof vulnerability.severity === 'string' ? vulnerability.severity : undefined;
        const entries: Advisory[] = resolveRootAdvisories(audit, packageName).map((root) => ({
            ...root,
            severity
        }));

        if (entries.length === 0 && severity && BLOCKING_SEVERITIES.has(severity)) {
            entries.push({ id: `npm:${packageName}`, severity, packageName });
        }

        for (const advisory of entries) {
            const existing = advisories.get(advisory.id);
            if (!existing || severityRank(advisory.severity) > severityRank(existing.severity)) {
                advisories.set(advisory.id, advisory);
            }
        }
    }

    return [...advisories.values()];
}

const isExpired = (expires: string, now: Date): boolean => {
    const expiry = new Date(`${expires}T00:00:00.000Z`);
    return Number.isNaN(expiry.valueOf()) || expiry < now;
};

const failedClosed = (): AuditVerdict => ({
    ok: false,
    auditFailed: true,
    unexpected: [],
    expired: [],
    stale: [],
    allowlisted: []
});

/** Evaluates npm's audit JSON without I/O, so the fail-closed policy is testable in-process. */
export function evaluateAudit(
    audit: unknown,
    allowlist: AllowlistEntry[],
    now: Date
): AuditVerdict {
    if (!isValidAuditPayload(audit)) return failedClosed();

    const advisories = collectAdvisories(audit);
    const allIds = new Set(advisories.map(({ id }) => normalizeId(id)));
    const blocking = advisories.filter(
        ({ severity }) => severity !== undefined && BLOCKING_SEVERITIES.has(severity)
    );
    const byId = new Map(allowlist.map((entry) => [normalizeId(entry.id), entry]));
    const unexpected = blocking.filter(({ id }) => !byId.has(normalizeId(id)));
    const expired = allowlist.filter((entry) => isExpired(entry.expires, now));
    const stale = allowlist.filter((entry) => !allIds.has(normalizeId(entry.id)));
    const allowlisted = advisories.filter(({ id }) => byId.has(normalizeId(id)));

    return {
        ok: unexpected.length === 0 && expired.length === 0 && stale.length === 0,
        auditFailed: false,
        unexpected,
        expired,
        stale,
        allowlisted
    };
}

function loadAudit(): { audit: unknown; completed: boolean } {
    const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: false });
    try {
        const audit: unknown = JSON.parse(result.stdout);
        const completed =
            isRecord(audit) &&
            !Object.hasOwn(audit, 'error') &&
            (result.status === 0 || isValidAuditPayload(audit));
        return { audit, completed };
    } catch {
        return { audit: null, completed: false };
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.join(__dirname, 'audit-allowlist.json');

export function loadAllowlist(file: string = ALLOWLIST_PATH): AllowlistEntry[] {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as AllowlistEntry[];
}

const formatEntries = (label: string, entries: Array<{ id: string; severity?: string }>) =>
    entries.map(({ id, severity }) => `${label}: ${id}${severity ? ` (${severity})` : ''}`);

export function main(): void {
    const allowlist = loadAllowlist();
    const loaded = loadAudit();
    const result = loaded.completed
        ? evaluateAudit(loaded.audit, allowlist, new Date())
        : failedClosed();

    for (const entry of allowlist) {
        console.log(
            `[audit allowlist] ${entry.id}\nreason: ${entry.reason}\nupstream: ${entry.upstream}\nexpires: ${entry.expires}`
        );
    }

    const failures = result.auditFailed
        ? ['Audit could not be completed; failing closed.']
        : [
              ...formatEntries('Unexpected high/critical advisory', result.unexpected),
              ...formatEntries('Expired allowlist entry', result.expired),
              ...formatEntries('Stale allowlist entry', result.stale)
          ];

    if (failures.length > 0) {
        console.error(failures.join('\n'));
        process.exitCode = 1;
        return;
    }
    console.log('✓ audit gate: no unexpected high/critical advisories');
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
