/** The base URL for the test site. */
const testSiteUrl = Cypress.env('TEST_SITE_URL') || 'http://comentario-test-site:8000/';

context('Comments', () => {

    before(cy.backendReset);

    it('displays comments', () => {
        // Verify headings
        cy.visit(testSiteUrl);
        cy.get('h1').should('have.text', 'Comentario test');
        cy.get('h2#comments').should('have.text', 'Comments');

        // Verify basic layout
        cy.get('comentario-comments').as('cc').should('be.visible');
        cy.get('@cc').find('.comentario-root').as('root')
            .should('be.visible')
            .should('have.class', 'comentario-root-font');

        // Profile bar
        cy.get('@root').find('.comentario-profile-bar').as('profileBar')
            .should('be.visible')
            .find('button').should('have.text', 'Login');

        // Main area
        cy.get('@root').find('.comentario-main-area').as('mainArea')
            .should('be.visible');
        cy.get('@mainArea').find('.comentario-add-comment-host').should('be.visible');
        cy.get('@mainArea').find('.comentario-sort-policy-buttons-container').should('be.visible');
        cy.get('@mainArea').find('.comentario-comments').as('comments').should('be.visible');

        // Comments
        cy.get('@comments').find('> .comentario-card').should('have.length', 2);

        // Footer
        cy.get('@root').find('.comentario-footer').as('footer')
            .should('be.visible')
            .find('a')
                .should('have.text', 'Powered by Comentario')
                .should('have.attr', 'href', 'https://comentario.app/');
    });
});
