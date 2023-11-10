import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith, Observable, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DomainSelectorService } from './domain-selector.service';
import { ApiGeneralService } from '../../../../generated-api';

@Injectable({
    providedIn: 'root',
})
export class CommentService {

    private readonly refresh$ = new BehaviorSubject<void>(undefined);

    /** Number of comments pending moderation for the current domain. */
    readonly countPending: Observable<number> = this.domainSelectorService.domainMeta(true)
        .pipe(
            // Trigger a reload on request
            combineLatestWith(this.refresh$),
            // If the current user is a domain owner/moderator/superuser, fetch the pending comment count
            switchMap(([meta]) => meta.canModerateDomain ?
                this.api.commentCount(meta.domain!.id!, undefined, undefined, false, true, false, false) :
                of(0)),
            // Do not let error seep through
            catchError(() => of(0)));

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorService: DomainSelectorService,
    ) {}

    /**
     * Trigger a reload of the comment count.
     */
    refresh() {
        this.refresh$.next();
    }
}
