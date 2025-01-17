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
                cy.get('.top-toast .toast-details').should('be.visible')
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
                cy.get('#domainDetailTable').ddItem('Read-only').should('have.text', '✔');

                // Go back to ops and unfreeze
                cy.visit(pagePath);
                cy.get('@domainOperations').contains('button', 'Unfreeze').click();
                cy.confirmationDialog(/Are you sure you want to unfreeze the domain\?/).dlgButtonClick('Unfreeze');
                cy.toastCheckAndClose('data-saved');
                cy.get('@domainOperations').contains('button', 'Freeze').should('be.visible').and('be.enabled');

                // Go to domain properties and verify it's not readonly
                cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
                cy.get('#domainDetailTable').ddItem('Read-only').should('have.text', '');
            });

            context('Danger zone', () => {

                beforeEach(() => {
                    // Expand the danger zone
                    cy.get('@domainOperations').find('#danger-zone-container').should('not.be.visible');
                    cy.get('@domainOperations').contains('button', 'Danger zone').click();
                    cy.get('@domainOperations').find('#danger-zone-container').should('be.visible');
                });

                context('Purge domain operation', () => {

                    const makeDlgAliases = () => {
                        cy.confirmationDialog(/Permanently remove from domain/).as('dlg');
                        cy.get('@dlg').find('#purge-marked-deleted')      .as('delMarked').should('be.checked');
                        cy.get('@dlg').find('#purge-user-created-deleted').as('delNoUser').should('not.be.checked');
                        cy.get('@dlg').contains('button', 'Purge comments').as('btnPurge').should('be.enabled');
                    };

                    it('allows to purge deleted comments', () => {
                        cy.get('@domainOperations').contains('button', 'Purge').click();
                        makeDlgAliases();

                        // Check the confirmation dialog. The action button only gets enabled when at least one checkbox
                        // is checked
                        cy.get('@delMarked').clickLabel().should('not.be.checked');
                        cy.get('@btnPurge').should('be.disabled');
                        cy.get('@delNoUser').clickLabel().should('be.checked');
                        cy.get('@btnPurge').should('be.enabled');
                        cy.get('@delMarked').clickLabel().should('be.checked');
                        cy.get('@btnPurge').should('be.enabled');

                        // Purge marked as deleted only: expect 1 removed comment
                        cy.get('@delNoUser').clickLabel();
                        cy.get('@btnPurge').click();
                        // We can't rely on the number of deleted comments (reported in details) as it varies among databases
                        cy.toastCheckAndClose('domain-cleared');

                        // Verify no deleted comment
                        cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).comments);
                        cy.get('app-comment-manager #comments-filter-approved').clickLabel().should('not.be.checked');
                        cy.get('app-comment-manager #comments-filter-pending') .clickLabel().should('not.be.checked');
                        cy.get('app-comment-manager #comments-filter-rejected')             .should('be.checked');
                        cy.get('app-comment-manager #comments-filter-deleted') .clickLabel().should('be.checked');
                        // Only 1 rejected comment is shown
                        cy.get('app-comment-manager').verifyListFooter(1, false);
                    });

                    it('allows to purge comments by deleted users', () => {
                        // Login as superuser and delete user King
                        cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.king.id).props);
                        cy.contains('app-user-properties button', 'Delete user').click();
                        cy.confirmationDialog(/Are you sure you want to delete this user/).dlgButtonClick('Delete user');

                        // Go to domain operations
                        cy.loginViaApi(user, pagePath);
                        cy.contains('app-domain-operations button', 'Danger zone').click();
                        cy.contains('app-domain-operations button', 'Purge').click();
                        makeDlgAliases();

                        // Enable "Comments by deleted users" only
                        cy.get('@delMarked').clickLabel();
                        cy.get('@delNoUser').clickLabel();
                        cy.get('@btnPurge').click();
                        // We can't rely on the number of deleted comments (reported in details) as it varies among databases
                        cy.toastCheckAndClose('domain-cleared');

                        // Verify comments left
                        cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).comments);
                        cy.get('app-comment-manager').verifyListFooter(25, true);
                    });
                });

                it('allows to clear domain', () => {
                    cy.get('@domainOperations').contains('button', 'Clear').click();
                    cy.confirmationDialog(/Are you absolutely sure you want to remove all comments and pages from the domain/)
                        .dlgButtonClick('Clear domain');
                    cy.toastCheckAndClose('domain-cleared');

                    // Verify comment/view counters in domain props
                    cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
                    cy.get('#domainDetailTable').ddItem('Number of comments').should('have.text', '0');
                    cy.get('#domainDetailTable').ddItem('Number of views')   .should('have.text', '0');

                    // Verify the numbers in stats
                    cy.visit(PATHS.manage.domains.id(DOMAINS.localhost.id).stats);
                    cy.get('app-daily-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 0}, {label: Comments, value: 0}]');
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
