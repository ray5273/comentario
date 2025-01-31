import { COOKIES, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Live comment update', () => {

    const host = DOMAINS.localhost.host;
    const pagePath = TEST_PATHS.comments;

    beforeEach(cy.backendReset);

    it('updates comments for anonymous user', () => {
        cy.testSiteVisit(pagePath);
        EmbedUtils.makeAliases({anonymous: true, numComments: 1});
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
        EmbedUtils.checkNumComments(2);
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
        EmbedUtils.checkNumComments(3);
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
        EmbedUtils.makeAliases({numComments: 1});
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
        EmbedUtils.checkNumComments(2);
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
        cy.commentAddViaApi(host, pagePath, null, 'Bar comment').its('body.comment.id').as('anonCommentId');
        EmbedUtils.checkNumComments(3);
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

        // Delete the first comment
        cy.testSiteLoginViaApi(USERS.king);
        cy.commentDeleteViaApi('0b5e258b-ecc6-4a9c-9f31-f775d88a258b');
        EmbedUtils.checkNumComments(3);
        cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago, deleted by moderator just now
                  html: (deleted) # Text is gone
                  score: null     # No score anymore
                  sticky: false   # Not sticky anymore
                  pending: false
                  children:
                  - author: Engineer King
                    subtitle: just now
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Anonymous
                  subtitle: just now
                  html: <p>Bar comment</p>
                  score: 0
                  sticky: false
                  pending: true
                `);

        // Approve the last added comment
        cy.get<string>('@anonCommentId').then(id => cy.commentModerateViaApi(id, true));
        EmbedUtils.checkNumComments(3);
        cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago, deleted by moderator just now
                  html: (deleted) 
                  score: null
                  sticky: false
                  pending: false
                  children:
                  - author: Engineer King
                    subtitle: just now
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Anonymous
                  subtitle: just now
                  html: <p>Bar comment</p>
                  score: 0
                  sticky: false
                  pending: false  # Not pending anymore
                `);

        // Vote for the last comment
        cy.get<string>('@anonCommentId').then(id => cy.commentVoteViaApi(id, -1));
        EmbedUtils.checkNumComments(3);
        cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago, deleted by moderator just now
                  html: (deleted)
                  score: null
                  sticky: false
                  pending: false
                  children:
                  - author: Engineer King
                    subtitle: just now
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Anonymous
                  subtitle: just now
                  html: <p>Bar comment</p>
                  score: -1  # Score is updated
                  sticky: false
                  pending: false
                `);

        // Sticky the last comment
        cy.get<string>('@anonCommentId').then(id => cy.commentStickyViaApi(id, true));
        EmbedUtils.checkNumComments(3);
        cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago, deleted by moderator just now
                  html: (deleted)
                  score: null
                  sticky: false
                  pending: false
                  children:
                  - author: Engineer King
                    subtitle: just now
                    html: <p>Foo comment</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Anonymous
                  subtitle: just now
                  html: <p>Bar comment</p>
                  score: -1
                  sticky: true # It's sticky now
                  pending: false
                `);
    });

    it('doesn\'t update comments when disabled', () => {
        // Navigate to the page that has live update disabled
        cy.testSiteLoginViaApi(USERS.ace, TEST_PATHS.attr.noLiveUpdate);
        EmbedUtils.makeAliases({hasSortButtons: false, numComments: 0});
        cy.commentTree().should('be.empty');

        // Submit a comment via API
        cy.commentAddViaApi(host, TEST_PATHS.attr.noLiveUpdate, null, 'Phew!');

        // Wait 2 seconds and there's still no comment
        cy.wait(2000);
        EmbedUtils.checkNumComments(0);
        cy.commentTree().should('be.empty');

        // Reload and the comment is there
        cy.reload();
        EmbedUtils.makeAliases({numComments: 1});
        cy.commentTree('html', 'author', 'subtitle')
            .should('yamlMatch',
                // language=yaml
                `
                - author: Captain Ace
                  subtitle: just now
                  html: <p>Phew!</p>
                `);
    });
});
