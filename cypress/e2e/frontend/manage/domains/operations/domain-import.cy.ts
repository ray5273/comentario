import { DOMAINS, PATHS, REGEXES, USERS } from '../../../../../support/cy-utils';

context('Domain Import page', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).import;

    const zeroResults = [
        ['Total users',          '0'],
        ['Added users',          '0'],
        ['Added domain users',   '0'],
        ['Total domain pages',   '0'],
        ['Added domain pages',   '0'],
        ['Total comments',       '0'],
        ['Imported comments',    '0'],
        ['Skipped comments',     '0'],
        ['Non-deleted comments', '0'],
    ];

    const makeAliases = () => {
        // Check heading
        cy.get('@domainImport').find('h1').should('have.text', 'Import data').and('be.visible');

        // Form controls
        cy.get('@domainImport').find('#source-comentario') .as('sourceComentario');
        cy.get('@domainImport').find('#source-disqus')     .as('sourceDisqus');
        cy.get('@domainImport').find('#source-wordpress')  .as('sourceWordPress');
        cy.get('@domainImport').find('#import-file-select').as('importFileSelect');

        // Buttons
        cy.get('@domainImport').contains('.form-footer a', 'Cancel')    .as('btnCancel');
        cy.get('@domainImport').find('.form-footer button[type=submit]').as('btnSubmit')
            .should('have.text', 'Import').and('be.enabled');

        // Results
        cy.get('@domainImport').find('#import-complete').should('not.exist');
    };

    const checkResults = (warning: string | null, expected: string[][]) => {
        cy.get('@domainImport').find('#import-complete').as('importComplete').should('be.visible');

        // Alert message
        if (warning) {
            cy.get('@importComplete').contains('.alert-warning', 'Import finished with a warning:')
                .as('importWarning').should('be.visible').and('contain', warning);
        } else {
            cy.get('@importComplete').contains('.alert-success', 'Import finished successfully.').should('be.visible');
        }

        // Result table
        cy.get('@importComplete').find('#importResultsTable').dlTexts().should('matrixMatch', expected);

        // Buttons
        cy.get('@importComplete').contains('a', 'Comments')         .as('btnComments')        .should('be.visible');
        cy.get('@importComplete').contains('a', 'Pages')            .as('btnPages')           .should('be.visible');
        cy.get('@importComplete').contains('a', 'Domain properties').as('btnDomainProperties').should('be.visible');
    };

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
                cy.get('app-domain-import').as('domainImport');
                makeAliases();
            });

            it('cancels', () => {
                cy.get('@btnCancel').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).operations);
                cy.noToast();
            });

            it('validates input', () => {
                // Verify initial state
                cy.get('@sourceComentario').should('have.class',     'selected');
                cy.get('@sourceDisqus')    .should('not.have.class', 'selected');
                cy.get('@sourceWordPress') .should('not.have.class', 'selected');
                cy.get('@importFileSelect').should('have.value', '');

                // Click on Import and get error feedback
                cy.get('@btnSubmit').click();
                cy.get('@importFileSelect').isInvalid('Please select a file.');
                cy.noToast();
                cy.isAt(pagePath);
            });

            context('Comentario import', () => {

                [
                    {file: 'comentario-ok-empty-v1.json.gz',  count: 0},
                    {file: 'comentario-ok-empty-v3.json.gz',  count: 0},
                    {file: 'comentario-ok-single-v1.json.gz', count: 1, remark: 'Imported from Commento/Comentario'},
                    {file: 'comentario-ok-single-v3.json.gz', count: 1, remark: 'Imported from Comentario V3'},
                ]
                    .forEach(({file, count, remark}) =>
                        it(`handles valid file ${file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${file}`);
                            cy.get('@btnSubmit').click();
                            const countStr = count.toString();
                            checkResults(null, [
                                ['Total users',          countStr],
                                ['Added users',          countStr],
                                ['Added domain users',   countStr],
                                ['Total domain pages',   countStr],
                                ['Added domain pages',   '0'],
                                ['Total comments',       countStr],
                                ['Imported comments',    countStr],
                                ['Skipped comments',     '0'],
                                ['Non-deleted comments', countStr],
                            ]);

                            // Click on Comments
                            cy.get('@btnComments').click();
                            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).comments);
                            cy.get('app-comment-list #filter-string').setValue('yay');
                            cy.get('app-comment-list').verifyListFooter(count, false);
                            if (count) {
                                cy.get('app-comment-list #comment-list').texts('app-user-link .user-name').should('arrayMatch', ['Bugs Bunny']);
                                cy.get('app-comment-list #comment-list').texts('.comment-text')           .should('arrayMatch', ['Yay, imported']);

                                // If it's a superuser, verify the imported user's properties
                                if (user.isSuper) {
                                    cy.sidebarClick('Users', PATHS.manage.users);
                                    cy.contains('app-user-manager #user-list a', 'Bugs Bunny').click();
                                    cy.get('app-user-properties #user-details .detail-table').dlTexts().should('matrixMatch', [
                                        ['ID',         REGEXES.uuid],
                                        ['Name',       'Bugs Bunny'],
                                        ['Email',      'bugsy@bigsy'],
                                        ['Language',   'en'],
                                        ['Remarks',    remark],
                                        ['Confirmed',  REGEXES.checkDatetime],
                                        ['Created',    REGEXES.datetime],
                                        ['Last login', '(never)'],
                                    ]);
                                }
                            }
                        }));

                [
                    {file: 'comentario-bad-format.json.gz',  warning: 'invalid character \'A\''},
                    {file: 'comentario-bad-version.json.gz', warning: 'invalid Comentario export version (481)'},
                ]
                    .forEach(({file, warning}) =>
                        it(`handles invalid file ${file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${file}`);
                            cy.get('@btnSubmit').click();
                            checkResults(warning, zeroResults);
                        }));
            });

            context('Disqus import', () => {

                beforeEach(() => cy.get('@sourceDisqus').click().should('have.class', 'selected'));


                [
                    {file: 'disqus-ok-empty.xml.gz',  count: 0},
                    {file: 'disqus-ok-single.xml.gz', count: 1, remark: 'Imported from Disqus'},
                ]
                    .forEach(({file, count, remark}) =>
                        it(`handles valid file ${file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${file}`);
                            cy.get('@btnSubmit').click();
                            const countStr = count.toString();
                            checkResults(null, [
                                ['Total users',          countStr],
                                ['Added users',          countStr],
                                ['Added domain users',   countStr],
                                ['Total domain pages',   countStr],
                                ['Added domain pages',   '0'],
                                ['Total comments',       countStr],
                                ['Imported comments',    countStr],
                                ['Skipped comments',     '0'],
                                ['Non-deleted comments', countStr],
                            ]);

                            // Click on Comments
                            cy.get('@btnComments').click();
                            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).comments);
                            cy.get('app-comment-list #filter-string').setValue('yay');
                            cy.get('app-comment-list').verifyListFooter(count, false);
                            if (count) {
                                cy.get('app-comment-list #comment-list').texts('app-user-link .user-name').should('arrayMatch', ['Bugs Bunny']);
                                cy.get('app-comment-list #comment-list').texts('.comment-text')           .should('arrayMatch', ['Yay, imported']);

                                // If it's a superuser, verify the imported user's properties
                                if (user.isSuper) {
                                    cy.sidebarClick('Users', PATHS.manage.users);
                                    cy.contains('app-user-manager #user-list a', 'Bugs Bunny').click();
                                    cy.get('app-user-properties #user-details .detail-table').dlTexts().should('matrixMatch', [
                                        ['ID',         REGEXES.uuid],
                                        ['Name',       'Bugs Bunny'],
                                        ['Email',      'bugsy@disqus-user'],
                                        ['Language',   'en'],
                                        ['Remarks',    remark],
                                        ['Created',    REGEXES.datetime],
                                        ['Last login', '(never)'],
                                    ]);
                                }
                            }
                        }));

                [
                    {file: 'disqus-bad-format.xml.gz', warning: 'XML syntax error'},
                ]
                    .forEach(({file, warning}) =>
                        it(`handles invalid file ${file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${file}`);
                            cy.get('@btnSubmit').click();
                            checkResults(warning, zeroResults);
                        }));
            });

            context('WordPress import', () => {

                beforeEach(() => cy.get('@sourceWordPress').click().should('have.class', 'selected'));


                [
                    {file: 'wordpress-ok-empty.zip',  count: 0},
                    {file: 'wordpress-ok-long.zip',   count: 1, remark: 'Imported from WordPress'},
                    {file: 'wordpress-ok-single.zip', count: 1, remark: 'Imported from WordPress'},
                ]
                    .forEach(({file, count, remark}) =>
                        it(`handles valid file ${file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${file}`);
                            cy.get('@btnSubmit').click();
                            const countStr = count.toString();
                            checkResults(null, [
                                ['Total users',          countStr],
                                ['Added users',          countStr],
                                ['Added domain users',   countStr],
                                ['Total domain pages',   countStr],
                                ['Added domain pages',   '0'],
                                ['Total comments',       countStr],
                                ['Imported comments',    countStr],
                                ['Skipped comments',     '0'],
                                ['Non-deleted comments', countStr],
                            ]);

                            // Click on Comments
                            cy.get('@btnComments').click();
                            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).comments);
                            cy.get('app-comment-list #filter-string').setValue('yay');
                            cy.get('app-comment-list').verifyListFooter(count, false);
                            if (count) {
                                cy.get('app-comment-list #comment-list').texts('app-user-link .user-name').should('arrayMatch', ['Luke Skywalker']);
                                cy.get('app-comment-list #comment-list').texts('.comment-text')           .should('arrayMatch', [/Yay, imported/]);

                                // If it's a superuser, verify the imported user's properties
                                if (user.isSuper) {
                                    cy.sidebarClick('Users', PATHS.manage.users);
                                    cy.contains('app-user-manager #user-list a', 'Luke Skywalker').click();
                                    cy.get('app-user-properties #user-details .detail-table').dlTexts().should('matrixMatch', [
                                        ['ID',          REGEXES.uuid],
                                        ['Name',        'Luke Skywalker'],
                                        ['Email',       'luke@skywalker.com'],
                                        ['Language',    'en'],
                                        ['Remarks',     remark],
                                        ['Website URL', 'https://skywalker.com/'],
                                        ['Confirmed',   REGEXES.checkDatetime],
                                        ['Created',     REGEXES.datetime],
                                        ['Last login',  '(never)'],
                                    ]);
                                }
                            }
                        }));

                [
                    {file: 'wordpress-bad-format.zip',    warning: 'XML syntax error'},
                    {file: 'wordpress-bad-no-files.zip',  toast: 'invalid-input-data', details: '(unsupported binary data format)'},
                    {file: 'wordpress-bad-two-files.zip', toast: 'invalid-input-data', details: '(decompression failed)'},
                ]
                    .forEach(test =>
                        it(`handles invalid file ${test.file}`, () => {
                            cy.get('@importFileSelect').selectFile(`cypress/fixtures/import/${test.file}`);
                            cy.get('@btnSubmit').click();
                            if (test.toast) {
                                cy.toastCheckAndClose(test.toast, test.details);
                            } else {
                                checkResults(test.warning, zeroResults);
                            }
                        }));
            });
        }));
});
