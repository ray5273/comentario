import { DOMAIN_PAGES, DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Page Edit page', () => {

    const pagesPath            = PATHS.manage.domains.id(DOMAINS.localhost.id).pages;
    const homePagePathProps    = `${pagesPath}/${DOMAIN_PAGES.home.id}`;
    const otherPagePathProps   = `${pagesPath}/${DOMAIN_PAGES.comments.id}`;
    const homePagePathMoveData = `${homePagePathProps}/move`;

    const makeAliases = () => {
        cy.get('app-domain-page-move-data').as('pageMove');

        // Header
        cy.get('@pageMove').find('h1').should('have.text', 'Move domain page data').and('be.visible');

        // Form controls
        cy.get('@pageMove').find('#sourcePage').as('source').should('have.value', DOMAIN_PAGES.home.path).and('be.enabled').and('have.attr', 'readonly');
        cy.get('@pageMove').find('#targetPage').as('target').should('have.value', '').and('be.enabled');

        // Buttons
        cy.get('@pageMove').contains('.form-footer a', 'Cancel')    .as('btnCancel');
        cy.get('@pageMove').find('.form-footer button[type=submit]').as('btnSubmit');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'read-only',  user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(homePagePathMoveData, test.user, test.redir)));
    });

    it('stays on the page after reload', () => {
        cy.verifyStayOnReload(homePagePathMoveData, USERS.ace);

        // Test cancelling: we return to page properties
        makeAliases();
        cy.get('@btnCancel').click();
        cy.isAt(homePagePathProps);
        cy.noToast();
    });

    it('validates input', () => {
        cy.loginViaApi(USERS.ace, homePagePathMoveData);
        makeAliases();

        // Try to submit to get error feedback
        cy.get('@btnSubmit').click();
        cy.isAt(homePagePathMoveData);

        // Target page
        cy.get('@target').isInvalid('Please select a value.')
            // Click the input: typeahead dropdown must appear
            .click();
        cy.get('ngb-typeahead-window').should('be.visible')
            .texts('.dropdown-item').should('arrayMatch', [
                DOMAIN_PAGES.attrAutoInit.path,
                DOMAIN_PAGES.attrAutoNonIntSso.path,
                DOMAIN_PAGES.attrCssOverrideFalse.path,
                DOMAIN_PAGES.attrCssOverride.path,
                DOMAIN_PAGES.attrLiveUpdate.path,
                DOMAIN_PAGES.attrMaxLevel.path,
                DOMAIN_PAGES.attrNoFonts.path,
                DOMAIN_PAGES.comments.path,
                DOMAIN_PAGES.darkMode.path,
                DOMAIN_PAGES.attrPageId.path,
                DOMAIN_PAGES.double.path,
                DOMAIN_PAGES.dynamic.path,
                DOMAIN_PAGES.nocomment.path,
                DOMAIN_PAGES.longPath.path,
                DOMAIN_PAGES.readonly.path,
            ]);
        cy.get('@target').typeaheadSelect('comment', true, 2)
            .should('have.value', DOMAIN_PAGES.comments.path).isValid()
            .clear().isInvalid();
    });

    context('allows to move page data', () => {

        [
            {name: 'superuser', user: USERS.root},
            {name: 'owner',     user: USERS.ace},
        ]
            .forEach(test => {
                it(`by ${test.name}, changing path`, () => {
                    // Login
                    cy.loginViaApi(test.user, homePagePathMoveData);
                    makeAliases();

                    // Fill out the page and submit
                    cy.get('@target').focus().typeaheadSelect('/comm', true).should('have.value', DOMAIN_PAGES.comments.path);
                    cy.get('@btnSubmit').click();

                    // We get a confirmation dialog
                    cy.confirmationDialog('Are you sure you want to move all data to the target page and permanently delete the source page?').dlgButtonClick('Move data');

                    // We're back to Domain page manager
                    cy.isAt(pagesPath);
                    cy.toastCheckAndClose('data-updated');

                    // One fewer page on the list
                    cy.get('app-domain-page-manager').as('pageMgr').verifyListFooter(15, false);

                    // Verify the "Page with comments": it got all the comments from Home
                    cy.get('@pageMgr').contains('#domain-page-list .list-group-item', DOMAIN_PAGES.comments.path)
                        .should('contain.text', '18' + 'comments')
                        .should('contain.text', '10' + 'views')
                        // Click the list row and navigate to the page properties
                        .click();
                    cy.isAt(otherPagePathProps);

                    // Verify page properties
                    cy.get('app-domain-page-properties #domainPageDetailTable').dlTexts().should('matrixMatch', [
                        ['Domain',             DOMAINS.localhost.host],
                        ['Path',               DOMAIN_PAGES.comments.path],
                        ['Title',              'Comments'],
                        ['Read-only',          ''],
                        ['Created',            REGEXES.datetime],
                        ['Number of comments', '18'],
                        ['Number of views',    '10'],
                        ['Comment RSS feed',   null],
                    ]);

                    // Verify comments have moved
                    cy.testSiteVisit(TEST_PATHS.comments);
                    cy.commentTree('id', 'html', 'author', 'subtitle', 'score', 'sticky').should('yamlMatch',
                        // language=yaml
                        `
                        - id: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b
                          author: Anonymous
                          subtitle: 3 hours ago
                          html: <p>This is a <b>root</b>, sticky comment</p>
                          score: 0
                          sticky: true
                        - id: ef81dbe5-22f6-4d90-958f-834e6f2cdc63
                          author: Captain Ace
                          subtitle: 3 hours ago
                          html: <p>Alright crew, let's gather around for a quick meeting. We've got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>
                          score: 8
                          sticky: false
                          children:
                          - id: 40330ddf-13de-4921-b123-7a32057988cd
                            author: Engineer King
                            subtitle: 2 hours ago
                            html: <p>What's on the agenda, captain?</p>
                            score: 0
                            sticky: false
                            children:
                            - id: 788c0b17-a922-4c2d-816b-98def34a0008
                              author: Captain Ace
                              subtitle: 2 hours ago
                              html: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                              score: 0
                              sticky: false
                              children:
                              - id: 82acadba-3e77-4bcd-a366-78c7ff56c3b9
                                author: Engineer King
                                subtitle: 2 hours ago
                                html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                                score: 0
                                sticky: false
                              - id: 64fb0078-92c8-419d-98ec-7f22c270ef3a
                                author: Commenter Two
                                subtitle: 2 hours ago
                                html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                                score: 4
                                sticky: false
                                children:
                                - id: e8331f48-516d-45fc-80a1-d1b2d5a21d08
                                  author: Captain Ace
                                  subtitle: 2 hours ago
                                  html: <p>Good work, navigator. That's what I was thinking too.</p>
                                  score: 0
                                  sticky: false
                            - id: 9a93d7bd-80cb-49bd-8dc1-67326df6fcaf
                              author: Captain Ace
                              subtitle: 2 hours ago
                              html: <p>What about supplies, cook?</p>
                              score: 0
                              sticky: false
                              children:
                              - id: da05d978-9218-4263-886e-542068251787
                                author: Cook Queen
                                subtitle: 2 hours ago, edited by author 13 minutes ago
                                html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                                score: 4
                                sticky: false
                                children:
                                - id: 4922acc5-0330-4d1a-8092-ca7c67536b08
                                  author: Captain Ace
                                  subtitle: 2 hours ago
                                  html: <p>Absolutely, cook. I'll make a note of it.</p>
                                  score: 0
                                  sticky: false
                        - id: bc460a63-f256-47e3-8915-3931acad132a
                          author: Captain Ace
                          subtitle: 2 hours ago
                          html: <p>Now, is there anything else anyone wants to bring up?</p>
                          score: 0
                          sticky: false
                          children:
                          - id:  5f066198-03ab-41f8-bd80-c4efaeafd153
                            author: Engineer King
                            subtitle: 2 hours ago
                            html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                            score: 0
                            sticky: false
                            children:
                            - id: 00e7320a-ecb4-44f4-84ca-ffc2f8c62729
                              author: Captain Ace
                              subtitle: 2 hours ago
                              html: <p>Alright, engineer. Let's schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                              score: 2
                              sticky: false
                          - id: cb057a9b-e293-4e15-bdb9-c11880cb53bf
                            author: Navigator Jack
                            subtitle: 2 hours ago
                            html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                            score: -2
                            sticky: false
                            children:
                            - id: 72314bae-a05d-4551-91df-270802e6b003
                              author: Captain Ace
                              subtitle: 2 hours ago
                              html: <p>Good point, navigator. I'll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                              score: 0
                              sticky: false
                              children:
                              - id: 8f31a61b-e1e6-4090-a426-52ce91a5181b
                                author: Cook Queen
                                subtitle: 2 hours ago
                                html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                                score: 6
                                sticky: false
                                children:
                                - id: 069f98da-bbc5-40ad-8c91-e8a089288ecb
                                  author: Captain Ace
                                  subtitle: 2 hours ago
                                  html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                                  score: 0
                                  sticky: false
                        `);
                });
            });
    });
});
