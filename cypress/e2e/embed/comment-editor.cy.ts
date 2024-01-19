import { DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Comment Editor', () => {

    beforeEach(cy.backendReset);

    context('on comment page', () => {

        const addAnonymousComment = (clickAnonymous: boolean) => {
            // Submit a root comment. First time a Login dialog may appear
            EmbedUtils.addComment(undefined, 'This is also a root', clickAnonymous);

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

            // Add a reply: no login dialog will appear second time
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply here!', false);

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
        };

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
            cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Cancel').click();
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree('id').should('have.length', 1);
        });

        it('submits anonymous comment, choosing Comment anonymously in Login dialog', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Add comment
            addAnonymousComment(true);
        });

        it('submits anonymous comment directly when only anonymous is enabled', () => {
            // Allow only anonymous comments
            cy.backendPatchDomain(DOMAINS.localhost.id, {authLocal: false, authSso: false});
            cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);

            // Visit the page as anonymous: there's no Login button
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true, login: false});

            // Add comment
            addAnonymousComment(false);
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

        it('allows to preview comment text', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Open editor and add text
            const text = '## Apples and oranges\n\n' +
                '* Apples\n' +
                '* Oranges\n\n' +
                '```bash\n' +
                'echo "I\'m a code block"\n' +
                '```';
            cy.get('.comentario-root .comentario-add-comment-host').focus();
            cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');
            cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue(text);

            // Click on "Preview"
            cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview').as('previewBtn').click()
                .should('have.class', 'comentario-btn-active');

            // The textarea is gone and a preview pane is visible
            cy.get('@textarea').should('not.be.visible');
            cy.get('@editor').find('.comentario-comment-editor-preview').as('preview')
                .should('be.visible')
                .invoke('html').should('eq',
                    '<h2>Apples and oranges</h2>\n' +
                    '<ul>\n' +
                    '<li>Apples</li>\n' +
                    '<li>Oranges</li>\n' +
                    '</ul>\n' +
                    '<pre><code>echo "I\'m a code block"\n</code></pre>\n');

            // Deactivate the preview: the editor's back and the preview gone
            cy.get('@previewBtn').click().should('not.have.class', 'comentario-btn-active');
            cy.get('@preview') .should('not.be.visible');
            cy.get('@textarea').should('be.visible').and('be.focused').and('have.value', text);
        });
    });
});
