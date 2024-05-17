import { PATHS, USERS } from '../../support/cy-utils';

context('Home', () => {

    beforeEach(() => {
        cy.backendReset();
        cy.visit('/');
        cy.isAt(PATHS.home);
    });

    it('has content', () => {
        // Check the content
        cy.get('#front-page')
            .should('have.class', 'unauthenticated').should('not.have.class', 'authenticated')
            // Under test, the front page is replaced with a placeholder
            .should('have.text', '[https://edge.docs.comentario.app/en/embed/front-page/]');

        // Not logged in initially
        cy.isLoggedIn(false);

        // If logged in, the home class is changed to authenticated
        cy.loginViaApi(USERS.commenterOne, PATHS.home);
        cy.get('#front-page').should('not.have.class', 'unauthenticated').should('have.class', 'authenticated')
            .should('have.text', '[https://edge.docs.comentario.app/en/embed/front-page/]');
    });

    it('has navbar', () => {
        cy.get('app-navbar nav').should('be.visible').as('navbar');
        cy.get('@navbar').find('#navbar-logo img').as('logo').should('have.attr', 'src', 'images/logo.svg');
        cy.get('@navbar').contains('a', 'Docs')
            .should('be.anchor',
                'https://edge.docs.comentario.app/en/',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
        cy.get('@navbar').contains('a', 'About')
            .should('be.anchor',
                'https://edge.docs.comentario.app/en/about/',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false});

        // Click on Sign in
        cy.get('#user-nav-button').should('not.exist');
        cy.get('#login-nav-button').should('have.text', 'Sign in').click();
        cy.isAt(PATHS.auth.login);

        // Click on the logo and return to the homepage
        cy.get('@logo').click();
        cy.isAt(PATHS.home);

        // Log in, Sign in is replaced with Dashboard button
        cy.loginViaApi(USERS.commenterOne, PATHS.home);
        cy.get('#login-nav-button').should('not.exist');
        cy.get('#user-nav-button') .should('have.text', 'C' + 'Commenter One').click();
        cy.isAt(PATHS.manage.dashboard);
    });

    it('has footer', () => {
        cy.get('app-footer footer').as('footer').should('be.visible');

        // Check the logo
        cy.get('@footer').find('a img[alt="Comentario"]').as('logo').should('have.attr', 'src', 'images/logo.svg');

        // Check external links
        cy.get('@footer').find('a[href="https://comentario.app/"]')
            .should('be.anchor',
                'https://comentario.app/',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false})
            .should('have.attr', 'title', 'comentario.app');
        cy.get('@footer').find('a[href*="gitlab"]')
            .should('be.anchor',
                'https://gitlab.com/comentario/comentario',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false})
            .should('have.attr', 'title', 'GitLab');
        cy.get('@footer').find('a[href*="twitter"]')
            .should('be.anchor',
                'https://twitter.com/ComentarioApp',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false})
            .should('have.attr', 'title', 'Xwitter');
        cy.get('@footer').find('a[href*="linkedin"]')
            .should('be.anchor',
                'https://www.linkedin.com/company/comentario-app/',
                {newTab: true, noOpener: true, noReferrer: false, noFollow: false})
            .should('have.attr', 'title', 'LinkedIn');

        // Check copyright
        cy.get('@footer').find('.footer-copyright').invoke('text').should('match', /^Copyright ©\d{4}–\d{4} Comentario$/);

        // Check version
        cy.get('@footer').find('.footer-version').invoke('text').should('equal', 'Version 1.2.3');

        // Check doc links
        ['Docs', 'About', 'Privacy Policy', 'Terms of Service']
            .forEach(s =>
                cy.get('@footer').contains('a', s)
                    .should('be.visible')
                    .should(
                        'be.anchor',
                        /^https:\/\/edge\.docs\.comentario\.app\/en\//,
                        {newTab: true, noOpener: true, noReferrer: false, noFollow: false}));

        // Check app links
        cy.contains('app-footer a', 'Sign up').click();
        cy.isAt(PATHS.auth.signup);
        cy.contains('app-footer a', 'Sign in').click();
        cy.isAt(PATHS.auth.login);

        // Click on the logo and return to the homepage
        cy.get('@logo').click();
        cy.isAt(PATHS.home);

        // Log in, the links change
        cy.loginViaApi(USERS.commenterOne, PATHS.home);
        cy.contains('app-footer a', 'Sign up').should('not.exist');
        cy.contains('app-footer a', 'Sign in').should('not.exist');
        cy.contains('app-footer a', 'Dashboard').click();
        cy.isAt(PATHS.manage.dashboard);
        cy.contains('app-footer a', 'Domains').click();
        cy.isAt(PATHS.manage.domains);
        cy.contains('app-footer a', 'Profile').click();
        cy.isAt(PATHS.manage.account.profile);

        // Log out, the links revert back
        cy.logout();
        cy.contains('app-footer a', 'Sign up')  .should('be.visible');
        cy.contains('app-footer a', 'Sign in')  .should('be.visible');
        cy.contains('app-footer a', 'Dashboard').should('not.exist');
        cy.contains('app-footer a', 'Domains')  .should('not.exist');
        cy.contains('app-footer a', 'Profile')  .should('not.exist');
    });
});
