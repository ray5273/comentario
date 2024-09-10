import { DOMAINS, TEST_PATHS, UI_LANGUAGES } from '../../support/cy-utils';

context('API', () => {

    before(cy.backendReset);

    context('i18n', () => {

        let numAssets: number;

        // Determine the number of expected entries by looking at the en.yaml file
        before(() => cy.readFile('resources/i18n/en.yaml', 'utf-8')
            .then((data: string) => numAssets = data.match(/\{id:/g).length));

        const expectMessagesLang = (code: string, expected: string) => {
            cy.request({url: `/api/embed/i18n/${code}/messages`, followRedirect: false}).then(r => {
                expect(r.status).eq(200);
                expect(typeof r.body === 'object' && !Array.isArray(r.body) && r.body !== null).true;

                const { _lang: lang, ...messages } = r.body;
                expect(lang).eq(expected);
                expect(Object.keys(messages).length).eq(numAssets);
            });
        }

        Object.entries(UI_LANGUAGES)
            .forEach(([code, name]) =>
                it(`serves messages in ${code} - ${name}`, () => expectMessagesLang(code, code)));

        const expectedLang = {
            'unknown': 'en',
            'pt-br': 'pt-BR',
            'pt': 'pt-BR',
            'zh': 'zh-Hans',
            'zh-hans': 'zh-Hans',
            'zh-hans-my': 'zh-Hans',
            'zh-my': 'zh-Hant', // This is unexpected, but may not worth to hard-code it, so leave it anyway
            'zh-sg': 'zh-Hans',
            'zh-tw': 'zh-Hant',
        }

        Object.entries(expectedLang)
            .forEach(([code, expected]) =>
                it(`serves messages for unsupported languages or fallbacks: ${code} -> ${expected}`, () => expectMessagesLang(code, expected)));
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
