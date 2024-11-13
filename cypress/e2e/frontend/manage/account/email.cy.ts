import { InstanceConfigKey, PATHS, TEST_PATHS, USERS } from '../../../../support/cy-utils';

context('Email update page', () => {

    const pagePath = PATHS.manage.account.email;

    const makeAliases = () => {
        cy.get('app-email-update')                       .as('emailUpdate');
        cy.get('@emailUpdate').find('#email-update-form').as('form');
        cy.get('@form').find('#email')                   .as('email')    .should('be.visible').and('be.enabled').and('have.value', '');
        cy.get('@form').find('#password input')          .as('password') .should('be.visible').and('be.enabled').and('have.value', '');
        cy.get('@form').contains('a', 'Cancel')          .as('btnCancel').should('be.visible');
        cy.get('@form').find('button[type=submit]')      .as('btnSubmit').should('be.visible').and('be.enabled');

        // No "Submitted" message
        verifySubmitted(false);
    };

    const verifySubmitted = (submitted: boolean) =>
        cy.get('@emailUpdate').find('#email-update-submitted').should(submitted ? 'be.visible' : 'not.exist');

    beforeEach(cy.backendReset);

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.commenterTwo));

    it('validates input', () => {
        cy.loginViaApi(USERS.commenterOne, pagePath);
        makeAliases();

        // Try to submit and get error feedback for each field
        cy.get('@btnSubmit').click();
        cy.isAt(pagePath);

        // Email
        cy.get('@email').verifyEmailInputValidation();

        // Password
        cy.get('@password').verifyPasswordInputValidation({required: true});
    });


    [
        {name: 'superuser', user: USERS.root},
        {name: 'owner',     user: USERS.ace},
        {name: 'moderator', user: USERS.king},
        {name: 'commenter', user: USERS.commenterTwo},
        {name: 'readonly',  user: USERS.commenterOne},
    ]
        .forEach(test =>
            context(`for ${test.name} user`, () => {

                it('redirects unauthenticated user to login and back', () => cy.verifyRedirectsAfterLogin(pagePath, test.user));

                context('when enabled in config', () => {

                    beforeEach(() => {
                        // Enable email change in dynamic config
                        cy.backendUpdateDynConfig({[InstanceConfigKey.authEmailUpdateEnabled]: true});

                        // Login as the user
                        cy.loginViaApi(test.user, pagePath);
                        makeAliases();
                    });

                    it('allows to change email when enabled in config', () => {
                        // Try to submit an email change
                        const newEmail = 'some@new.email';
                        cy.get('@email')    .setValue(newEmail);
                        cy.get('@password') .setValue(test.user.password);
                        cy.get('@btnSubmit').click();

                        // There's a "Submitted" message
                        verifySubmitted(true);

                        // Still on the same page
                        cy.isAt(pagePath);

                        // Fetch the sent email: there must be exactly one
                        cy.backendGetSentEmails()
                            .should('have.length', 1)
                            .its(0)
                            .then(m => {
                                // Verify the email's headers
                                expect(m.headers['Subject']).eq('Comentario: Confirm Updating Your Email');
                                expect(m.headers['From'])   .eq('noreply@localhost');
                                expect(m.headers['To'])     .eq(newEmail);

                                // Extract a confirmation link from the body
                                const matches = m.body.match(/http:\/\/localhost:8080\/api\/user\/email\/confirm\?access_token=[^"]+/g);
                                expect(matches).length(1);

                                // Confirm user's email change by following the link (unescape ampersands in the link)
                                cy.visit(matches[0].replaceAll('&amp;', '&'));
                            });

                        // We're back to the profile, and the email has changed now
                        cy.isAt(PATHS.manage.account.profile);
                        cy.get('app-profile #email').should('have.value', newEmail);

                        // Log in with the new email
                        cy.logout();
                        cy.login(test.user.withEmail(newEmail));
                        cy.isAt(PATHS.manage.dashboard);

                        // The old email doesn't work anymore
                        cy.logout();
                        cy.login(test.user, {succeeds: false, errToast: 'invalid-credentials'});

                        // Also log in to the test site
                        cy.testSiteLoginViaApi(test.user.withEmail(newEmail), TEST_PATHS.home);
                    });

                    it('allows to reuse the same email', () => {
                        // Try to submit the same email
                        cy.get('@email')    .setValue(test.user.email);
                        cy.get('@password') .setValue(test.user.password);
                        cy.get('@btnSubmit').click();

                        // We're immediately back to profile, skipping any confirmation
                        cy.isAt(PATHS.manage.account.profile);
                        cy.toastCheckAndClose('data-saved');
                    });

                    it('refuses to change email with invalid password', () => {
                        // Try to submit an email change using a wrong password
                        cy.get('@email')    .setValue('some@new.email');
                        cy.get('@password') .setValue('WRONG');
                        cy.get('@btnSubmit').click();

                        // Get a failure toast
                        cy.toastCheckAndClose('wrong-cur-password');
                        verifySubmitted(false);

                        // Still on the same page
                        cy.isAt(pagePath);
                    });

                    it('refuses to change email to existing value', () => {
                        // Try to submit an email change using an existing email
                        cy.get('@email')    .setValue(USERS.facebookUser.email);
                        cy.get('@password') .setValue(test.user.password);
                        cy.get('@btnSubmit').click();

                        // Get a failure toast
                        cy.toastCheckAndClose('email-already-exists');
                        verifySubmitted(false);

                        // Still on the same page
                        cy.isAt(pagePath);
                    });

                    it('refuses to change email when signature doesn\'t match the email', () => {
                        // Try to submit an email change
                        cy.get('@email')    .setValue('correct@new.email');
                        cy.get('@password') .setValue(test.user.password);
                        cy.get('@btnSubmit').click();

                        // There's a "Submitted" message
                        verifySubmitted(true);
                        cy.isAt(pagePath);

                        // Fetch the sent email: there must be exactly one
                        cy.backendGetSentEmails()
                            .should('have.length', 1)
                            // Extract a confirmation link from the email body
                            .its('0.body').invoke('match', /http:\/\/localhost:8080\/api\/user\/email\/confirm\?access_token=[^"]+/g)
                            .should('have.length', 1)
                            // Modify the email address in the link
                            .its(0).invoke('replaceAll', '&amp;', '&').invoke('replace', 'correct%40new.email', 'wrong%40new.email')
                            // "Open" the link
                            .then(url => cy.request({url, failOnStatusCode: false}))
                            // Expect a 400 Bad Request
                            .should(r => expect(r.status).eq(400))
                            .its('body').should('deep.equal', {
                                id:      'invalid-prop-value',
                                message: 'Value of the property is invalid',
                                details: 'HMAC signature doesn\'t check out',
                            });
                    });
                });

                it('disallows changing email when disabled in config', () => {
                    // Login as the user
                    cy.loginViaApi(test.user, pagePath);
                    makeAliases();

                    // Try to submit an email change
                    cy.get('@email')    .setValue('some@new.email');
                    cy.get('@password') .setValue(test.user.password);
                    cy.get('@btnSubmit').click();

                    // Get a failure toast
                    cy.toastCheckAndClose('email-update-forbidden');
                    verifySubmitted(false);

                    // Still on the same page
                    cy.isAt(pagePath);
                });
            }));

    it('redirects federated user to Profile', () => {
        // Try to visit the path as a federated user
        cy.loginFederatedViaApi(USERS.facebookUser.id, pagePath);

        // We're redirected to the Profile
        cy.isAt(PATHS.manage.account.profile);
    });
});
