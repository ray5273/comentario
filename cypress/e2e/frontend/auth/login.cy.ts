import { InstanceConfigKey, PATHS, USERS } from '../../../support/cy-utils';

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

    it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.auth.login));

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
        cy.login(USERS.banned, {succeeds: false, errToast: 'user-banned'});
        cy.isAt(PATHS.auth.login);

        // Try to log in as a nonexistent user and fail
        cy.login({email: 'who@knows', password: 'Passw0rd'}, {goTo: false, succeeds: false, errToast: 'invalid-credentials'});
        cy.isAt(PATHS.auth.login);

        // Try to log in with the wrong password and fail
        cy.login(USERS.ace.withPassword('wrong'), {goTo: false, succeeds: false, errToast: 'invalid-credentials'});
        cy.isAt(PATHS.auth.login);
    });

    it('locks user after too many attempts', () => {
        // Set max allowed failed attempts to 1
        cy.backendUpdateDynConfig({[InstanceConfigKey.authLoginLocalMaxAttempts]: 1});

        // Try to login with an invalid password, twice
        for (const {} of [1, 2]) {
            cy.login(USERS.ace.withPassword('wrong'), {goTo: false, succeeds: false, errToast: 'invalid-credentials'});
        }

        // Now try to login again with the correct password: the user is locked
        cy.login(USERS.ace, {goTo: false, succeeds: false, errToast: 'user-locked'});

        // Open the user properties (as root) and unlock the user account
        cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.ace.id).props);
        cy.contains('app-user-properties button', 'Unlock').click();
        cy.toastCheckAndClose('user-is-unlocked');
        cy.logout();

        // The user is able to login again
        cy.login(USERS.ace);
    });

    it('doesn\'t lock user with unlimited failed attempts', () => {
        // Disable locking by setting max allowed failed attempts to 0
        cy.backendUpdateDynConfig({[InstanceConfigKey.authLoginLocalMaxAttempts]: 0});

        // Try to login with an invalid password multiple times
        cy.login(USERS.ace.withPassword('wrong'), {goTo: false, succeeds: false, errToast: 'invalid-credentials'});
        for (let i = 0; i < 20; i++) {
            cy.get('@submit').click();
            cy.toastCheckAndClose('invalid-credentials');
        }

        // Still able to login with the correct credentials
        cy.login(USERS.ace);
    });
});
