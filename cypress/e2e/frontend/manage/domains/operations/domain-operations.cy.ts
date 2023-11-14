import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Operations page', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).operations;

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'readonly',   user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.ace));

    [
        {name: 'superuser', user: USERS.root},
        {name: 'owner',     user: USERS.ace},
    ]
        .forEach(({name, user}) => context(`for ${name} user`, () => {

            beforeEach(() => {
                cy.loginViaApi(user, pagePath);
                cy.get('app-domain-operations').as('domainOperations');

                // Check heading
                cy.get('@domainOperations').find('h1').should('have.text', 'Operations').and('be.visible');
                cy.get('@domainOperations').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);
            });

            it('navigates to Clone domain', () => {
                cy.get('@domainOperations').contains('button', 'Clone').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).clone);
            });

            it('allows to export domain', () => {
                // Trigger export
                cy.get('@domainOperations').contains('button', 'Export data').click();

                // Read the file name from the toast details
                cy.get('#toast-0 .toast-details').should('be.visible')
                    .invoke('text').should('match', /^\(localhost8000-.+\.json\.gz\)$/)
                    .then(details =>
                        // For now, check the file has been saved in the downloads directory
                        cy.readFile(Cypress.config('downloadsFolder') + '/' + details.substring(1, details.length - 1)));

                // There's a success toast
                cy.toastCheckAndClose('file-downloaded');
            });

            it('navigates to Domain import', () => {
                cy.get('@domainOperations').contains('button', 'Import data').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).import);
            });

            it('allows to (un)freeze domain', () => {
                // Freeze
                cy.get('@domainOperations').contains('button', 'Freeze').click();
                cy.confirmationDialog(/Are you sure you want to freeze the domain\?/).dlgButtonClick('Freeze');
                cy.toastCheckAndClose('data-saved');
                cy.get('@domainOperations').contains('button', 'Unfreeze').should('be.visible').and('be.enabled');

                // Go to domain properties and verify it's readonly
                cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
                cy.contains('#domain-detail-table dt', 'Read-only').next().should('have.text', '✔');

                // Go back to ops and unfreeze
                cy.visit(pagePath);
                cy.get('@domainOperations').contains('button', 'Unfreeze').click();
                cy.confirmationDialog(/Are you sure you want to unfreeze the domain\?/).dlgButtonClick('Unfreeze');
                cy.toastCheckAndClose('data-saved');
                cy.get('@domainOperations').contains('button', 'Freeze').should('be.visible').and('be.enabled');

                // Go to domain properties and verify it's not readonly
                cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
                cy.contains('#domain-detail-table dt', 'Read-only').next().should('have.text', '');
            });

            context('Danger zone', () => {

                beforeEach(() => {
                    // Expand the danger zone
                    cy.get('@domainOperations').find('#danger-zone-container').should('not.be.visible');
                    cy.get('@domainOperations').contains('button', 'Danger zone').click();
                    cy.get('@domainOperations').find('#danger-zone-container').should('be.visible');
                });

                it('allows to clear domain', () => {
                    cy.get('@domainOperations').contains('button', 'Clear').click();
                    cy.confirmationDialog(/Are you absolutely sure you want to remove all comments and pages from the domain/)
                        .dlgButtonClick('Clear domain');
                    cy.toastCheckAndClose('domain-cleared');

                    // Verify the numbers in stats
                    cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).stats);
                    cy.get('app-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 0}, {label: Comments, value: 0}]');
                });

                it('allows to delete domain', () => {
                    cy.get('@domainOperations').contains('button', 'Delete').click();
                    cy.confirmationDialog(/Are you absolutely sure you want to delete the domain/)
                        .dlgButtonClick('Delete domain');
                    cy.toastCheckAndClose('domain-deleted');

                    // We're back to the Domain Manager
                    cy.isAt(PATHS.manage.domains);

                    // Visit the test site and get an error message
                    cy.testSiteVisit(TEST_PATHS.home);
                    cy.contains('comentario-comments .comentario-error', 'This domain is not registered in Comentario');
                });
            });
        }));
});
