import { TEST_PATHS } from '../support/cy-utils';

/** Settings for checking comment page layout. */
interface LayoutSettings {
    /** Expected page heading. */
    heading: string;
    /** Whether the comments are read-only. */
    readonly?: boolean;
    /** Moderation notice, if any. */
    notice?: string;
}

context('Comments', () => {

    beforeEach(cy.backendReset);

    /**
     * Check comment page layout and create corresponding aliases.
     */
    const checkLayout = (settings: LayoutSettings) => {
        // Verify headings
        cy.get('h1').should('have.text', settings.heading);
        cy.get('h2#comments').should('have.text', 'Comments');

        // Check root
        cy.get('comentario-comments').should('be.visible')
            .find('.comentario-root').as('root')
            .should('be.visible')
            .should('have.class', 'comentario-root-font');

        // Check Profile bar
        cy.get('@root').find('.comentario-profile-bar').as('profileBar')
            .should('be.visible')
            .find('button').should('have.text', 'Login');

        // Check main area
        cy.get('@root').find('.comentario-main-area').as('mainArea')
            .should('be.visible');
        if (settings?.readonly) {
            // No add comment host if readonly
            cy.get('@mainArea').find('.comentario-add-comment-host').should('not.exist');
        } else {
            cy.get('@mainArea').find('.comentario-add-comment-host').as('addCommentHost').should('be.visible');
        }

        // Check sort buttons
        cy.get('@mainArea').find('.comentario-sort-policy-buttons-container').should('be.visible');

        // Check comments
        cy.get('@mainArea').find('.comentario-comments').as('comments').should('exist');

        // Check footer
        cy.get('@root').find('.comentario-footer').as('footer')
            .should('be.visible')
            .find('a')
            .should('have.text', 'Powered by Comentario')
            .should('have.attr', 'href', 'https://comentario.app/');

        // Check any moderation notice
        cy.get('@mainArea').find('.comentario-moderation-notice').should(el => {
            if (settings.notice) {
                expect(el.text()).eq(settings.notice);
            } else {
                expect(el).not.to.exist;
            }
        });
    };

    it('displays comments on home page', () => {
        cy.visitTestSite(TEST_PATHS.home);

        // Verify layout
        checkLayout({
            heading: 'Comentario test',
        });

        // Verify comments
        cy.commentTree('id', 'html', 'author', 'score')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - id: ef81dbe5-22f6-4d90-958f-834e6f2cdc63
                  author: Captain Ace
                  html: <p>Alright crew, let's gather around for a quick meeting. We've got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>
                  score: 8
                  children:
                  - id: 40330ddf-13de-4921-b123-7a32057988cd
                    author: Engineer King
                    html: <p>What's on the agenda, captain?</p>
                    score: 0
                    children:
                    - id: 788c0b17-a922-4c2d-816b-98def34a0008
                      author: Captain Ace
                      html: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                      score: 0
                      children:
                      - id: 82acadba-3e77-4bcd-a366-78c7ff56c3b9
                        author: Engineer King
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                        score: 0
                      - id: 64fb0078-92c8-419d-98ec-7f22c270ef3a
                        author: Commenter Two
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        score: 4
                        children:
                        - id: e8331f48-516d-45fc-80a1-d1b2d5a21d08
                          author: Captain Ace
                          html: <p>Good work, navigator. That's what I was thinking too.</p>
                          score: 0
                    - id: 9a93d7bd-80cb-49bd-8dc1-67326df6fcaf
                      author: Captain Ace
                      html: <p>What about supplies, cook?</p>
                      score: 0
                      children:
                      - id: da05d978-9218-4263-886e-542068251787
                        author: Cook Queen
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        score: 4
                        children:
                        - id: 4922acc5-0330-4d1a-8092-ca7c67536b08
                          author: Captain Ace
                          html: <p>Absolutely, cook. I'll make a note of it.</p>
                          score: 0
                - id: bc460a63-f256-47e3-8915-3931acad132a
                  author: Captain Ace
                  html: <p>Now, is there anything else anyone wants to bring up?</p>
                  score: 0
                  children:
                  - id:  5f066198-03ab-41f8-bd80-c4efaeafd153
                    author: Engineer King 
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    score: 0
                    children:
                    - id: 00e7320a-ecb4-44f4-84ca-ffc2f8c62729
                      author: Captain Ace
                      html: <p>Alright, engineer. Let's schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                      score: 2
                  - id: cb057a9b-e293-4e15-bdb9-c11880cb53bf
                    author: Navigator Jack
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    score: -2
                    children:
                    - id: 72314bae-a05d-4551-91df-270802e6b003
                      author: Captain Ace
                      html: <p>Good point, navigator. I'll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                      score: 0
                      children:
                      - id: 8f31a61b-e1e6-4090-a426-52ce91a5181b
                        author: Cook Queen
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        score: 6
                        children:
                        - id: 069f98da-bbc5-40ad-8c91-e8a089288ecb
                          author: Captain Ace
                          html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                          score: 0
                `);
    });

    it('shows page with a comment', () => {
        cy.visitTestSite(TEST_PATHS.comments);

        // Verify layout
        checkLayout({
            heading: 'Comments',
        });

        // Verify comments
        cy.commentTree('id', 'html', 'author', 'score', 'sticky')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b
                  author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                `);
    });

    it('shows page without comments', () => {
        cy.visitTestSite(TEST_PATHS.noComment);

        // Verify layout
        checkLayout({
            heading: 'No comment',
        });

        // Verify comments
        cy.commentTree().should('yamlMatch', '');
    });

    it('shows readonly page', () => {
        cy.visitTestSite(TEST_PATHS.readonly);

        // Verify layout
        checkLayout({
            heading:  'Read-only',
            readonly: true,
            notice:   'This thread is locked. You cannot add new comments.',
        });

        // Verify comments
        cy.commentTree().should('yamlMatch', '');
    });

    context('comment editor', () => {

        beforeEach(() => {
            // Go to the Comments page
            cy.visitTestSite(TEST_PATHS.comments);

            // Verify layout / create aliases
            checkLayout({
                heading: 'Comments',
            });
        });

        it('can be entered and canceled', () => {
            // Verify comments
            cy.commentTree('id').should('yamlMatch', `- id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b`);

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
            cy.commentTree('id').should('yamlMatch', `- id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b`);

            // Now open the editor by clicking
            cy.get('@addCommentHost').click();
            cy.get('@editor').should('be.visible')
                // The value is reset
                .find('textarea').should('be.focused').should('have.value', '')
                .type('Hey');

            // Click on Cancel, the editor is gone again
            cy.get('@editor').contains('.comentario-comment-editor-buttons button', 'Cancel').click();
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree('id').should('yamlMatch', `- id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b`);
        });

        it('validates input', () => {
            // Try to submit an empty comment
            cy.get('@addCommentHost').click()
                .find('form textarea').as('textarea').type('{ctrl+enter}')
                .should('have.class', 'comentario-touched')
                .should('match', ':invalid');

            // Still one comment
            cy.commentTree('id').should('yamlMatch', `- id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b`);
        });

        it('submits root comment', () => {
            // Submit anonymous comment
            cy.get('@addCommentHost').focus()
                .find('form').as('editor');
            cy.get('@editor').find('textarea').setValue('This is **bold** *italic* `code` ~~strikethrough~~');
            cy.get('@editor').contains('label', 'Comment anonymously').click();
            cy.get('@editor').find('.comentario-comment-editor-buttons button[type=submit]')
                .should('have.text', 'Add Comment')
                .click();
            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending')
                .should(
                    'yamlMatch',
                    // language=yaml
                    `
                    - author: Anonymous
                      html: <p>This is a <b>root</b>, sticky comment</p>
                      score: 0
                      sticky: true
                      pending: false
                    - author: Anonymous
                      html: <p>This is <strong>bold</strong> <em>italic</em> <code>code</code> <del>strikethrough</del></p>
                      score: 0
                      sticky: false
                      pending: true
                    `);

        });
    });
});
