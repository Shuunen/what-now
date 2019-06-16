/* eslint-disable cypress/no-unnecessary-waiting */
const AIRTABLE_API_BASE_SAMPLE = 'appdxOY0ei028c0AE'
const AIRTABLE_API_KEY_SAMPLE = 'keyWtbZlAQKQ10t1b'

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
      cy.get('.toast.error').as('toast').should('be.visible')
      cy.get('@toast').click()
      cy.get('@toast').should('not.be.visible')
    })
  })
  describe('Settings', () => {
    beforeEach(() => {
      cy.get('.settings--trigger').as('trigger')
      cy.get('.settings--modal').as('modal')
      cy.get('.settings--close').as('close')
      cy.get('.settings--save').as('save')
      cy.get('@modal').find('input[name="airtable-api-base"]').as('input-base')
      cy.get('@modal').find('input[name="airtable-api-key"]').as('input-key')
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
      cy.get('@close').click()
      cy.get('@modal').should('not.be.visible')
    })
    it('cannot submit empty form', () => {
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
    })
    it('pre-fill api fields if found in storage', () => {
      cy.setLS('api-base', AIRTABLE_API_BASE_SAMPLE)
      cy.setLS('api-key', AIRTABLE_API_KEY_SAMPLE)
      cy.visit('/')
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').should('have.value', AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').should('have.value', AIRTABLE_API_KEY_SAMPLE)
    })
    it('cannot submit invalid form', () => {
      cy.visit('/')
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').clear().type('abc')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').clear().type(AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').clear().type('abc')
      cy.get('@input-key').trigger('keypress')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
    })
    it('can submit valid form', () => {
      cy.get('@input-base').clear().type(AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').clear().type(AIRTABLE_API_KEY_SAMPLE)
      cy.get('@save').click()
      cy.get('@modal').should('not.be.visible')
    })
  })
  describe('Tasks', () => {
    beforeEach(() => {
      cy.get('.task--get').as('button-get')
      cy.get('.task--mark-as-done').as('button-done')
    })
    it('load 5 tasks from json', () => {
      cy.visit('/')
      cy.fixture('get-tasks').then((json) => {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: json })))
        cy.get('.toast.info').should('be.visible').contains('5 tasks found')
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
      cy.get('.toast.error').should('be.visible').contains('cannot update task without api')
      cy.get('.toast.error').click()
    })
    it('mark all tasks as done', () => {
      for (let i = 0; i < 4; i++) {
        cy.wait(300)
        cy.get('@button-get').click()
        cy.get('@button-done').click()
        cy.wait(200)
        cy.get('.toast.error').click()
      }
    })
    it('display everything done screen', () => {
      cy.get('.tasks--title.success').should('be.visible').contains('You did everything')
    })
    it('load empty task list', () => {
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.error').should('be.visible').contains('no tasks found')
    })
    it('load already done tasks', () => {
      cy.visit('/')
      const today = new Date().toISOString().split('T')[0]
      const task = {
        'id': 'some-id',
        'fields': {
          'name': 'Trier les mails',
          'once': 'day',
          'completed-on': today,
        },
      }
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [task] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.info').should('be.visible').contains('1 tasks found')
      cy.get('.tasks--title.success').should('be.visible').contains('You did everything')
    })
  })
})
