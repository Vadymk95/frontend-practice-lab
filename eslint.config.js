import js from '@eslint/js';
import queryPlugin from '@tanstack/eslint-plugin-query';
import pluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['dist', '.claude', '.cursor', '_bmad', '_bmad-output']),
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            'jsx-a11y': jsxA11y
        },
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat['recommended-latest'],
            reactRefresh.configs.vite,
            queryPlugin.configs['flat/recommended'],
            pluginImport.flatConfigs.recommended,
            prettierRecommended
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: { ...globals.browser, ...globals.node }
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: [
                        './tsconfig.app.json',
                        './tsconfig.node.json',
                        './tsconfig.scripts.json',
                        './tsconfig.vitest.json'
                    ],
                    alwaysTryTypes: true,
                    noWarnOnMultipleProjects: true
                },
                node: {
                    extensions: ['.js', '.jsx', '.ts', '.tsx']
                }
            },
            'import/extensions': ['.js', '.jsx', '.ts', '.tsx']
        },
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
            ],
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
                    pathGroups: [
                        {
                            pattern: 'tailwindcss/**',
                            group: 'external',
                            position: 'before'
                        },
                        {
                            pattern: '@/**',
                            group: 'internal',
                            position: 'before'
                        }
                    ],
                    pathGroupsExcludedImportTypes: ['builtin'],
                    alphabetize: { order: 'asc', caseInsensitive: true },
                    'newlines-between': 'always'
                }
            ],
            'prettier/prettier': [
                'error',
                {
                    trailingComma: 'none'
                }
            ],
            // Downgrade new react-hooks v7 rules from error to warn.
            // The set-state-in-effect pattern is used intentionally to reset state
            // on question navigation; purity flags Date.now() in CSR-only code.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',
            ...jsxA11y.configs.recommended.rules
        }
    }
]);
