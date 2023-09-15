import { TEST_PATHS } from '../support/cy-utils';

/** Settings for checking comment page layout. */
interface LayoutSettings {
    /** Expected page heading. */
    heading: string;
    /** Whether there's an h2 heading on the page. Defaults to true. */
    hasSubheading?: boolean;
    /** Root selector for Comentario, defaults to 'comentario-comments'. */
    rootSelector?: string;
    /** Whether the comments are read-only. */
    readonly?: boolean;
    /** Whether root font is applied. Defaults to true. */
    hasRootFont?: boolean;
    /** Moderation notice, if any. */
    notice?: string;
}

context('Embed', () => {

    beforeEach(cy.backendReset);

    /**
     * Check comment page layout and create corresponding aliases.
     */
    const checkLayout = (settings: LayoutSettings) => {
        // Verify headings
        cy.get('h1').should('have.text', settings.heading);
        if (settings.hasSubheading ?? true) {
            cy.get('h2#comments').should('have.text', 'Comments');
        }

        // Check root
        cy.get(settings.rootSelector || 'comentario-comments').should('be.visible')
            .find('.comentario-root').as('root')
            .should('be.visible')
            .should(settings.hasRootFont === false ? 'not.have.class' : 'have.class', 'comentario-root-font');

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
            cy.get('@mainArea').find('.comentario-add-comment-host').as('addCommentHost').should('exist');
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

    /**
     * Find and return a titled option button for a comment with the given ID.
     * @param id Comment ID.
     * @param title Button title.
     */
    const commentOptionButton = (id: string, title: string) =>
        cy.get('@mainArea').find(`#comentario-${id} .comentario-option-button[title="${title}"]`);

    context('displays comments', () => {

        it('on home page', () => {
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

        it('on page with a comment', () => {
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

        it('on page without comments', () => {
            cy.visitTestSite(TEST_PATHS.noComment);

            // Verify layout
            checkLayout({
                heading: 'No comment',
            });

            // Verify comments
            cy.commentTree().should('yamlMatch', '');
        });

        it('on page with double Comentario', () => {
            cy.visitTestSite(TEST_PATHS.double);

            // Verify layout
            checkLayout({
                heading:      'Double',
                rootSelector: '#com-1',
            });

            // Verify both comment blocks
            ['#com-1', '#com-2']
                .forEach(selector =>
                    cy.get(selector).commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: 7fbec006-b484-4372-b6db-f01177ee1dfa
                          author: Captain Ace
                          html: <p>Doubling down</p>
                          score: 1
                          sticky: false
                          children:
                          - id: f08639de-ab7b-4032-bdce-a021bf07e596
                            author: Commenter Two
                            html: <p>Children double, too</p>
                            score: 2
                            sticky: false
                        `));
        });

        it('on page with dynamic Comentario', () => {
            cy.visitTestSite(TEST_PATHS.dynamic);

            // No Comentario initially
            cy.get('comentario-comments').should('not.exist');

            // Click on "Insert Comentario" three times, there must appear 3 instances
            cy.contains('button', 'Insert Comentario').click().click().click();

            ['#com-1', '#com-2', '#com-3']
                .forEach(selector => {
                    // Verify layout
                    checkLayout({
                        heading:      'Dynamic insertion',
                        hasSubheading: false,
                        rootSelector:  selector,
                    });

                    // Verify comment block
                    cy.get(selector).commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: 7a803058-8a80-4e64-96f3-bb1e881597c4
                          author: Captain Ace
                          html: <p>I am dynamic 🚀</p>
                          score: 65
                          sticky: true
                        `);
                });
        });

        it('on readonly page', () => {
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

        context('with tag attributes', () => {

            it('auto-init=false', () => {
                cy.visitTestSite(TEST_PATHS.attr.autoInit);

                // There's comments tag but Comentario isn't running
                cy.get('comentario-comments .comentario-root').as('root').should('exist');
                cy.get('@root').find('.comentario-profile-bar').should('not.exist');
                cy.get('@root').find('.comentario-main-area')  .should('not.exist');
                cy.get('@root').find('.comentario-footer')     .should('not.exist');

                // Click on "Run Comentario" three times, each time Comentario gets (re)initialised
                for (let i = 0; i < 3; i++) {
                    cy.contains('button', 'Run Comentario').click();
                        // Verify layout
                        checkLayout({
                            heading: 'Attribute: auto-init=false',
                        });

                        // Verify comment block
                        cy.commentTree('id', 'html', 'author', 'score', 'sticky')
                            .should(
                                'yamlMatch',
                                // language=yaml
                                `
                                - id: 80422207-7bea-4f56-9f07-01736306d544
                                  author: Captain Ace
                                  html: <p>Auto-init OK</p>
                                  score: 3
                                  sticky: true
                                  children:
                                  - id: cbbaf220-6cc4-4160-af43-9fdd6f2ec6fe
                                    author: Anonymous
                                    html: <p>Auto-init child</p>
                                    score: 0
                                    sticky: false
                              `);
                }
            });

            it('no-fonts=true', () => {
                cy.visitTestSite(TEST_PATHS.attr.noFonts);

                // Verify layout
                checkLayout({
                    heading:     'Attribute: no-fonts=true',
                    hasRootFont: false,
                });

                // Verify comment block
                cy.commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: 69adf987-caec-4ad5-ae86-82c8f607d17a
                          author: Captain Ace
                          html: <p>No root font for comments</p>
                          score: 0
                          sticky: false
                          children:
                          - id: 29f0a6d8-267e-4ac7-9dac-af0a39ceb1bd
                            author: Anonymous
                            html: <p>No root font child</p>
                            score: 0
                            sticky: false
                      `);
            });

            it('css-override', () => {
                cy.visitTestSite(TEST_PATHS.attr.cssOverride);

                // Verify layout
                checkLayout({
                    heading: 'Attribute: css-override',
                });

                // Verify the original CSS and the override are both applied
                cy.document().find(`head link[href="${Cypress.config().baseUrl}/comentario.css"]`)  .should('have.attr', 'rel', 'stylesheet');
                cy.document().find('head link[href="/css-override.css"]').should('have.attr', 'rel', 'stylesheet');

                // Verify comment block
                cy.commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: a3df5e05-ba17-4fba-be29-e53dba42ecb5
                          author: Captain Ace
                          html: <p>CSS override with crazy colours</p>
                          score: 0
                          sticky: false
                          children:
                          - id: 092b0623-10c4-4ad0-9465-b618943425e5
                            author: Anonymous
                            html: <p>CSS override child</p>
                            score: 0
                            sticky: false
                      `);
            });

            it('css-override=false', () => {
                cy.visitTestSite(TEST_PATHS.attr.cssOverrideFalse);

                // Verify layout
                checkLayout({
                    heading: 'Attribute: css-override=false',

                });

                // Verify neither CSS link exists
                cy.document().find('head link[href$="/comentario.css"]')  .should('not.exist');
                cy.document().find('head link[href$="/css-override.css"]').should('not.exist');

                // Verify comment block
                cy.commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: 0cefafcd-070f-442d-99c6-7b794477489f
                          author: Captain Ace
                          html: <p>CSS override disabled</p>
                          score: 0
                          sticky: false
                          children:
                          - id: 7cffd785-f5c5-4464-bf2c-b33997834e4f
                            author: Anonymous
                            html: <p>CSS override disabled child</p>
                            score: 0
                            sticky: false
                      `);
            });

            it('page-id', () => {
                cy.visitTestSite(TEST_PATHS.attr.pageId);

                // Verify layout
                checkLayout({
                    heading: 'Attribute: page-id',
                });

                // Verify comment block: comments loaded properly from the different path
                cy.commentTree('id', 'html', 'author', 'score', 'sticky')
                    .should(
                        'yamlMatch',
                        // language=yaml
                        `
                        - id: 1b0398b7-b3c4-422e-a04a-a38efce9c8be
                          author: Captain Ace
                          html: <p>The path of this page is set to <code>/different-page/123</code></p>
                          score: 0
                          sticky: false
                          children:
                          - id: 30ada0fc-d813-4dea-853e-3276052725eb
                            author: Anonymous
                            html: <p>Path override child</p>
                            score: 0
                            sticky: false
                      `);
            });
        });
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
                .should('match', ':invalid').should('not.match', ':valid');

            // Still one comment
            cy.commentTree('id').should('yamlMatch', `- id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b`);

            // Enter a char
            cy.get('@textarea').type('a').should('not.match', ':invalid').should('match', ':valid');
        });

        it('submits anonymous comment', () => {
            // Submit anonymous root comment
            cy.get('@addCommentHost').focus()
                .find('form').as('editor');
            cy.get('@editor').find('textarea').setValue('This is root');
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
                      html: <p>This is root</p>
                      score: 0
                      sticky: false
                      pending: true
                    `);

            // Click on the reply button, a new editor appears
            commentOptionButton('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'Reply').click();
            cy.get('@mainArea').find('form.comentario-comment-editor').as('editor');
            cy.get('@editor').find('textarea').as('textarea').should('be.focused');
            cy.get('@editor').contains('label', 'Comment anonymously').click();
            cy.get('@textarea').setValue('A reply here!').type('{ctrl+enter}');
            cy.get('@editor').should('not.exist');

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
                      children:
                      - author: Anonymous
                        html: <p>A reply here!</p>
                        score: 0
                        sticky: false
                        pending: true
                    - author: Anonymous
                      html: <p>This is root</p>
                      score: 0
                      sticky: false
                      pending: true
                    `);
        });
    });
});
