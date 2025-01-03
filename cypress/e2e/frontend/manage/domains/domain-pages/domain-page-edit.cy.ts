import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Edit page', () => {

    const pagesPath             = PATHS.manage.domains.id(DOMAINS.localhost.id).pages;
    const propsPagePathWritable = `${pagesPath}/0ebb8a1b-12f6-421e-b1bb-75867ac480c6`;
    const pagePathWritable      = `${propsPagePathWritable}/edit`;

    const pathComments = '/comments/';

    const makeAliases = (path: string, pathEditable: boolean, readOnly: boolean) => {
        cy.get('app-domain-page-edit').as('pageEdit');

        // Header
        cy.get('@pageEdit').find('h1').should('have.text', 'Edit domain page').and('be.visible');
        cy.get('@pageEdit').find('#domain-page-path').should('have.text', path).and('be.visible');

        // Form controls
        cy.get('@pageEdit').find('#path')    .as('path')    .should('have.value', path).and(pathEditable ? 'be.enabled' : 'be.disabled');
        cy.get('@pageEdit').find('#readOnly').as('readOnly').should(readOnly ? 'be.checked' : 'not.be.checked').and('be.enabled');

        // Buttons
        cy.get('@pageEdit').contains('.form-footer a', 'Cancel')    .as('btnCancel');
        cy.get('@pageEdit').find('.form-footer button[type=submit]').as('btnSubmit');
    };

    const checkIsReadonly = (path: string) => {
        cy.testSiteVisit(path);
        cy.get('comentario-comments .comentario-page-moderation-notice').should('have.text', 'This thread is locked. You cannot add new comments.');
        cy.get('comentario-comments .comentario-add-comment-host')      .should('not.exist');
    };

    const checkNotReadonly = (path: string) => {
        cy.testSiteVisit(path);
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
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'read-only',  user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePathWritable, test.user, test.redir)));
    });

    it('stays on the page after reload', () => {
        cy.verifyStayOnReload(pagePathWritable, USERS.ace);

        // Test cancelling: we return to page properties
        makeAliases(pathComments, true, false);
        cy.get('@btnCancel').click();
        cy.isAt(propsPagePathWritable);
        cy.noToast();
    });

    context('allows to edit page', () => {

        [
            {name: 'superuser', user: USERS.root},
            {name: 'owner',     user: USERS.ace},
        ]
            .forEach(test =>
                it(`by ${test.name}`, () => {
                    // Login
                    cy.loginViaApi(test.user, pagePathWritable);
                    const newPath = '/new-path';
                    makeAliases(pathComments, true, false);

                    // Edit the page and submit
                    cy.get('@path').setValue(newPath);
                    cy.get('@readOnly').click().should('be.checked');
                    cy.get('@btnSubmit').click();

                    // We're back to page props
                    cy.isAt(propsPagePathWritable);
                    cy.toastCheckAndClose('data-saved');
                    cy.get('app-domain-page-properties').as('pageProps')
                        .find('#domain-page-detail-table').as('pageDetails')
                        .dlTexts().should('matrixMatch', [
                            ['Domain',             DOMAINS.localhost.host],
                            ['Path',               newPath],
                            ['Title',              'Comments'],
                            ['Read-only',          '✔'],
                            ['Created',            REGEXES.datetime],
                            ['Number of comments', '0'],
                            ['Number of views',    '0'],
                        ]);

                    // Revert path so that we can check the comments
                    cy.get('@pageProps').contains('a', 'Edit').click();
                    makeAliases(newPath, true, true);
                    cy.get('@path').setValue(pathComments);
                    cy.get('@btnSubmit').click();
                    cy.toastCheckAndClose('data-saved');

                    // Login into a comment page and check the page is now readonly
                    checkIsReadonly(TEST_PATHS.comments);

                    // Edit the page again
                    cy.visit(propsPagePathWritable);
                    cy.get('@pageProps').contains('a', 'Edit').click();
                    makeAliases(pathComments, true, true);
                    cy.get('@readOnly').click().should('not.be.checked');
                    cy.get('@btnSubmit').click();

                    // Verify the updated properties
                    cy.isAt(propsPagePathWritable);
                    cy.toastCheckAndClose('data-saved');
                    cy.get('app-domain-page-properties').as('pageProps')
                        .find('#domain-page-detail-table').as('pageDetails')
                        .dlTexts().should('matrixMatch', [
                            ['Domain',             DOMAINS.localhost.host],
                            ['Path',               pathComments],
                            ['Title',              'Comments'],
                            ['Read-only',          ''],
                            ['Created',            REGEXES.datetime],
                            ['Number of comments', '0'],
                            ['Number of views',    '1'], // A view is registered
                        ]);

                    // Go to the test page again and verify it isn't readonly anymore
                    checkNotReadonly(TEST_PATHS.comments);
                }));

        it('by moderator', () => {
            // Login
            cy.loginViaApi(USERS.king, pagePathWritable);
            makeAliases(pathComments, false, false);

            // Make the page readonly and submit
            cy.get('@readOnly').click().should('be.checked');
            cy.get('@btnSubmit').click();

            // We're back to page props
            cy.isAt(propsPagePathWritable);
            cy.toastCheckAndClose('data-saved');
            cy.get('app-domain-page-properties').as('pageProps')
                .find('#domain-page-detail-table').as('pageDetails')
                .dlTexts().should('matrixMatch', [
                    ['Domain',    DOMAINS.localhost.host],
                    ['Path',      pathComments],
                    ['Title',     'Comments'],
                    ['Read-only', '✔'],
                ]);

            // Login into a comment page and check the page is now readonly
            checkIsReadonly(TEST_PATHS.comments);

            // Edit the page again
            cy.visit(propsPagePathWritable);
            cy.get('@pageProps').contains('a', 'Edit').click();
            makeAliases(pathComments, false, true);
            cy.get('@readOnly').click().should('not.be.checked');
            cy.get('@btnSubmit').click();

            // Verify the updated properties
            cy.isAt(propsPagePathWritable);
            cy.toastCheckAndClose('data-saved');
            cy.get('app-domain-page-properties').as('pageProps')
                .find('#domain-page-detail-table').as('pageDetails')
                .dlTexts().should('matrixMatch', [
                ['Domain',    DOMAINS.localhost.host],
                ['Path',      pathComments],
                ['Title',     'Comments'],
                ['Read-only', ''],
            ]);

            // Go to the test page again and verify it isn't readonly anymore
            checkNotReadonly(TEST_PATHS.comments);
        });
    });
});
