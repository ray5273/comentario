import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';
import { CopyTextDirective } from '../../../tools/_directives/copy-text.directive';
import { CurrentUserBadgeComponent } from '../../badges/current-user-badge/current-user-badge.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { CheckmarkComponent } from '../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../_pipes/datetime.pipe';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { CountryNamePipe } from '../../_pipes/country-name.pipe';
import { ExternalLinkDirective } from '../../../tools/_directives/external-link.directive';

/**
 * Renders a table with user properties.
 */
@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
    imports: [
        UserAvatarComponent,
        RouterLink,
        CopyTextDirective,
        CurrentUserBadgeComponent,
        IdentityProviderIconComponent,
        CheckmarkComponent,
        DatetimePipe,
        DecimalPipe,
        SpinnerDirective,
        CountryNamePipe,
        ExternalLinkDirective,
    ],
})
export class UserDetailsComponent {

    /** The user in question. */
    @Input({required: true})
    user?: User;

    /** Whether to turn the ID into a link. */
    @Input()
    userLink?: boolean;

    /** Whether the current user can unlock users (= is a superuser). */
    @Input()
    canUnlock?: boolean;

    @Output()
    readonly unlocked = new EventEmitter<void>();

    readonly Paths = Paths;
    readonly unlocking = new ProcessingStatus();

    constructor(
        private readonly api: ApiGeneralService,
        private readonly toastSvc: ToastService,
    ) {}

    /**
     * Unlock the current user.
     */
    unlock() {
        if (this.user) {
            this.api.userUnlock(this.user.id!)
                .pipe(this.unlocking.processing())
                .subscribe(() => {
                    // Notify subscribers
                    this.unlocked.emit();
                    // Add a success toast
                    this.toastSvc.success('user-is-unlocked');
                });
        }
    }
}
