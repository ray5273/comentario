import { DOMAINS, TEST_PATHS, UI_LANGUAGES } from '../../support/cy-utils';

context('API', () => {

    before(cy.backendReset);

    context('i18n', () => {

        let numAssets: number;

        // Determine the number of expected entries by looking at the en.yaml file
        before(() => cy.readFile('resources/i18n/en.yaml', 'utf-8')
            .then((data: string) => numAssets = data.match(/\{id:/g).length));

        Object.entries(UI_LANGUAGES)
            .forEach(([code, name]) =>
                it(`serves messages in ${code} - ${name}`, () => {
                    cy.request({url: `/api/embed/i18n/${code}/messages`, followRedirect: false}).then(r => {
                        expect(r.status).eq(200);
                        expect(typeof r.body === 'object' && !Array.isArray(r.body) && r.body !== null).true;

                        const { _lang: lang, ...messages } = r.body;
                        expect(lang).eq(code);
                        expect(Object.keys(messages).length).eq(numAssets);
                    });
                }));

        it('redirects to en on an unknown language', () => {
            cy.request({url: '/api/embed/i18n/xx-yz/messages', followRedirect: false}).then(r => {
                expect(r.status).eq(307);
                expect(r.headers.location).eq(`${Cypress.config().baseUrl}/api/embed/i18n/en/messages`);
            });
        });
    });

    context('EmbedCommentCount', () => {

        it('returns comment counts for existing paths', () => {
            cy.request({
                method: 'POST',
                url:    '/api/embed/comments/counts',
                body:   {
                    host:  DOMAINS.localhost.host,
                    paths: [TEST_PATHS.home, TEST_PATHS.comments, TEST_PATHS.noComment, "/foo"],
                },
            }).then(r => {
                expect(r.status).eq(200);
                expect(r.body.commentCounts).deep.eq({
                    [TEST_PATHS.home]:      17,
                    [TEST_PATHS.comments]:  0,
                    [TEST_PATHS.noComment]: 0,
                });
            });
        });
    });
});
