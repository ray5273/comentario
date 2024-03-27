import { Injectable } from '@angular/core';
import { BehaviorSubject, first, Observable, switchMap, tap } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { ApiGeneralService, InstanceStaticConfig } from '../../generated-api';
import { DynamicConfig } from '../_models/config';

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        Cypress?: never; // Set when run under Cypress
    }
}

@Injectable({
    providedIn: 'root',
})
export class ConfigService {

    /**
     * Toast hiding delay in milliseconds.
     */
    static readonly TOAST_DELAY = 10000;

    /**
     * Whether the system is running under an end-2-end test.
     */
    readonly isUnderTest: boolean = false;

    private readonly _dynamicReload$ = new BehaviorSubject<void>(undefined);

    /**
     * Dynamic instance configuration obtained from the server.
     */
    readonly dynamicConfig = this._dynamicReload$
        .pipe(
            // Fetch the config from the backend
            switchMap(() => this.api.configGet()),
            // Store its static part permanently
            tap(cfg => this._staticConfig = cfg.staticConfig),
            // Convert the dynamic part into a map
            map(cfg => new DynamicConfig(cfg.dynamicConfig)),
            // Cache the last result
            shareReplay(1));

    /**
     * Enabled extensions obtained from the server.
     */
    readonly extensions = this.api.configExtensionsGet().pipe(map(r => r.extensions), shareReplay(1));

    private _staticConfig?: InstanceStaticConfig;

    constructor(
        ngbConfig: NgbConfig,
        toastConfig: NgbToastConfig,
        private readonly api: ApiGeneralService,
    ) {
        // Detect if the e2e-test is active
        this.isUnderTest = !!window.Cypress;

        // Disable animations with e2e to speed up the tests
        ngbConfig.animation = !this.isUnderTest;
        toastConfig.delay = ConfigService.TOAST_DELAY;
    }

    /**
     * Static instance configuration obtained from the server.
     */
    get staticConfig(): InstanceStaticConfig {
        return this._staticConfig!;
    }

    /**
     * Initialise the app configuration.
     */
    init(): Observable<unknown> {
        return this.dynamicConfig.pipe(first());
    }

    /**
     * Returns whether the length of the provided array (representing a portion of fetched data) is equal to the
     * configured result page size, or greater.
     * @param d The array to check.
     */
    canLoadMore(d: any[] | null | undefined): boolean {
        return (d?.length ?? 0) >= this.staticConfig.resultPageSize;
    }

    /**
     * Trigger an update of the dynamic configuration.
     */
    dynamicReload(): void {
        this._dynamicReload$.next(undefined);
    }
}
