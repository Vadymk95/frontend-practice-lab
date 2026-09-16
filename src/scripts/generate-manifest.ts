import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CategoryFileSchema } from '../lib/data/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT, 'public/data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

interface ModeCounts {
    quiz: number;
    bugFinding: number;
    codeCompletion: number;
}

/**
 * `counts` are the per-axis totals. `matrix` is the exact count for every
 * difficulty x mode pair — the configurator needs it because the two axes are
 * not independent (a category can hold easy questions and bug-finding questions
 * and no easy bug-finding question at all).
 */
interface ManifestEntry {
    slug: string;
    displayName: string;
    counts: {
        easy: number;
        medium: number;
        hard: number;
        total: number;
        quiz: number;
        bugFinding: number;
        codeCompletion: number;
    };
    matrix: {
        easy: ModeCounts;
        medium: ModeCounts;
        hard: ModeCounts;
    };
}

function emptyModeCounts(): ModeCounts {
    return { quiz: 0, bugFinding: 0, codeCompletion: 0 };
}

const DISPLAY_NAME_MAP: Record<string, string> = {
    'ai-llm': 'AI / LLM',
    'api-bff': 'API & BFF',
    architecture: 'Architecture',
    'best-practices': 'Best Practices',
    'browser-internals': 'Browser Internals',
    'build-tools': 'Build Tools',
    css: 'CSS',
    'feature-flags': 'Feature Flags',
    git: 'Git',
    html: 'HTML',
    javascript: 'JavaScript',
    nextjs: 'Next.js',
    performance: 'Performance',
    react: 'React',
    security: 'Security',
    'team-lead': 'Team Lead',
    testing: 'Testing',
    typescript: 'TypeScript',
    'system-design': 'System Design',
    observability: 'Observability'
};

function toDisplayName(slug: string): string {
    if (DISPLAY_NAME_MAP[slug]) return DISPLAY_NAME_MAP[slug];
    // fallback for any future categories not yet in the map
    return slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function main(dataDir: string = DATA_DIR, manifestPath: string = MANIFEST_PATH): void {
    let hasError = false;
    const manifest: ManifestEntry[] = [];

    const files = fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

    if (files.length === 0) {
        console.error(`No JSON files found in ${dataDir}`);
        process.exit(1);
    }

    for (const file of files) {
        const slug = file.replace('.json', '');
        const filePath = path.join(dataDir, file);

        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as unknown;
            const questions = CategoryFileSchema.parse(parsed);

            const counts = {
                easy: 0,
                medium: 0,
                hard: 0,
                total: questions.length,
                quiz: 0,
                bugFinding: 0,
                codeCompletion: 0
            };
            const matrix = {
                easy: emptyModeCounts(),
                medium: emptyModeCounts(),
                hard: emptyModeCounts()
            };
            for (const q of questions) {
                counts[q.difficulty]++;
                const mode =
                    q.type === 'single-choice' || q.type === 'multi-choice'
                        ? 'quiz'
                        : q.type === 'bug-finding'
                          ? 'bugFinding'
                          : 'codeCompletion';
                counts[mode]++;
                matrix[q.difficulty][mode]++;
            }

            manifest.push({
                slug,
                displayName: toDisplayName(slug),
                counts,
                matrix
            });

            console.log(`✓ ${file} — ${questions.length} questions`);
        } catch (err) {
            console.error(`✗ ${file} — validation failed:`, err);
            hasError = true;
        }
    }

    if (hasError) {
        console.error('\nManifest generation failed due to schema violations.');
        process.exit(1);
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ manifest.json written with ${manifest.length} categories.`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
