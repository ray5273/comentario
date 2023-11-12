import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Properties page', () => {

    const localhostPagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).pages + '/0ebb8a1b-12f6-421e-b1bb-75867ac480c7';
    const readonlyInfo = 'When a page is read-only, users cannot add comments to it.';

    const makeAliases = (hasReadOnly: boolean, hasUpdateTitle: boolean) => {
        cy.get('app-domain-page-properties').as('pageProps');

        // Header
        cy.get('@pageProps').find('h1').should('have.text', 'Domain page properties').and('be.visible');

        // Page details
        cy.get('@pageProps').find('#page-detail-table').as('pageDetails');
        if (hasReadOnly) {
            cy.get('@pageProps').find('#page-readonly-switch').as('pageReadonly')
                .should('be.visible').and('be.enabled').and('not.be.checked');
        }

        // Buttons
        if (hasUpdateTitle) {
            cy.get('@pageProps').contains('button', 'Update title').as('btnUpdateTitle').should('be.visible').and('be.enabled');
        } else {
            cy.get('@pageProps').contains('button', 'Update title').should('not.exist');
        }

        // Comments
        cy.get('@pageProps').find('app-comment-list').as('commentList').should('be.visible');
    };

    const checkReadOnly = () => {
        cy.get('@pageReadonly').clickLabel().should('be.checked');

        // Navigate to the test page and verify the comment thread is locked
        cy.testSiteVisit(TEST_PATHS.home);
        cy.get('comentario-comments .comentario-page-moderation-notice').should('have.text', 'This thread is locked. You cannot add new comments.');
        cy.get('comentario-comments .comentario-add-comment-host')      .should('not.exist');

        // Navigate back to the page properties and uncheck Read-only
        cy.visit(localhostPagePath);
        cy.get('app-domain-page-properties #page-readonly-switch').should('be.checked')
            .clickLabel().should('not.be.checked');

        // Go to the test page again and verify it isn't readonly anymore
        cy.testSiteVisit(TEST_PATHS.home);
        cy.get('comentario-comments .comentario-page-moderation-notice').should('not.exist');
        cy.get('comentario-comments .comentario-add-comment-host')      .should('exist');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'back'},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'back'},
            {name: 'read-only',  user: USERS.commenterThree, dest: 'back'},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(localhostPagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(localhostPagePath, USERS.commenterTwo));

    [
        {name: 'read-only', user: USERS.commenterThree, numComments: 0},
        {name: 'commenter', user: USERS.commenterTwo,   numComments: 1},
    ]
        .forEach(test =>
            it(`shows properties for ${test.name} user`, () => {
                cy.loginViaApi(test.user, localhostPagePath);
                makeAliases(false, false);
                cy.get('@pageDetails').dlTexts().should('matrixMatch', [
                    ['Domain',    DOMAINS.localhost.host],
                    ['Path',      '/'],
                    ['Title',     'Home'],
                    ['Read-only', readonlyInfo],
                ]);

                // Check number of comments in the Comments section
                cy.get('@commentList').verifyListFooter(test.numComments, false);
            }));


    it('shows properties for moderator user', () => {
        cy.loginViaApi(USERS.king, localhostPagePath);
        makeAliases(true, false);
        cy.get('@pageDetails').dlTexts().should('matrixMatch', [
            ['Domain',    DOMAINS.localhost.host],
            ['Path',      '/'],
            ['Title',     'Home'],
            ['Read-only', 'Read-only\n' + readonlyInfo],
        ]);

        // Check number of comments in the Comments section
        cy.get('@commentList').verifyListFooter(16, false);

        // Test the read-only switch
        checkReadOnly();
    });

    [
        {name: 'owner',     user: USERS.ace},
        {name: 'superuser', user: USERS.root},
    ]
        .forEach(test =>
            it(`shows properties for ${test.name} user`, () => {
                cy.loginViaApi(test.user, localhostPagePath);
                makeAliases(true, true);
                cy.get('@pageDetails').dlTexts().should('matrixMatch', [
                    ['Domain',             DOMAINS.localhost.host],
                    ['Path',               '/'],
                    ['Title',              'Home'],
                    ['Read-only',          'Read-only\n' + readonlyInfo],
                    ['Created',            REGEXES.datetime],
                    ['Number of comments', '17'],
                    ['Number of views',    '10'],
                ]);

                // Test Update title button
                cy.get('@btnUpdateTitle').click();
                cy.get('@pageDetails').contains('dt', 'Title').next().should('have.text', 'Home | Comentario Test');

                // Check number of comments in the Comments section
                cy.get('@commentList').verifyListFooter(16, false);

                // Test the read-only switch
                checkReadOnly();
            }));
});
