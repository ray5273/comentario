import { PATHS, USERS } from '../../../support/cy-utils';

context('Dashboard', () => {

    const makeAliases = (chart: boolean) => {
        cy.get('app-dashboard').as('dashboard');

        // Check heading
        cy.get('@dashboard').find('h1').should('have.text', 'Dashboard').and('be.visible');

        // Totals
        cy.get('@dashboard').find('#dashboard-totals').as('totals');

        // Daily stats chart
        if (chart) {
            cy.get('@dashboard').find('#dashboard-daily-stats').as('dailyStats');
            cy.get('@dailyStats').find('h2').should('have.text', 'Daily statistics').and('be.visible');
            cy.get('@dailyStats').find('.stats-chart-info').should('have.text', 'Last 30 days.').and('be.visible');
        } else {
            cy.get('@dashboard').find('#dashboard-daily-stats').should('not.exist');
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
                    - label:    Pages
                      sublabel: you commented on
                      value:    3
                    - label:    Comments
                      sublabel: you authored
                      value:    3
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
                      value:    14
                    - label:    Pages
                      sublabel: you commented on
                      value:    9
                    - label:    Domain users
                      sublabel: you manage
                      value:    6
                    - label:    Comments
                      sublabel: total
                      value:    40
                    - label:    Comments
                      sublabel: you authored
                      value:    17
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      value:    217
                    - label:    Comments
                      value:    40
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
                      value:    17
                    - label:    Pages
                      sublabel: you commented on
                      value:    2
                    - label:    Domain users
                      sublabel: you manage
                      value:    1
                    - label:    Comments
                      sublabel: total
                      value:    40
                    - label:    Comments
                      sublabel: you authored
                      value:    4
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      value:    0
                    - label:    Comments
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
                      value:    18
                    - label:    Domain users
                      sublabel: you manage
                      value:    9
                    - label:    Comments
                      sublabel: total
                      value:    41
                    - label:    Commenters
                      sublabel: total
                      value:    7
                    `,
                dailyMetrics:
                    // language=yaml
                    `
                    - label:    Views
                      value:    217
                    - label:    Comments
                      value:    41
                    `,
            },
        ]
            .forEach(test =>
                it(`for ${test.name}`, () => {
                    cy.loginViaApi(test.user, PATHS.manage.dashboard);
                    makeAliases(test.hasChart);
                    cy.get('@totals').metricCards().should('yamlMatch', test.metrics);
                    if (test.hasChart) {
                        cy.get('@dailyStats').metricCards().should('yamlMatch', test.dailyMetrics);
                    }
                }));
    });
});
