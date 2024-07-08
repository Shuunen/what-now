import { expect, it } from 'vitest'
import { parseClipboard } from './credentials.utils'

it('parseClipboard A empty', () => {
  expect(parseClipboard('')).toMatchInlineSnapshot(`
    {
      "apiBase": "",
      "apiToken": "",
      "hueEndpoint": "",
    }
  `)
})

it('parseClipboard B invalid', () => {
  expect(parseClipboard('app1238479649646azd46az465azdazd\nhttps://zob.com')).toMatchInlineSnapshot(`
    {
      "apiBase": "",
      "apiToken": "",
      "hueEndpoint": "",
    }
  `)
})

it('parseClipboard C valid', () => {
  expect(parseClipboard(`"app1238479649646azd46az465azdazd
pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd
https://zob.com"`)).toMatchInlineSnapshot(`
  {
    "apiBase": "app1238479649646azd46az465azdazd",
    "apiToken": "pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd",
    "hueEndpoint": "https://zob.com",
  }
`)
})
