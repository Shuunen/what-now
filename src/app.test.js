describe('App', () => {
  it('successfully loads', () => {
    cy.visit('/')
    cy.get('h1').should('contain', 'What now')
  })

  describe('Settings', () => {
    it('has a button to open modal', () => {
      cy.get('.settings--trigger').should('be.visible')
    })
    it('open modal', () => {
      cy.get('.settings').should('not.be.visible')
      cy.get('.settings--trigger').click()
      cy.get('.settings').should('be.visible')
    })
    it('cannot submit invalid form', () => {
      cy.get('.settings input[type="submit"].success').click()
      cy.get('.settings').should('be.visible')
    })
    it('can submit valid form', () => {
      cy.get('.settings input[name="api"]').type('https://api.sheety.co/31935d1e-4f9d-442d-a504-2c13ecd441a3')
      cy.get('.settings input[type="submit"].success').click()
      cy.get('.settings').should('not.be.visible')
    })
  })
})
