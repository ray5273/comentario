import { DOMAINS, TEST_PATHS } from '../../support/cy-utils';

context('API', () => {

    before(cy.backendReset);

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
