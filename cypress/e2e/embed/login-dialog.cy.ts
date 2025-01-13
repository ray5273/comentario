import { DomainConfigKey, DOMAINS, InstanceConfigKey, PATHS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Login dialog', () => {

    const openLoginDlg = () => {
        cy.testSiteVisit(TEST_PATHS.comments);
        EmbedUtils.makeAliases({anonymous: true});

        // Click on "Sign in"
        cy.get('@profileBar').contains('button', 'Sign in').click();

        // Aliases
        cy.get('@root').find('.comentario-dialog').as('loginDialog').should('be.visible')
            .contains('.comentario-dialog-header', 'Log in').should('be.visible');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('can be closed', () => {

        beforeEach(() => openLoginDlg());

        it('with "X"', () => {
            cy.get('@loginDialog').find('.comentario-dialog-btn-close').click();
            cy.get('@loginDialog').should('not.exist');
        });

        it('by clicking outside', () => {
            cy.get('@root').click('topLeft');
            cy.get('@loginDialog').should('not.exist');
        });

        it('with Esc', () => {
            cy.get('@loginDialog').find('input[name=email]').type('{esc}');
            cy.get('@loginDialog').should('not.exist');
        });
    });

    context('SSO auth', () => {

        it('shows no login button when disabled', () => {
            cy.backendPatchDomain(DOMAINS.localhost.id, {authSso: false});
            openLoginDlg();
            cy.get('@loginDialog').contains('button', 'Single Sign-On').should('not.exist');
        });

        context('when initially enabled', () => {

            beforeEach(() => {
                openLoginDlg();
                cy.get('@loginDialog').contains('button', 'Single Sign-On').as('btnSso').should('be.visible').and('be.enabled');
            });

            it('allows to login new user', () => {
                cy.get('@btnSso').click();
                cy.testSiteIsLoggedIn(USERS.johnDoeSso.name);
            });

            it('logs in existing user after disabled', () => {
                // Login via SSO to register a new account
                cy.get('@btnSso').click();

                // Click on "Logout"
                cy.get('@profileBar').find('button[title="Logout"]').click();

                // Now disable SSO signups and login again
                cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.ssoSignupEnabled]: false});
                cy.get('@profileBar').contains('button', 'Sign in').click();
                cy.get('@root').contains('.comentario-dialog button', 'Single Sign-On').click();
                cy.testSiteIsLoggedIn(USERS.johnDoeSso.name);
            });

            it('rejects new SSO user after disabled', () => {
                // Disable Cypress' rejected promise handling
                Cypress.on('uncaught:exception', () => false);

                // Disable SSO signups for the domain, try to register and fail
                cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.ssoSignupEnabled]: false});
                cy.get('@btnSso').click();
                cy.testSiteCheckMessage('New signups are forbidden');
            });
        });
    });

    context('federated auth', () => {

        const knownIdps = [
            {id: 'facebook',      label: 'Facebook'},
            {id: 'github',        label: 'GitHub'},
            {id: 'gitlab',        label: 'GitLab'},
            {id: 'google',        label: 'Google'},
            {id: 'twitter',       label: 'Twitter'},
        ];

        it('shows no login buttons when no IdP enabled', () => {
            cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);
            openLoginDlg();
            knownIdps.forEach(idp => cy.get('@loginDialog').contains('button', idp.label).should('not.exist'));
        });

        it('shows login buttons for all enabled IdPs', () => {
            openLoginDlg();
            cy.get('@loginDialog').texts('.comentario-oauth-buttons button')
                .should('arrayMatch', ['Single Sign-On', ...knownIdps.map(idp => idp.label)]);
        });

        knownIdps.forEach(idp =>
            it(`shows login button for ${idp.label} only`, () => {
                cy.backendUpdateDomainIdps(DOMAINS.localhost.id, [idp.id]);
                openLoginDlg();
                cy.get('@loginDialog').texts('.comentario-oauth-buttons button')
                    .should('arrayMatch', ['Single Sign-On', idp.label]);
            }));
    });

    context('local auth', () => {

        it('shows no login form when disabled', () => {
            cy.backendPatchDomain(DOMAINS.localhost.id, {authLocal: false});
            openLoginDlg();
            cy.get('@loginDialog').find('#comentario-login-form').should('not.exist');
        });

        context('when enabled', () => {

            beforeEach(() => {
                openLoginDlg();

                // Aliases for the login form
                cy.get('@loginDialog').find('#comentario-login-form').as('loginForm');
                cy.get('@loginForm').find('input[name=email]')   .as('email')   .should('be.visible');
                cy.get('@loginForm').find('input[name=password]').as('password').should('be.visible');
                cy.get('@loginForm').find('button[type=submit]') .as('submit')  .should('be.visible').and('be.enabled');
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
                    .and('be.anchor', Cypress.config().baseUrl + PATHS.auth.forgotPassword, {newTab: true});
            });

            context('allows to login', () => {

                [
                    {name: 'superuser',  user: USERS.root,           isModerator: true},
                    {name: 'owner',      user: USERS.ace,            isModerator: true},
                    {name: 'moderator',  user: USERS.king,           isModerator: true},
                    {name: 'commenter',  user: USERS.commenterTwo,   isModerator: false},
                    {name: 'read-only',  user: USERS.commenterThree, isModerator: false},
                    {name: 'non-domain', user: USERS.commenterOne,   isModerator: false},
                ]
                    .forEach(test => it(`for ${test.name} user`, () => {
                        cy.get('@email')   .setValue(test.user.email);
                        cy.get('@password').setValue(test.user.password).type('{enter}');
                        cy.get('@loginDialog').should('not.exist');

                        // Verify user name in the profile bar
                        cy.testSiteIsLoggedIn(test.user.name);
                    }));
            });

            context('refuses to login', () => {

                beforeEach(() => {
                    // Disable Cypress' rejected promise handling
                    Cypress.on('uncaught:exception', () => false);
                });

                [
                    {name: 'banned user',         user: USERS.banned,                         err: 'User is banned'},
                    {name: 'nonexistent user',    user: {email: 'a@b.com',    password: 'x'}, err: 'Wrong password or user doesn\'t exist'},
                    {name: 'with wrong password', user: {...USERS.ace,        password: 'x'}, err: 'Wrong password or user doesn\'t exist'},
                    {name: 'federated user',      user: {...USERS.githubUser, password: 'x'}, err: 'Wrong password or user doesn\'t exist'},
                    {name: 'SSO user',            user: {...USERS.ssoUser,    password: 'x'}, err: 'Wrong password or user doesn\'t exist'},
                ]
                    .forEach(({name, user, err}) => it(name, () => {
                        cy.get('@email')   .setValue(user.email);
                        cy.get('@password').setValue(user.password);
                        cy.get('@submit').click();
                        cy.testSiteCheckMessage(err);
                    }));

                it('locked user', () => {
                    // Set max allowed failed attempts to 1
                    cy.backendUpdateDynConfig({[InstanceConfigKey.authLoginLocalMaxAttempts]: 1});

                    // Try to login with invalid password, twice
                    for (const {} of [1, 2]) {
                        cy.get('@email').setValue(USERS.ace.email);
                        cy.get('@password').setValue('whatevva');
                        cy.get('@submit').click();
                        cy.testSiteCheckMessage('Wrong password or user doesn\'t exist');
                        openLoginDlg();
                    }

                    // Try to login again with the correct password: the user is locked
                    cy.get('@email')   .setValue(USERS.ace.email);
                    cy.get('@password').setValue(USERS.ace.password);
                    cy.get('@submit').click();
                    cy.testSiteCheckMessage('User is locked');
                });
            });
        });
    });

    context('switching to Sign-up', () => {

        it('shows no button when disabled', () => {
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.localSignupEnabled]: false});
            openLoginDlg();
            cy.get('@loginDialog').contains('button', 'Sign up here').should('not.exist');
        });

        it('open Signup dialog when enabled', () => {
            openLoginDlg();
            cy.get('@loginDialog').contains('button', 'Sign up here').click();
            cy.get('@root').contains('.comentario-dialog .comentario-dialog-header', 'Create an account').should('be.visible');
        });
    });

    context('unregistered commenting', () => {

        it('shows no button when disabled', () => {
            cy.backendPatchDomain(DOMAINS.localhost.id, {authAnonymous: false});
            openLoginDlg();
            cy.get('@loginDialog').find('#comentario-unregistered-form').should('not.exist');
        });

        it('hides dialog when enabled', () => {
            openLoginDlg();
            cy.get('@loginDialog').find('#comentario-unregistered-form button[type=submit]').click();
            cy.get('@loginDialog').should('not.exist');
        });
    });
});
