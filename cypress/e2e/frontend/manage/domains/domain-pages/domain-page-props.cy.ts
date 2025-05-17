import { DOMAIN_PAGES, DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Properties page', () => {

    const localhostPageId   = DOMAIN_PAGES.home.id;
    const localhostPagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).pages + `/${localhostPageId}`;

    const makeAliases = (hasEdit: boolean, hasUpdateTitle: boolean, hasMove: boolean, hasDelete: boolean) => {
        cy.get('app-domain-page-properties').as('pageProps');

        // Header
        cy.get('@pageProps').find('h1').should('have.text', 'Domain page properties').and('be.visible');

        // Page details
        cy.get('@pageProps').find('#domainPageDetailTable').as('pageDetails');

        // Buttons
        if (hasEdit) {
            cy.get('@pageProps').contains('a', 'Edit').as('btnEdit').should('be.visible');
        } else {
            cy.get('@pageProps').contains('a', 'Edit').should('not.exist');
        }
        if (hasUpdateTitle) {
            cy.get('@pageProps').contains('button', 'Update title').as('btnUpdateTitle').should('be.visible').and('be.enabled');
        } else {
            cy.get('@pageProps').contains('button', 'Update title').should('not.exist');
        }
        if (hasMove) {
            cy.get('@pageProps').contains('a', 'Move data').as('btnMoveData').should('be.visible');
        } else {
            cy.get('@pageProps').contains('a', 'Move data').should('not.exist');
        }
        if (hasDelete) {
            cy.get('@pageProps').contains('button', 'Delete').as('btnDelete').should('be.visible').and('be.enabled');
        } else {
            cy.get('@pageProps').contains('button', 'Delete').should('not.exist');
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
                makeAliases(test.editable, false, false, false);
                cy.get('@pageDetails').dlTexts().should('matrixMatch', [
                    ['Domain',           DOMAINS.localhost.host],
                    ['Path',             '/'],
                    ['Title',            'Home'],
                    ['Read-only',        ''],
                    ['Comment RSS feed', null], // Checked separately below
                ]);

                // Check number of comments in the Comments section
                cy.get('@commentList').verifyListFooter(test.numComments, false);

                // Verify the RSS link
                cy.get('@pageDetails').ddItem('Comment RSS feed').verifyRssLink(DOMAINS.localhost.id, test.user.id, localhostPageId);

                // Verify the edit button
                if (test.editable) {
                    cy.get('@btnEdit').click();
                    cy.isAt(localhostPagePath + '/edit');
                }
            }));

    [
        {
            name: 'owner',
            user: USERS.ace,
            metrics:
                // language=yaml
                `
                - {label: Domains,      sublabel: you own,          value: 1}
                - {label: Pages,        sublabel: you moderate,     value: 15}
                - {label: Pages,        sublabel: you commented on, value: 8}
                - {label: Domain users, sublabel: you manage,       value: 6}
                - {label: Comments,     sublabel: total,            value: 24}
                - {label: Comments,     sublabel: you authored,     value: 8}
                - {label: Commenters,   sublabel: total,            value: 7}
                `,
        },
        {
            name: 'superuser',
            user: USERS.root,
            metrics:
                // language=yaml
                `
                - {label: Users,        sublabel: total,        value: 16}
                - {label: Pages,        sublabel: you moderate, value: 19}
                - {label: Domain users, sublabel: you manage,   value: 9}
                - {label: Comments,     sublabel: total,        value: 25}
                - {label: Commenters,   sublabel: total,        value: 7}
                `,
        },
    ]
        .forEach(test =>
            context(`for ${test.name} user`, () => {

                beforeEach(() => {
                    cy.loginViaApi(test.user, localhostPagePath);
                    makeAliases(true, true, true, true);
                });

                it('shows page properties', () => {
                    cy.get('@pageDetails').dlTexts().should('matrixMatch', [
                        ['Domain',             DOMAINS.localhost.host],
                        ['Path',               '/'],
                        ['Title',              'Home'],
                        ['Read-only',          ''],
                        ['Created',            REGEXES.datetime],
                        ['Number of comments', '17'],
                        ['Number of views',    '10'],
                        ['Comment RSS feed',   null], // Checked separately below
                    ]);

                    // Verify the RSS link
                    cy.get('@pageDetails').ddItem('Comment RSS feed').verifyRssLink(DOMAINS.localhost.id, test.user.id, localhostPageId);

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
                });

                it('allows to edit page', () => {
                    // Click on Edit
                    cy.get('@btnEdit').click();
                    cy.isAt(localhostPagePath + '/edit');
                });

                it('allows to move page data', () => {
                    // Click on Move data
                    cy.get('@btnMoveData').click();
                    cy.isAt(localhostPagePath + '/move');
                });

                it('allows to delete a page', () => {
                    // Click on Delete
                    cy.get('@btnDelete').click();

                    // Confirmation dialog appears. Confirm deletion
                    cy.confirmationDialog(/Are you sure you want to delete this domain page\?/).as('dlg');
                    cy.get('@dlg').dlgButtonClick('Delete domain page');

                    // We're back to the Domain Page Manager and there's a success toast
                    cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).pages);
                    cy.toastCheckAndClose('domain-page-deleted');

                    // One fewer page on the list
                    cy.get('app-domain-page-manager').verifyListFooter(15, false);

                    // Check the Dashboard, too
                    cy.sidebarClick('Dashboard', PATHS.manage.dashboard);
                    cy.get('app-dashboard #dashboard-totals').metricCards().should('yamlMatch', test.metrics);
                });
            }));
});
