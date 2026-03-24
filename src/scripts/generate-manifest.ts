import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CategoryFileSchema } from '../lib/data/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT, 'public/data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

interface ManifestEntry {
    slug: string;
    displayName: string;
    counts: {
        easy: number;
        medium: number;
        hard: number;
        total: number;
    };
}

function toDisplayName(slug: string): string {
    return slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function main() {
    let hasError = false;
    const manifest: ManifestEntry[] = [];

    const files = fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

    if (files.length === 0) {
        console.error('No JSON files found in public/data/');
        process.exit(1);
    }

    for (const file of files) {
        const slug = file.replace('.json', '');
        const filePath = path.join(DATA_DIR, file);

        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as unknown;
            const questions = CategoryFileSchema.parse(parsed);

            const counts = { easy: 0, medium: 0, hard: 0, total: questions.length };
            for (const q of questions) {
                counts[q.difficulty]++;
            }

            manifest.push({
                slug,
                displayName: toDisplayName(slug),
                counts
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

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ manifest.json written with ${manifest.length} categories.`);
}

main();
