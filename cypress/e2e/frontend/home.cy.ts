import { PATHS } from '../../support/cy-utils';

context('Home', () => {

    beforeEach(() => {
        cy.visit('/');
        cy.isAt(PATHS.home);
    });

    it('has a navbar, content, and a footer', () => {
        // Check the navbar
        cy.get('app-navbar nav').should('be.visible');

        // Check the hero area
        cy.contains('app-home .hero-area', 'Comments. Easy.').as('hero').should('be.visible');
        cy.get('@hero').contains('div', 'Add comments to your web page or blog in a matter of minutes.')
            .should('be.visible');
        cy.get('@hero').contains('a', 'View Demo')
            .should('have.attr', 'href', 'https://demo.comentario.app/');
        cy.get('@hero').contains('a', 'Get Started')
            .should('have.attr', 'href').should('match', /docs\.comentario\.app\/en\/getting-started\/$/);

        // Check the footer
        cy.get('app-footer footer').should('be.visible');
    });
});
