import JQueryWithSelector = Cypress.JQueryWithSelector;

// @ts-ignore
const { config, $ } = Cypress;
const baseUrl = config('baseUrl');

/** The base URL for the test site. */
const testSiteUrl = Cypress.env('TEST_SITE_URL') || 'http://localhost:8000/';

const commentDeepMap = (c: Cypress.Comment, props: (keyof Cypress.Comment)[]) => {
    const x: any = {};
    props.forEach(p => x[p] = c[p]);
    if (c.children?.length) {
        x.children = c.children.map(child => commentDeepMap(child, props));
    }
    return x;
};

const getChildComments = (root: Element): Cypress.Comment[] =>
    // Query comment cards
    Array.from(root.children)
        // Filter comment cards
        .filter(c => c.classList.contains('comentario-card'))
        // Turn the card into a comment
        .map(c => $(c))
        .map($card => {
            const $self     = $card.find('> .comentario-card-self');
            const $header   = $self.find('> .comentario-card-header');
            const $options  = $self.find('> .comentario-options');
            const c: Cypress.Comment = {
                id:        $self.attr('id')?.replace('comentario-', ''),
                html:      $self.find(' > .comentario-card-body').html(),
                author:    $header.find('.comentario-name').html(),
                score:     Number($options.find('.comentario-score').html()),
                upvoted:   $options.find('.comentario-button[title=Upvote]')  .hasClass('comentario-upvoted'),
                downvoted: $options.find('.comentario-button[title=Downvote]').hasClass('comentario-downvoted'),
                sticky:    !!$options.find('.comentario-is-sticky').length,
                pending:   $self.hasClass('comentario-pending'),
            };

            // Recurse children, if any
            const $children = $card.find('> .comentario-card-children');
            if ($children.length) {
                const ch = getChildComments($children[0]);
                if (ch.length) {
                    c.children = ch;
                }
            }
            return c;
        });

Cypress.Commands.addQuery(
    'commentTree',
    function commentTree(...properties: (keyof Cypress.Comment)[]) {
        return () => {
            // Collect the commments
            let cc = $('.comentario-comments').map((_, c) => getChildComments(c)).get();
            // Map properties, if needed
            return properties.length ? cc.map(c => commentDeepMap(c, properties)) : cc;
        };
    });

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
            return (element ? (selector ? $(element).find(selector) : $(element)) : $(selector))
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

Cypress.Commands.add(
    'visitTestSite',
    {prevSubject: false},
    (path: string) => cy.visit(`${testSiteUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`));

Cypress.Commands.add('backendReset', () =>
    cy.request('POST', '/api/e2e/reset').its('status').should('eq', 204));

Cypress.Commands.add('backendGetSentEmails', () =>
    cy.request('/api/e2e/mails').should(response => expect(response.status).to.eq(200)).its('body'));
