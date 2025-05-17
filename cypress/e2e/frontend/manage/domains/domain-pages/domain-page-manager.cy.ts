import { DOMAIN_PAGES, DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).pages;

    /** Pages, ordered by creation date. */
    const pages = [
        {path: TEST_PATHS.comments,                   title: 'Comments',                                 cntComments: 1,  cntViews: 0},
        {path: TEST_PATHS.home,                       title: 'Home',                                     cntComments: 17, cntViews: 10},
        {path: TEST_PATHS.noComment,                  title: 'No comment',                               cntComments: 0,  cntViews: 2},
        {path: TEST_PATHS.readonly,                   title: 'Readonly page',                            cntComments: 0,  cntViews: 42},
        {path: TEST_PATHS.looooong,                   title: '',                                         cntComments: 0,  cntViews: 0},
        {path: TEST_PATHS.double,                     title: 'Double Comentario',                        cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.dynamic,                    title: 'Dynamic insertion',                        cntComments: 1,  cntViews: 4},
        {path: TEST_PATHS.darkMode,                   title: 'Dark mode',                                cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.autoInit,              title: 'Attribute: auto-init=false',               cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.autoNonInteractiveSso, title: 'Attribute: auto-non-interactive-sso=true', cntComments: 0,  cntViews: 23},
        {path: TEST_PATHS.attr.noFonts,               title: 'Attribute: no-fonts=true',                 cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.cssOverride,           title: 'Attribute: css-override',                  cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.cssOverrideFalse,      title: 'Attribute: css-override=false',            cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.pageIdAlias,           title: 'Attribute: page-id',                       cntComments: 2,  cntViews: 0},
        {path: TEST_PATHS.attr.noLiveUpdate,          title: 'Attribute: live-update=false',             cntComments: 0,  cntViews: 0},
        {path: TEST_PATHS.attr.maxLevel,              title: 'Attribute: max-level=2',                   cntComments: 6,  cntViews: 0},
    ];
    const pagesByPath        = pages.slice().sort((a, b) => a.path.localeCompare(b.path))  .map(p => p.path);
    const pagesByTitle       = pages.slice().sort((a, b) => a.title.localeCompare(b.title)).map(p => p.title).filter(s => s);
    const pagesByCntComments = pages.slice().sort((a, b) => a.cntComments - b.cntComments) .map(p => p.cntComments === 1 ? '1\ncomment' : `${p.cntComments}\ncomments`);
    const pagesByCntViews    = pages.slice().sort((a, b) => a.cntViews - b.cntViews)       .map(p => p.cntViews    === 1 ? '1\nview'    : `${p.cntViews}\nviews`);

    const makeAliases = (hasItems: boolean) => {
        cy.get('app-domain-page-manager').as('pageManager');

        // Check heading
        cy.get('@pageManager').find('h1').should('have.text', 'Domain pages').and('be.visible');
        cy.get('@pageManager').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

        // Filter
        cy.get('@pageManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@pageManager').find('#filter-string') .as('filterString').should('have.value', '');
        cy.get('@pageManager').find('#domain-page-list').as('pageList')
            .find('.list-group-item').should(hasItems ? 'have.length.above' : 'have.length', 0);
    };

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

    context('for owner user', () => {

        beforeEach(() => {
            cy.loginViaApi(USERS.ace, pagePath);
            makeAliases(true);
        });

        it('shows page list', () => {
            // Check page list
            cy.get('@pageManager').verifyListFooter(pages.length, false);

            // Check items: default sort is Path ASC
            cy.get('@pageList').texts('.domain-page-domain').should('arrayMatch', Array(pages.length).fill(DOMAINS.localhost.host));
            cy.get('@pageList').texts('.domain-page-path')  .should('arrayMatch', pagesByPath);

            // Check the Open in new tab link
            cy.get('@pageList').find('a.btn')
                .should('have.length', pages.length)
                .then(a => a.map((_, e) => e.getAttribute('href')).get())
                .should('arrayMatch', pages.slice().sort((a, b) => a.path.localeCompare(b.path)).map(p => `http://${DOMAINS.localhost.host}${p.path}`));

            // Sort by Path DESC
            cy.get('@pageManager').changeListSort('Path', 'asc', 'Path', 'desc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pagesByPath.slice().reverse());

            // Sort by Title
            cy.get('@pageManager').changeListSort('Path', 'desc', 'Title', 'asc');
            cy.get('@pageList').texts('.domain-page-title').should('arrayMatch', pagesByTitle);
            cy.get('@pageManager').changeListSort('Title', 'asc', 'Title', 'desc');
            cy.get('@pageList').texts('.domain-page-title').should('arrayMatch', pagesByTitle.slice().reverse());

            // Sort by Created
            cy.get('@pageManager').changeListSort('Title', 'desc', 'Created', 'asc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pages.map(p => p.path));
            cy.get('@pageManager').changeListSort('Created', 'asc', 'Created', 'desc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pages.slice().reverse().map(p => p.path));

            // Sort by Number of comments
            cy.get('@pageManager').changeListSort('Created', 'desc', 'Number of comments', 'asc');
            cy.get('@pageList').texts('.domain-page-cnt-comments').should('arrayMatch', pagesByCntComments);
            cy.get('@pageManager').changeListSort('Number of comments', 'asc', 'Number of comments', 'desc');
            cy.get('@pageList').texts('.domain-page-cnt-comments').should('arrayMatch', pagesByCntComments.slice().reverse());

            // Sort by Number of views
            cy.get('@pageManager').changeListSort('Number of comments', 'desc', 'Number of views', 'asc');
            cy.get('@pageList').texts('.domain-page-cnt-views').should('arrayMatch', pagesByCntViews);
            cy.get('@pageManager').changeListSort('Number of views', 'asc', 'Number of views', 'desc');
            cy.get('@pageList').texts('.domain-page-cnt-views').should('arrayMatch', pagesByCntViews.slice().reverse());

            // Sort by Path ASC again
            cy.get('@pageManager').changeListSort('Number of views', 'desc', 'Path', 'asc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pagesByPath);
        });

        it('retains chosen sort order', () =>
            cy.checkListSortRetained(
                '@pageManager',
                [
                    {sort: 'Path',               order: 'asc'},
                    {sort: 'Path',               order: 'desc'},
                    {sort: 'Title',              order: 'asc'},
                    {sort: 'Title',              order: 'desc'},
                    {sort: 'Created',            order: 'asc'},
                    {sort: 'Created',            order: 'desc'},
                    {sort: 'Number of comments', order: 'asc'},
                    {sort: 'Number of comments', order: 'desc'},
                    {sort: 'Number of views',    order: 'asc'},
                    {sort: 'Number of views',    order: 'desc'},
                ]));

        it('filters pages', () => {

            const filterOn = (s: string) => {
                cy.get('@filterString').setValue(s);
                // Wait for debounce
                cy.wait(600);
            };

            // Test filtering by path
            filterOn('tr/');
            cy.get('@pageManager').verifyListFooter(7, false);
            cy.get('@pageList').texts('.domain-page-path')
                .should('arrayMatch', [
                    '/attr/auto-init/',
                    '/attr/auto-non-interactive-sso/',
                    '/attr/css-override-false/',
                    '/attr/css-override/',
                    '/attr/live-update/',
                    '/attr/max-level/',
                    '/attr/no-fonts/',
                ]);

            // Test filtering by title
            filterOn('cOmEnT');
            cy.get('@pageManager').verifyListFooter(1, false);
            cy.get('@pageList').texts('.domain-page-title')
                .should('arrayMatch', ['Double Comentario']);
        });

        it('allows to navigate to page props', () => {
            cy.get('@pageList').find('a.list-group-item').eq(1).click();
            cy.isAt(`${pagePath}/${DOMAIN_PAGES.attrAutoInit.id}`);
        });

        it('updates view stats', () => {
            // Visit the comments page to register a pageview
            cy.testSiteVisit(TEST_PATHS.comments);
            cy.commentTree().should('have.length', 1);

            // Go back to the list and check the counts
            cy.visit(pagePath);
            cy.get('@pageList').contains('a.list-group-item', TEST_PATHS.comments)
                .find('.domain-page-cnt-views').should('have.text', '1' + 'view');
        });
    });

    it('shows page list for commenter user', () => {
        cy.loginViaApi(USERS.commenterTwo, pagePath);
        makeAliases(true);

        cy.get('@pageManager').verifyListFooter(3, false);
        cy.get('@pageList').texts('.domain-page-domain').should('arrayMatch', Array(3).fill(DOMAINS.localhost.host));
        cy.get('@pageList').texts('.domain-page-path')  .should('arrayMatch', ['/', '/attr/max-level/', '/double/']);
        cy.get('@pageList').texts('.domain-page-title') .should('arrayMatch', ['Home', 'Attribute: max-level=2', 'Double Comentario']);

        // No comment or view count
        cy.get('@pageList').find('.domain-page-cnt-comments').should('not.exist');
        cy.get('@pageList').find('.domain-page-cnt-views')   .should('not.exist');
    });

    it('shows page list for readonly user', () => {
        cy.loginViaApi(USERS.commenterThree, pagePath);
        makeAliases(true);
        cy.get('@pageManager').verifyListFooter(1, false);
    });
});
