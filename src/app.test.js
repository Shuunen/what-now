
const badUrl = 'https/bad-url.com'
const goodUrl = 'https://api.sheety.co/31935d1e-4f9d-442d-a504-2c13ecd441a3'

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
    it('has a button to open modal', () => {
      cy.get('.settings--trigger').should('be.visible')
    })
    it('open modal', () => {
      cy.get('.settings--modal').should('not.be.visible')
      cy.get('.settings--trigger').click()
      cy.get('.settings--modal').should('be.visible')
    })
    it('close modal', () => {
      cy.get('.settings--modal').should('be.visible')
      cy.get('.settings--close').click()
      cy.get('.settings--modal').should('not.be.visible')
    })
    it('cannot submit empty form', () => {
      cy.get('.settings--trigger').click()
      cy.get('.settings--modal').should('be.visible')
      cy.get('.settings--save').click()
      cy.get('.settings--modal').should('be.visible')
    })
    it('pre-fill api field if found in storage', () => {
      const url = 'https://url-from-storage'
      cy.setApiInLS(url)
      cy.visit('/')
      cy.get('.settings--trigger').click()
      cy.get('.settings--modal').should('be.visible')
      cy.get('.settings--modal input[name="api"]').should('have.value', url)
    })
    it('cannot submit invalid form', () => {
      cy.get('.settings--modal input[name="api"]').clear().type(badUrl + '2')
      cy.get('.settings--save').click()
      cy.get('.settings--modal').should('be.visible')
    })
    it('can submit valid form', () => {
      cy.get('.settings--modal input[name="api"]').clear().type(goodUrl)
      cy.get('.settings--save').click()
      cy.get('.settings--modal').should('not.be.visible')
      cy.get('.loader').should('be.visible')
    })
  })
})
