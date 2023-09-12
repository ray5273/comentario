/** The base URL for the test site. */
const testSiteUrl = Cypress.env('TEST_SITE_URL') || 'http://localhost:8000/';

context('Comments', () => {

    before(cy.backendReset);

    const deepMap = (c: Cypress.Comment, property: keyof Cypress.Comment) => {
        const x: any = {};
        x[property as any] = c[property];
        if (c.children?.length) {
            x.children = c.children.map(child => deepMap(child, property));
        }
        return x;
    };

    it('displays comments', () => {
        // Verify headings
        cy.visit(testSiteUrl);
        cy.get('h1').should('have.text', 'Comentario test');
        cy.get('h2#comments').should('have.text', 'Comments');

        // Verify basic layout
        cy.get('comentario-comments').as('cc').should('be.visible');
        cy.get('@cc').find('.comentario-root').as('root')
            .should('be.visible')
            .should('have.class', 'comentario-root-font');

        // Profile bar
        cy.get('@root').find('.comentario-profile-bar').as('profileBar')
            .should('be.visible')
            .find('button').should('have.text', 'Login');

        // Main area
        cy.get('@root').find('.comentario-main-area').as('mainArea')
            .should('be.visible');
        cy.get('@mainArea').find('.comentario-add-comment-host').should('be.visible');
        cy.get('@mainArea').find('.comentario-sort-policy-buttons-container').should('be.visible');
        cy.get('@mainArea').find('.comentario-comments').as('comments').should('be.visible');

        // Comments
        cy.commentTree().then(comments => {
            expect(comments.map(c => deepMap(c, 'html'))).eql([
                {
                    'html': '<p>Alright crew, let\'s gather around for a quick meeting. We\'ve got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>',
                    'children': [
                        {
                            'html': '<p>What\'s on the agenda, captain?</p>',
                            'children': [
                                {
                                    'html': '<p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>',
                                    'children': [
                                        {'html': '<p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>'},
                                        {
                                            'html': '<p>Captain, I\'ve plotted our course, and I suggest we take the eastern route. It\'ll take us a bit longer, but we\'ll avoid any bad weather.</p>',
                                            'children': [
                                                {'html': '<p>Good work, navigator. That\'s what I was thinking too.</p>'},
                                            ],
                                        },
                                    ],
                                },
                                {
                                    'html': '<p>What about supplies, cook?</p>',
                                    'children': [
                                        {
                                            'html': '<p>We\'ve got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It\'ll help us avoid scurvy.</p>',
                                            'children': [
                                                {'html': '<p>Absolutely, cook. I\'ll make a note of it.</p>'},
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    'html': '<p>Now, is there anything else anyone wants to bring up?</p>',
                    'children': [
                        {
                            'html': '<p>Captain, I\'ve been noticing some strange vibrations in the engine room. It\'s nothing too serious, but I\'d like to take a look at it just to be safe.</p>',
                            'children': [
                                {'html': '<p>Alright, engineer. Let\'s schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>'},
                            ],
                        },
                        {
                            'html': '<p><strong>Captain</strong>, one more thing. We\'ll be passing through some pirate-infested waters soon. Should we be concerned?</p>',
                            'children': [
                                {
                                    'html': '<p>Good point, navigator. I\'ll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>',
                                    'children': [
                                        {
                                            'html': '<p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>',
                                            'children': [
                                                {'html': '<p>Let\'s hope it doesn\'t come to that, cook. But it\'s good to know we have you on our side.</p><p>Alright, everyone, let\'s get to work. We\'ve got a long journey ahead of us!</p>'},
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ]);
        });

        // Footer
        cy.get('@root').find('.comentario-footer').as('footer')
            .should('be.visible')
            .find('a')
                .should('have.text', 'Powered by Comentario')
                .should('have.attr', 'href', 'https://comentario.app/');
    });
});
