// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import pluginMocha from 'eslint-plugin-mocha';
import pluginCypress from 'eslint-plugin-cypress/flat';

export default tseslint.config(
    // Frontend Typescript
    {
        files: ['frontend/**/*.ts'],
        ignores: ['frontend/generated-api/**'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            'brace-style': 'error',
            curly: ['error', 'all'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
        },
    },

    // Frontend HTML templates
    {
        files: ['frontend/**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
    },

    // Embed typescript
    {
        files: ['embed/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
        ],
        rules: {
            'brace-style': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            curly: ['error', 'all'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
        },
    },

    // Cypress Typescript
    {
        files: ['cypress/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
        ],
        plugins: {
            mocha: pluginMocha,
            cypress: pluginCypress,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'mocha/no-exclusive-tests': 'error',
            'mocha/no-skipped-tests': 'error',
            'no-empty-pattern': 'off',
            semi: ['error', 'always'],
        },
    },
);
