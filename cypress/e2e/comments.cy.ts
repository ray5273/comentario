import { TEST_PATHS } from '../support/cy-utils';

context('Comments', () => {

    beforeEach(cy.backendReset);

    const checkRoot = () =>
        cy.get('comentario-comments').should('be.visible')
            .find('.comentario-root').as('root')
                .should('be.visible')
                .should('have.class', 'comentario-root-font');

    const checkProfileBarLogin = () =>
        cy.get('@root').find('.comentario-profile-bar').as('profileBar')
            .should('be.visible')
            .find('button').should('have.text', 'Login');

    const checkMainArea = (addHost: boolean) => {
        cy.get('@root').find('.comentario-main-area').as('mainArea')
            .should('be.visible');
        if (addHost) {
            cy.get('@mainArea').find('.comentario-add-comment-host').as('addCommentHost').should('be.visible');
        } else {
            cy.get('@mainArea').find('.comentario-add-comment-host').should('not.exist');
        }
        cy.get('@mainArea').find('.comentario-sort-policy-buttons-container').should('be.visible');
        cy.get('@mainArea').find('.comentario-comments').as('comments').should('exist');
    };

    const checkFooter = () =>
        cy.get('@root').find('.comentario-footer').as('footer')
            .should('be.visible')
            .find('a')
            .should('have.text', 'Powered by Comentario')
            .should('have.attr', 'href', 'https://comentario.app/');

    const checkModerationNotice = (text?: string) =>
        cy.get('@mainArea').find('.comentario-moderation-notice').should(el => {
            if (text) {
                expect(el.text()).eq(text);
            } else {
                expect(el).not.to.exist;
            }
        });

    it('displays comments on home page', () => {
        // Verify headings
        cy.visitTestSite(TEST_PATHS.home);
        cy.get('h1').should('have.text', 'Comentario test');
        cy.get('h2#comments').should('have.text', 'Comments');

        // Verify the layout
        checkRoot();
        checkProfileBarLogin();
        checkMainArea(true);
        checkModerationNotice();
        checkFooter();

        // Verify comments
        cy.commentTree('html', 'author', 'score')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - author: Captain Ace
                  html: <p>Alright crew, let's gather around for a quick meeting. We've got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>
                  score: 8
                  children:
                  - author: Engineer King
                    html: <p>What's on the agenda, captain?</p>
                    score: 0
                    children:
                    - author: Captain Ace
                      html: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                      score: 0
                      children:
                      - author: Engineer King
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                        score: 0
                      - author: Commenter Two
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        score: 4
                        children:
                        - author: Captain Ace
                          html: <p>Good work, navigator. That's what I was thinking too.</p>
                          score: 0
                    - author: Captain Ace
                      html: <p>What about supplies, cook?</p>
                      score: 0
                      children:
                      - author: Cook Queen
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        score: 4
                        children:
                        - author: Captain Ace
                          html: <p>Absolutely, cook. I'll make a note of it.</p>
                          score: 0
                - author: Captain Ace
                  html: <p>Now, is there anything else anyone wants to bring up?</p>
                  score: 0
                  children:
                  - author: Engineer King 
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    score: 0
                    children:
                    - author: Captain Ace
                      html: <p>Alright, engineer. Let's schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                      score: 2
                  - author: Navigator Jack
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    score: -2
                    children:
                    - author: Captain Ace
                      html: <p>Good point, navigator. I'll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                      score: 0
                      children:
                      - author: Cook Queen
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        score: 6
                        children:
                        - author: Captain Ace
                          html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                          score: 0
                `);
    });

    it('shows page without comments', () => {
        // Verify headings
        cy.visitTestSite(TEST_PATHS.noComment);
        cy.get('h1').should('have.text', 'No comment');
        cy.get('h2#comments').should('have.text', 'Comments');

        // Verify the layout
        checkRoot();
        checkProfileBarLogin();
        checkMainArea(true);
        checkModerationNotice();
        checkFooter();

        // Verify comments
        cy.commentTree('html', 'author', 'score')
            .should(
                'yamlMatch',
                // language=yaml
                ``);
    });

    it('shows readonly page', () => {
        // Verify headings
        cy.visitTestSite(TEST_PATHS.readonly);
        cy.get('h1').should('have.text', 'Read-only');
        cy.get('h2#comments').should('have.text', 'Comments');

        // Verify the layout
        checkRoot();
        checkProfileBarLogin();
        checkMainArea(false);
        checkModerationNotice('This thread is locked. You cannot add new comments.');
        checkFooter();

        // Verify comments
        cy.commentTree('html', 'author', 'score').should('yamlMatch', '');
    });

    context('comment editor', () => {

        beforeEach(() => {
            // Go to the Comments page
            cy.visitTestSite(TEST_PATHS.comments);

            // Verify headings
            cy.visitTestSite(TEST_PATHS.comments);
            cy.get('h1').should('have.text', 'Comments');
            cy.get('h2#comments').should('have.text', 'Comments');

            // Verify the layout / create aliases
            checkRoot();
            checkProfileBarLogin();
            checkMainArea(true);
            checkModerationNotice();
            checkFooter();
        });

        it('can be entered', () => {
            // Verify comments
            cy.commentTree('html', 'author', 'score', 'sticky')
                .should(
                    'yamlMatch',
                    // language=yaml
                    `
                    - author: Anonymous
                      html: <p>This is a <b>root</b>, sticky comment</p>
                      score: 0
                      sticky: true
                    `);

            // Focus the host, the editor should be inserted
            cy.get('@addCommentHost').focus()
                .should('have.class', 'comentario-editor-inserted')
                .find('form.comentario-comment-editor').as('editor').should('be.visible')
                .find('textarea').should('be.focused').should('have.value', '')
                // Type some text, then press Esc, and the editor's gone
                .type('Hi there{esc}');
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

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

            // Open the editor again, try to submit an empty comment
            cy.get('@addCommentHost').click();
            cy.get('@editor').find('textarea').type('{ctrl+enter}')
                .should('have.class', 'comentario-touched')
                .should('match', ':invalid');

            // Still one comment
            cy.commentTree().should('have.length', 1).its(0).should('not.have.property', 'children');

            // Open the editor again, enter text, tick off "Anonymous" and submit
            cy.get('@addCommentHost').focus();
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
