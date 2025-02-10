import { DOMAINS, TEST_PATHS, UI_LANGUAGES } from '../../support/cy-utils';

context('API / Embed', () => {

    before(cy.backendReset);

    context('i18n', () => {

        let numAssets: number;

        // Determine the number of expected entries by looking at the en.yaml file
        before(() => cy.readFile('resources/i18n/en.yaml', 'utf-8')
            .then((data: string) => numAssets = data.match(/\{id:/g).length));

        const expectMessagesLang = (code: string, lang: string) => {
            cy.request({url: `/api/embed/i18n/${code}/messages`, followRedirect: false}).then(r => {
                expect(r.status).eq(200);
                expect(r.body).to.not.be.null;
                expect(Object.keys(r.body)).to.have.length(numAssets + 1); // An extra item for _lang
                expect(r.body._lang).to.equal(lang);
            });
        };

        context('known languages', () => {

            Object.entries(UI_LANGUAGES)
                .forEach(([code, name]) =>
                    it(`serves messages in ${code} - ${name}`, () => expectMessagesLang(code, code)));
        });

        context('fallback languages', () => {
            [
                {code: 'unknown',    want: 'en'},
                {code: 'en-US',      want: 'en'},
                {code: 'en-GB',      want: 'en'},
                {code: 'en-AU',      want: 'en'},
                {code: 'pt-br',      want: 'pt-BR'},
                {code: 'pt',         want: 'pt-BR'},
                {code: 'ru',         want: 'ru'},
                {code: 'ru-ru',      want: 'ru'},
                {code: 'ru-by',      want: 'ru'},
                {code: 'ru-UNKNOWN', want: 'ru'},
                {code: 'zh',         want: 'zh-Hans'},
                {code: 'zh-hans',    want: 'zh-Hans'},
                {code: 'zh-hans-my', want: 'zh-Hans'},
                {code: 'zh-my',      want: 'zh-Hant'}, // This is unexpected, but may not worth to hard-code it, so leave it anyway
                {code: 'zh-sg',      want: 'zh-Hans'},
                {code: 'zh-tw',      want: 'zh-Hant'},
            ]
                .forEach(test =>
                    it(`serves messages for ${test.code} as ${test.want}`,
                        () => expectMessagesLang(test.code, test.want)));
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
                    [TEST_PATHS.comments]:  1,
                    [TEST_PATHS.noComment]: 0,
                });
            });
        });
    });
});
