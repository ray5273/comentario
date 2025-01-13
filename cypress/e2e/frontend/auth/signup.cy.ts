import { InstanceConfigKey, PATHS, USERS } from '../../../support/cy-utils';

context('Signup', () => {

    beforeEach(cy.backendReset);

    it('is unavailable when disabled in configuration', () => {
        // Disable registrations and visit the page
        cy.backendUpdateDynConfig({[InstanceConfigKey.authSignupEnabled]: false});
        cy.visit(PATHS.auth.signup);

        // There's a banner
        cy.contains('app-signup .alert', 'Sign-up closed').should('be.visible');

        // No form
        cy.get('#signup-form').should('not.exist');

        // There's a login link though
        cy.contains('app-signup a', 'Already have an account?').click();
        cy.isAt(PATHS.auth.login);
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.auth.signup));

    it('redirects authenticated user to Dashboard', () => {
        cy.loginViaApi(USERS.commenterOne, PATHS.auth.signup);
        cy.isAt(PATHS.manage.dashboard);
    });

    context('when enabled', () => {

        /** Signup as provided user via the UI. */
        const signup = (user: Partial<Cypress.User>) => {
            cy.get('@email')   .setValue(user.email)   .isValid();
            cy.get('@password').setValue(user.password).isValid();
            cy.get('@name')    .setValue(user.name)    .isValid();
            cy.get('@submit').click();
        };

        beforeEach(() => {
            cy.visit(PATHS.auth.signup);
            cy.isAt(PATHS.auth.signup);

            // Check page content
            cy.get('app-signup').as('signup');
            cy.get('@signup').find('h1').should('have.text', 'Sign up').and('be.visible');

            // Signup form
            cy.get('@signup').find('#signup-form')     .as('form');
            cy.get('@form').find('#email')             .as('email')   .should('be.visible').should('be.enabled').should('have.value', '');
            cy.get('@form').find('#password input')    .as('password').should('be.visible').should('be.enabled').should('have.value', '');
            cy.get('@form').find('#name')              .as('name')    .should('be.visible').should('be.enabled').should('have.value', '');
            cy.get('@form').find('button[type=submit]').as('submit')  .should('be.visible').should('be.enabled').should('have.text',  'Sign up');
        });

        it('has all necessary controls', () => {
            // Check form content
            cy.get('@form').contains('label', 'Your email');
            cy.get('@form').contains('label', 'Password');
            cy.get('@form').contains('label', 'Your name');

            // Check consent
            cy.get('@form').contains('By signing up, you agree to our Terms of Service and Privacy Policy.').as('consent');
            cy.get('@consent').contains('a', 'Terms of Service')
                .should('be.anchor', /\/en\/legal\/tos\/$/, {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
            cy.get('@consent').contains('a', 'Privacy Policy')
                .should('be.anchor', /\/en\/legal\/privacy\/$/, {newTab: true, noOpener: true, noReferrer: false, noFollow: false});

            // Check social buttons
            cy.get('app-federated-login').should('be.visible')
                .texts('button')
                .should('arrayMatch', ['Facebook', 'GitHub', 'GitLab', 'Google', 'Twitter']);

            // Check switch to login
            cy.contains('a', 'Log in here').click();
            cy.isAt(PATHS.auth.login);
        });

        it('validates input', () => {
            // Click on Sign up and get error feedback for each field
            cy.get('@submit').click();
            cy.isAt(PATHS.auth.signup);

            // Email
            cy.get('@email').verifyEmailInputValidation();

            // Password
            cy.get('@password').verifyPasswordInputValidation({required: true, strong: true});

            // Name
            cy.get('@name').verifyTextInputValidation(2, 63, true, 'Please enter a valid name.');
        });

        it('allows user to sign up with confirmation', () => {
            // Sign up
            const user = {email: 'test@example', name: 'Imp', password: 'Passw0rd'};
            signup(user);

            // We're still on the signup page
            cy.noToast();
            cy.isAt(PATHS.auth.signup);
            cy.get('#signup-complete').should('be.visible')
                .should('contain.text', 'Your registration is almost complete!');

            // Try to login and fail because the email isn't confirmed
            cy.login(user, {goTo: true, succeeds: false, errToast: 'email-not-confirmed'});

            // Fetch the sent email: there must be exactly one
            cy.backendGetSentEmails()
                .should('have.length', 1)
                .its(0).then(m => {
                    // Verify the email's headers
                    expect(m.headers['Subject']).eq('Comentario: Confirm Your Email');
                    expect(m.headers['From'])   .eq('noreply@localhost');
                    expect(m.headers['To'])     .eq('test@example');

                    // Extract a confirmation link from the body
                    const matches = m.body.match(/http:\/\/localhost:8080\/api\/auth\/confirm\?access_token=[^"]+/g);
                    expect(matches).length(1);

                    // Confirm user's email address by following the link
                    cy.visit(matches[0]);
                });

            // There's a success toast
            cy.toastCheckAndClose('email-confirmed');

            // We're at the login page. Login, now successfully
            cy.isAt(PATHS.auth.login, {ignoreQuery: true});
            cy.login(user, {goTo: false});
        });

        it('allows user to sign up without confirmation', () => {
            // Deactivate email confirmation (on by default)
            cy.backendUpdateDynConfig({[InstanceConfigKey.authSignupConfirmUser]: false});

            // Sign up
            const user = {email: 'test@example', name: 'Imp', password: 'Passw0rd'};
            signup(user);

            // We're at the login page
            cy.isAt(PATHS.auth.login);
            cy.login(user, {goTo: false});
        });

        it('allows user to sign up with a custom language', () => {
            // Deactivate email confirmation (on by default)
            cy.backendUpdateDynConfig({[InstanceConfigKey.authSignupConfirmUser]: false});

            // Modify the language header in the outgoing request
            cy.intercept(
                {method: 'POST', url: 'api/auth/profile'},
                req => req.headers['accept-language'] = 'nl-BE;q=0.9,nl;q=0.8,en-GB;q=0.7,en;q=0.6');

            // Sign up
            const user = {email: 'boo@example.test', name: 'Boo', password: 'Passw0rd'};
            signup(user);
            cy.isAt(PATHS.auth.login);

            // Login and navigate to profile to check the language
            cy.loginViaApi(user, PATHS.manage.account.profile);
            cy.get('app-profile #lang').should('have.value', 'nl-BE');
        });
    });
});
