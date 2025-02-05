# Benchmarks

## Eslint

`hyperfine --runs 3 --warmup 1 'npx eslint'`

|     date     |     delay      | node  |     machine      | comment                         |
| :----------: | :------------: | :---: | :--------------: | ------------------------------- |
| 2025-02-05#1 | 5.1 s ±  0.1 s | 22.11 | romain duc win11 | eslint-plugin-shuunen 0.4.0 CJS |
