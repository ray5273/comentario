const { config } = Cypress;
const baseUrl = config('baseUrl');

/**
 * Request the backend to reset the database and all the settings to test defaults.
 */
Cypress.Commands.add('backendReset', () =>
    cy.request('POST', '/api/e2e/reset').its('status').should('eq', 204));

Cypress.Commands.add('isAt', (expected: string | RegExp, ignoreQuery?: boolean) => cy.url().should((url) => {
    // Strip off any parameters before comparing
    url = url.replace(/;.*$/, '');

    // Strip off any query params, if needed
    if (ignoreQuery) {
        url = url.replace(/\?.*$/, '');
    }

    // The URL must begin with the base URL
    expect(url.substring(0, baseUrl.length)).eq(baseUrl);

    // Compare the path part
    const actual = url.substring(baseUrl.length);
    if (expected instanceof RegExp) {
        expect(actual).to.match(expected);
    } else {
        expect(actual).eq(expected);
    }
}));
