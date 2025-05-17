import { DOMAIN_PAGES, DomainConfigKey, DOMAINS, USERS } from '../../support/cy-utils';

const { $ } = Cypress;

context('API / RSS', () => {

    before(cy.backendReset);

    context('comments', () => {

        const feedUrl = (query: Record<string, string>) => `/api/rss/comments?${new URLSearchParams(query).toString()}`;

        const fetchRssItems = (query: Record<string, string>, expectPath: string, expectTitle: string) =>
            cy.request({method: 'GET', url: feedUrl(query)})
                .then(r => {
                    expect(r.status).eq(200);
                    expect(r.headers['content-type']).eq('application/rss+xml');

                    // Parse the RSS (XML) response
                    const xml = $($.parseXML(r.body));
                    expect(xml.find('rss').attr('version')).eq('2.0');
                    expect(xml.find('rss').attr('xmlns:content')).eq('http://purl.org/rss/1.0/modules/content/');
                    expect(xml.find('rss channel').toArray()).to.have.length(1);

                    // Check the channel
                    const pageUrl = `http://localhost:8000${expectPath}`;
                    const channel = xml.find('rss channel');
                    expect(channel.find('> title')      .text()).eq(expectTitle);
                    expect(channel.find('> link')       .text()).eq(pageUrl);
                    expect(channel.find('> description').text()).eq(`Comentario RSS Feed for ${pageUrl}`);
                    // -- Image
                    expect(channel.find('> image > url')   .text()).eq('http://localhost:8080/icon-rss-64px.png');
                    expect(channel.find('> image > title') .text()).eq(expectTitle);
                    expect(channel.find('> image > link')  .text()).eq(pageUrl);
                    expect(channel.find('> image > width') .text()).eq('64');
                    expect(channel.find('> image > height').text()).eq('64');

                    // Convert items into an array of objects
                    return xml.find('rss channel item').toArray().map(el => ({
                        title:       el.querySelector('title')      .textContent,
                        link:        el.querySelector('link')       .textContent,
                        description: el.querySelector('description').textContent,
                        author:      el.querySelector('author')     .textContent,
                        guid:        el.querySelector('guid')       .textContent,
                    }));
                });

        it('returns RSS feed for a domain', () => {
            fetchRssItems(
                {domain: DOMAINS.localhost.id},
                '',
                'Comentario comments on localhost:8000',
            ).should('yamlMatch',
                // language=yaml
                `
                - title: Commenter Two | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-64fb0078-92c8-419d-98ec-7f22c270ef3a
                  description: <p>Captain, I&#39;ve plotted our course, and I suggest we take the eastern route. It&#39;ll take us a bit longer, but we&#39;ll avoid any bad weather.</p>
                  author: Commenter Two
                  guid: 64fb0078-92c8-419d-98ec-7f22c270ef3a
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-8f31a61b-e1e6-4090-a426-52ce91a5181b
                  description: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                  author: Cook Queen
                  guid: 8f31a61b-e1e6-4090-a426-52ce91a5181b
                - title: Navigator Jack | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-cb057a9b-e293-4e15-bdb9-c11880cb53bf
                  description: <p><strong>Captain</strong>, one more thing. We&#39;ll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                  author: Navigator Jack
                  guid: cb057a9b-e293-4e15-bdb9-c11880cb53bf
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-da05d978-9218-4263-886e-542068251787
                  description: <p>We&#39;ve got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It&#39;ll help us avoid scurvy.</p>
                  author: Cook Queen
                  guid: da05d978-9218-4263-886e-542068251787
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-00e7320a-ecb4-44f4-84ca-ffc2f8c62729
                  description: <p>Alright, engineer. Let&#39;s schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                  author: Captain Ace
                  guid: 00e7320a-ecb4-44f4-84ca-ffc2f8c62729
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-069f98da-bbc5-40ad-8c91-e8a089288ecb
                  description: <p>Let&#39;s hope it doesn&#39;t come to that, cook. But it&#39;s good to know we have you on our side.</p><p>Alright, everyone, let&#39;s get to work. We&#39;ve got a long journey ahead of us!</p>
                  author: Captain Ace
                  guid: 069f98da-bbc5-40ad-8c91-e8a089288ecb
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-72314bae-a05d-4551-91df-270802e6b003
                  description: <p>Good point, navigator. I&#39;ll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                  author: Captain Ace
                  guid: 72314bae-a05d-4551-91df-270802e6b003
                - title: Engineer King | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-5f066198-03ab-41f8-bd80-c4efaeafd153
                  description: <p>Captain, I&#39;ve been noticing some strange vibrations in the engine room. It&#39;s nothing too serious, but I&#39;d like to take a look at it just to be safe.</p>
                  author: Engineer King
                  guid: 5f066198-03ab-41f8-bd80-c4efaeafd153
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-bc460a63-f256-47e3-8915-3931acad132a
                  description: <p>Now, is there anything else anyone wants to bring up?</p>
                  author: Captain Ace
                  guid: bc460a63-f256-47e3-8915-3931acad132a
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-4922acc5-0330-4d1a-8092-ca7c67536b08
                  description: <p>Absolutely, cook. I&#39;ll make a note of it.</p>
                  author: Captain Ace
                  guid: 4922acc5-0330-4d1a-8092-ca7c67536b08
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-9a93d7bd-80cb-49bd-8dc1-67326df6fcaf
                  description: <p>What about supplies, cook?</p>
                  author: Captain Ace
                  guid: 9a93d7bd-80cb-49bd-8dc1-67326df6fcaf
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-e8331f48-516d-45fc-80a1-d1b2d5a21d08
                  description: <p>Good work, navigator. That&#39;s what I was thinking too.</p>
                  author: Captain Ace
                  guid: e8331f48-516d-45fc-80a1-d1b2d5a21d08
                - title: Engineer King | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-82acadba-3e77-4bcd-a366-78c7ff56c3b9
                  description: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                  author: Engineer King
                  guid: 82acadba-3e77-4bcd-a366-78c7ff56c3b9
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-788c0b17-a922-4c2d-816b-98def34a0008
                  description: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                  author: Captain Ace
                  guid: 788c0b17-a922-4c2d-816b-98def34a0008
                - title: Engineer King | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-40330ddf-13de-4921-b123-7a32057988cd
                  description: <p>What&#39;s on the agenda, captain?</p>
                  author: Engineer King
                  guid: 40330ddf-13de-4921-b123-7a32057988cd
                - title: Commenter Two | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-13b2c933-822c-4308-956a-a1943a64d157
                  description: <p>6th level comment</p>
                  author: Commenter Two
                  guid: 13b2c933-822c-4308-956a-a1943a64d157
                - title: Anonymous | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-973c1c1e-bfcd-435c-bb35-ad496dd04d81
                  description: <p>5th level comment</p>
                  author: Anonymous
                  guid: 973c1c1e-bfcd-435c-bb35-ad496dd04d81
                - title: Navigator Jack | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-56b2b226-840d-4189-996c-f2c6cbc86a5b
                  description: <p>4th level comment</p>
                  author: Navigator Jack
                  guid: 56b2b226-840d-4189-996c-f2c6cbc86a5b
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-1a29d310-8b6b-4cb2-bcaf-5e3346d1aaeb
                  description: <p>3rd level comment</p>
                  author: Cook Queen
                  guid: 1a29d310-8b6b-4cb2-bcaf-5e3346d1aaeb
                - title: Engineer King | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-721870c6-64e1-4f51-9500-92e2bb8250d0
                  description: <p>2nd level comment</p>
                  author: Engineer King
                  guid: 721870c6-64e1-4f51-9500-92e2bb8250d0
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-c7998a8b-408c-4dbe-9c1b-c422a74e4fcb
                  description: <p>Root level comment</p>
                  author: Captain Ace
                  guid: c7998a8b-408c-4dbe-9c1b-c422a74e4fcb
                - title: Anonymous | localhost:8000 | Comentario
                  link: http://localhost:8000/different-page/123#comentario-30ada0fc-d813-4dea-853e-3276052725eb
                  description: <p>Path override child</p>
                  author: Anonymous
                  guid: 30ada0fc-d813-4dea-853e-3276052725eb
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/different-page/123#comentario-1b0398b7-b3c4-422e-a04a-a38efce9c8be
                  description: <p>The path of this page is set to <code>/different-page/123</code></p>
                  author: Captain Ace
                  guid: 1b0398b7-b3c4-422e-a04a-a38efce9c8be
                - title: Anonymous | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/css-override-false/#comentario-7cffd785-f5c5-4464-bf2c-b33997834e4f
                  description: <p>CSS override disabled child</p>
                  author: Anonymous
                  guid: 7cffd785-f5c5-4464-bf2c-b33997834e4f
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/css-override-false/#comentario-0cefafcd-070f-442d-99c6-7b794477489f
                  description: <p>CSS override disabled</p>
                  author: Captain Ace
                  guid: 0cefafcd-070f-442d-99c6-7b794477489f
            `);
        });

        it('returns RSS feed for a domain page', () => {
            fetchRssItems(
                {domain: DOMAINS.localhost.id, page: DOMAIN_PAGES.comments.id},
                '/comments/',
                'Comentario page comments on localhost:8000',
            ).should('yamlMatch',
                // language=yaml
                `
                - title: Anonymous | localhost:8000 | Comentario
                  link: http://localhost:8000/comments/#comentario-0b5e258b-ecc6-4a9c-9f31-f775d88a258b
                  description: <p>This is a <b>root</b>, sticky comment</p>
                  author: Anonymous
                  guid: 0b5e258b-ecc6-4a9c-9f31-f775d88a258b
            `);
        });

        it('returns RSS feed for an author user', () => {
            fetchRssItems(
                {domain: DOMAINS.localhost.id, author: USERS.queen.id},
                '',
                'Comentario comments by Cook Queen on localhost:8000',
            ).should('yamlMatch',
                // language=yaml
                `
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-8f31a61b-e1e6-4090-a426-52ce91a5181b
                  description: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                  author: Cook Queen
                  guid: 8f31a61b-e1e6-4090-a426-52ce91a5181b
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-da05d978-9218-4263-886e-542068251787
                  description: <p>We&#39;ve got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It&#39;ll help us avoid scurvy.</p>
                  author: Cook Queen
                  guid: da05d978-9218-4263-886e-542068251787
                - title: Cook Queen | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-1a29d310-8b6b-4cb2-bcaf-5e3346d1aaeb
                  description: <p>3rd level comment</p>
                  author: Cook Queen
                  guid: 1a29d310-8b6b-4cb2-bcaf-5e3346d1aaeb
            `);
        });

        it('returns RSS feed for replies to a user', () => {
            fetchRssItems(
                {domain: DOMAINS.localhost.id, replyToUser: USERS.queen.id},
                '',
                'Comentario comments in reply to Cook Queen on localhost:8000',
            ).should('yamlMatch',
                // language=yaml
                `
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-069f98da-bbc5-40ad-8c91-e8a089288ecb
                  description: <p>Let&#39;s hope it doesn&#39;t come to that, cook. But it&#39;s good to know we have you on our side.</p><p>Alright, everyone, let&#39;s get to work. We&#39;ve got a long journey ahead of us!</p>
                  author: Captain Ace
                  guid: 069f98da-bbc5-40ad-8c91-e8a089288ecb
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-4922acc5-0330-4d1a-8092-ca7c67536b08
                  description: <p>Absolutely, cook. I&#39;ll make a note of it.</p>
                  author: Captain Ace
                  guid: 4922acc5-0330-4d1a-8092-ca7c67536b08
                - title: Navigator Jack | localhost:8000 | Comentario
                  link: http://localhost:8000/attr/max-level/#comentario-56b2b226-840d-4189-996c-f2c6cbc86a5b
                  description: <p>4th level comment</p>
                  author: Navigator Jack
                  guid: 56b2b226-840d-4189-996c-f2c6cbc86a5b
            `);
        });

        it('returns RSS feed for all filters', () => {
            fetchRssItems(
                {
                    domain: DOMAINS.localhost.id,
                    page: DOMAIN_PAGES.home.id,
                    author: USERS.ace.id,
                    replyToUser: USERS.queen.id,
                },
                '/',
                'Comentario page comments by Captain Ace in reply to Cook Queen on localhost:8000',
            )
            .should('yamlMatch',
                // language=yaml
                `
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-069f98da-bbc5-40ad-8c91-e8a089288ecb
                  description: <p>Let&#39;s hope it doesn&#39;t come to that, cook. But it&#39;s good to know we have you on our side.</p><p>Alright, everyone, let&#39;s get to work. We&#39;ve got a long journey ahead of us!</p>
                  author: Captain Ace
                  guid: 069f98da-bbc5-40ad-8c91-e8a089288ecb
                - title: Captain Ace | localhost:8000 | Comentario
                  link: http://localhost:8000/#comentario-4922acc5-0330-4d1a-8092-ca7c67536b08
                  description: <p>Absolutely, cook. I&#39;ll make a note of it.</p>
                  author: Captain Ace
                  guid: 4922acc5-0330-4d1a-8092-ca7c67536b08
            `);
        });

        it('errors when RSS is disabled', () => {
            cy.backendReset();

            // Disable RSS
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.enableRss]: false});

            // RSS endpoint must return an error now
            cy.request({method: 'GET', url: feedUrl({domain: DOMAINS.localhost.id}), failOnStatusCode: false})
                .then(r => {
                    expect(r.status).eq(403);
                    expect(r.body).eq(
                        '<Error>' +
                            '<ID>feature-disabled</ID>' +
                            '<Message>This feature is disabled</Message>' +
                            '<Details>RSS</Details>' +
                        '</Error>');
                });
        });
    });
});
