import { h1, tw } from 'shuutils'
// eslint-disable-next-line unicorn/prevent-abbreviations
import pkg from '../../package.json'

const title = h1(tw('app-title -ml-2 text-5xl text-blue-300 sm:text-7xl'), 'What now')
title.title = `v${pkg.version}`

export { title }
