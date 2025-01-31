/** Settings for checking comment page layout. */
export interface LayoutSettings {
    /** Root selector for Comentario, defaults to 'comentario-comments'. */
    rootSelector?: string;
    /** Whether the user is not logged in. Defaults to false. */
    anonymous?: boolean;
    /** Whether login button is available (only when anonymous is true). Defaults to true. */
    login?: boolean;
    /** Whether the comments are read-only (also applies when no auth method is available). */
    readonly?: boolean;
    /** Whether root font is applied. Defaults to true. */
    hasRootFont?: boolean;
    /** Whether RSS button is visible in the thread toolbar. Defaults to true. */
    hasRss?: boolean;
    /** Whether sort buttons are visible in the thread toolbar. Defaults to true. */
    hasSortButtons?: boolean;
    /** Moderation notice, if any. */
    notice?: string;
    /** Number of comments expected. */
    numComments?: number;
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

        // Check Profile bar. It won't be "visible" if has no elements because of zero height
        cy.get('@root').find('.comentario-profile-bar').as('profileBar');

        // Check login/logout buttons
        cy.get('@profileBar').contains('button', 'Sign in')
            .should(settings?.anonymous && (settings?.login ?? true) ? 'be.visible' : 'not.exist');
        cy.get('@profileBar').find('button[title="Logout"]')
            .should(settings?.anonymous ? 'not.exist' : 'be.visible');

        // Check main area
        cy.get('@root').find('.comentario-main-area').as('mainArea')
            .should('be.visible');
        if (settings?.readonly) {
            // No add comment host if readonly
            cy.get('@mainArea').find('.comentario-add-comment-host').should('not.exist');
        } else {
            cy.get('@mainArea').find('.comentario-add-comment-host').as('addCommentHost').should('exist');
        }

        // Thread toolbar
        cy.get('@mainArea').find('.comentario-thread-toolbar').as('threadToolbar').should('be.visible');
        if (settings?.hasRss ?? true) {
            cy.get('@threadToolbar').contains('button', 'RSS').as('btnRss').should('be.visible');
        } else {
            cy.get('@threadToolbar').contains('button', 'RSS').should('not.exist');
        }
        cy.get('@threadToolbar').find('.comentario-sort-buttons').should((settings?.hasSortButtons ?? true) ? 'be.visible' : 'not.be.visible');
        if (settings?.numComments !== undefined) {
            this.checkNumComments(settings.numComments);
        }

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
     * Verifies the number of comments reported in the thread toolbar is correct.
     * NB: requires makeAliases() to have been called prior to this one.
     * @param num Expected number of comments
     */
    static checkNumComments(num: number) {
        cy.get('@threadToolbar').find('.comentario-comment-count')
            .should(num ? 'have.text' : 'not.be.visible', `${num} comment(s)`);
    }

    /**
     * Find and return a titled comment toolbar button for a comment with the given ID.
     * @param id Comment ID.
     * @param title Button title.
     */
    static commentToolbarButton(id: string, title: string) {
        return cy.get(`.comentario-root #comentario-${id} .comentario-toolbar button[title="${title}"]`);
    }

    /**
     * Add a root comment or reply on the current page.
     * @param parentId Parent comment ID. If undefined, a root comment is created.
     * @param markdown Markdown text of the comment.
     * @param clickUnregistered Whether the user will be given an option to submit the comment without registration in the Login dialog.
     * @param authorName Optional name of the (unregistered) author in case clickUnregistered is true.
     */
    static addComment(parentId: string | undefined, markdown: string, clickUnregistered: boolean, authorName?: string) {
        // Focus the add host or click the reply button
        if (parentId) {
            this.commentToolbarButton(parentId, 'Reply').click();
        } else {
            cy.get('.comentario-root .comentario-add-comment-host').focus();
        }

        // Verify the editor is shown
        cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');

        // Enter comment text
        cy.get('@editor').find('textarea').should('be.focused').setValue(markdown);

        // Submit the comment
        cy.get('@editor').find('.comentario-comment-editor-footer button[type=submit]')
            .should('have.text', 'Add Comment')
            .click();

        // If we're to comment unregistered, the Login dialog must appear
        if (clickUnregistered) {
            cy.get('.comentario-root .comentario-dialog #comentario-unregistered-form').as('addCommentUnregForm')
                .should('be.visible');
            cy.get('@addCommentUnregForm').find('input[name=userName]').setValue(authorName ?? '');
            cy.get('@addCommentUnregForm').find('button[type=submit]').click();
        }
    }

    /**
     * Vote for a comment with the given ID.
     * @param id Comment ID.
     * @param negative Downvote the comment if true, otherwise upvote.
     */
    static commentVote(id: string, negative: boolean) {
        return this.commentToolbarButton(id, negative ? 'Downvote' : 'Upvote').click();
    }
}
