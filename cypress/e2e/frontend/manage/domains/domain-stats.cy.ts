import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../../support/cy-utils';

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

                    // Check chart
                    cy.get('@domainStats').find('.stats-chart-info').should('have.text', 'Last 30 days.').and('be.visible');
                    cy.get('@domainStats').metricCards().should('yamlMatch', '[{label: Views, value: 217}, {label: Comments, value: 33}]');

                    // View a page and wait for the comments to be loaded
                    cy.testSiteVisit(TEST_PATHS.home);
                    cy.commentTree().should('have.length', 2);

                    // Back to the stats page
                    cy.visit(pagePath);
                    cy.get('app-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 218}, {label: Comments, value: 33}]');

                    // Visit another page and leave a comment
                    cy.testSiteVisit(TEST_PATHS.noComment);
                    cy.get('comentario-comments .comentario-add-comment-host').focus()
                        .find('form').as('editor');
                    cy.get('@editor').contains('label', 'Comment anonymously').click();
                    cy.get('@editor').find('textarea').setValue('Hey there').type('{ctrl+Enter}');
                    cy.commentTree().should('have.length', 1);

                    // Back to the stats page
                    cy.visit(pagePath);
                    cy.get('app-stats-chart').metricCards().should('yamlMatch', '[{label: Views, value: 219}, {label: Comments, value: 34}]');
                }));
    });
});
