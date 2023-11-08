import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Comment Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).comments;

    const makeAliases = (hasItems: boolean, canLoadMore: boolean, hasFilterButtons: boolean) => {
        cy.get('app-comment-manager')                     .as('commentManager');
        cy.get('@commentManager').find('#sortByDropdown') .as('sortDropdown');
        cy.get('@commentManager').find('#filter-string')  .as('filterString').should('have.value', '');
        if (hasItems) {
            cy.get('@commentManager').find('#comment-list').as('commentList').should('be.visible');
            if (canLoadMore) {
                cy.get('@commentManager').contains('app-list-footer button', 'Load more').as('loadMore');
            }
        }
        if (hasFilterButtons) {
            cy.get('@commentManager').find('#comments-quick-filter')   .as('quickFilter')         .should('be.visible');
            cy.get('@quickFilter').contains('button', 'Undeleted')     .as('quickFilterUndeleted').should('be.visible');
            cy.get('@quickFilter').contains('button', 'All')           .as('quickFilterAll')      .should('be.visible');
            cy.get('@quickFilter').contains('button', 'Pending')       .as('quickFilterPending')  .should('be.visible');
            cy.get('@commentManager').find('#comments-filter-approved').as('filterApprovedBtn')   .should('be.visible');
            cy.get('@commentManager').find('#comments-filter-pending') .as('filterPendingBtn')    .should('be.visible');
            cy.get('@commentManager').find('#comments-filter-rejected').as('filterRejectedBtn')   .should('be.visible');
            cy.get('@commentManager').find('#comments-filter-deleted') .as('filterDeletedBtn')    .should('be.visible');
        } else {
            cy.get('@commentManager').find('#comments-quick-filter')   .should('not.exist');
            cy.get('@commentManager').find('#comments-filter-approved').should('not.exist');
            cy.get('@commentManager').find('#comments-filter-pending') .should('not.exist');
            cy.get('@commentManager').find('#comments-filter-rejected').should('not.exist');
            cy.get('@commentManager').find('#comments-filter-deleted') .should('not.exist');
        }
    };

    const filterOn = (s: string) => {
        cy.get('@filterString').setValue(s);
        // Wait for debounce
        cy.wait(600);
    };

    beforeEach(cy.backendReset);

    [
        {name: 'superuser',  user: USERS.root,         dest: 'back'},
        {name: 'owner',      user: USERS.ace,          dest: 'back'},
        {name: 'moderator',  user: USERS.king,         dest: 'back'},
        {name: 'commenter',  user: USERS.commenterTwo, dest: 'back'},
        {name: 'non-domain', user: USERS.commenterOne, dest: 'to Domain Manager', redir: PATHS.manage.domains},
    ]
        .forEach(test =>
            it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.commenterTwo));

    [
        {name: 'superuser', user: USERS.root},
        {name: 'owner',     user: USERS.ace},
        {name: 'moderator', user: USERS.king},
    ]
        .forEach(({name, user}) => context(`for ${name} user`, () => {

            beforeEach(() => {
                cy.loginViaApi(user, pagePath);
                makeAliases(true, true, true);
            });

            it('shows page list', () => {
                // Check heading
                cy.get('@commentManager').find('h1').should('have.text', 'Comments').and('be.visible');

                // Check page list
                cy.get('@commentList').verifyListFooter(25, true);
                cy.get('@loadMore').click();
                cy.get('@commentList').verifyListFooter(32, false);

                // TODO
            });

            it('filters comments', () => {

                const checkFilter = (approved: boolean, pending: boolean, rejected: boolean, deleted: boolean) => {
                    cy.get('@filterString')     .should('have.value', '');
                    cy.get('@filterApprovedBtn').invoke('prop', 'checked').should('eq', approved);
                    cy.get('@filterPendingBtn') .invoke('prop', 'checked').should('eq', pending);
                    cy.get('@filterRejectedBtn').invoke('prop', 'checked').should('eq', rejected);
                    cy.get('@filterDeletedBtn') .invoke('prop', 'checked').should('eq', deleted);
                };

                // Verify initial values
                checkFilter(true, true, true, false);

                // Test filtering by markdown source
                filterOn('css');
                cy.get('@commentList').verifyListFooter(4, false);
                cy.get('@commentList').texts('.comment-text')
                    .should('arrayMatch', [
                        'CSS override with crazy colours',
                        'CSS override child',
                        'CSS override disabled',
                        'CSS override disabled child',
                    ]);

                // Test filtering by commenter name
                filterOn('apTaiN aCe');
                cy.get('@commentList').verifyListFooter(16, false);

                // Test quick filters
                // -- All
                cy.get('@quickFilterAll').click();
                checkFilter(true, true, true, true);
                cy.get('@commentList').verifyListFooter(25, true);
                cy.get('@loadMore').click();
                cy.get('@commentList').verifyListFooter(33, false);
                // -- Pending
                cy.get('@quickFilterPending').click();
                checkFilter(false, true, false, false);
                cy.get('@commentList').verifyListFooter(1, false);
                // -- Undeleted
                cy.get('@quickFilterUndeleted').click();
                checkFilter(true, true, true, false);
                cy.get('@commentList').verifyListFooter(25, true);
                cy.get('@loadMore').click();
                cy.get('@commentList').verifyListFooter(32, false);

                // Enable Deleted, switch off Approved
                cy.get('@filterApprovedBtn').clickLabel();
                cy.get('@filterDeletedBtn') .clickLabel();
                checkFilter(false, true, true, true);
                cy.get('@commentList').verifyListFooter(3, false);

                // Switch off Pending
                cy.get('@filterPendingBtn') .clickLabel();
                checkFilter(false, false, true, true);
                cy.get('@commentList').verifyListFooter(2, false);
                cy.get('@commentList').texts('.comment-deleted').should('arrayMatch', ['(deleted)']);
                cy.get('@commentList').texts('.comment-text')   .should('arrayMatch', ['Rejected reply']);

                // Add filter string
                filterOn('ly');
                cy.get('@commentList').verifyListFooter(1, false);
                cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Rejected reply']);
            });

            it('allows to moderate/delete comments', () => {
                // TODO
            });
        }));

    it('shows page list for commenter user', () => {
        cy.loginViaApi(USERS.commenterTwo, pagePath);
        makeAliases(true, false, false);
        cy.get('@commentList').verifyListFooter(2, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', [
            'Captain, I\'ve plotted our course, and I suggest we take the eastern route. It\'ll take us a bit longer, but we\'ll avoid any bad weather.',
            'Children double, too',
        ]);

        // Test filtering
        filterOn('tOo');
        cy.get('@commentList').verifyListFooter(1, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Children double, too']);

        // Test deleting comment
        // TODO
    });

    it('shows page list for readonly user', () => {
        cy.loginViaApi(USERS.commenterThree, pagePath);
        makeAliases(true, false, false);
        cy.get('@commentList').verifyListFooter(1, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Auto-init child']);

        // Test deleting comment
        // TODO
    });
});
