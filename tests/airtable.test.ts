import { check, checksRun } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { airtableValidate, checkCredentials } from '../src/utils/airtable'
import { state } from '../src/utils/state'

check('airtableValidate A', airtableValidate('A'), false)

check('checkCredentials A nothing setup', checkCredentials(), false)
check('checkCredentials B giving valid hash', checkCredentials('#app12345654987123&key12345654987123'), true)
test('checkCredentials C giving invalid hash', function () {
  state.apiBase = ''
  state.apiKey = ''
  const hasSucceed = checkCredentials('#app12343&key12345654987123')
  equal(hasSucceed, false)
})
test('checkCredentials D with a with valid base & key in state', function () {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const hasSucceed = checkCredentials()
  equal(hasSucceed, true)
})

checksRun()
