import { COOKIES, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';

context('Email notifications', () => {

    /** Assert there's no email sent. */
    const noEmail = () => cy.backendGetSentEmails().should('be.empty');

    beforeEach(cy.backendReset);

    context('moderator notifications', () => {

        it('doesn\'t notify when disabled for domain', () => {
            // Disable moderator emails
            cy.backendPatchDomain(DOMAINS.localhost.id, {modNotifyPolicy: 'none'});

            // Add an anonymous root comment
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'Blah');

            // Expect no email
            noEmail();
        });

        it('doesn\'t notify when disabled for moderator', () => {
            // Disable notifications for Ace
            cy.testSiteLoginViaApi(USERS.ace);
            cy.commenterUpdateSettingsViaApi(DOMAINS.localhost.id, true, false, true);

            // Add an anonymous root comment
            cy.clearCookie(COOKIES.embedCommenterSession);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'Blah');

            // Expect 3 emails for other moderators
            cy.backendGetSentEmails()
                .should('have.length', 3)
                .and(mails => mails.forEach(m => expect(m.headers['Subject']).eq('Comentario: New comment on Comments')))
                .and(mails => expect(mails.map(m => m.headers['To'])).has.members([USERS.jack.email, USERS.king.email, USERS.queen.email]));
        });

        it('notifies of pending comments', () => {
            // Add a comment by registered user
            cy.testSiteLoginViaApi(USERS.commenterOne);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'My comment');

            // Expect no email
            noEmail();

            // Add an anonymous root comment
            cy.clearCookie(COOKIES.embedCommenterSession);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'Blah');

            // Expect 4 emails: 1 for owner + 3 moderators
            cy.backendGetSentEmails()
                .should('have.length', 4)
                .and(mails => mails.forEach(m => expect(m.headers['Subject']).eq('Comentario: New comment on Comments')))
                .and(mails => expect(mails.map(m => m.headers['To'])).has.members([USERS.ace.email, USERS.jack.email, USERS.king.email, USERS.queen.email]));
        });

        it('notifies of every comment', () => {
            // Set moderator emails to 'all'
            cy.backendPatchDomain(DOMAINS.localhost.id, {modNotifyPolicy: 'all'});

            // Add a comment by registered user
            cy.testSiteLoginViaApi(USERS.commenterOne);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'My comment');

            // Expect 4 emails: 1 for owner + 3 moderators
            cy.backendGetSentEmails()
                .should('have.length', 4)
                .and(mails => mails.forEach(m => expect(m.headers['Subject']).eq('Comentario: New comment on Comments')))
                .and(mails => expect(mails.map(m => m.headers['To'])).has.members([USERS.ace.email, USERS.jack.email, USERS.king.email, USERS.queen.email]));

            // Add an anonymous root comment
            cy.clearCookie(COOKIES.embedCommenterSession);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'Blah');

            // Expect 8 emails now
            cy.backendGetSentEmails().should('have.length', 8);
        });
    });

    context('reply notifications', () => {

        // Get moderator emails out of the way
        beforeEach(() => cy.backendPatchDomain(DOMAINS.localhost.id, {modNotifyPolicy: 'none'}));

        it('doesn\'t notify Anonymous', () => {
            // Reply on an anonymous comment
            cy.testSiteLoginViaApi(USERS.commenterOne);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, '0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'It is a reply');

            // Expect no email
            noEmail();
        });

        it('doesn\'t notify when disabled', () => {
            // Disable reply notifications for Commenter Two
            cy.testSiteLoginViaApi(USERS.commenterTwo);
            cy.commenterUpdateSettingsViaApi(DOMAINS.localhost.id, false, true, true);

            // Reply on Commenter Two's comment as Commenter One
            cy.testSiteLoginViaApi(USERS.commenterOne);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, '64fb0078-92c8-419d-98ec-7f22c270ef3a', 'Chihuahua');

            // Expect no email
            noEmail();
        });

        it('notifies the author', () => {
            // Reply on Commenter Two's comment
            cy.testSiteLoginViaApi(USERS.commenterOne);
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, '64fb0078-92c8-419d-98ec-7f22c270ef3a', 'Chihuahua');

            // Expect one email
            cy.backendGetSentEmails()
                .should('have.length', 1)
                .its(0).then(mail => {
                    expect(mail.headers['Subject']).eq('Comentario: New comment on Comments');
                    expect(mail.headers['To']).eq(USERS.commenterTwo.email);
                    expect(mail.body).contains('Chihuahua');
                });
        });
    });

    context('comment status notifications', () => {

        // Get moderator emails out of the way
        beforeEach(() => cy.backendPatchDomain(DOMAINS.localhost.id, {modNotifyPolicy: 'none'}));

        it('doesn\'t notify Anonymous', () => {
            // Write an anonymous comment
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'Pending comment')
                .then(r => {
                    expect(r.body.comment.isPending).true;
                    return r.body.comment;
                })
                .as('comment');

            // Expect no email yet
            noEmail();

            // Approve the comment
            cy.testSiteLoginViaApi(USERS.ace);
            cy.get('@comment').then((c: any) => cy.commentModerateViaApi(c.id, true));

            // Still no email
            noEmail();
        });

        [
            {status: 'rejected', approve: false, text: 'This comment was rejected by a moderator because it&#39;s spam or inappropriate.'},
            {status: 'approved', approve: true,  text: 'This comment has been approved by a moderator.'},
        ]
            .forEach(test => {

                // Make all new comments be marked pending
                beforeEach(() => cy.backendPatchDomain(DOMAINS.localhost.id, {modAuthenticated: true}));

                it(`doesn't notify of ${test.status} comment when disabled`, () => {
                    // Disable comment status notifications for Commenter One and write a comment
                    cy.testSiteLoginViaApi(USERS.commenterOne);
                    cy.commenterUpdateSettingsViaApi(DOMAINS.localhost.id, true, true, false);
                    cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'This is new')
                        .its('body.comment').as('comment')
                        .should('have.a.property', 'isPending', true);

                    // Expect no email yet
                    noEmail();

                    // Approve/Reject the comment
                    cy.testSiteLoginViaApi(USERS.ace);
                    cy.get('@comment').then((c: any) => cy.commentModerateViaApi(c.id, test.approve));

                    // Still no email
                    noEmail();
                });

                it(`notifies of ${test.status} comment when enabled`, () => {
                    // Write a comment as Commenter One
                    cy.testSiteLoginViaApi(USERS.commenterOne);
                    cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, undefined, 'This is new')
                        .its('body.comment').as('comment');

                    // Expect no email yet
                    noEmail();

                    // Approve/Reject the comment
                    cy.testSiteLoginViaApi(USERS.ace);
                    cy.get('@comment').then((c: any) => cy.commentModerateViaApi(c.id, test.approve));

                    // Expect one email
                    cy.backendGetSentEmails()
                        .should('have.length', 1)
                        .its(0).then(mail => {
                        expect(mail.headers['Subject']).eq('Comentario: Comment status changed');
                        expect(mail.headers['To']).eq(USERS.commenterOne.email);
                        expect(mail.body).contains('This is new');
                        expect(mail.body).contains(test.text);
                    });
                });
            });
    });
});
