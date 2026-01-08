import tseslint from '@electron-toolkit/eslint-config-ts'
import unocss from '@unocss/eslint-config/flat'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import eslintPluginVue from 'eslint-plugin-vue'
import {defineConfig} from 'eslint/config'
import vueParser from 'vue-eslint-parser'
import prettierConfig from './.prettierrc.mjs'

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out', '.github'] },
  tseslint.configs.recommended,
  unocss,
  eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/valid-attribute-name': 'off',
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts'
          }
        }
      ]
    }
  },
  {
    ...eslintPluginPrettier,
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      ...eslintPluginPrettier.rules,
      'prettier/prettier': [
        'error',
        prettierConfig
      ]
    }
  }
)
