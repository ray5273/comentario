import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../support/cy-utils';

context('Dashboard', () => {

    const makeAliases = (hasStats: boolean, hasDaily?: boolean, hasPageViews?: boolean, hasTopPages?: boolean) => {
        cy.get('app-dashboard').as('dashboard');

        // Check heading
        cy.get('@dashboard').find('h1').should('have.text', 'Dashboard').and('be.visible');

        // Totals
        cy.get('@dashboard').find('#dashboard-totals').as('totals');

        // If there are any stats at all
        if (hasStats) {
            // Daily section
            cy.get('@dashboard').find('#stats-daily').as('daily');
            cy.get('@daily').find('h2').should('have.text', 'Daily statistics').and('be.visible');
            cy.get('@daily').find('.stats-chart-info').should('have.text', 'Last 30 days.').and('be.visible');
            // Page views section
            cy.get('@dashboard').find('#stats-page-views').as('pageViews');
            cy.get('@pageViews').find('h2').should('have.text', 'Page view statistics').and('be.visible');
            // Top pages section
            cy.get('@dashboard').find('#stats-top-pages').as('topPages');
            cy.get('@topPages').find('h2').should('have.text', 'Top performing pages').and('be.visible');
        } else {
            cy.get('@dashboard').find('#stats-daily')     .should('not.exist');
            cy.get('@dashboard').find('#stats-page-views').should('not.exist');
            cy.get('@dashboard').find('#stats-top-pages') .should('not.exist');
        }

        // If there are daily stats charts
        if (hasDaily) {
            cy.get('@daily').find('#stats-daily-charts').as('dailyCharts');
        } else {
            cy.get('@dashboard').find('#stats-daily-charts').should('not.exist');
        }

        // If there are page view stats charts
        if (hasPageViews) {
            cy.get('@pageViews').find('#stats-page-view-charts').as('pageViewCharts');
        } else {
            cy.get('@dashboard').find('#stats-page-view-charts') .should('not.exist');
        }

        // If there are top pages tables
        if (hasTopPages) {
            cy.get('@topPages').find('#stats-top-pages-views')   .as('pagesByViews');
            cy.get('@topPages').find('#stats-top-pages-comments').as('pagesByComments');
        } else {
            cy.get('@dashboard').find('#stats-top-pages-views')   .should('not.exist');
            cy.get('@dashboard').find('#stats-top-pages-comments').should('not.exist');
        }
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root},
            {name: 'owner',      user: USERS.ace},
            {name: 'moderator',  user: USERS.king},
            {name: 'commenter',  user: USERS.commenterTwo},
            {name: 'readonly',   user: USERS.commenterThree},
            {name: 'non-domain', user: USERS.commenterOne},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and back`, () =>
                    cy.verifyRedirectsAfterLogin(PATHS.manage.dashboard, test.user)));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.manage.dashboard, USERS.commenterOne));

    context('shows metrics and statistics', () => {

        [
            {
                name:         'user without domains',
                user:         USERS.commenterOne,
                hasStats:     false,
            },
            {
                name:         'commenter user',
                user:         USERS.commenterTwo,
                metrics:
                    // language=yaml
                    `
                    - {label: Domains,  sublabel: you're commenter on, value: 1}
                    - {label: Pages,    sublabel: you commented on,    value: 3}
                    - {label: Comments, sublabel: you authored,        value: 3}
                    `,
            },
            {
                name:         'owner user',
                user:         USERS.ace,
                hasStats:     true,
                metrics:
                    // language=yaml
                    `
                    - {label: Domains,      sublabel: you own,          value: 1}
                    - {label: Pages,        sublabel: you moderate,     value: 16}
                    - {label: Pages,        sublabel: you commented on, value: 9}
                    - {label: Domain users, sublabel: you manage,       value: 6}
                    - {label: Comments,     sublabel: total,            value: 40}
                    - {label: Comments,     sublabel: you authored,     value: 17}
                    - {label: Commenters,   sublabel: total,            value: 7}
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - {label: Views,    value: 217}
                    - {label: Comments, value: 40}
                    `,
                pageViewMetrics: {
                    country:
                        // language=yaml
                        `
                        - {label: US,        value: 36}
                        - {label: DE,        value: 19}
                        - {label: NL,        value: 17}
                        - {label: BR,        value: 11}
                        - {label: ES,        value: 11}
                        - {label: Others,    value: 123}
                        `,
                    device:
                        // language=yaml
                        `
                        - {label: Computer,  value: 187}
                        - {label: Phone,     value: 26}
                        - {label: Unknown,   value: 4}
                        `,
                    browser:
                        // language=yaml
                        `
                        - {label: Chrome,    value: 114}
                        - {label: Firefox,   value: 56}
                        - {label: IE,        value: 24}
                        - {label: Safari,    value: 8}
                        - {label: GoogleBot, value: 4}
                        - {label: Others,    value: 11}
                        `,
                    os:
                        // language=yaml
                        `
                        - {label: Windows,   value: 90}
                        - {label: MacOSX,    value: 48}
                        - {label: Linux,     value: 44}
                        - {label: Android,   value: 20}
                        - {label: iOS,       value: 6}
                        - {label: Others,    value: 9}
                        `,
                },
                topPages: {
                    byViews: [
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.home,          metric: '217 views'},
                    ],
                    byComments: [
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.home,          metric: '16 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.attr.maxLevel, metric: '6 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.dynamic,       metric: '3 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.double,        metric: '2 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.darkMode,      metric: '2 comments'},
                    ],
                },
            },
            {
                name:         'user with multiple roles',
                user:         USERS.king,
                hasStats:     true,
                metrics:
                    // language=yaml
                    `
                    - {label: Domains,      sublabel: you own,             value: 1}
                    - {label: Domains,      sublabel: you moderate,        value: 1}
                    - {label: Domains,      sublabel: you're commenter on, value: 1}
                    - {label: Domains,      sublabel: you're read-only on, value: 1}
                    - {label: Pages,        sublabel: you moderate,        value: 19}
                    - {label: Pages,        sublabel: you commented on,    value: 2}
                    - {label: Domain users, sublabel: you manage,          value: 1}
                    - {label: Comments,     sublabel: total,               value: 40}
                    - {label: Comments,     sublabel: you authored,        value: 4}
                    - {label: Commenters,   sublabel: total,               value: 7}
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - {label: Views,    value: 0}
                    - {label: Comments, value: 0}
                    `,
            },
            {
                name:         'superuser',
                user:         USERS.root,
                hasStats:     true,
                hasDaily:     true,
                hasTopPages:  true,
                metrics:
                    // language=yaml
                    `
                    - {label: Users,        sublabel: total,        value: 16}
                    - {label: Pages,        sublabel: you moderate, value: 20}
                    - {label: Domain users, sublabel: you manage,   value: 9}
                    - {label: Comments,     sublabel: total,        value: 41}
                    - {label: Commenters,   sublabel: total,        value: 7}
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - {label: Views,    value: 217}
                    - {label: Comments, value: 41}
                    `,
                pageViewMetrics: {
                    country:
                        // language=yaml
                        `
                        - {label: US,        value: 36}
                        - {label: DE,        value: 19}
                        - {label: NL,        value: 17}
                        - {label: BR,        value: 11}
                        - {label: ES,        value: 11}
                        - {label: Others,    value: 123}
                        `,
                    device:
                        // language=yaml
                        `
                        - {label: Computer,  value: 187}
                        - {label: Phone,     value: 26}
                        - {label: Unknown,   value: 4}
                        `,
                    browser:
                        // language=yaml
                        `
                        - {label: Chrome,    value: 114}
                        - {label: Firefox,   value: 56}
                        - {label: IE,        value: 24}
                        - {label: Safari,    value: 8}
                        - {label: GoogleBot, value: 4}
                        - {label: Others,    value: 11}
                        `,
                    os:
                        // language=yaml
                        `
                        - {label: Windows,   value: 90}
                        - {label: MacOSX,    value: 48}
                        - {label: Linux,     value: 44}
                        - {label: Android,   value: 20}
                        - {label: iOS,       value: 6}
                        - {label: Others,    value: 9}
                        `,
                },
                topPages: {
                    byViews: [
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.home,          metric: '217 views'},
                    ],
                    byComments: [
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.home,          metric: '16 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.attr.maxLevel, metric: '6 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.dynamic,       metric: '3 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.double,        metric: '2 comments'},
                        {domain: DOMAINS.localhost.host, path: TEST_PATHS.darkMode,      metric: '2 comments'},
                    ],
                },
            },
        ]
            .forEach(test =>
                it(`for ${test.name}`, () => {
                    cy.loginViaApi(test.user, PATHS.manage.dashboard);
                    makeAliases(test.hasStats, !!test.dailyMetrics, !!test.pageViewMetrics, !!test.topPages);

                    // Verify metric cards, if any
                    if (test.metrics) {
                        cy.get('@totals').metricCards().should('yamlMatch', test.metrics);

                    } else {
                        // Otherwise, a welcome message must be visible
                        cy.get('@dashboard').contains('h2', 'Welcome to Comentario Dashboard!').should('be.visible');
                        cy.get('@dashboard').contains('p', 'This application allows you to navigate domains, pages, and comments you authored.').should('be.visible');
                    }

                    // Verify total figures above the daily charts
                    if (test.dailyMetrics) {
                        cy.get('@dailyCharts').metricCards().should('yamlMatch', test.dailyMetrics);
                    }

                    // Verify page view stats in the legends of pie charts
                    if (test.pageViewMetrics) {
                        Object.entries(test.pageViewMetrics)
                            .forEach(([dim, yaml]) =>
                                cy.get('@pageViewCharts')
                                    .find(`#stats-page-views-${dim}`)
                                    .pieChartLegend()
                                    .should('yamlMatch', yaml));
                    }

                    // Verify top pages tables
                    if (test.topPages) {
                        // By views
                        cy.get('@pagesByViews')   .texts('.domain-page-domain').should('arrayMatch', test.topPages.byViews.map(p => p.domain));
                        cy.get('@pagesByViews')   .texts('.domain-page-path')  .should('arrayMatch', test.topPages.byViews.map(p => p.path));
                        cy.get('@pagesByViews')   .texts('.domain-page-metric').should('arrayMatch', test.topPages.byViews.map(p => p.metric));
                        // By comments
                        cy.get('@pagesByComments').texts('.domain-page-domain').should('arrayMatch', test.topPages.byComments.map(p => p.domain));
                        cy.get('@pagesByComments').texts('.domain-page-path')  .should('arrayMatch', test.topPages.byComments.map(p => p.path));
                        cy.get('@pagesByComments').texts('.domain-page-metric').should('arrayMatch', test.topPages.byComments.map(p => p.metric));
                    }
                }));
    });
});
