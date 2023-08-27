import JQueryWithSelector = Cypress.JQueryWithSelector;

const { config } = Cypress;
const baseUrl = config('baseUrl');

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

Cypress.Commands.add(
    'setValue',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, s: string) =>
        cy.wrap(element).invoke('val', s).trigger('input').trigger('change').wrap(element));

Cypress.Commands.addQuery(
    'texts',
    function texts(selector?: string) {
        return (element?: HTMLElement) => {
            if (!(element instanceof HTMLElement) && !selector) {
                throw Error('cy.texts(): either element or selector must be provided.');
            }
            return (element ? (selector ? Cypress.$(element).find(selector) : Cypress.$(element)) : Cypress.$(selector))
                .map((i, e) => e.innerText)
                .get();
        };
    });

Cypress.Commands.add(
    'isValid',
    {prevSubject: 'element'},
    (element: JQueryWithSelector) => cy.wrap(element).siblings('.invalid-feedback').should('be.hidden').wrap(element));

Cypress.Commands.add(
    'isInvalid',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, text?: string) =>
        cy.wrap(element).should('have.class', 'is-invalid')
            .siblings('.invalid-feedback').should('be.visible')
            .should(fb => text && expect(fb.text()).eq(text))
            .wrap(element));

Cypress.Commands.add('backendReset', () =>
    cy.request('POST', '/api/e2e/reset').its('status').should('eq', 204));

Cypress.Commands.add('backendGetSentEmails', () =>
    cy.request('/api/e2e/mails').should(response => expect(response.status).to.eq(200)).its('body'));
