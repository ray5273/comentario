import { Component, Input } from '@angular/core';
import { DomainSelectorService } from '../../_services/domain-selector.service';

/**
 * The root component for all other components that deal with a certain domain. Its only responsibility is to make sure
 * the DomainSelectorService is up to date about the domain requested in the router.
 */
@Component({
    selector: 'app-domain-detail',
    template: '<router-outlet></router-outlet>',
})
export class DomainDetailComponent {

    constructor(
        private readonly domainSelectorService: DomainSelectorService,
    ) {}

    /** Selected domain ID. */
    @Input({required: true})
    set id(id: string) {
        // Make sure the correct domain is selected
        this.domainSelectorService.setDomainId(id);
    }
}
