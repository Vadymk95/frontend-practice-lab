// Git hooks live in .husky/_, which `npm run prepare` generates. Lifecycle scripts are
// disabled repo-wide (.npmrc ignore-scripts), so a fresh clone skips husky's install —
// fail loudly instead of committing unhooked.
//
// Existence alone is not enough: git runs hooks from `core.hooksPath`, and a stale
// ABSOLUTE path (left behind when a repo moves, or a worktree) makes git skip every hook
// silently while .husky/_ still sits on disk. This repo carried exactly that: an absolute
// hooksPath pointing at `.husky` until 2026-09-16. So the config must RESOLVE to this
// checkout's own .husky/_.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface HooksVerdict {
    ok: boolean;
    messages: string[];
}

// GIT_DIR / GIT_WORK_TREE are exported by git itself when this runs inside a hook chain;
// a child `git` inheriting them answers for a DIFFERENT repo than the cwd this check is
// about (the incident class: a test's tmp-repo git call once rewrote a real core.hooksPath).
export function envWithoutGit(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('GIT_')));
}

export function readHooksPath(cwd: string, env: NodeJS.ProcessEnv = process.env): string {
    try {
        return execFileSync('git', ['config', 'core.hooksPath'], {
            cwd,
            encoding: 'utf8',
            env: envWithoutGit(env)
        }).trim();
    } catch {
        return '';
    }
}

export function evaluateHooks(cwd: string, env: NodeJS.ProcessEnv = process.env): HooksVerdict {
    if (env.CI) return { ok: true, messages: ['CI: hooks are not installed by design'] };

    const expected = path.resolve(cwd, '.husky/_');
    if (!fs.existsSync(expected)) {
        return {
            ok: false,
            messages: [
                'Git hooks are not installed (lifecycle scripts are disabled by .npmrc).',
                'Run once after cloning: npm run prepare'
            ]
        };
    }

    const hooksPath = readHooksPath(cwd, env);
    if (path.resolve(cwd, hooksPath || '.git/hooks') !== expected) {
        return {
            ok: false,
            messages: [
                `Git hooks are configured at "${hooksPath || '(unset)'}", not this checkout's .husky/_ —`,
                'git skips every hook (pre-commit, commit-msg, pre-push) silently.',
                'Fix: git config core.hooksPath .husky/_'
            ]
        };
    }

    return { ok: true, messages: [] };
}

export function main(cwd: string = process.cwd()): void {
    const verdict = evaluateHooks(cwd);
    for (const line of verdict.messages) console.error(line);
    if (!verdict.ok) process.exit(1);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
