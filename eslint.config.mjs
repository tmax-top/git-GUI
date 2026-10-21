import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

const nodeGlobals = Object.fromEntries(
  [
    'require', 'module', 'exports', '__dirname', '__filename', 'process',
    'console', 'Buffer', 'setTimeout', 'clearTimeout', 'setInterval',
    'clearInterval', 'setImmediate', 'clearImmediate', 'global'
  ].map((g) => [g, 'readonly'])
)

export default tseslint.config(
  { ignores: ['dist', 'out', 'release', 'node_modules', '.pnpm-store', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: nodeGlobals },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
)
