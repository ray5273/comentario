import { PATHS } from '../../../support/cy-utils';

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

    it('allows user to sign up', () => {
        cy.get('@email')   .setValue('test@example').isValid();
        cy.get('@password').setValue('Passw0rd')    .isValid();
        cy.get('@name')    .setValue('Imp')         .isValid();
        cy.get('@submit').click();

        // We're at the login page
        cy.isAt(PATHS.auth.login);
        cy.get('#email').setValue('test@example');
        cy.get('#password input').setValue('Passw0rd');
        cy.get('button[type=submit]').click();

        // We're in the Dashboard
        cy.isAt(PATHS.manage.dashboard);
    });
});
