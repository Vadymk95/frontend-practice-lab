import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CategoryFileSchema } from '../lib/data/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT, 'public/data');

function main() {
    let hasError = false;

    const files = fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

    if (files.length === 0) {
        console.error('No JSON files found in public/data/');
        process.exit(1);
    }

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);

        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as unknown;
            const questions = CategoryFileSchema.parse(parsed);
            console.log(`✓ ${file} — ${questions.length} questions`);
        } catch (err) {
            console.error(`✗ ${file} — schema violation:`, err);
            hasError = true;
        }
    }

    if (hasError) {
        console.error('\nValidation failed. Fix the errors above.');
        process.exit(1);
    }

    console.log('\n✅ All data files are valid.');
}

main();
