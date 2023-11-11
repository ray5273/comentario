import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).pages;

    /** Pages, ordered by creation date. */
    const pages = [
        {path: '/comments/',                title: 'Comments',                      cntComments: 0,  cntViews: 0},
        {path: '/',                         title: 'Home',                          cntComments: 17, cntViews: 10},
        {path: '/nocomment/',               title: 'No comment',                    cntComments: 0,  cntViews: 2},
        {path: '/readonly/',                title: 'Readonly page',                 cntComments: 0,  cntViews: 42},
        {path: '/page/with/a/very/long/path/that/will/definitely/have/to/be/wrapped/on/display/to/make/it/a/bit/usable.html?some_even_more_long_param=long_boring_value_3457290346493563584693847569723456987245869&foo=bar&buzz=238974592875469782&bux=whatever-28973423498765987249586729847569275469874578969234756938745697834569782349567824596879432756924578692874569234865',
                                            title: '',                              cntComments: 0,  cntViews: 0},
        {path: '/double/',                  title: 'Double Comentario',             cntComments: 2,  cntViews: 0},
        {path: '/attr/auto-init/',          title: 'Attribute: auto-init=false',    cntComments: 2,  cntViews: 0},
        {path: '/dynamic/',                 title: 'Dynamic insertion',             cntComments: 1,  cntViews: 4},
        {path: '/attr/no-fonts/',           title: 'Attribute: no-fonts=true',      cntComments: 2,  cntViews: 0},
        {path: '/attr/css-override/',       title: 'Attribute: css-override',       cntComments: 2,  cntViews: 0},
        {path: '/attr/css-override-false/', title: 'Attribute: css-override=false', cntComments: 2,  cntViews: 0},
        {path: '/different-page/123',       title: 'Attribute: page-id',            cntComments: 2,  cntViews: 0},
    ];
    const pagesByPath        = pages.slice().sort((a, b) => a.path.localeCompare(b.path))  .map(p => p.path);
    const pagesByTitle       = pages.slice().sort((a, b) => a.title.localeCompare(b.title)).map(p => p.title).filter(s => s);
    const pagesByCntComments = pages.slice().sort((a, b) => a.cntComments - b.cntComments) .map(p => `${p.cntComments}\ncomments`);
    const pagesByCntViews    = pages.slice().sort((a, b) => a.cntViews - b.cntViews)       .map(p => `${p.cntViews}\nviews`);

    const makeAliases = (hasItems: boolean) => {
        cy.get('app-domain-page-manager')             .as('pageManager');
        cy.get('@pageManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@pageManager').find('#filter-string') .as('filterString').should('have.value', '');
        if (hasItems) {
            cy.get('@pageManager').find('#page-list').as('pageList').should('be.visible');
        }
    };

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

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
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.commenterTwo));

    context('for owner user', () => {

        beforeEach(() => {
            cy.loginViaApi(USERS.ace, pagePath);
            makeAliases(true);
        });

        it('shows page list', () => {
            // Check heading
            cy.get('@pageManager').find('h1').should('have.text', 'Domain pages').and('be.visible');

            // Check page list
            cy.get('@pageList').verifyListFooter(pages.length, false);

            // Check items: default sort is Path ASC
            cy.get('@pageList').texts('.domain-page-domain').should('arrayMatch', Array(pages.length).fill(DOMAINS.localhost.host));
            cy.get('@pageList').texts('.domain-page-path')  .should('arrayMatch', pagesByPath);

            // Check the Open in new tab link
            cy.get('@pageList').find('a.btn')
                .should('have.length', pages.length)
                .then(a => a.map((_, e) => e.getAttribute('href')).get())
                .should('arrayMatch', pages.slice().sort((a, b) => a.path.localeCompare(b.path)).map(p => `http://${DOMAINS.localhost.host}${p.path}`));

            // Sort by Path DESC
            cy.get('@pageManager').changeListSort('Path', 'desc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pagesByPath.slice().reverse());

            // Sort by Title
            cy.get('@pageManager').changeListSort('Title', 'asc');
            cy.get('@pageList').texts('.domain-page-title').should('arrayMatch', pagesByTitle);
            cy.get('@pageManager').changeListSort('Title', 'desc');
            cy.get('@pageList').texts('.domain-page-title').should('arrayMatch', pagesByTitle.slice().reverse());

            // Sort by Created
            cy.get('@pageManager').changeListSort('Created', 'asc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pages.map(p => p.path));
            cy.get('@pageManager').changeListSort('Created', 'desc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pages.slice().reverse().map(p => p.path));

            // Sort by Number of comments
            cy.get('@pageManager').changeListSort('Number of comments', 'asc');
            cy.get('@pageList').texts('.domain-page-cnt-comments').should('arrayMatch', pagesByCntComments);
            cy.get('@pageManager').changeListSort('Number of comments', 'desc');
            cy.get('@pageList').texts('.domain-page-cnt-comments').should('arrayMatch', pagesByCntComments.slice().reverse());

            // Sort by Number of views
            cy.get('@pageManager').changeListSort('Number of views', 'asc');
            cy.get('@pageList').texts('.domain-page-cnt-views').should('arrayMatch', pagesByCntViews);
            cy.get('@pageManager').changeListSort('Number of views', 'desc');
            cy.get('@pageList').texts('.domain-page-cnt-views').should('arrayMatch', pagesByCntViews.slice().reverse());

            // Sort by Path ASC again
            cy.get('@pageManager').changeListSort('Path', 'asc');
            cy.get('@pageList').texts('.domain-page-path').should('arrayMatch', pagesByPath);
        });

        it('filters pages', () => {

            const filterOn = (s: string) => {
                cy.get('@filterString').setValue(s);
                // Wait for debounce
                cy.wait(600);
            };

            cy.get('@filterString').should('have.value', '');

            // Test filtering by path
            filterOn('tr/');
            cy.get('@pageList').verifyListFooter(4, false);
            cy.get('@pageList').texts('.domain-page-path')
                .should('arrayMatch', ['/attr/auto-init/', '/attr/css-override-false/', '/attr/css-override/', '/attr/no-fonts/']);

            // Test filtering by title
            filterOn('cOmEnT');
            cy.get('@pageList').verifyListFooter(1, false);
            cy.get('@pageList').texts('.domain-page-title')
                .should('arrayMatch', ['Double Comentario']);
        });

        it('allows to navigate to page props', () => {
            cy.get('@pageList').find('a.list-group-item').eq(1).click();
            cy.isAt(pagePath + '/0ebb8a1b-12f6-421e-b1bb-75867ac4a000');
        });
    });

    it('shows page list for commenter user', () => {
        cy.loginViaApi(USERS.commenterTwo, pagePath);
        makeAliases(true);

        cy.get('@pageList').verifyListFooter(2, false);
        cy.get('@pageList').texts('.domain-page-domain').should('arrayMatch', Array(2).fill(DOMAINS.localhost.host));
        cy.get('@pageList').texts('.domain-page-path')  .should('arrayMatch', ['/', '/double/']);
        cy.get('@pageList').texts('.domain-page-title') .should('arrayMatch', ['Home', 'Double Comentario']);

        // No comment or view count
        cy.get('@pageList').find('.domain-page-cnt-comments').should('not.exist');
        cy.get('@pageList').find('.domain-page-cnt-views')   .should('not.exist');
    });

    it('shows page list for readonly user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.spirit.id).pages);
        makeAliases(false);
        cy.get('@pageManager').verifyListFooter(0, false);
    });
});
