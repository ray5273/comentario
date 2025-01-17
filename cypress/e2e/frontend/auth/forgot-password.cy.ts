import { PATHS, USERS } from '../../../support/cy-utils';

context('Forgot password', () => {

    beforeEach(() => {
        cy.backendReset();
        cy.visit(PATHS.auth.forgotPassword);
        cy.isAt(PATHS.auth.forgotPassword);

        // Aliases
        cy.get('#forgot-password-form').as('form');
        cy.get('#email')               .as('email');
        cy.get('button[type=submit]')  .as('submit');
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.auth.forgotPassword));

    it('redirects authenticated user to Dashboard', () => {
        cy.loginViaApi(USERS.commenterOne, PATHS.auth.forgotPassword);
        cy.isAt(PATHS.manage.dashboard);
    });

    it('has all necessary controls', () => {
        // Check page content
        cy.get('h1').should('have.text', 'Forgot your password?');
        cy.contains('p', 'Please enter your email in the form below, and we\'ll send you a reset link.');

        // Check form content
        cy.get('@form').contains('label', 'Your email');
        cy.get('@email') .should('be.visible').should('be.enabled').should('have.value', '');
        cy.get('@submit').should('be.visible').should('be.enabled').should('have.text',  'Send me a link!');
    });

    it('validates input', () => {
        // Click on the submit button and get error feedback for each field
        cy.get('@submit').click();
        cy.isAt(PATHS.auth.forgotPassword);

        // Email
        cy.get('@email').verifyEmailInputValidation();
    });

    it('allows existing user to reset password', () => {
        cy.get('@email').setValue(USERS.commenterOne.email);
        cy.get('@submit').click();

        // We're back home and there's a success toast
        cy.isAt(PATHS.home);
        cy.toastCheckAndClose('pwd-reset-email-sent');

        // Fetch the sent email: there must be exactly one
        cy.backendGetSentEmails()
            .should('have.length', 1)
            .its(0).then(m => {
                // Verify the email's headers
                expect(m.headers['Subject']).eq('Comentario: Reset Your Password');
                expect(m.headers['From'])   .eq('noreply@localhost');
                expect(m.headers['To'])     .eq(USERS.commenterOne.email);

                // Extract a password reset link from the body
                const matches = m.body.match(/http:\/\/localhost:8080\/en\/\?passwordResetToken=[^"]+/g);
                expect(matches).length(1);

                // Click the link
                cy.visit(matches[0]);
            });

        // We're at the password reset page
        cy.isAt(PATHS.auth.resetPassword);

        // Validate its elements
        cy.get('h1').should('have.text', 'Reset password');
        cy.get('#reset-password-form').as('rpForm')    .contains('label', 'New password');
        cy.get('#newPassword input')  .as('rpPassword').should('be.visible').and('be.enabled').and('have.value', '');
        cy.get('button[type=submit]') .as('rpSubmit')  .should('be.visible').and('be.enabled').and('have.text',  'Change password');

        // Click on the submit button and get error feedback for each field
        cy.get('@rpSubmit').click();
        cy.isAt(PATHS.auth.resetPassword);

        // Validate the password input
        cy.get('@rpPassword').verifyPasswordInputValidation({required: true, strong: true});

        // Submit new password
        cy.get('@rpPassword').setValue('NewPassword456').type('{enter}');

        // We're at the login page. Verify we can login with the new password
        cy.login(USERS.commenterOne.withPassword('NewPassword456'), {goTo: false});
    });

    it('ignores nonexistent user', () => {
        cy.get('@email').setValue('pretty@random');
        cy.get('@submit').click();

        // We're still back home and there's a success toast
        cy.isAt(PATHS.home);
        cy.toastCheckAndClose('pwd-reset-email-sent');

        // But there's no email
        cy.backendGetSentEmails().should('be.empty');
    });
});
