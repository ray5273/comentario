import { TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Comment Editor', () => {

    beforeEach(cy.backendReset);

    context('on comment page', () => {

        it('can be entered and canceled', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Verify comments
            cy.commentTree('id').should('have.length', 1);

            // Focus the host, the editor should be inserted
            cy.get('@addCommentHost').focus()
                .should('have.class', 'comentario-editor-inserted')
                .find('form').as('editor').should('be.visible')
                .find('textarea').should('be.focused').should('have.value', '')
                // Type some text, then press Esc, and the editor's gone
                .type('Hi there{esc}');
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree('id').should('have.length', 1);

            // Open the editor by clicking it
            cy.get('@addCommentHost').click()
                // The value is reset
                .find('form textarea').as('textarea').should('be.focused').and('have.value', '')
                // Test validation: try to submit an empty comment
                .type('{ctrl+enter}')
                    .should('have.class', 'comentario-touched')
                    .should('match', ':invalid')
                    .should('not.match', ':valid')
                // Type in some text
                .type('Hey')
                    .should('not.match', ':invalid')
                    .should('match', ':valid');

            // Click on Cancel, the editor is gone again
            cy.get('@editor').contains('.comentario-comment-editor-buttons button', 'Cancel').click();
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree('id').should('have.length', 1);
        });

        it('submits anonymous comment', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Submit a root comment
            EmbedUtils.addComment(undefined, 'This is also a root', true);

            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: Anonymous
                  html: <p>This is also a root</p>
                  score: 0
                  sticky: false
                  pending: true
                `);

            // Add a reply
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply here!', true);

            // New comment is added, also in the Pending state
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Anonymous
                    html: <p>A reply here!</p>
                    score: 0
                    sticky: false
                    pending: true
                - author: Anonymous
                  html: <p>This is also a root</p>
                  score: 0
                  sticky: false
                  pending: true
                `);
        });

        it('submits non-anonymous comment', () => {
            // Visit the page as anonymous
            cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);
            EmbedUtils.makeAliases();

            // Submit a root comment
            EmbedUtils.addComment(undefined, 'Here goes', false);

            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: Commenter One
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);

            // Add a reply
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply *here*!', false);

            // New comment is added, also in the Pending state
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Commenter One
                    html: <p>A reply <em>here</em>!</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Commenter One
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);
        });
    });
});
