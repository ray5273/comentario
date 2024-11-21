import { DomainConfigKey, DOMAINS, InstanceConfigKey, PATHS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Signup dialog', () => {

    const signupWith = (creds: Cypress.CredentialsWithName, website?: string, lang?: string) => {
        cy.get('@email')   .setValue(creds.email);
        cy.get('@name')    .setValue(creds.name);
        cy.get('@password').setValue(creds.password);
        if (website) {
            cy.get('@website').setValue(website);
        }
        // Modify the language header in the outgoing request, if necessary
        if (lang) {
            cy.intercept({method: 'POST', url: 'api/embed/auth/signup'}, req => req.headers['accept-language'] = lang);
        }
        cy.get('@submit').click();
        cy.get('@signupDialog').should('not.exist');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(() => {
        cy.backendReset();
        cy.testSiteVisit(TEST_PATHS.comments);
        EmbedUtils.makeAliases({anonymous: true});

        // Click on "Sign in" and subsequently on Signup
        cy.get('@profileBar').contains('button', 'Sign in').click();
        cy.get('@root').contains('.comentario-dialog button', 'Sign up here').click();
        cy.get('@root').find('.comentario-dialog').as('signupDialog').should('be.visible');
        cy.get('@signupDialog').contains('.comentario-dialog-header', 'Create an account').should('be.visible');

        // Signup form
        cy.get('@signupDialog').find('input[name=email]')   .as('email')   .should('be.visible').and('have.value', '').and('be.focused');
        cy.get('@signupDialog').find('input[name=name]')    .as('name')    .should('be.visible').and('have.value', '');
        cy.get('@signupDialog').find('input[name=password]').as('password').should('be.visible').and('have.value', '');
        cy.get('@signupDialog').find('input[name=website]') .as('website') .should('be.visible').and('have.value', '');
        cy.get('@signupDialog').find('button[type=submit]') .as('submit')  .should('be.visible').and('be.enabled');
    });

    context('can be closed', () => {

        it('with "X"', () => {
            cy.get('@signupDialog').find('.comentario-dialog-btn-close').click();
            cy.get('@signupDialog').should('not.exist');
        });

        it('by clicking outside', () => {
            cy.get('@root').click('topLeft');
            cy.get('@signupDialog').should('not.exist');
        });

        it('with Esc', () => {
            cy.get('@email').type('{esc}');
            cy.get('@signupDialog').should('not.exist');
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

        // Name
        cy.get('@name')         .should('match', ':invalid')
            .type('a')          .should('match', ':invalid')
            .type('b')          .should('match', ':valid')
            .setValue('Guffy G').should('match', ':valid')
            .clear()            .should('match', ':invalid');

        // Password
        cy.get('@password')     .should('match', ':invalid')
            .type('p')          .should('match', ':invalid')
            .setValue('P')      .should('match', ':invalid')
            .type('Pass')       .should('match', ':invalid')
            .type('word')       .should('match', ':invalid')
            .type('!')          .should('match', ':valid')
            .type('{backspace}').should('match', ':invalid')
            .clear()            .should('match', ':invalid');

        // Website
        cy.get('@website')      .should('match', ':valid')
            .type('h')          .should('match', ':invalid')
            .type('ttp')        .should('match', ':invalid')
            .type('://')        .should('match', ':invalid')
            .type('a')          .should('match', ':valid')
            .type('{backspace}').should('match', ':invalid')
            .clear()            .should('match', ':valid');

        // Check consent
        cy.get('@signupDialog').contains('By signing up, you agree to our Terms of Service and Privacy Policy.').as('consent');
        cy.get('@consent').contains('a', 'Terms of Service')
            .should('be.anchor', /\/en\/legal\/tos\/$/, {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
        cy.get('@consent').contains('a', 'Privacy Policy')
            .should('be.anchor', /\/en\/legal\/privacy\/$/, {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
    });

    context('allows to sign up', () => {

        it('without confirmation', () => {
            // Fill out and submit the form
            signupWith({email: 'darth.vader@death.star', name: 'Anakin Skywalker', password: 'Us3Th3Force'});

            // The user is immediately logged in
            cy.testSiteIsLoggedIn('Anakin Skywalker');

            // No email sent
            cy.backendGetSentEmails().should('be.empty');
        });

        it('without confirmation, with custom language', () => {
            // Fill out and submit the form
            const user = {email: 'joe.vader@light.star', name: 'Joe', password: 'Passw0rd'};
            signupWith(user, 'https://jedi.org', 'nl-BE;q=0.9,nl;q=0.8,en-GB;q=0.7,en;q=0.6');

            // The user is immediately logged in
            cy.testSiteIsLoggedIn('Joe');

            // Check the language in the profile
            cy.loginViaApi(user, PATHS.manage.account.profile);
            cy.get('app-profile #lang').should('have.value', 'nl-BE');
        });

        it('with confirmation', () => {
            // Enable commenter email confirmation
            cy.backendUpdateDynConfig({[InstanceConfigKey.authSignupConfirmCommenter]: true});

            // Fill out and submit the form
            const user = {email: 'obiwan@jedi.org', name: 'Obi-Wan Kenobi', password: '1wannaSandwich'};
            signupWith(user, 'https://jedi.org/lightsabers-for-sale');

            // There's a success message
            cy.testSiteCheckMessage('Account is successfully created', true);

            // We can't log in yet
            cy.testSiteLogin(user, {succeeds: false, errMessage: 'User\'s email address is not confirmed yet'});

            // Fetch the sent email: there must be exactly one
            cy.backendGetSentEmails()
                .should('have.length', 1)
                .its(0).then(m => {
                    // Verify the email's headers
                    expect(m.headers['Subject']).eq('Comentario: Confirm Your Email');
                    expect(m.headers['From'])   .eq('noreply@localhost');
                    expect(m.headers['To'])     .eq(user.email);

                    // Extract a confirmation link from the body
                    const matches = m.body.match(/http:\/\/localhost:8080\/api\/auth\/confirm\?access_token=[^"]+/g);
                    expect(matches).length(1);

                    // Confirm user's email address by following the link
                    cy.visit(matches[0]);
                });

            // We're back to the same page
            cy.isAt(TEST_PATHS.comments, {testSite: true});

            // Try to login, this time successfully
            cy.testSiteLogin(user);
        });

        it('with confirmation and custom language', () => {
            // Enable commenter email confirmation
            cy.backendUpdateDynConfig({[InstanceConfigKey.authSignupConfirmCommenter]: true});

            // Fill out and submit the form
            const user = {email: 'obitwo@jedi.org', name: 'Obi-Two Kenobi', password: 'Passw0rd'};
            signupWith(user, undefined, 'en;q=0.3,nl;q=0.8,nl-NL;q=0.9');

            // There's a success message
            cy.testSiteCheckMessage('Account is successfully created', true);

            // Fetch the sent email: there must be exactly one, and it's in Dutch
            cy.backendGetSentEmails()
                .should('have.length', 1)
                .its(0).then(m => {
                    // Verify the email's headers
                    expect(m.headers['Subject']).eq('Comentario: Bevestig je e-mailadres');
                    expect(m.headers['From'])   .eq('noreply@localhost');
                    expect(m.headers['To'])     .eq(user.email);

                    // Verify the body is also in Dutch
                    expect(m.body).contains('Je hebt onlangs een nieuw Comentario-account geregistreerd met dit e-mailadres.');
                    expect(m.body).contains('Klik op de knop hieronder om je registratie te voltooien.');

                    // Extract a confirmation link from the body
                    const matches = m.body.match(/http:\/\/localhost:8080\/api\/auth\/confirm\?access_token=[^"]+/g);
                    expect(matches).length(1);

                    // Confirm user's email address by following the link
                    cy.visit(matches[0]);
                });

            // We're back to the same page
            cy.isAt(TEST_PATHS.comments, {testSite: true});

            // Verify login is possible
            cy.testSiteLogin(user);

            // Check the language in the profile
            cy.loginViaApi(user, PATHS.manage.account.profile);
            cy.get('app-profile #lang').should('have.value', 'nl-NL');
        });
    });

    context('refuses to register', () => {

        beforeEach(() => {
            // Disable Cypress' rejected promise handling
            Cypress.on('uncaught:exception', () => false);
        });

        it('locally when signups are disabled', () => {
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.localSignupEnabled]: false});
            signupWith({...USERS.ace, password: 'Passw0rd'});
            cy.testSiteCheckMessage('New signups are forbidden');
        });

        it('with an already used email', () => {
            signupWith({...USERS.ace, password: 'Passw0rd'});
            cy.testSiteCheckMessage('This email address is already registered');
        });

        it('with a federated user\'s email', () => {
            signupWith({...USERS.facebookUser, password: 'Passw0rd'});
            cy.testSiteCheckMessage('There\'s already a registered account with this email. Please login via the correct federated identity provider instead (facebook)');
        });

        it('with invalid website URL', () => {
            signupWith({email: 'peppa@piggy.com', name: 'Peppa Pig', password: 'Passw0rd'}, 'ftp://peppapig.com');
            cy.testSiteCheckMessage('body.websiteUrl in body must be of type uri');
        });
    });
});
