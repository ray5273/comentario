import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';

/**
 * Renders a table with user properties.
 */
@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
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
