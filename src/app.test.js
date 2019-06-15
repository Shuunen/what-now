/* eslint-disable cypress/no-unnecessary-waiting */

const invalidUrl = 'https/bad-url.com'
const validUrl = 'https://www.mocky.io'

describe('App', () => {
  it('successfully loads', () => {
    cy.visit('/')
    cy.get('h1').should('contain', 'What now')
  })
  describe('Toaster', () => {
    it('show success toast', () => {
      const message = 'nice success'
      cy.window().then(w => w.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message } })))
      cy.get('.toast.success').should('be.visible').contains(message)
    })
    it('show error toast', () => {
      const message = 'bad news'
      cy.window().then(w => w.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message } })))
      cy.get('.toast.error').should('be.visible').contains(message)
    })
    it('dismiss error toast', () => {
      cy.get('.toast.error').should('be.visible')
      cy.get('.toast.error').click()
      cy.get('.toast.error').should('not.be.visible')
    })
  })
  describe('Settings', () => {
    beforeEach(() => {
      cy.get('.settings--trigger').as('trigger')
      cy.get('.settings--modal').as('modal')
    })
    it('has a button to open modal', () => {
      cy.get('@trigger').should('be.visible')
    })
    it('open modal', () => {
      cy.get('@modal').should('not.be.visible')
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
    })
    it('close modal', () => {
      cy.get('@modal').should('be.visible')
      cy.get('.settings--close').click()
      cy.get('@modal').should('not.be.visible')
    })
    it('cannot submit empty form', () => {
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('.settings--save').click()
      cy.get('@modal').should('be.visible')
    })
    it('pre-fill api field if found in storage', () => {
      cy.setApiInLS(validUrl)
      cy.visit('/')
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@modal').find('input[name="api"]').should('have.value', validUrl)
    })
    it('cannot submit invalid form', () => {
      cy.get('@modal').find('input[name="api"]').clear().type(invalidUrl + '2')
      cy.get('.settings--save').click()
      cy.get('@modal').should('be.visible')
    })
    it('can submit valid form', () => {
      cy.get('@modal').find('input[name="api"]').clear().type(validUrl)
      cy.get('.settings--save').click()
      cy.get('@modal').should('not.be.visible')
    })
    it('should have 2 error toast displayed', () => {
      cy.get('.toast.error').as('toasts').should('have.length', 2)
      cy.get('@toasts').each(toast => toast.click())
      cy.get('@toasts').should('have.length', 0)
    })
  })
  describe('Tasks', () => {
    beforeEach(() => {
      cy.get('.task--get').as('button-get')
      cy.get('.task--mark-as-done').as('button-done')
    })
    it('load tasks from json', () => {
      cy.fixture('get-tasks').then((json) => {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: json })))
        cy.get('.toast.success').should('be.visible').contains('5 tasks found')
      })
    })
    it('show task', () => {
      cy.get('.task--title').as('task-title').should('not.be.visible')
      cy.get('@button-done').as('button').should('not.be.visible')
      cy.get('@button-get').click()
      cy.get('@task-title').should('be.visible').contains('Faire une lessive')
    })
    it('mark task as done', () => {
      cy.get('@button-done').should('be.visible')
      cy.get('@button-done').click()
      cy.get('@button-done').should('not.be.visible')
      cy.get('.toast.success').should('be.visible').contains('well done')
    })
    it('mark all tasks as done', () => {
      for (let i = 0; i < 4; i++) {
        cy.get('@button-get').click()
        cy.get('@button-done').click()
      }
    })
    it('display everything done screen', () => {
      cy.get('.tasks--title.success').as('success-message').should('be.visible')
      cy.get('@success-message').contains('You did everything')
    })
  })
})
