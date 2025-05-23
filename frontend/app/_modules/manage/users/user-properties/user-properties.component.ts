import { Component, computed, effect, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatestWith, EMPTY, switchMap, tap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faCalendarXmark, faEdit, faLockOpen, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, UserGet200Response, UserSession } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';
import { Animations } from '../../../../_utils/animations';
import { Utils } from '../../../../_utils/utils';
import { ConfigService } from '../../../../_services/config.service';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ConfirmDirective } from '../../../tools/_directives/confirm.directive';
import { UserDetailsComponent } from '../user-details/user-details.component';
import { AttributeTableComponent } from '../../attribute-table/attribute-table.component';
import { DomainUserRoleBadgeComponent } from '../../badges/domain-user-role-badge/domain-user-role-badge.component';
import { ListFooterComponent } from '../../../tools/list-footer/list-footer.component';
import { InfoBlockComponent } from '../../../tools/info-block/info-block.component';
import { DatetimePipe } from '../../_pipes/datetime.pipe';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { PrincipalService } from '../../../../_services/principal.service';

@UntilDestroy()
@Component({
    selector: 'app-user-properties',
    templateUrl: './user-properties.component.html',
    animations: [Animations.fadeIn('slow')],
    imports: [
        SpinnerDirective,
        FaIconComponent,
        ConfirmDirective,
        UserDetailsComponent,
        AttributeTableComponent,
        RouterLink,
        DomainUserRoleBadgeComponent,
        ListFooterComponent,
        InfoBlockComponent,
        DatetimePipe,
        NoDataComponent,
        ReactiveFormsModule,
    ],
})
export class UserPropertiesComponent {

    /** ID of the user to display properties for. */
    readonly id = input<string>();

    /** Signals to reload the current user and dependent objects. */
    private readonly reload$ = new BehaviorSubject<any>(undefined);

    /** API response, which combines the user, their attributes, and domain users. */
    readonly _userResp = toSignal<UserGet200Response>(
        toObservable(this.id)
            .pipe(
                combineLatestWith(this.reload$),
                switchMap(([id]) => id ? this.api.userGet(id).pipe(this.loading.processing()) : EMPTY)));

    /** User in question, whose properties are displayed. */
    readonly user = computed(() => this._userResp()?.user);

    /** Selected user's attributes. */
    readonly userAttrs = computed(() => Utils.sortByKey(this._userResp()?.attributes as Record<string, string> | undefined));

    /** Domain users for the selected user. */
    readonly domainUsers = computed(() => this._userResp()?.domainUsers);

    /** Domains of domainUsers. */
    readonly domains = computed<Map<string, Domain>>(() => new Map<string, Domain>(this._userResp()?.domains?.map(d => [d.id!, d])));

    /** User sessions. */
    userSessions?: UserSession[];

    /** Whether there are more sessions to load. */
    canLoadMoreSessions = true;

    /** Whether the user is the currently authenticated principal. */
    readonly isSelf = computed(() => this.id() && this.id() === this.principalSvc.principal()?.id);

    readonly Paths = Paths;
    readonly loading          = new ProcessingStatus();
    readonly loadingSessions  = new ProcessingStatus();
    readonly unlocking        = new ProcessingStatus();
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
    readonly faBan           = faBan;
    readonly faCalendarXmark = faCalendarXmark;
    readonly faEdit          = faEdit;
    readonly faLockOpen      = faLockOpen;
    readonly faTrashAlt      = faTrashAlt;

    /** Last loaded session list page number. */
    private loadedSessionsPageNum = 0;

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly principalSvc: PrincipalService,
        private readonly toastSvc: ToastService,
        private readonly configSvc: ConfigService,
    ) {
        // Ban and delete confirmation forms: disable Purge comments if Delete comments is off
        [this.banConfirmationForm, this.deleteConfirmationForm]
            .forEach(f => f.controls.deleteComments.valueChanges
                .pipe(untilDestroyed(this))
                .subscribe(b => Utils.enableControls(b, f.controls.purgeComments)));

        // Load the user's sessions
        effect(() => this.loadSessions(true));
    }

    toggleBan() {
        const u = this.user();
        if (u) {
            const ban = !u.banned;
            const vals = this.banConfirmationForm.value;
            this.api.userBan(u.id!, {ban, deleteComments: vals.deleteComments, purgeComments: vals.purgeComments})
                .pipe(this.banning.processing(), tap(this.reload$))
                // Add a success toast
                .subscribe(r => this.toastSvc.success({
                    messageId: ban ? 'user-is-banned' : 'user-is-unbanned',
                    details:   ban && vals.deleteComments ? $localize`${r.countDeletedComments} comments have been deleted` : undefined,
                }));
        }
    }

    delete() {
        const u = this.user();
        if (u) {
            const vals = this.deleteConfirmationForm.value;
            this.api.userDelete(u.id!, vals)
                .pipe(this.deleting.processing())
                .subscribe(r => {
                    // Add a success toast
                    this.toastSvc.success({
                        messageId:         'user-is-deleted',
                        details:           vals.deleteComments ? $localize`${r.countDeletedComments} comments have been deleted` : undefined,
                        keepOnRouteChange: true,
                    });
                    // Navigate to the user list
                    this.router.navigate([Paths.manage.users]);
                });
        }
    }

    /**
     * Load or reload sessions of the current user.
     * @param reset Whether to reset the list prior to load.
     */
    loadSessions(reset: boolean) {
        const uid = this.id();
        if (uid) {
            // Reset the content/page if needed
            if (reset) {
                this.userSessions = undefined;
                this.loadedSessionsPageNum = 0;
            }

            // Load sessions
            this.api.userSessionList(uid, ++this.loadedSessionsPageNum)
                .pipe(this.loadingSessions.processing())
                .subscribe(sessions => {
                    this.userSessions = [...this.userSessions || [], ...sessions || []];
                    this.canLoadMoreSessions = this.configSvc.canLoadMore(sessions);
                });
        }
    }

    expireSessions() {
        const id = this.id();
        if (id) {
            this.api.userSessionsExpire(id)
                .pipe(this.expiringSessions.processing())
                .subscribe(() => this.loadSessions(true));
        }
    }

    /**
     * Return whether the given session has expired.
     */
    isSessionExpired(us: UserSession): boolean {
        return new Date(us.expiresTime).getTime() < new Date().getTime();
    }

    /**
     * Unlock the current user.
     */
    unlock() {
        const id = this.id();
        if (id) {
            this.api.userUnlock(id)
                .pipe(this.unlocking.processing(), tap(this.reload$))
                .subscribe(() => this.toastSvc.success('user-is-unlocked'));
        }
    }
}
