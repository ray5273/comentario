import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, switchMap } from 'rxjs';
import { faBan, faEdit } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainUser, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';

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
    readonly banning = new ProcessingStatus();

    readonly banConfirmationForm = this.fb.nonNullable.group({
        deleteComments: false,
    });

    // Icons
    readonly faBan  = faBan;
    readonly faEdit = faEdit;

    private readonly refresh$ = new BehaviorSubject<void>(undefined);

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        // Load the user's details, triggering a reload on each refresh signal
        this.refresh$
            .pipe(switchMap(() => this.api.userGet(id).pipe(this.loading.processing())))
            .subscribe(r => {
                this.user        = r.user;
                this.domainUsers = r.domainUsers;

                // Make a domain map
                this.domains.clear();
                r.domains?.forEach(d => this.domains.set(d.id!, d));
            });
    }

    toggleBan() {
        const ban = !this.user!.banned;
        const deleteComments = this.banConfirmationForm.value.deleteComments;
        this.api.userBan(this.user!.id!, {ban, deleteComments})
            .pipe(this.banning.processing())
            .subscribe(r => {
                // Add a success toast
                this.toastSvc.success(
                    ban ? 'user-is-banned' : 'user-is-unbanned',
                    undefined,
                    ban && deleteComments ?
                        $localize`${r.countDeletedComments} comments have been deleted` :
                        undefined,
                );
                // Reload the properties
                this.refresh$.next();
            });
    }
}
