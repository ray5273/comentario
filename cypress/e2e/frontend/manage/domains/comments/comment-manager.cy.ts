import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Comment Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).comments;

    /** Localhost comments, in reverse chronological order. */
    const comments = [
        {author: USERS.commenterTwo.name,   score:    4, text: 'Captain, I\'ve plotted our course, and I suggest we take the eastern route. It\'ll take us a bit longer, but we\'ll avoid any bad weather.'},
        {author: USERS.queen.name,          score:    6, text: 'I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣'},
        {author: USERS.jack.name,           score:   -2, text: 'Captain, one more thing. We\'ll be passing through some pirate-infested waters soon. Should we be concerned?'},
        {author: USERS.queen.name,          score:    4, text: 'We\'ve got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It\'ll help us avoid scurvy.'},
        {author: USERS.ace.name,            score:    2, text: 'Alright, engineer. Let\'s schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.'},
        {author: USERS.ace.name,            score:    0, text: 'Let\'s hope it doesn\'t come to that, cook. But it\'s good to know we have you on our side.\n\nAlright, everyone, let\'s get to work. We\'ve got a long journey ahead of us!'},
        {author: USERS.ace.name,            score:    0, text: 'Good point, navigator. I\'ll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.'},
        {author: USERS.king.name,           score:    0, text: 'Captain, I\'ve been noticing some strange vibrations in the engine room. It\'s nothing too serious, but I\'d like to take a look at it just to be safe.'},
        {author: USERS.ace.name,            score:    0, text: 'Now, is there anything else anyone wants to bring up?'},
        {author: USERS.ace.name,            score:    0, text: 'Absolutely, cook. I\'ll make a note of it.'},
        {author: USERS.ace.name,            score:    0, text: 'What about supplies, cook?'},
        {author: USERS.ace.name,            score:    0, text: 'Good work, navigator. That\'s what I was thinking too.'},
        {author: USERS.king.name,           score:    0, text: 'Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.'},
        {author: USERS.ace.name,            score:    0, text: 'First off, we need to make sure the engine is in good working order. Any issues we need to address, engineer?'},
        {author: USERS.king.name,           score:    0, text: 'What\'s on the agenda, captain?'},
        {author: USERS.commenterTwo.name,   score:    0, text: '6th level comment'},
        {author: USERS.anonymous.name,      score:    0, text: '5th level comment'},
        {author: USERS.jack.name,           score:    0, text: '4th level comment'},
        {author: USERS.queen.name,          score:    0, text: '3rd level comment'},
        {author: USERS.king.name,           score:    0, text: '2nd level comment'},
        {author: USERS.ace.name,            score:    0, text: 'Root level comment'},
        {author: USERS.anonymous.name,      score:    0, text: 'Path override child'},
        {author: USERS.ace.name,            score:    0, text: 'The path of this page is set to /different-page/123'},
        {author: USERS.anonymous.name,      score:    0, text: 'CSS override disabled child'},
        {author: USERS.ace.name,            score:    0, text: 'CSS override disabled'},
        {author: USERS.anonymous.name,      score:    0, text: 'CSS override child'},
        {author: USERS.ace.name,            score:    0, text: 'CSS override with crazy colours'},
        {author: USERS.anonymous.name,      score:    0, text: 'No root font child'},
        {author: USERS.ace.name,            score:    0, text: 'No root font for comments'},
        {author: USERS.commenterThree.name, score:    0, text: 'Auto-init child'},
        {author: USERS.ace.name,            score:    3, text: 'Auto-init OK'},
        {author: USERS.anonymous.name,      score:    0, text: ''},
        {author: USERS.anonymous.name,      score:    0, text: 'Rejected reply'},
        {author: USERS.anonymous.name,      score:    0, text: 'Phishy reply'},
        {author: USERS.ace.name,            score:   65, text: 'I am dynamic 🚀'},
        {author: USERS.commenterTwo.name,   score:    2, text: 'Children double, too'},
        {author: USERS.ace.name,            score:    1, text: 'Doubling down'},
        {author: USERS.anonymous.name,      score:    0, text: 'This is a root, sticky comment'},
        {author: USERS.ace.name,            score:    8, text: 'Alright crew, let\'s gather around for a quick meeting. We\'ve got a long voyage ahead of us, and I want to make sure everyone is on the same page.'},
        {author: 'Luke',                    score:    0, text: 'We need to talk'},
        {author: 'Darth Vader',             score: -100, text: 'Hello from the Dark Side'},
    ];
    const undeletedComments = comments.filter(c => c.text);

    const makeAliases = (hasItems: boolean, canLoadMore: boolean, hasFilterButtons: boolean) => {
        cy.get('app-comment-manager').as('commentManager');

        // Check heading
        cy.get('@commentManager').find('h1').should('have.text', 'Comments').and('be.visible');
        cy.get('@commentManager').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

        // Filter
        cy.get('@commentManager').find('#sortByDropdown') .as('sortDropdown');
        cy.get('@commentManager').find('#filter-string')  .as('filterString').should('have.value', '');
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

        // Comments
        cy.get('@commentManager').find('#comment-list').as('commentList')
            .find('.list-group-item').should(hasItems ? 'have.length.above' : 'have.length', 0);
        if (canLoadMore) {
            cy.get('@commentManager').contains('app-list-footer button', 'Load more').as('loadMore');
        }
    };

    const filterOn = (s: string) => {
        cy.get('@filterString').setValue(s);
        // Wait for debounce
        cy.wait(600);
    };

    /** Run the specified comment action on a comment at the specified index. */
    const commentAction = (action: 'Approve' | 'Reject' | 'Delete', index: number) => {
        cy.get('@commentList').find('.list-group-item').eq(index).find(`button[title="${action}"]`).click();
        // Delete action shows a confirmation dialog
        if (action === 'Delete') {
            cy.confirmationDialog('Are you sure you want to delete this comment?').dlgButtonClick('Delete comment');
        }
    };

    /** Check the specified comment flags against a boolean array. */
    const checkFlags = (flag: 'deleted' | 'pending' | 'rejected', expected: boolean[]) =>
        cy.get('@commentList').find('.list-group-item').hasClass(`list-group-item-${flag}`).should('arrayMatch', expected);

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'back'},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'back'},
            {name: 'readonly',   user: USERS.commenterThree, dest: 'back'},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
    });

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

            it('shows comment list', () => {
                // Check page list: initial sorting is Created DESC
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@commentList').texts('app-user-link .user-name').should('arrayMatch', undeletedComments.slice(0, 25).map(c => c.author));
                cy.get('@commentList').texts('.comment-text')           .should('arrayMatch', undeletedComments.slice(0, 25).map(c => c.text));
                // Add more
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(40, false);
                cy.get('@commentList').texts('app-user-link .user-name').should('arrayMatch', undeletedComments.map(c => c.author));
                cy.get('@commentList').texts('.comment-text')           .should('arrayMatch', undeletedComments.map(c => c.text));

                // Sort by Created ASC
                cy.get('@commentManager').changeListSort('Created', 'desc', 'Created', 'asc');
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@commentList').texts('app-user-link .user-name').should('arrayMatch', undeletedComments.slice(15, 40).reverse().map(c => c.author));
                cy.get('@commentList').texts('.comment-text')           .should('arrayMatch', undeletedComments.slice(15, 40).reverse().map(c => c.text));
                // Add more
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(40, false);
                cy.get('@commentList').texts('app-user-link .user-name').should('arrayMatch', undeletedComments.slice().reverse().map(c => c.author));
                cy.get('@commentList').texts('.comment-text')           .should('arrayMatch', undeletedComments.slice().reverse().map(c => c.text));

                // Sort by Score ASC
                const commentsScore = undeletedComments.slice().sort((a, b) => a.score - b.score).map(c => c.score.toString());
                cy.get('@commentManager').changeListSort('Created', 'asc', 'Score', 'asc');
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@commentList').texts('.comment-score').should('arrayMatch', commentsScore.slice(0, 25));
                // Add more
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(40, false);
                cy.get('@commentList').texts('.comment-score').should('arrayMatch', commentsScore.slice());

                // Sort by Score DESC
                cy.get('@commentManager').changeListSort('Score', 'asc', 'Score', 'desc');
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@commentList').texts('.comment-score').should('arrayMatch', commentsScore.slice(15, 40).reverse());
                // Add more
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(40, false);
                cy.get('@commentList').texts('.comment-score').should('arrayMatch', commentsScore.slice().reverse());

                // Click on a comment body and land in comment properties
                cy.get('@commentList').find('.comment-body').eq(7).click();
                cy.isAt(pagePath + '/f08639de-ab7b-4032-bdce-a021bf07e596');
            });

            it('retains chosen sort order', () =>
                cy.checkListSortRetained(
                    '@commentManager',
                    [
                        {sort: 'Created', order: 'desc'},
                        {sort: 'Created', order: 'asc'},
                        {sort: 'Score',   order: 'asc'},
                        {sort: 'Score',   order: 'desc'},
                        {sort: 'Created', order: 'asc'},
                    ]));

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
                cy.get('@commentManager').verifyListFooter(4, false);
                cy.get('@commentList').texts('.comment-text')
                    .should('arrayMatch', [
                        'CSS override disabled child',
                        'CSS override disabled',
                        'CSS override child',
                        'CSS override with crazy colours',
                    ]);

                // Test filtering by commenter name
                filterOn('apTaiN aCe');
                cy.get('@commentManager').verifyListFooter(17, false);

                // Test quick filters
                // -- All
                cy.get('@quickFilterAll').click();
                checkFilter(true, true, true, true);
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(41, false);
                // -- Pending
                cy.get('@quickFilterPending').click();
                checkFilter(false, true, false, false);
                cy.get('@commentManager').verifyListFooter(1, false);
                // -- Undeleted
                cy.get('@quickFilterUndeleted').click();
                checkFilter(true, true, true, false);
                cy.get('@commentManager').verifyListFooter(25, true);
                cy.get('@loadMore').click();
                cy.get('@commentManager').verifyListFooter(40, false);

                // Enable Deleted, switch off Approved
                cy.get('@filterApprovedBtn').clickLabel();
                cy.get('@filterDeletedBtn') .clickLabel();
                checkFilter(false, true, true, true);
                cy.get('@commentManager').verifyListFooter(3, false);

                // Switch off Pending
                cy.get('@filterPendingBtn') .clickLabel();
                checkFilter(false, false, true, true);
                cy.get('@commentManager').verifyListFooter(2, false);
                cy.get('@commentList').texts('.comment-deleted').should('arrayMatch', ['(deleted)']);
                cy.get('@commentList').texts('.comment-text')   .should('arrayMatch', ['Rejected reply']);

                // Add filter string
                filterOn('ly');
                cy.get('@commentManager').verifyListFooter(1, false);
                cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Rejected reply']);
            });

            it('allows to moderate comments', () => {
                // All comments are initially approved
                const false25 = Array(25).fill(false);
                checkFlags('deleted',  false25);
                checkFlags('pending',  false25);
                checkFlags('rejected', false25);

                // Unapprove a comment
                commentAction('Approve', 0);
                checkFlags('deleted',  false25);
                checkFlags('pending',  [true, ...false25.slice(1)]);
                checkFlags('rejected', false25);

                // Reject another comment
                commentAction('Reject', 1);
                checkFlags('deleted',  false25);
                checkFlags('pending',  [true, ...false25.slice(1)]);
                checkFlags('rejected', [false, true, ...false25.slice(2)]);

                // Show pending only
                cy.get('@quickFilterPending').click();
                cy.get('@commentManager').verifyListFooter(2, false);
                checkFlags('deleted',  [false, false]);
                checkFlags('pending',  [true, true]);
                checkFlags('rejected', [false, false]);
                cy.get('@commentList').texts('.comment-pending-reason').should('arrayMatch', [
                    'Pending moderation' + `Set to pending by ${user.name} <${user.email}>`,
                    'Pending moderation' + 'Something is fishy here',
                ]);

                // Approve the first comment
                commentAction('Approve', 0);
                checkFlags('deleted',  [false, false]);
                checkFlags('pending',  [false, true]);
                checkFlags('rejected', [false, false]);
            });

            it('allows to delete comments', () => {
                // Test deletion when deleted are hidden
                commentAction('Delete', 14);
                cy.get('@commentManager').verifyListFooter(24, true);
                checkFlags('deleted', Array(24).fill(false));

                // Show deleted
                cy.get('@filterDeletedBtn').clickLabel();
                cy.get('@commentManager').verifyListFooter(25, true);
                checkFlags('deleted', [...Array(14).fill(false), true, ...Array(10).fill(false)]);

                // Delete another comment: item doesn't disappear but is rather marked as deleted
                commentAction('Delete', 3);
                cy.get('@commentManager').verifyListFooter(25, true);
                checkFlags('deleted', [false, false, false, true, ...Array(10).fill(false), true, ...Array(10).fill(false)]);
            });
        }));

    it('shows comment list for commenter user', () => {
        cy.loginViaApi(USERS.commenterTwo, pagePath);
        makeAliases(true, false, false);
        cy.get('@commentManager').verifyListFooter(3, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', [
            'Captain, I\'ve plotted our course, and I suggest we take the eastern route. It\'ll take us a bit longer, but we\'ll avoid any bad weather.',
            '6th level comment',
            'Children double, too',
        ]);

        // Test filtering
        filterOn('tOo');
        cy.get('@commentManager').verifyListFooter(1, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Children double, too']);

        // Test deleting comment
        commentAction('Delete', 0);
        cy.get('@commentManager').verifyListFooter(1, false);
        checkFlags('deleted', [true]);

        // Click on comment body and land in comment properties
        cy.get('@commentList').find('.comment-body').click();
        cy.isAt(pagePath + '/f08639de-ab7b-4032-bdce-a021bf07e596');
    });

    it('shows comment list for readonly user', () => {
        cy.loginViaApi(USERS.commenterThree, pagePath);
        makeAliases(true, false, false);
        cy.get('@commentManager').verifyListFooter(1, false);
        cy.get('@commentList').texts('.comment-text').should('arrayMatch', ['Auto-init child']);

        // Test deleting comment
        commentAction('Delete', 0);
        cy.get('@commentManager').verifyListFooter(1, false);
        checkFlags('deleted', [true]);

        // Click on comment body and land in comment properties
        cy.get('@commentList').find('.comment-body').click();
        cy.isAt(pagePath + '/cbbaf220-6cc4-4160-af43-9fdd6f2ec6fe');
    });
});
