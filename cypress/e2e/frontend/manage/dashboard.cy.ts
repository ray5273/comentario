import { PATHS, USERS } from '../../../support/cy-utils';
const { $ } = Cypress;

context('Dashboard', () => {

    const makeAliases = (chart: boolean) => {
        cy.get('app-dashboard').as('dashboard');

        // Check heading
        cy.get('@dashboard').find('h1').should('have.text', 'Dashboard').and('be.visible');

        // Cards
        cy.get('@dashboard').find('#dashboard-totals').as('totals');
        cy.get('@totals').find('app-metric-card').as('cards');

        // Daily stats chart
        if (chart) {
            cy.get('@dashboard').find('#dashboard-daily-stats').as('dailyStats');
            cy.get('@dailyStats').find('h2').should('have.text', 'Daily statistics').and('be.visible');
            cy.get('@dailyStats').find('.stats-chart-info').should('have.text', 'Last 30 days.').and('be.visible');
            cy.get('@dailyStats').find('app-stats-chart app-metric-card').as('dailyStatsCards');
        } else {
            cy.get('@dashboard').find('#dashboard-daily-stats').should('not.exist');
        }
    };

    /** Collect metric cards and verify them against the expectation provided as a YAML string/ */
    const checkCardTexts = (alias: string, expected: string) => cy.get(alias)
        .should(cards => {
            const actual = cards
                .map((_, card) => {
                    const c = $(card);
                    return {
                        label:    c.find('.metric-label').text(),
                        sublabel: c.find('.metric-sublabel').text(),
                        value:    Number(c.find('.metric-value').text()),
                    };
                })
                .get();
            // Wrap the check in the same should() to allow re-querying
            expect(actual).to.yamlMatch(expected);
        });

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

    context('shows metrics', () => {

        [
            {
                name:     'user without domains',
                user:     USERS.commenterOne,
                hasChart: false,
                metrics:
                    // language=yaml
                    `
                    - label:    Domains
                      sublabel: you're commenter on
                      value:    0
                    `,
            },
            {
                name: 'commenter user',
                user: USERS.commenterTwo,
                hasChart: false,
                metrics:
                    // language=yaml
                        `
                    - label:    Domains
                      sublabel: you're commenter on
                      value:    1
                    `,
            },
            {
                name: 'owner user',
                user: USERS.ace,
                hasChart: true,
                metrics:
                    // language=yaml
                    `
                    - label:    Domains
                      sublabel: you own
                      value:    1
                    - label:    Domains
                      sublabel: you're commenter on
                      value:    0
                    - label:    Pages
                      sublabel: you moderate
                      value:    12
                    - label:    Domain users
                      sublabel: you manage
                      value:    6
                    - label:    Comments
                      sublabel: total
                      value:    33
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      sublabel: ''
                      value:    217
                    - label:    Comments
                      sublabel: ''
                      value:    33
                    `,
            },
            {
                name: 'user with multiple roles',
                user: USERS.king,
                hasChart: true,
                metrics:
                // language=yaml
                    `
                    - label:    Domains
                      sublabel: you own
                      value:    1
                    - label:    Domains
                      sublabel: you moderate
                      value:    1
                    - label:    Domains
                      sublabel: you're commenter on
                      value:    1
                    - label:    Domains
                      sublabel: you're read-only on
                      value:    1
                    - label:    Pages
                      sublabel: you moderate
                      value:    15
                    - label:    Domain users
                      sublabel: you manage
                      value:    1
                    - label:    Comments
                      sublabel: total
                      value:    33
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      sublabel: ''
                      value:    0
                    - label:    Comments
                      sublabel: ''
                      value:    0
                    `,
            },
            {
                name: 'superuser',
                user: USERS.root,
                hasChart: true,
                metrics:
                    // language=yaml
                    `
                    - label:    Users
                      sublabel: total
                      value:    16
                    - label:    Domains
                      sublabel: you're commenter on
                      value:    0
                    - label:    Pages
                      sublabel: you moderate
                      value:    16
                    - label:    Domain users
                      sublabel: you manage
                      value:    9
                    - label:    Comments
                      sublabel: total
                      value:    34
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      sublabel: ''
                      value:    217
                    - label:    Comments
                      sublabel: ''
                      value:    34
                    `,
            },
        ]
            .forEach(test =>
                it(`for ${test.name}`, () => {
                    cy.loginViaApi(test.user, PATHS.manage.dashboard);
                    makeAliases(test.hasChart);
                    checkCardTexts('@cards', test.metrics);
                    if (test.hasChart) {
                        checkCardTexts('@dailyStatsCards', test.dailyMetrics);
                    }
                }));
    });
});
