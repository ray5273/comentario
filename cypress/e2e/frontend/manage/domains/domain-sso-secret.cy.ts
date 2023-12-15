import { DOMAINS, PATHS, TEST_PATHS, USERS, Util } from '../../../../support/cy-utils';

context('Domain SSO Secret page', () => {

    beforeEach(cy.backendReset);

    const localhostPath = PATHS.manage.domains.id(DOMAINS.localhost.id).sso;

    const makeAliases = () => {
        cy.get('app-domain-sso-secret')                               .as('ssoSecret');
        cy.get('@ssoSecret').find('#sso-secret-value')                .as('value');
        cy.get('@ssoSecret').contains('button', 'Copy')               .as('btnCopy');
        cy.get('@ssoSecret').contains('button', 'Generate new secret').as('btnGenerate');
    };

    const testGenerate = () => {
        // Click on "Generate": a new value appears
        cy.get('@btnGenerate').click();
        cy.get('@value').invoke('text').should('match', /^[a-f\d]{4}••••••••••$/);
        cy.get('@ssoSecret').find('#sso-secret-once-warning').should('be.visible').and('contain.text', 'this secret is only available for you this time');
        cy.get('@ssoSecret').find('#sso-secret-regen-warning').should('not.exist');

        // Test copying
        cy.get('@btnCopy').should('be.enabled').click();
        cy.get('@writeText').should('be.calledWithMatch', /^[a-f\d]{64}$/);
    };

    it('stays on the page after reload', () => cy.verifyStayOnReload(localhostPath, USERS.ace));

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,         dest: 'back'},
            {name: 'owner',      user: USERS.ace,          dest: 'back'},
            {name: 'moderator',  user: USERS.king,         dest: 'to Domain Properties', redir: PATHS.manage.domains.id(DOMAINS.localhost.id).props},
            {name: 'commenter',  user: USERS.commenterTwo, dest: 'to Domain Properties', redir: PATHS.manage.domains.id(DOMAINS.localhost.id).props},
            {name: 'non-domain', user: USERS.commenterOne, dest: 'to Domain Manager',    redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(localhostPath, test.user, test.redir)));
    });

    it('allows to generate secret', () => {
        cy.loginViaApi(USERS.root, PATHS.manage.domains.id(DOMAINS.health.id).sso, Util.stubWriteText);
        makeAliases();

        // Check page content
        cy.get('@ssoSecret').find('h1').should('have.text', 'SSO secret');
        cy.get('@value')               .should('be.visible').and('have.text', '(not generated)');
        cy.get('@btnCopy')             .should('be.visible').and('be.disabled');
        cy.get('@btnGenerate')         .should('be.visible').and('be.enabled');
        cy.get('@ssoSecret').find('#sso-secret-once-warning') .should('not.exist');
        cy.get('@ssoSecret').find('#sso-secret-regen-warning').should('not.exist');

        // Check generating secret
        testGenerate();
    });

    it('allows to regenerate secret', () => {
        cy.loginViaApi(USERS.root, localhostPath, Util.stubWriteText);
        makeAliases();

        // Check page content
        cy.get('@ssoSecret').find('h1').should('have.text', 'SSO secret');
        cy.get('@value')               .should('be.visible').and('have.text', '(hidden)');
        cy.get('@btnCopy')             .should('be.visible').and('be.disabled');
        cy.get('@btnGenerate')         .should('be.visible').and('be.enabled');
        cy.get('@ssoSecret').find('#sso-secret-once-warning') .should('not.exist');
        cy.get('@ssoSecret').find('#sso-secret-regen-warning').should('be.visible').and('have.text', 'Regenerating the secret will require reconfiguring your SSO provider.');

        // Check regenerating secret
        testGenerate();

        // Verify SSO login works
        cy.logout();
        cy.testSiteVisit(TEST_PATHS.home);
        cy.testSiteSsoLogin();
    });
});
