import { DOMAIN_PAGES, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('RSS dialog', () => {

    before(cy.backendReset);

    const makeDlgAliases = (hasRepliesCB: boolean) => {
        // Check the title
        cy.get('@root').find('.comentario-dialog').as('rssDialog').should('be.visible')
            .contains('.comentario-dialog-header', 'Comment RSS feed').should('be.visible');

        // Check the settings
        cy.get('@rssDialog').find('#comentario-cb-only-this-page').as('cbThisPage').should('be.visible').and('be.checked');
        if (hasRepliesCB) {
            cy.get('@rssDialog').find('#comentario-cb-only-replies').as('cbReplies').should('be.visible').and('not.be.checked');
        } else {
            cy.get('@rssDialog').find('#comentario-cb-only-replies').should('not.exist');
        }

        // Link
        cy.get('@rssDialog').find('a').as('rssLink').should('be.visible');
    };

    it('shows RSS feed link for anonymous user', () => {
        // Visit the comment page anonymously
        cy.testSiteVisit(TEST_PATHS.comments);
        EmbedUtils.makeAliases({anonymous: true, numComments: 1});

        // Open the RSS dialog
        cy.get('@btnRss').click();
        makeDlgAliases(false);

        // Check the link
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id});

        // Uncheck the "this page" checkbox
        cy.get('@cbThisPage').click().should('not.be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id});

        // Enable it again and come back to the previous URL
        cy.get('@cbThisPage').click().should('be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id});

        // Close the dialog with Esc
        cy.get('@cbThisPage').type('{esc}');
        cy.get('@rssDialog').should('not.exist');
    });

    it('shows RSS feed link for logged-in user', () => {
        // Log in and visit the comment page
        cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);
        EmbedUtils.makeAliases({numComments: 1});

        // Open the RSS dialog
        cy.get('@btnRss').click();
        makeDlgAliases(true);

        // Check the link
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id});

        // Uncheck the "this page" checkbox
        cy.get('@cbThisPage').click().should('not.be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id});

        // Check the "replies" checkbox
        cy.get('@cbReplies').click().should('be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, replyToUser: USERS.commenterOne.id});

        // Enable "this page" again
        cy.get('@cbThisPage').click().should('be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id, replyToUser: USERS.commenterOne.id});

        // Uncheck the "replies" checkbox
        cy.get('@cbReplies').click().should('not.be.checked');
        cy.get('@rssLink').should('be.rssLink', {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id});

        // Close the dialog with Esc
        cy.get('@cbThisPage').type('{esc}');
        cy.get('@rssDialog').should('not.exist');
    });
});
