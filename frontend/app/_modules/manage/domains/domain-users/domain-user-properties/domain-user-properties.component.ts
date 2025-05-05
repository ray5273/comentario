import { Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatestWith, EMPTY, switchMap } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, DomainUser, User } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { DomainUserRoleBadgeComponent } from '../../../badges/domain-user-role-badge/domain-user-role-badge.component';
import { CheckmarkComponent } from '../../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { UserDetailsComponent } from '../../../users/user-details/user-details.component';
import { CommentListComponent } from '../../comments/comment-list/comment-list.component';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';

/**
 * Object combining a domain user and a corresponding user; is implemented by the domainUserGet()'s response.
 */
interface UserDomainUser {
    user?: User;
    domainUser?: DomainUser;
}

@UntilDestroy()
@Component({
    selector: 'app-domain-user-properties',
    templateUrl: './domain-user-properties.component.html',
    imports: [
        SpinnerDirective,
        FaIconComponent,
        DomainUserRoleBadgeComponent,
        CheckmarkComponent,
        DatetimePipe,
        UserDetailsComponent,
        CommentListComponent,
        NoDataComponent,
        RouterLink,
    ],
})
export class DomainUserPropertiesComponent {

    /** ID of the domain user to display properties for. */
    readonly id = input<string>();

    /** The current domain/user metadata. */
    readonly domainMeta = toSignal(this.domainSelectorSvc.domainMeta(true));

    /** The domain user in question, and the corresponding user. */
    readonly userDomainUser = toSignal<UserDomainUser>(
        toObservable(this.domainMeta)
            .pipe(
                combineLatestWith(toObservable(this.id)),
                switchMap(([meta, id]) => meta && id ?
                    this.api.domainUserGet(id, meta.domain!.id!).pipe(this.loading.processing()) :
                    EMPTY)));

    /** Whether the currently authenticated principal is a superuser. */
    readonly isSuperuser = computed<boolean>(() => !!this.domainMeta()?.principal?.isSuperuser);

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();

    // Icons
    readonly faEdit = faEdit;

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
