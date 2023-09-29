import { PATHS, USERS } from '../../../support/cy-utils';

context('Login', () => {

    beforeEach(() => {
        cy.backendReset();
        cy.visit(PATHS.auth.login);
        cy.isAt(PATHS.auth.login);

        // Aliases
        cy.get('#login-form')                    .as('form');
        cy.get('#email')                         .as('email');
        cy.get('#password input')                .as('password');
        cy.get('button[type=submit]')            .as('submit');
        cy.contains('a', 'Forgot your password?').as('forgotPwdLink');
    });

    it('stays on the page after reload', () => {
        cy.reload();
        cy.isAt(PATHS.auth.login);
    });

    it('redirects authenticated user to Dashboard', () => {
        cy.loginViaApi(USERS.commenterOne, PATHS.auth.login);
        cy.isAt(PATHS.manage.dashboard);
    });

    it('has all necessary controls', () => {
        // Check page content
        cy.get('h1').should('have.text', 'Log in');

        // Check form content
        cy.get('@form').contains('label', 'Your email');
        cy.get('@form').contains('label', 'Password');
        cy.get('@email')        .should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@password')     .should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@submit')       .should('be.visible').should('be.enabled').should('have.text',  'Sign in');
        cy.get('@forgotPwdLink').should('be.visible');

        // Check social buttons
        cy.get('app-federated-login').should('be.visible')
            .texts('button')
            .should('arrayMatch', ['Facebook', 'GitHub', 'GitLab', 'Google', 'Twitter']);

        // Check switch to signup
        cy.contains('a', 'Sign up here').click();
        cy.isAt(PATHS.auth.signup);

        // Check switch to forgot password
        cy.visit(PATHS.auth.login);
        cy.get('@forgotPwdLink').click();
        cy.isAt(PATHS.auth.forgotPassword);
    });

    it('validates input', () => {
        // Click on Sign in and get error feedback for each field
        cy.get('@submit').click();
        cy.isAt(PATHS.auth.login);

        // Email
        cy.get('@email').verifyEmailInputValidation();

        // Password
        cy.get('@password').verifyPasswordInputValidation({required: true});
    });

    it('logs user in and out', () => {
        // Try valid users
        cy.login(USERS.root);
        cy.logout();
        cy.login(USERS.ace);
        cy.logout();
        cy.login(USERS.commenterOne);
        cy.logout();

        // Try to log in as a banned user and fail
        cy.login(USERS.banned, {verify: false});
        cy.toastCheckAndClose('user-banned');
        cy.isAt(PATHS.auth.login);

        // Try to log in as a nonexistent user and fail
        cy.login({email: 'who@knows', password: 'Passw0rd'}, {goTo: false, verify: false});
        cy.toastCheckAndClose('invalid-credentials');
        cy.isAt(PATHS.auth.login);

        // Try to log in with the wrong password and fail
        cy.login({email: USERS.ace.email, password: 'wrong'}, {goTo: false, verify: false});
        cy.toastCheckAndClose('invalid-credentials');
        cy.isAt(PATHS.auth.login);
    });
});
