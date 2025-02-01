/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// @ts-expect-error missing types
import shuunen from 'eslint-plugin-shuunen'

export default [
  {
    ignores: ['public/*.js'],
    name: 'what-now-ignores',
  },
  ...shuunen.configs.base,
  ...shuunen.configs.node,
  ...shuunen.configs.browser,
  ...shuunen.configs.typescript,
]
