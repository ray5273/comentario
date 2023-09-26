import { DYN_CONFIG_ITEMS, PATHS } from '../../../support/cy-utils';

context('Signup', () => {

    beforeEach(() => {
        cy.backendReset();
        cy.visit(PATHS.auth.signup);
        cy.isAt(PATHS.auth.signup);

        // Aliases
        cy.get('#signup-form')       .as('form');
        cy.get('#email')             .as('email');
        cy.get('#password input')    .as('password');
        cy.get('#name')              .as('name');
        cy.get('#name')              .as('name');
        cy.get('button[type=submit]').as('submit');
    });

    it('has all necessary controls', () => {
        // Check page content
        cy.get('h1').should('have.text', 'Sign up');

        // Check form content
        cy.get('@form').contains('label', 'Your email');
        cy.get('@form').contains('label', 'Password');
        cy.get('@form').contains('label', 'Your name');
        cy.get('@email')   .should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@password').should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@name')    .should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@submit')  .should('be.visible').should('be.enabled').should('have.text',  'Sign up');

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
        cy.get('@email').isInvalid('Please enter a valid email.')
            .type('abc').isInvalid()
            .type('@').isInvalid()
            .type('example.com').isValid();

        // Password
        cy.get('@password').isInvalid('Please enter a password.')
            .type('p').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain an uppercase letter (A-Z).' +
                'Password must contain a digit or a special symbol.')
            .setValue('P').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain a lowercase letter (a-z).' +
                'Password must contain a digit or a special symbol.')
            .type('Pass').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain a digit or a special symbol.')
            .type('word').isInvalid(
                'Password must contain a digit or a special symbol.')
            .type('!').isValid();

        // Name
        cy.get('@name').isInvalid('Please enter your name.')
            .type('a').isInvalid()
            .type('b').isValid()
            .setValue('b'.repeat(64)).isInvalid()
            .type('{backspace}').isValid();
    });

    it('allows user to sign up with confirmation', () => {
        // Sign up
        const user = {email: 'test@example', name: 'Imp', password: 'Passw0rd'};
        cy.signup(user, {goTo: false});

        // We're still on the signup page
        cy.noToast();
        cy.isAt(PATHS.auth.signup);
        cy.get('#signup-complete').should('be.visible')
            .should('contain.text', 'Your registration is almost complete!');

        // Try to login and fail because the email isn't confirmed
        cy.login(user, {goTo: true, verify: false});
        cy.toastCheckAndClose('email-not-confirmed');

        // Fetch the sent email: there must be exactly one
        cy.backendGetSentEmails().then(mails => {
            // Check there's exactly one email
            expect(mails).length(1);

            // Verify the email's headers
            const m = mails[0];
            expect(m.headers['Subject']).eq('Comentario: Please confirm your email address');
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
        cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.authSignupConfirmUser, 'false');

        // Sign up
        const user = {email: 'test@example', name: 'Imp', password: 'Passw0rd'};
        cy.signup(user, {goTo: false});

        // We're at the login page
        cy.isAt(PATHS.auth.login);
        cy.login(user, {goTo: false});
    });
});
