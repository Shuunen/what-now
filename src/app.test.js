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
  })
  describe('Settings', () => {
    beforeEach(() => {
      cy.visit('/')
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
    it('open & close modal', () => {
      cy.get('@modal').should('not.be.visible')
      cy.get('@trigger').click()
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
      cy.get('@input-base').should('have.value', AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').should('have.value', AIRTABLE_API_KEY_SAMPLE)
    })
    it('cannot submit invalid form', () => {
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
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').type(AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').type(AIRTABLE_API_KEY_SAMPLE)
      cy.get('@save').click()
      cy.get('@modal').should('not.be.visible')
    })
  })
  describe('Tasks', () => {
    before(() => {
      cy.visit('/')
    })
    it('load 5 tasks from json', () => {
      cy.fixture('get-tasks').then((json) => {
        // set the 2 first tasks completed on yesterday, with this format "2019-07-14"
        const yesterday = (d => new Date(d.setDate(d.getDate() - 1)))(new Date()).toISOString().split('T')[0]
        json.records[0].fields['completed-on'] = yesterday
        json.records[1].fields['completed-on'] = yesterday
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: json })))
        cy.get('.toast.info').should('be.visible').contains('5 tasks found')
      })
    })
    it('has one task-done badge displayed because one task has been already completed', () => {
      cy.get('.badge.task-done').should('be.visible')
    })
    it('show task', () => {
      cy.get('.task--title').should('not.be.visible')
      cy.get('.task--mark-as-done').should('not.be.visible')
      cy.get('.task--get').click()
      // because of the important sort & completion dates previously set, 'Faire une lessive' should be the one to be suggested
      cy.get('.task--title').should('be.visible').contains('Faire une lessive')
    })
    it('can skip the displayed task because a badge is available', () => {
      cy.get('.badge.task-done').click()
      cy.get('.task--title').should('be.visible').contains('Trier les mails')
    })
    it('mark task as done', () => {
      cy.get('.task--mark-as-done').should('be.visible')
      cy.get('.task--mark-as-done').click()
      cy.get('.task--mark-as-done').should('not.be.visible')
      cy.get('.toast.success').should('be.visible').contains('well done')
      cy.get('.toast.error').should('be.visible').contains('cannot update task without api')
      cy.get('.toast.error').click()
    })
    it('mark all tasks as done', () => {
      for (let i = 0; i < 3; i++) {
        cy.wait(300)
        cy.get('.task--get').click()
        cy.get('.task--mark-as-done').click()
        cy.wait(200)
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
        id: 'some-id',
        fields: {
          name: 'Trier les mails',
          once: 'day',
          'completed-on': today,
        },
      }
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [task] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.info').should('be.visible').contains('1 tasks found')
      cy.get('.tasks--title.success').should('be.visible').contains('You did everything')
    })
  })
  describe('Badges', () => {
    const taskDone = { fields: { done: true } }
    const taskTodo = { fields: { } }
    it('has no badges at start', () => {
      cy.visit('/')
      cy.get('.badges').should('be.visible')
    })
    it('can display badges on demand', () => {
      for (const emoji of '🌌✨💖') {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('add-badge', { detail: { type: 'test', content: emoji } })))
        cy.get('.badge').should('be.visible').contains(emoji)
      }
    })
    it('should display task-done badge on task complete', () => {
      cy.visit('/')
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [taskDone, taskTodo] } })))
      cy.get('.badge.task-done').should('be.visible')
    })
    it('should display n stars & 1 medal badge when all tasks complete', () => {
      cy.visit('/')
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [taskDone, taskDone, taskDone] } })))
      cy.get('.badge').should('have.length', 4) // 3 .task-done ⭐ & 1 .tasks-done 🎖️
      cy.get('.badge.tasks-done').should('have.length', 1)
    })
    it('should handle master badgerz or haxx0rz', () => {
      cy.visit('/')
      cy.get('.badge').should('have.length', 0)
      const emojis = '😎🤓💻🖖⚗🤯'.repeat(30) // 6 emojis * 30 = 180
      for (const emoji of emojis) {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('add-badge', { detail: { type: 'test', content: emoji } })))
        cy.wait(1)
      }
      cy.get('.badge').should('have.length', 180)
    })
  })
  describe('Progress', () => {
    before(() => {
      cy.visit('/')
    })
    it('has no progression by default', () => {
      cy.get('.what-now').should('be.visible')
      cy.get('[class^="level-"]').should('have.length', 0)
    })
    it('load 5 tasks from json', () => {
      cy.fixture('get-tasks').then((json) => {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: json })))
        cy.get('.toast.info').should('be.visible').contains('5 tasks found')
      })
    })
    it('has default progress', () => {
      cy.get('.what-now[data-progress="40"]').should('be.visible')
      cy.get('.progress .level-40').should('be.visible')
    })
    it('gain levels via completing tasks', () => {
      cy.get('.task--get').click()
      cy.get('.task--mark-as-done').click()
      cy.get('.what-now[data-progress="60"]').should('be.visible')
      cy.get('.progress .level-60').should('be.visible')
    })
    it('complete all levels', () => {
      cy.get('.task--get').click()
      cy.get('.task--mark-as-done').click()
      cy.get('.task--get').click()
      cy.get('.task--mark-as-done').click()
      cy.get('.what-now[data-progress="100"]').should('be.visible')
      cy.get('.progress .level-100').should('be.visible')
    })
  })
})
