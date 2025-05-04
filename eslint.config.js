import { base } from 'eslint-plugin-shuunen/configs/base'
import { browser } from 'eslint-plugin-shuunen/configs/browser'
import { node } from 'eslint-plugin-shuunen/configs/node'
import { typescript } from 'eslint-plugin-shuunen/configs/typescript'

export default [
  ...base,
  ...node,
  ...browser,
  ...typescript,
]
