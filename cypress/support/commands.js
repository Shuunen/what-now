// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

const getTasks = require('../fixtures/get-tasks.json')

Cypress.Commands.add('setLS', (key, value) => {
  console.log(`setting key "${key}" in LS with value :`, value)
  window.localStorage.setItem(key, value)
})

Cypress.on('window:before:load', win => {
  win.fetch = (url, options) => {
    let data = 'case not handled yet'
    options = options || { method: 'get' }
    if (options.method === 'get' && url.includes('/tasks')) data = getTasks
    else console.log('fake fetch not handled yet :', url, options)
    return { json: () => data }
  }
})
