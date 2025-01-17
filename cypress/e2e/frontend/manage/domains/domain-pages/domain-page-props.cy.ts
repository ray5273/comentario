import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Properties page', () => {

    const localhostPagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).pages + '/0ebb8a1b-12f6-421e-b1bb-75867ac480c7';

    const makeAliases = (hasUpdateTitle: boolean, hasEdit: boolean) => {
        cy.get('app-domain-page-properties').as('pageProps');

        // Header
        cy.get('@pageProps').find('h1').should('have.text', 'Domain page properties').and('be.visible');

        // Page details
        cy.get('@pageProps').find('#domainPageDetailTable').as('pageDetails');

        // Buttons
        if (hasUpdateTitle) {
            cy.get('@pageProps').contains('button', 'Update title').as('btnUpdateTitle').should('be.visible').and('be.enabled');
        } else {
            cy.get('@pageProps').contains('button', 'Update title').should('not.exist');
        }
        if (hasEdit) {
            cy.get('@pageProps').contains('a', 'Edit').as('btnEdit').should('be.visible');
        } else {
            cy.get('@pageProps').contains('a', 'Edit').should('not.exist');
        }

        // Comments
        cy.get('@pageProps').find('app-comment-list').as('commentList').should('be.visible');
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
        {name: 'read-only', user: USERS.commenterThree, numComments:  0, editable: false},
        {name: 'commenter', user: USERS.commenterTwo,   numComments:  1, editable: false},
        {name: 'moderator', user: USERS.king,           numComments: 16, editable: true},
    ]
        .forEach(test =>
            it(`shows properties for ${test.name} user`, () => {
                cy.loginViaApi(test.user, localhostPagePath);
                makeAliases(test.editable, test.editable);
                cy.get('@pageDetails').dlTexts().should('matrixMatch', [
                    ['Domain',    DOMAINS.localhost.host],
                    ['Path',      '/'],
                    ['Title',     'Home'],
                    ['Read-only', ''],
                ]);

                // Check number of comments in the Comments section
                cy.get('@commentList').verifyListFooter(test.numComments, false);
            }));

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
                    ['Read-only',          ''],
                    ['Created',            REGEXES.datetime],
                    ['Number of comments', '17'],
                    ['Number of views',    '10'],
                ]);

                // Test Update title button
                cy.get('@btnUpdateTitle').click();
                cy.get('@pageDetails').ddItem('Title').should('have.text', 'Home | Comentario Test');

                // Check number of comments in the Comments section
                cy.get('@commentList').verifyListFooter(16, false);

                // Load the comment page and wait for Comentario to load
                cy.testSiteVisit(TEST_PATHS.home);
                cy.commentTree().should('have.length', 2);

                // Go back to verify the pageview has been registered
                cy.visit(localhostPagePath);
                cy.get('@pageDetails').ddItem('Number of views').should('have.text', '11');
            }));
});
