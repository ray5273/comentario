import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, combineLatestWith, mergeWith, of, Subject, switchMap, tap, throwError } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faAngleDown, faBan, faCalendarXmark, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainUser, KeyValue, User, UserSession } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';
import { AuthService } from '../../../../_services/auth.service';
import { Animations } from '../../../../_utils/animations';
import { Utils } from '../../../../_utils/utils';
import { ConfigService } from '../../../../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-user-properties',
    templateUrl: './user-properties.component.html',
    animations: [Animations.fadeIn('slow')],
})
export class UserPropertiesComponent {

    /** The selected user whose properties are displayed. */
    user?: User;

    /** Domain users for the selected user. */
    domainUsers?: DomainUser[];

    /** Domains of domainUsers. */
    domains = new Map<string, Domain>();

    /** The selected user's attributes. */
    userAttrs?: KeyValue[];

    /** User sessions. */
    userSessions?: UserSession[];

    /** Whether there are more sessions to load. */
    canLoadMoreSessions = true;

    /** Whether the user is the currently authenticated principal. */
    isSelf = false;

    /** Whether the Attribute section, if any, is collapsed. */
    isAttrsCollapsed = true;

    /** Observable triggering a sessions load, while indicating whether a reset is needed. */
    readonly loadSessions$ = new Subject<boolean>();

    readonly Paths = Paths;
    readonly loading          = new ProcessingStatus();
    readonly loadingSessions  = new ProcessingStatus();
    readonly banning          = new ProcessingStatus();
    readonly deleting         = new ProcessingStatus();
    readonly expiringSessions = new ProcessingStatus();

    readonly banConfirmationForm = this.fb.nonNullable.group({
        deleteComments: false,
        purgeComments:  [{value: false, disabled: true}],
    });

    readonly deleteConfirmationForm = this.fb.nonNullable.group({
        deleteComments: false,
        purgeComments:  [{value: false, disabled: true}],
    });

    // Icons
    readonly faAngleDown     = faAngleDown;
    readonly faBan           = faBan;
    readonly faCalendarXmark = faCalendarXmark;
    readonly faEdit          = faEdit;
    readonly faTrashAlt      = faTrashAlt;

    /** Observable triggering a full refresh. */
    private readonly refresh$ = new BehaviorSubject<void>(undefined);

    /** Last loaded session list page number. */
    private loadedSessionsPageNum = 0;

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
        private readonly configSvc: ConfigService,
    ) {
        // Ban and delete confirmation forms: disable Purge comments if Delete comments is off
        [this.banConfirmationForm, this.deleteConfirmationForm]
            .forEach(f => f.controls.deleteComments.valueChanges
                .pipe(untilDestroyed(this))
                .subscribe(b => Utils.enableControls(b, f.controls.purgeComments)));
    }

    @Input()
    set id(id: string) {
        // Load the user's details, triggering a reload on each refresh signal
        this.refresh$
            .pipe(
                switchMap(() => this.api.userGet(id).pipe(this.loading.processing())),
                // Monitor principal changes, too
                combineLatestWith(this.authSvc.principal),
                // Save user properties
                switchMap(([r, principal]) => {
                    // Terminate processing if not logged in anymore (for example, if the user expired their own sessions)
                    if (!principal) {
                        return throwError(() => 'Not authenticated');
                    }

                    this.user        = r.user;
                    this.userAttrs   = r.attributes;
                    this.domainUsers = r.domainUsers;
                    this.isSelf      = principal?.id === this.user?.id;

                    // Make a domain map
                    this.domains.clear();
                    r.domains?.forEach(d => this.domains.set(d.id!, d));

                    // Map this action to true (= reset)
                    return of(true);
                }),
                // Subscribe to sessions load requests
                mergeWith(this.loadSessions$),
                // Reset the content/page if needed
                tap(reset => {
                    if (reset) {
                        this.userSessions = undefined;
                        this.loadedSessionsPageNum = 0;
                    }
                }),
                // Fetch user sessions
                switchMap(() => this.api.userSessionList(id, ++this.loadedSessionsPageNum).pipe(this.loadingSessions.processing())))
            .subscribe(uss => {
                this.userSessions = [...this.userSessions || [], ...uss || []];
                this.canLoadMoreSessions = this.configSvc.canLoadMore(uss);
            });
    }

    toggleBan() {
        const ban = !this.user!.banned;
        const vals = this.banConfirmationForm.value;
        this.api.userBan(this.user!.id!, {ban, deleteComments: vals.deleteComments, purgeComments: vals.purgeComments})
            .pipe(this.banning.processing())
            .subscribe(r => {
                // Add a success toast
                this.toastSvc.success(
                    ban ? 'user-is-banned' : 'user-is-unbanned',
                    undefined,
                    ban && vals.deleteComments ?
                        $localize`${r.countDeletedComments} comments have been deleted` :
                        undefined,
                );
                // Reload the properties
                this.reload();
            });
    }

    delete() {
        const vals = this.deleteConfirmationForm.value;
        this.api.userDelete(this.user!.id!, vals)
            .pipe(this.deleting.processing())
            .subscribe(r => {
                // Add a success toast
                this.toastSvc.success(
                    'user-is-deleted',
                    undefined,
                    vals.deleteComments ? $localize`${r.countDeletedComments} comments have been deleted` : undefined,
                ).keepOnRouteChange();
                // Navigate to the user list
                this.router.navigate([Paths.manage.users]);
            });
    }

    /**
     * Trigger a reload of the current user.
     */
    reload() {
        this.refresh$.next();
    }

    expireSessions() {
        this.api.userSessionsExpire(this.user!.id!)
            .pipe(this.expiringSessions.processing())
            .subscribe(() => this.loadSessions$.next(true));
    }

    /**
     * Return whether the given session has expired.
     */
    isSessionExpired(us: UserSession): boolean {
        return new Date(us.expiresTime).getTime() < new Date().getTime();
    }
}
