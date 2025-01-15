import { Component } from '@angular/core';
import { JsonPipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faChevronDown, faCircleExclamation, faExclamation, faInfoCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { Highlight } from 'ngx-highlightjs';
import { Severity, Toast, ToastService } from '../_services/toast.service';
import { Paths } from '../_utils/consts';
import { AuthService } from '../_services/auth.service';
import { ServerMessageComponent } from '../_modules/tools/server-message/server-message.component';

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    imports: [
        NgbToastModule,
        NgClass,
        FaIconComponent,
        ServerMessageComponent,
        Highlight,
        JsonPipe,
    ],
})
export class ToastComponent {

    /** Whether toasts are to be automatically hidden after a timeout. */
    autohide = true;

    /** Toast list. */
    toasts: Toast[] = [];

    /** ID of the toast that has technical details open. If undefined, no technical details is open at all. */
    techDetailsOpenID?: string;

    readonly Paths = Paths;

    /** Toast background class that corresponds to the toast's severity. */
    readonly BgClassBySeverity: Record<Severity, string> = {
        [Severity.INFO]:    'bg-info',
        [Severity.SUCCESS]: 'bg-success',
        [Severity.WARNING]: 'bg-warning',
        [Severity.ERROR]:   'bg-danger',
    };

    /** Icon corresponding to the toast's severity. */
    readonly IconBySeverity: Record<Severity, IconDefinition> = {
        [Severity.INFO]:    faInfoCircle,
        [Severity.SUCCESS]: faCheck,
        [Severity.WARNING]: faExclamation,
        [Severity.ERROR]:   faCircleExclamation,
    };

    /** Icon class to the toast's severity. */
    readonly IconClassBySeverity: Record<Severity, string> = {
        [Severity.INFO]:    'text-info',
        [Severity.SUCCESS]: 'text-success',
        [Severity.WARNING]: 'text-warning',
        [Severity.ERROR]:   'text-danger',
    };

    // Icons
    readonly faChevronDown = faChevronDown;

    constructor(
        private readonly router: Router,
        private readonly toastSvc: ToastService,
        private readonly authSvc: AuthService,
    ) {
        this.toastSvc.toastsChanges.subscribe(ts => this.toasts = ts);
    }

    /**
     * Remove the toast from the list by its unique ID.
     * @param uid Toast UID to remove.
     */
    remove(uid: string): void {
        this.toastSvc.removeByUid(uid);
    }

    /**
     * Toggle the technical details on the toast with the given ID.
     */
    toggleDetails(id: string) {
        this.techDetailsOpenID = this.techDetailsOpenID === id ? undefined : id;
    }

    /**
     * Navigate to the login page, remembering the current URL as a return route.
     */
    goLogin() {
        // Remember the current route to get back to it after login
        this.authSvc.afterLoginRedirectUrl = this.router.url;

        // Redirect to login
        this.router.navigate([Paths.auth.login]);
    }
}
