/**
 * QUOI     — les règles de lint de la V2.
 * POURQUOI — ce que la V1 a laissé passer par bonne volonté (any, console.log, fichiers trop
 *            longs, styles inline, imports de la V1), l'outil le refuse ici. Repris de l'app
 *            Runes de Chêne le 07/10/2026.
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const V1 = { group: ['**/apps/web/**', '../web/**'], message: 'La V2 n’importe jamais la V1.' }

export default defineConfig([
  globalIgnores(['dist', 'src/types/supabase.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // La forme courte `onClick={() => setX(v)}` reste permise : elle se lit d'un coup d'œil.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // Un nombre dans une chaîne (« 3 jours ») est légitime ; le reste doit être converti.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': 'error',
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': ['error', { patterns: [V1] }],
      'no-restricted-syntax': [
        'error',
        {
          // Style inline passé par une variable : on ne peut pas vérifier ce qu'il contient.
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > Identifier",
          message:
            'Pas de style inline par variable : écrire l’objet sur place, variables CSS seulement.',
        },
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.type='Literal'][key.value!=/^--/]",
          message: "Pas de style inline : seules les variables CSS ('--nom') sont permises.",
        },
        {
          selector: "JSXAttribute[name.name='style'] Property[key.type='Identifier']",
          message:
            "Pas de style inline : passer par styles/3-components. Seules les variables CSS ('--nom') sont permises.",
        },
      ],
    },
  },
])
