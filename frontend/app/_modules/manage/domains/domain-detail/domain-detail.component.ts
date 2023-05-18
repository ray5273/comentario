import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ApiOwnerService, Domain } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';

@UntilDestroy()
@Component({
    selector: 'app-domain-detail',
    templateUrl: './domain-detail.component.html',
})
export class DomainDetailComponent implements OnInit {

    _domain?: Domain;

    /** Observable for retrieving the domain in question. */
    readonly domain = new BehaviorSubject<Domain | undefined>(undefined);
    /** Observable for retrieving domain federated identity providers. */
    readonly federatedIdpIds = new BehaviorSubject<string[] | undefined>(undefined);

    readonly loading = new ProcessingStatus();
    readonly Paths = Paths;

    private _host?: string | null;

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly api: ApiOwnerService,
    ) {}

    /**
     * The last path segment, which is used for tab selection.
     */
    get subPath(): string {
        return this.router.url.split('/').pop() || '';
    }

    ngOnInit(): void {
        // Subscribe to route parameter changes to reload data
        this.route.paramMap
            .subscribe(pm => {
                this._host = pm.get('host');
                this.reload();
            });
    }

    reload() {
        // Load the domain, if the host is known
        if (this._host) {
            this.api.domainGet(this._host)
                .pipe(this.loading.processing())
                .subscribe(r => {
                    this.setDomain(r.domain);
                    this.setFederatedIdpIds(r.federatedIdpIds);
                });
        } else {
            this.setDomain(undefined);
        }
    }

    private setDomain(d: Domain | undefined) {
        this._domain = d;
        this.domain.next(d);
    }

    private setFederatedIdpIds(v: string[] | undefined) {
        this.federatedIdpIds.next(v);
    }
}
