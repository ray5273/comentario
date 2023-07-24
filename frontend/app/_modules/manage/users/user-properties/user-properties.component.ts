import { Component, Input } from '@angular/core';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainUser, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-user-properties',
    templateUrl: './user-properties.component.html',
})
export class UserPropertiesComponent {

    /** The selected user whose properties are displayed. */
    user?: User;

    /** Domain users for the selected user. */
    domainUsers?: DomainUser[];

    /** Domains of domainUsers. */
    domains = new Map<string, Domain>();

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();

    // Icons
    readonly faEdit = faEdit;

    constructor(
        private readonly api: ApiGeneralService,
    ) {}

    @Input()
    set id(id: string) {
        // Load the user's details
        this.api.userGet(id)
            .pipe(this.loading.processing())
            .subscribe(r => {
                this.user        = r.user;
                this.domainUsers = r.domainUsers;

                // Make a domain map
                this.domains.clear();
                r.domains?.forEach(d => this.domains.set(d.id!, d));
            });
    }
}
