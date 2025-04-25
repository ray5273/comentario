import { DOMAINS, PATHS, USERS } from '../../../support/cy-utils';

interface SidebarItem {
    label:    string;
    path?:    string | RegExp | Cypress.IsAtObjectWithUnderscore;
    partial?: boolean;
}

context('Sidebar', () => {

    const noDomainSidebarItems = (userName: string): SidebarItem[] => ([
        {label: 'Dashboard', path: PATHS.manage.dashboard},
        {label: 'Domains',   path: PATHS.manage.domains._},
        {label: 'ACCOUNT'},
        {label: userName,    path: PATHS.manage.account.profile, partial: true},
        {label: 'LOGOUT'},
        {label: 'Logout'},
    ]);

    /** Items for both commenter and readonly domain user. */
    const commenterSidebarItems = (userName: string, domain: Cypress.Domain): SidebarItem[] => ([
        {label: 'Dashboard', path: PATHS.manage.dashboard},
        {label: 'Domains',   path: PATHS.manage.domains._},
        {label: domain.host, path: PATHS.manage.domains.id(domain.id).props, partial: true},
        {label: 'Pages',     path: PATHS.manage.domains.id(domain.id).pages},
        {label: 'Comments',  path: PATHS.manage.domains.id(domain.id).comments},
        {label: 'ACCOUNT'},
        {label: userName,    path: PATHS.manage.account.profile, partial: true},
        {label: 'LOGOUT'},
        {label: 'Logout'},
    ]);

    const ownerSidebarItems = (userName: string, domain: Cypress.Domain): SidebarItem[] => ([
        {label: 'Dashboard',    path: PATHS.manage.dashboard},
        {label: 'Domains',      path: PATHS.manage.domains._},
        {label: domain.host,    path: PATHS.manage.domains.id(domain.id).props, partial: true},
        {label: 'Pages',        path: PATHS.manage.domains.id(domain.id).pages},
        {label: 'Comments',     path: PATHS.manage.domains.id(domain.id).comments, partial: true /* There's 1 pending comment */},
        {label: 'Domain users', path: PATHS.manage.domains.id(domain.id).users},
        {label: 'Statistics',   path: PATHS.manage.domains.id(domain.id).stats},
        {label: 'Operations',   path: PATHS.manage.domains.id(domain.id).operations},
        {label: 'ACCOUNT'},
        {label: userName,       path: PATHS.manage.account.profile, partial: true},
        {label: 'LOGOUT'},
        {label: 'Logout'},
    ]);

    const superNoDomainSidebarItems = (userName: string): SidebarItem[] => ([
        {label: 'Dashboard',     path: PATHS.manage.dashboard},
        {label: 'Domains',       path: PATHS.manage.domains._},
        {label: 'ADMINISTRATION'},
        {label: 'Users',         path: PATHS.manage.users},
        {label: 'CONFIGURATION'},
        {label: 'Configuration', path: PATHS.manage.config.static},
        {label: 'ACCOUNT'},
        {label: userName,        path: PATHS.manage.account.profile, partial: true},
        {label: 'LOGOUT'},
        {label: 'Logout'},
    ]);

    const superSidebarItems = (userName: string, domain: Cypress.Domain): SidebarItem[] => ([
        {label: 'Dashboard',     path: PATHS.manage.dashboard},
        {label: 'Domains',       path: PATHS.manage.domains._},
        {label: domain.host,     path: PATHS.manage.domains.id(domain.id).props, partial: true},
        {label: 'Pages',         path: PATHS.manage.domains.id(domain.id).pages},
        {label: 'Comments',      path: PATHS.manage.domains.id(domain.id).comments},
        {label: 'Domain users',  path: PATHS.manage.domains.id(domain.id).users},
        {label: 'Statistics',    path: PATHS.manage.domains.id(domain.id).stats},
        {label: 'Operations',    path: PATHS.manage.domains.id(domain.id).operations},
        {label: 'ADMINISTRATION'},
        {label: 'Users',         path: PATHS.manage.users},
        {label: 'CONFIGURATION'},
        {label: 'Configuration', path: PATHS.manage.config.static},
        {label: 'ACCOUNT'},
        {label: userName,        path: PATHS.manage.account.profile, partial: true},
        {label: 'LOGOUT'},
        {label: 'Logout'},
    ]);

    const checkSidebarItems = (items: SidebarItem[]) => {
        // Check item texts
        cy.texts('app-control-center li.nav-item')
            .should('arrayMatch', ['' /* Logo */, ...items.map(i => i.partial ? new RegExp(i.label) : i.label)]);

        // Click items one-for-one, skipping logo and headers
        items.filter(i => i.path).forEach(i => cy.sidebarClick(i.label, i.path));
    };

    beforeEach(cy.backendReset);

    it('isn\'t shown on the homepage', () => {
        cy.visit(PATHS.home);
        cy.isAt(PATHS.home);
        cy.get('app-control-center').should('not.exist');
    });

    it('shows readonly commenter items', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.dashboard);
        checkSidebarItems(noDomainSidebarItems('Engineer King'));

        // Select a domain where the user is readonly
        cy.selectDomain(DOMAINS.spirit);
        checkSidebarItems(commenterSidebarItems('Engineer King', DOMAINS.spirit));
        cy.logout();
    });

    it('shows commenter items', () => {
        // Login as commenter without domain records
        cy.loginViaApi(USERS.commenterOne, PATHS.manage.dashboard);
        checkSidebarItems(noDomainSidebarItems('Commenter One'));
        cy.logout();

        // Login as commenter with a domain record (no domain selected yet)
        cy.loginViaApi(USERS.commenterTwo, PATHS.manage.dashboard);
        checkSidebarItems(noDomainSidebarItems('Commenter Two'));

        // Select the domain
        cy.selectDomain(DOMAINS.localhost);
        checkSidebarItems(commenterSidebarItems('Commenter Two', DOMAINS.localhost));
        cy.logout();
    });

    it('shows owner items', () => {
        cy.loginViaApi(USERS.ace, PATHS.manage.dashboard);
        checkSidebarItems(noDomainSidebarItems('Captain Ace'));

        // Select the domain
        cy.selectDomain(DOMAINS.localhost);
        checkSidebarItems(ownerSidebarItems('Captain Ace', DOMAINS.localhost));
        cy.logout();
    });

    it('shows superuser items', () => {
        cy.loginViaApi(USERS.root, PATHS.manage.dashboard);
        checkSidebarItems(superNoDomainSidebarItems('Root'));

        // Select the domain
        cy.selectDomain(DOMAINS.access);
        checkSidebarItems(superSidebarItems('Root', DOMAINS.access));
        cy.logout();
    });
});
