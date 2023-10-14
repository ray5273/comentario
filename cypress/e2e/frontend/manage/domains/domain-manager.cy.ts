import { DOMAINS, DYN_CONFIG_ITEMS, PATHS, REGEXES, USERS, Util } from '../../../../support/cy-utils';

context('Domain Manager', () => {

    const noData = 'You have no connected domains.';
    const makeDMAliases = (canAdd: boolean, hasItems: boolean, canLoadMore: boolean = false) => {
        cy.get('app-domain-manager')                    .as('domainManager');
        cy.get('@domainManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@domainManager').find('#filter-string') .as('filterString');

        if (canAdd) {
            cy.get('@domainManager').contains('button', 'New domain').as('newDomain');
        } else {
            cy.get('@domainManager').contains('button', 'New domain').should('not.exist');
        }

        if (hasItems) {
            cy.get('@domainManager').find('#domain-list').as('domainList');
        } else {
            cy.get('@domainManager').find('#domain-list').should('not.exist');
        }

        if (canLoadMore) {
            cy.get('@domainManager').contains('app-list-footer button', 'Load more').as('loadMore');
        }
    };

    beforeEach(cy.backendReset);

    it('redirects user to login and back', () => cy.verifyRedirectsAfterLogin(PATHS.manage.domains._, USERS.commenterOne));

    it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.manage.domains._, USERS.commenterOne));

    it('shows domain list for user without domains', () => {
        // Login with default config (no new owners allowed)
        cy.loginViaApi(USERS.commenterOne, PATHS.manage.domains._);
        cy.contains('app-domain-manager button', 'New domain').should('not.exist');
        cy.verifyListFooter(0, false, noData)
            .contains('a', 'Add domain').should('not.exist');

        // Enable new owners and reload
        cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.operationNewOwnerEnabled, 'true');
        cy.reload();
        makeDMAliases(true, false);

        // Controls are visible
        cy.get('@newDomain').should('be.visible');
        cy.get('@domainManager').verifyListFooter(0, false, noData)
            // Click the "Add domain" button in the "No data" placeholder
            .contains('a', 'Add domain').click();
        cy.isAt(PATHS.manage.domains.create);
    });

    it('shows domain list for user with one domain', () => {
        cy.loginViaApi(USERS.ace, PATHS.manage.domains._);
        makeDMAliases(true, true);

        // Check footer
        cy.get('@domainManager').verifyListFooter(1, false);

        // Check domain list
        cy.get('@domainList').texts('.domain-host').should('arrayMatch', [DOMAINS.localhost.host]);
        cy.get('@domainList').texts('.domain-name').should('arrayMatch', [DOMAINS.localhost.name]);
        cy.get('@domainList').texts('app-domain-user-badge').should('arrayMatch', ['Owner']);

        // Select the domain
        cy.get('@domainList').find('a').eq(0).click();
        cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
    });

    it('shows domain list for user with multiple domain', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains._);
        makeDMAliases(true, true);

        // Check footer
        cy.get('@domainManager').verifyListFooter(4, false);

        // Check domain list
        cy.get('@domainList').texts('.domain-host').should('arrayMatch', [
            DOMAINS.factor.host,
            DOMAINS.localhost.host,
            DOMAINS.market.host,
            DOMAINS.spirit.host,
        ]);
        cy.get('@domainList').texts('.domain-name').should('be.empty'); // No names, also because they're only visible to owners
        cy.get('@domainList').texts('app-domain-user-badge').should('arrayMatch', ['Owner', 'Moderator', 'Commenter', 'Read-only']);

        // Select the domain
        cy.get('@domainList').find('a').eq(0).click();
        cy.isAt(PATHS.manage.domains.id(DOMAINS.factor.id).props);
    });

    context('for superuser', () => {

        /** Hosts ordered by creation date. */
        const hostsByCreated = Object.values(DOMAINS).map(d => d.host);
        /** Hosts ordered alphabetically. */
        const hostsSorted = hostsByCreated.slice().sort();
        /** Names ordered alphabetically. */
        const namesSorted = Object.values(DOMAINS).filter(d => d.name).map(d => d.name).sort();

        beforeEach(() => {
            cy.loginViaApi(USERS.root, PATHS.manage.domains._);
            makeDMAliases(true, true, true);
        });

        it('allows to add domain', () => {
            cy.get('@newDomain').click();
            cy.isAt(PATHS.manage.domains.create);
        });

        it('shows domain list', () => {
            // Check footer
            cy.get('@domainManager').verifyListFooter(25, true);

            // Check domain list
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(0, 25));

            // Add more (1)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(50, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(0, 50));

            // Add more (2)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(75, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(0, 75));

            // Add more (3)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(100, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(0, 100));

            // Add more (4)
            cy.get('@loadMore').click().should('not.exist');
            cy.get('@domainManager').verifyListFooter(101, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted);
        });

        it('sorts items by Host', () => {
            // Default sort is host ASC. Sort by host DESC
            cy.get('@domainManager').changeListSort('Host', 'desc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(76, 101).reverse());

            // Add more (1)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(50, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(51, 101).reverse());

            // Add more (2)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(75, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(26, 101).reverse());

            // Add more (3)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(100, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(1, 101).reverse());

            // Add more (4)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(101, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice().reverse());

            // Sort by host ASC again
            cy.get('@domainManager').changeListSort('Host', 'asc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted.slice(0, 25));
        });

        it('sorts items by Name', () => {
            // Sort by name ASC
            cy.get('@domainManager').changeListSort('Name', 'asc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-name').should('be.empty');

            // Sort by name DESC
            cy.get('@domainManager').changeListSort('Name', 'desc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-name').should('arrayMatch', namesSorted.slice().reverse().slice(0, 25));

            // Add more (1)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(50, true);
            cy.get('@domainList').texts('.domain-name').should('arrayMatch', namesSorted.slice().reverse()); // Only 34 have a name
        });

        it('sorts items by Created', () => {
            // Sort ASC
            cy.get('@domainManager').changeListSort('Created', 'asc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice(0, 25));

            // Sort DESC
            cy.get('@domainManager').changeListSort('Created', 'desc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice(76, 101).reverse());

            // Add more (1)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(50, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice(51, 101).reverse());

            // Add more (2)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(75, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice(26, 101).reverse());

            // Add more (3)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(100, true);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice(1, 101).reverse());

            // Add more (4)
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(101, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsByCreated.slice().reverse());
        });

        it('sorts items by Number of comments', () => {
            // Sort ASC
            cy.get('@domainManager').changeListSort('Number of comments', 'asc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-cnt-comments').should('arrayMatch', Array(25).fill('0\ncomments'));

            // Sort DESC
            cy.get('@domainManager').changeListSort('Number of comments', 'desc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-cnt-comments')
                .should('arrayMatch', ['16\ncomments', '7\ncomments', ...Array(23).fill('0\ncomments')]);
        });

        it('sorts items by Number of views', () => {
            // Sort ASC
            cy.get('@domainManager').changeListSort('Number of views', 'asc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-cnt-views').should('arrayMatch', Array(25).fill('0\nviews'));

            // Sort DESC
            cy.get('@domainManager').changeListSort('Number of views', 'desc');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@domainList').texts('.domain-cnt-views')
                .should('arrayMatch', ['19,238,102\nviews', '5\nviews', ...Array(23).fill('0\nviews')]);
        });

        it('filters domains', () => {

            const filterOn = (s: string) => {
                cy.get('@filterString').setValue(s);
                // Wait for debounce
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(600);
            };

            // Filtering on "e" returns all domains
            cy.get('@filterString').should('have.value', '');
            filterOn('e');
            cy.get('@domainManager').verifyListFooter(25, true);
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(50, true);
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(75, true);
            cy.get('@loadMore').click();
            cy.get('@domainManager').verifyListFooter(100, true);
            cy.get('@loadMore').click().should('not.exist');
            cy.get('@domainManager').verifyListFooter(101, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', hostsSorted);

            // Remove filter
            filterOn('');
            cy.get('@domainManager').verifyListFooter(25, true);

            // Filter on "lo"
            filterOn('lo');
            cy.get('@domainManager').verifyListFooter(2, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', [DOMAINS.colour.host, DOMAINS.localhost.host]);

            // Click a domain
            cy.contains('app-domain-manager #domain-list a', DOMAINS.colour.host).click();
            cy.isAt(PATHS.manage.domains.id(DOMAINS.colour.id).props);

            // Go back to the Domain Manager
            cy.go('back');
            cy.isAt(PATHS.manage.domains);
            cy.get('@filterString').should('have.value', '');
            filterOn('sItE');
            cy.get('@domainManager').verifyListFooter(1, false);
            cy.get('@domainList').texts('.domain-host').should('arrayMatch', [DOMAINS.localhost.host]);
        });
    });

    context('Domain Properties page', () => {

        const checkNoInstallSection = () => {
            cy.contains('h2', 'Installation').should('not.exist');
            cy.get('#install-snippet').should('not.exist');
        };
        const checkNoEditButtons = () => {
            cy.contains('app-domain-detail a', 'Edit settings').should('not.exist');
            cy.contains('app-domain-detail a', 'SSO secret')   .should('not.exist');
        };
        const checkEditButtons = () => {
            // Click on "Edit settings" and land on the edit page
            cy.contains('app-domain-detail a', 'Edit settings').click();
            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).edit);

            // Click on Cancel and go back
            cy.contains('app-domain-edit form a', 'Cancel').click();
            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).props);

            // Click on "SSO secret" and land on the SSO secret page
            cy.contains('app-domain-detail a', 'SSO secret').click();
            cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).sso);
        };
        const checkAllProperties = () => {
            cy.contains('h2', 'Properties').should('be.visible');
            cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                ['Host',                                      DOMAINS.localhost.host],
                ['Name',                                      DOMAINS.localhost.name],
                ['Read-only',                                 ''],
                ['Require moderator approval on comment, if', 'Author is anonymous'],
                ['Email moderators',                          'For comments pending moderation'],
                ['Default comment sort',                      'Oldest first'],
                [
                    'Authentication',
                    [
                        'Anonymous comments',
                        'Local (password-based)',
                        'Non-interactive Single Sign-On',
                        `via http://localhost:8080/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                        'Facebook',
                        'GitHub',
                        'GitLab',
                        'Google',
                        'Twitter',
                    ],
                ],
                ['Created',                                  REGEXES.datetime],
                ['Number of comments',                       '16'],
                ['Number of views',                          '5'],
            ]);
        };

        it('shows properties for readonly user', () => {
            cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.spirit.id).props);
            checkNoInstallSection();
            checkNoEditButtons();
            cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                ['Host',                 DOMAINS.spirit.host],
                ['Read-only',            ''],
                ['Default comment sort', 'Oldest first'],
                ['Authentication',       ['Anonymous comments', 'Local (password-based)']],
            ]);
        });

        it('shows properties for commenter user', () => {
            cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.market.id).props);
            checkNoInstallSection();
            checkNoEditButtons();
            cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                ['Host',                 DOMAINS.market.host],
                ['Read-only',            '✔'],
                ['Default comment sort', 'Most upvoted first'],
                ['Authentication',       'Local (password-based)'],
            ]);
        });

        it('shows properties for moderator user', () => {
            cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.localhost.id).props);
            checkNoInstallSection();
            checkNoEditButtons();
            cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                ['Host',                 DOMAINS.localhost.host],
                ['Read-only',            ''],
                ['Default comment sort', 'Oldest first'],
                [
                    'Authentication',
                    [
                        'Anonymous comments',
                        'Local (password-based)',
                        'Non-interactive Single Sign-On',
                        `via http://localhost:8080/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                        'Facebook',
                        'GitHub',
                        'GitLab',
                        'Google',
                        'Twitter',
                    ],
                ],
            ]);
        });

        it('shows properties for owner user', () => {
            cy.loginViaApi(USERS.ace, PATHS.manage.domains.id(DOMAINS.localhost.id).props, Util.stubWriteText);

            // Check the Installation section
            const html = Util.installSnippet();
            cy.contains('h2', 'Installation').should('be.visible');
            cy.get('#install-snippet pre').should('have.text', html);

            // Test copying the snippet to the clipboard
            cy.contains('#install-snippet button', 'Copy').click();
            cy.get('@writeText').should('be.calledWithExactly', html);

            // Check domain properties table
            checkAllProperties();

            // Check buttons
            checkEditButtons();
        });

        it('shows properties for superuser', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.domains.id(DOMAINS.localhost.id).props);
            checkNoInstallSection();
            checkAllProperties();
            checkEditButtons();
        });
    });
});
