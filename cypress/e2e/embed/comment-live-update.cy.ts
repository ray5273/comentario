import { COOKIES, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';

context('Live comment update', () => {

    const host = DOMAINS.localhost.host;
    const pagePath = TEST_PATHS.comments;

    beforeEach(cy.backendReset);

    it('updates comments for anonymous user', () => {
        cy.testSiteVisit(pagePath);
        cy.commentTree('html', 'author', 'score', 'sticky')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                `);

        // Add a comment via API and expect a new comment to arrive
        cy.testSiteLoginViaApi(USERS.ace);
        cy.commentAddViaApi(host, pagePath, null, 'New comment');
        cy.commentTree('html', 'author', 'score', 'sticky')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                - author: Captain Ace
                  html: <p>New comment</p>
                  score: 0
                  sticky: false
                `);

        // Now add a child comment
        cy.testSiteLoginViaApi(USERS.king);
        cy.commentAddViaApi(host, pagePath, '0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'Another comment');
        cy.commentTree('html', 'author', 'score', 'sticky')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  children:
                  - author: Engineer King
                    html: <p>Another comment</p>
                    score: 0
                    sticky: false
                - author: Captain Ace
                  html: <p>New comment</p>
                  score: 0
                  sticky: false
                `);
    });

    it('updates comments for authenticated user', () => {
        cy.testSiteLoginViaApi(USERS.ace, pagePath);
        cy.commentTree('html', 'author', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                `);

        // Add a child comment
        cy.testSiteLoginViaApi(USERS.king);
        cy.commentAddViaApi(host, pagePath, '0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'Foo comment');
        cy.commentTree('html', 'author', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Engineer King
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                `);

        // Add an anonymous comment
        cy.clearCookie(COOKIES.embedCommenterSession);
        cy.commentAddViaApi(host, pagePath, null, 'Bar comment');
        cy.commentTree('html', 'author', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Engineer King
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Anonymous
                  html: <p>Bar comment</p>
                  score: 0
                  sticky: false
                  pending: true
                `);
    });
});
