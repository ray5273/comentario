import { TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Login Popup', () => {

    before(cy.backendReset);

    beforeEach(() => {
        cy.testSiteVisit(TEST_PATHS.comments);
        EmbedUtils.makeAliases({anonymous: true});

        // Click on Login
        cy.get('@profileBar').contains('button', 'Login').click();

        // Aliases
        cy.get('@root').find('.comentario-dialog').as('loginDialog').should('be.visible')
            .contains('.comentario-dialog-header', 'Log in').should('be.visible');
        // -- SSO
        cy.get('@loginDialog').contains('Login via localhost:8080').next()
            .contains('button', 'Single Sign-On').as('btnSso').should('be.visible').and('be.enabled');
        // -- Social login
        cy.get('@loginDialog').contains('Proceed with social login').next()
            .texts('button').should('arrayMatch', ['Facebook', 'GitHub', 'GitLab', 'Google', 'Twitter']);
        // -- Login form
        cy.get('@loginDialog').find('input[name=email]')   .as('email')   .should('be.visible').and('be.focused');
        cy.get('@loginDialog').find('input[name=password]').as('password').should('be.visible');
        cy.get('@loginDialog').find('button[type=submit]') .as('submit')  .should('be.visible').and('be.enabled');
    });

    context('can be closed', () => {

        it('with "X"', () => {
            cy.get('@loginDialog').find('.comentario-dialog-btn-close').click();
            cy.get('@loginDialog').should('not.exist');
        });

        it('by clicking outside', () => {
            cy.get('@root').click('topLeft');
            cy.get('@loginDialog').should('not.exist');
        });

        it('with Esc', () => {
            cy.get('@email').type('{esc}');
            cy.get('@loginDialog').should('not.exist');
        });
    });

    it('validates input', () => {
       cy.get('@submit').click();

        // Email
        cy.get('@email')        .should('match', ':invalid')
            .type('abc')        .should('match', ':invalid')
            .type('@')          .should('match', ':invalid')
            .type('example.com').should('match', ':valid')
            .clear()            .should('match', ':invalid');

        // Password
        cy.get('@password')     .should('match', ':invalid')
            .type('a')          .should('match', ':valid')
            .type('{backspace}').should('match', ':invalid');

        // Check the Forgot password link
        cy.get('@loginDialog').contains('a', 'Forgot your password?')
            .should('be.visible')
            .and('be.anchor', 'http://localhost:8080/en/auth/forgotPassword', {newTab: true});
    });

    it('allows to switch to Sign-up', () => {
        cy.get('@loginDialog').contains('a', 'Sign up here').click();
        cy.get('@root').contains('.comentario-dialog .comentario-dialog-header', 'Create an account').should('be.visible');
    });

    context('login', () => {

        it('allows to login via SSO', () => {
            cy.get('@btnSso').click();
            cy.get('.comentario-root .comentario-profile-bar .comentario-name').should('have.text', USERS.johnDoeSso.name);
        });

        [
            {name: 'superuser',  user: USERS.root,           isModerator: true},
            {name: 'owner',      user: USERS.ace,            isModerator: true},
            {name: 'moderator',  user: USERS.king,           isModerator: true},
            {name: 'commenter',  user: USERS.commenterTwo,   isModerator: false},
            {name: 'read-only',  user: USERS.commenterThree, isModerator: false},
            {name: 'non-domain', user: USERS.commenterOne,   isModerator: false},
        ]
            .forEach(test => it(`allows ${test.name} user to login with email and password`, () => {
                cy.get('@email')   .setValue(test.user.email);
                cy.get('@password').setValue(test.user.password).type('{enter}');
                cy.get('@loginDialog').should('not.exist');

                // Verify user name in the profile bar
                cy.get('.comentario-root .comentario-profile-bar .comentario-name')
                    .should('have.text', test.user.name).and('be.visible');
            }));
    });
});
