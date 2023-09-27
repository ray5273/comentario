import { PATHS } from '../../support/cy-utils';

context('Home', () => {

    beforeEach(() => {
        cy.visit('/');
        cy.isAt(PATHS.home);
    });

    it('has a navbar, content, and a footer', () => {
        // Check the navbar
        cy.get('app-navbar nav').should('be.visible');

        // Check the main content (it doesn't get embedded in e2e test)
        cy.get('app-home section.unauthenticated').should('exist');

        // Check the footer
        cy.get('app-footer footer').should('be.visible');
    });
});
