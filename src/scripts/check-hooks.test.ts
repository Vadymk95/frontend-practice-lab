// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { envWithoutGit, evaluateHooks } from './check-hooks.ts';

// Every case runs in a throwaway git repo, never against this repo's real config — a guard
// test that mutates the guarded state would be its own incident. GIT_* is stripped for the
// same reason: inherited from a hook, it points the child git at the REAL repo.
const CLEAN_ENV: NodeJS.ProcessEnv = { ...envWithoutGit(process.env), CI: '' };

const repos: string[] = [];

function makeRepo(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-hooks-'));
    execFileSync('git', ['init', '-q'], { cwd: dir, env: CLEAN_ENV });
    repos.push(dir);
    return dir;
}

function setHooksPath(dir: string, value: string): void {
    execFileSync('git', ['config', 'core.hooksPath', value], { cwd: dir, env: CLEAN_ENV });
}

afterEach(() => {
    for (const dir of repos.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('evaluateHooks', () => {
    it('passes when core.hooksPath resolves to this checkout’s .husky/_', () => {
        const repo = makeRepo();
        fs.mkdirSync(path.join(repo, '.husky/_'), { recursive: true });
        setHooksPath(repo, '.husky/_');
        expect(evaluateHooks(repo, CLEAN_ENV).ok).toBe(true);
    });

    it('refuses an absolute hooksPath pointing elsewhere, and prints the one-line fix', () => {
        // The measured failure mode: an absolute path left over from a repo move — git skips
        // every hook silently while .husky/_ still exists on disk.
        const repo = makeRepo();
        fs.mkdirSync(path.join(repo, '.husky/_'), { recursive: true });
        setHooksPath(repo, '/tmp/nowhere/.husky/_');
        const verdict = evaluateHooks(repo, CLEAN_ENV);
        expect(verdict.ok).toBe(false);
        expect(verdict.messages.join('\n')).toContain('git config core.hooksPath .husky/_');
    });

    it('refuses an absolute hooksPath that points at .husky (not .husky/_) of this very repo', () => {
        // The state this repo was in until 2026-09-16: husky 9 hooks live in .husky/_ but the
        // config named the parent dir with an absolute path — dead the day the repo moves.
        const repo = makeRepo();
        fs.mkdirSync(path.join(repo, '.husky/_'), { recursive: true });
        setHooksPath(repo, path.join(repo, '.husky'));
        expect(evaluateHooks(repo, CLEAN_ENV).ok).toBe(false);
    });

    it('refuses an UNSET hooksPath even though .husky/_ exists', () => {
        // Unset means git runs .git/hooks — husky never installed; the directory alone proves
        // nothing, which is exactly the fail-open this closes.
        const repo = makeRepo();
        fs.mkdirSync(path.join(repo, '.husky/_'), { recursive: true });
        const verdict = evaluateHooks(repo, CLEAN_ENV);
        expect(verdict.ok).toBe(false);
        expect(verdict.messages.join('\n')).toContain('git config core.hooksPath .husky/_');
    });

    it('still fails loudly when .husky/_ is missing entirely', () => {
        const repo = makeRepo();
        const verdict = evaluateHooks(repo, CLEAN_ENV);
        expect(verdict.ok).toBe(false);
        expect(verdict.messages.join('\n')).toContain('npm run prepare');
    });

    it('skips on CI, where hooks are not installed by design', () => {
        const repo = makeRepo();
        expect(evaluateHooks(repo, { ...CLEAN_ENV, CI: 'true' }).ok).toBe(true);
    });

    it('answers for the cwd repo even when a hook-exported GIT_DIR points at another repo', () => {
        // The GIT_DIR leak, reproduced: without the env strip, `git config` reads the OTHER
        // repo's config and this check lies. The correctly configured cwd repo must pass even
        // with a poisoned environment.
        const repo = makeRepo();
        fs.mkdirSync(path.join(repo, '.husky/_'), { recursive: true });
        setHooksPath(repo, '.husky/_');
        const other = makeRepo();
        const poisoned: NodeJS.ProcessEnv = {
            ...CLEAN_ENV,
            GIT_DIR: path.join(other, '.git'),
            GIT_WORK_TREE: other
        };
        expect(evaluateHooks(repo, poisoned).ok).toBe(true);
    });
});
