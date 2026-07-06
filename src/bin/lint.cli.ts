import { rules } from './lint.rules'

function main() {
  let foundIssues = false
  for (const rule of rules)
    if (!rule.check()) {
      console.error(`(${rule.name}) ${rule.error}`)
      foundIssues = true
    }

  if (foundIssues) throw new Error('Lint issues found.')
  console.log('All custom rules passed successfully!')
}

main()
