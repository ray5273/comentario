/** Settings for checking comment page layout. */
export interface LayoutSettings {
    /** Root selector for Comentario, defaults to 'comentario-comments'. */
    rootSelector?: string;
    /** Whether the user is anonymous. */
    anonymous?: boolean;
    /** Whether the comments are read-only. */
    readonly?: boolean;
    /** Whether root font is applied. Defaults to true. */
    hasRootFont?: boolean;
    /** Moderation notice, if any. */
    notice?: string;
}

export class EmbedUtils {

    /**
     * Check comment page layout and create corresponding aliases.
     */
    static makeAliases(settings?: LayoutSettings) {
        // Check root
        cy.get(settings?.rootSelector || 'comentario-comments').should('be.visible')
            .find('.comentario-root').as('root')
            .should('be.visible')
            .should(settings?.hasRootFont === false ? 'not.have.class' : 'have.class', 'comentario-root-font');

        // Check Profile bar
        cy.get('@root').find('.comentario-profile-bar').as('profileBar')
            .should('be.visible');

        // Check login button
        cy.get('@profileBar').contains('button', 'Login').should(settings?.anonymous ? 'be.visible' : 'not.exist');

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
        cy.get('@mainArea').find('.comentario-sort-buttons-container').should('be.visible');

        // Check comments
        cy.get('@mainArea').find('.comentario-comments').as('comments').should('exist');

        // Check footer
        cy.get('@root').find('.comentario-footer').as('footer')
            .should('be.visible')
            .find('a')
            .should('have.text', 'Powered by Comentario')
            .should('have.attr', 'href', 'https://comentario.app/');

        // Check any page moderation notice
        cy.get('@mainArea').find('.comentario-page-moderation-notice').should(el => {
            if (settings?.notice) {
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
    static commentOptionButton(id: string, title: string) {
        return cy.get(`.comentario-root #comentario-${id} .comentario-option-button[title="${title}"]`);
    }

    /**
     * Add a root comment or reply on the current page.
     * @param parentId Parent comment ID. If undefined, a root comment is created.
     * @param markdown Markdown text of the comment.
     * @param anonymous Whether to sibmit the comment anonymously.
     */
    static addComment(parentId: string | undefined, markdown: string, anonymous: boolean) {
        // Focus the add host or click the reply button
        if (parentId) {
            this.commentOptionButton(parentId, 'Reply').click();
        } else {
            cy.get('.comentario-root .comentario-add-comment-host').focus();
        }

        // Verify a editor is shown
        cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');

        // Enter comment text
        cy.get('@editor').find('textarea').should('be.focused').setValue(markdown);

        // Tick off "Comment anonymously" if needed
        if (anonymous) {
            cy.get('@editor').contains('label', 'Comment anonymously').click();
        }

        // Submit the comment
        cy.get('@editor').find('.comentario-comment-editor-buttons button[type=submit]')
            .should('have.text', 'Add Comment')
            .click();
    }
}
