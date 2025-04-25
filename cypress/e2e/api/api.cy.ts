import { PATHS, USERS } from '../../support/cy-utils';
import Cookie = Cypress.Cookie;

context('API', () => {

    before(cy.backendReset);

    context('XSRF protection', () => {

        it('protects AuthSignup endpoint', () => {
            cy.request({
                method: 'POST',
                url:    '/api/auth/profile',
                body:   {
                    name:     'John',
                    email:    'john@example.org',
                    password: 'Passw0rd!!!',
                },
                failOnStatusCode: false,
            }).then(r => {
                expect(r.status).eq(403);
                expect(r.body).deep.eq({
                    id:      'xsrf-token-invalid',
                    message: 'XSRF token is missing or invalid',
                    details: 'referer not supplied',
                });
            });
        });

        it('issues new token cookie on CurUserGet', () => {
            // No cookies initially and the user isn't logged in
            cy.getCookie('XSRF-TOKEN')   .should('be.null');
            cy.getCookie('_xsrf_session').should('be.null');
            cy.request('GET', '/api/user').its('status').should('eq', 204);

            // After a call to the user endpoint, both cookies must be set
            cy.getCookie('XSRF-TOKEN')   .should('not.be.null').as('token');
            cy.getCookie('_xsrf_session').should('not.be.null').as('session');

            // Log in
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.dashboard);
            cy.request('GET', '/api/user').its('status').should('eq', 200);

            // After another call to the user endpoint the token cookie has been renewed
            cy.getCookie('XSRF-TOKEN').should('not.be.null')
                .then(c => cy.get<Cookie>('@token').then(t => expect(c.value).not.eq(t.value)));
            // But the session cookie stays the same
            cy.getCookie('_xsrf_session').should('not.be.null')
                .then(c => cy.get<Cookie>('@session').then(s => expect(c).deep.eq(s)));
        });
    });
});
