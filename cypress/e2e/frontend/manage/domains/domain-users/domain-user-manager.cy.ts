import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../../../support/cy-utils';
const { $ } = Cypress;

context('Domain User Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).users;

    /** Users ordered by creation time. */
    const users = [USERS.ace, USERS.king, USERS.queen, USERS.jack, USERS.commenterTwo, USERS.commenterThree, USERS.johnDoeSso];
    /** Users ordered by name. */
    const usersByName = users.slice().sort((a, b) => a.name.localeCompare(b.name));
    /** Users ordered by email. */
    const usersByEmail = users.slice().sort((a, b) => a.email.localeCompare(b.email));

    const makeAliases = (hasItems: boolean, canLoadMore: boolean) => {
        cy.get('app-domain-user-manager').as('domainUserManager');

        // Check heading
        cy.get('@domainUserManager').find('h1').should('have.text', 'Domain users').and('be.visible');
        cy.get('@domainUserManager').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

        // Filter
        cy.get('@domainUserManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@domainUserManager').find('#filter-string').as('filterString').should('have.value', '');

        // Users
        cy.get('@domainUserManager').find('#domain-user-list').as('domainUserList')
            .find('.list-group-item').should(hasItems ? 'have.length.above' : 'have.length', 0);
        if (canLoadMore) {
            cy.get('@domainUserManager').contains('app-list-footer button', 'Load more').as('loadMore');
        }
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
                // Login with an SSO user to add it to the domain
                cy.testSiteVisit(TEST_PATHS.home);
                cy.testSiteSsoLogin();

                // Now login as the test user
                cy.loginViaApi(user, pagePath);
                makeAliases(true, false);
            });

            it('shows domain user list', () => {
                // Check items: default sort is email ASC
                cy.get('@domainUserManager').verifyListFooter(usersByEmail.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByEmail.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByEmail.map(u => u.email));

                // Check user badges
                cy.get('@domainUserList').find('.list-group-item')
                    .should(items =>
                        // For each item, collect all badge texts into a string[], then collect those arrays into string[][]
                        expect(items.map((_, item) => [$(item).find('.badge').map((_, badge) => $(badge).text()).get()]).get())
                            .to.matrixMatch([
                            name === 'superuser' ? ['Owner'] : ['Owner', 'You'],
                            ['Moderator'],
                            ['Moderator', 'SSO'],
                            ['Moderator'],
                            ['Moderator'],
                            ['Read-only'],
                            ['Commenter'],
                        ]));

                // Sort by email DESC
                cy.get('@domainUserManager').changeListSort('Email', 'asc', 'Email', 'desc');
                cy.get('@domainUserManager').verifyListFooter(usersByEmail.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByEmail.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByEmail.map(u => u.email).reverse());

                // Sort by name ASC
                cy.get('@domainUserManager').changeListSort('Email', 'desc', 'Name', 'asc');
                cy.get('@domainUserManager').verifyListFooter(usersByName.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByName.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByName.map(u => u.email));

                // Sort by name DESC
                cy.get('@domainUserManager').changeListSort('Name', 'asc', 'Name', 'desc');
                cy.get('@domainUserManager').verifyListFooter(usersByName.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByName.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByName.map(u => u.email).reverse());

                // Sort by created ASC
                cy.get('@domainUserManager').changeListSort('Name', 'desc', 'Created', 'asc');
                cy.get('@domainUserManager').verifyListFooter(users.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', users.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', users.map(u => u.email));

                // Sort by created DESC
                cy.get('@domainUserManager').changeListSort('Created', 'asc', 'Created', 'desc');
                cy.get('@domainUserManager').verifyListFooter(users.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', users.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', users.map(u => u.email).reverse());
            });

            it('retains chosen sort order', () =>
                cy.checkListSortRetained(
                    '@domainUserManager',
                    [
                        {sort: 'Email',   order: 'asc'},
                        {sort: 'Email',   order: 'desc'},
                        {sort: 'Name',    order: 'asc'},
                        {sort: 'Name',    order: 'desc'},
                        {sort: 'Created', order: 'asc'},
                        {sort: 'Created', order: 'desc'},
                    ]));

            it('filters items', () => {
                // Test filtering by email
                cy.get('@filterString').setValue('bLoG');
                cy.get('@domainUserManager').verifyListFooter(2, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.commenterThree.email, USERS.commenterTwo.email]);

                // Test filtering by name
                cy.get('@filterString').setValue('een');
                cy.get('@domainUserManager').verifyListFooter(1, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.queen.email]);

                // Test filtering by remarks
                cy.get('@filterString').setValue('aL');
                cy.get('@domainUserManager').verifyListFooter(2, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.jack.email, USERS.king.email]);
            });

            it('allows to open user properties', () => {
                cy.get('@domainUserList').find('.list-group-item').eq(3).click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).users + '/' + USERS.king.id);
            });
        }));
});
