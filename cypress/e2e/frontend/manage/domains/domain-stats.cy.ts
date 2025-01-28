import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../../support/cy-utils';
import { EmbedUtils } from '../../../../support/cy-embed-utils';

context('Domain Statistics page', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).stats;

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'read-only',  user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(pagePath, USERS.ace));

    context('shows domain statistics', () => {

        [
            {name: 'superuser', user: USERS.root},
            {name: 'owner',     user: USERS.ace},
        ]
            .forEach(({name, user}) =>
                it(`for ${name}`, () => {
                    cy.loginViaApi(user, pagePath);
                    cy.get('app-domain-stats').as('domainStats');

                    // Check heading
                    cy.get('@domainStats').find('h1').should('have.text', 'Statistics').and('be.visible');
                    cy.get('@domainStats').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

                    // Check the daily chart
                    cy.get('@domainStats').find('.stats-chart-info').should('have.text', 'Last 30 days.').and('be.visible');
                    cy.get('@domainStats').metricCards().should('yamlMatch', '[{label: Views, value: 217}, {label: Comments, value: 40}]');

                    // Verify page views
                    cy.get('@domainStats').find('#stats-page-view-charts').as('pageViewCharts');
                    cy.get('@pageViewCharts').find('#stats-page-views-country').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: US,     value: 36}
                        - {label: DE,     value: 19}
                        - {label: NL,     value: 17}
                        - {label: BR,     value: 11}
                        - {label: ES,     value: 11}
                        - {label: Others, value: 123}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-device').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Computer, value: 187}
                        - {label: Phone,    value: 26}
                        - {label: Unknown,  value: 4}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-browser').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Chrome,    value: 114}
                        - {label: Firefox,   value: 56}
                        - {label: IE,        value: 24}
                        - {label: Safari,    value: 8}
                        - {label: GoogleBot, value: 4}
                        - {label: Others,    value: 11}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-os').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Windows, value: 90}
                        - {label: MacOSX,  value: 48}
                        - {label: Linux,   value: 44}
                        - {label: Android, value: 20}
                        - {label: iOS,     value: 6}
                        - {label: Others,  value: 9}
                        `);

                    // Top pages by views
                    cy.get('@domainStats').find('#stats-top-pages-views').as('byViews');
                    cy.get('@byViews').find('.domain-page-domain') .should('not.exist');
                    cy.get('@byViews').texts('.domain-page-path')  .should('arrayMatch', [TEST_PATHS.home]);
                    cy.get('@byViews').texts('.domain-page-metric').should('arrayMatch', ['217 views']);
                    // Top pages by comments
                    cy.get('@domainStats').find('#stats-top-pages-comments').as('byComments');
                    cy.get('@byComments').find('.domain-page-domain') .should('not.exist');
                    cy.get('@byComments').texts('.domain-page-path')  .should('arrayMatch', [
                        TEST_PATHS.home,
                        TEST_PATHS.attr.maxLevel,
                        TEST_PATHS.dynamic,
                        TEST_PATHS.double,
                        TEST_PATHS.darkMode,
                    ]);
                    cy.get('@byComments').texts('.domain-page-metric').should('arrayMatch', [
                        '16 comments',
                        '6 comments',
                        '3 comments',
                        '2 comments',
                        '2 comments',
                    ]);

                    // View a page and wait for the comments to be loaded
                    cy.testSiteVisit(TEST_PATHS.home);
                    cy.commentTree().should('have.length', 2);

                    // Back to the stats page
                    cy.visit(pagePath);
                    cy.get('app-daily-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 218}, {label: Comments, value: 40}]');
                    cy.get('@pageViewCharts').find('#stats-page-views-country').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: US,     value: 36}
                        - {label: DE,     value: 19}
                        - {label: NL,     value: 17}
                        - {label: BR,     value: 11}
                        - {label: ES,     value: 11}
                        - {label: Others, value: 124}  # Incremented
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-device').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Computer, value: 188}  # Incremented
                        - {label: Phone,    value: 26}
                        - {label: Unknown,  value: 4}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-browser').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Chrome,    value: 115}  # Incremented
                        - {label: Firefox,   value: 56}
                        - {label: IE,        value: 24}
                        - {label: Safari,    value: 8}
                        - {label: GoogleBot, value: 4}
                        - {label: Others,    value: 11}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-os').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Windows, value: 90}
                        - {label: MacOSX,  value: 48}
                        - {label: Linux,   value: 45}  # Incremented
                        - {label: Android, value: 20}
                        - {label: iOS,     value: 6}
                        - {label: Others,  value: 9}
                        `);
                    cy.get('@byViews').texts('.domain-page-metric').should('arrayMatch', ['218 views']);

                    // Visit another page and leave a comment
                    cy.testSiteVisit(TEST_PATHS.noComment);
                    EmbedUtils.addComment(undefined, 'Hey', true);
                    cy.commentTree().should('have.length', 1);

                    // Back to the stats page
                    cy.visit(pagePath);
                    cy.get('app-daily-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 219}, {label: Comments, value: 41}]');
                    cy.get('@pageViewCharts').find('#stats-page-views-country').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: US,     value: 36}
                        - {label: DE,     value: 19}
                        - {label: NL,     value: 17}
                        - {label: BR,     value: 11}
                        - {label: ES,     value: 11}
                        - {label: Others, value: 125}  # Incremented
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-device').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Computer, value: 189}  # Incremented
                        - {label: Phone,    value: 26}
                        - {label: Unknown,  value: 4}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-browser').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Chrome,    value: 116}  # Incremented
                        - {label: Firefox,   value: 56}
                        - {label: IE,        value: 24}
                        - {label: Safari,    value: 8}
                        - {label: GoogleBot, value: 4}
                        - {label: Others,    value: 11}
                        `);
                    cy.get('@pageViewCharts').find('#stats-page-views-os').pieChartLegend().should('yamlMatch',
                        // language=yaml
                        `
                        - {label: Windows, value: 90}
                        - {label: MacOSX,  value: 48}
                        - {label: Linux,   value: 46}  # Incremented
                        - {label: Android, value: 20}
                        - {label: iOS,     value: 6}
                        - {label: Others,  value: 9}
                        `);
                    cy.get('@byViews').texts('.domain-page-path')  .should('arrayMatch', [TEST_PATHS.home, TEST_PATHS.noComment]);
                    cy.get('@byViews').texts('.domain-page-metric').should('arrayMatch', ['218 views', '1 views']);
                }));
    });
});
