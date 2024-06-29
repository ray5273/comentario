import { Injectable } from '@angular/core';
import { BehaviorSubject, first, Observable, of, switchMap, tap, timer } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { ApiGeneralService, InstancePluginConfig, InstanceStaticConfig, ReleaseMetadata } from '../../generated-api';
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
            // Store its static/plugin parts permanently
            tap(cfg => {
                this._staticConfig = cfg.staticConfig;
                this._pluginConfig = cfg.pluginConfig;
            }),
            // Convert the dynamic part into a map
            map(cfg => new DynamicConfig(cfg.dynamicConfig)),
            // Cache the last result
            shareReplay(1));

    /**
     * Enabled extensions obtained from the server.
     */
    readonly extensions = this.api.configExtensionsGet().pipe(map(r => r.extensions), shareReplay(1));

    /**
     * Observable for obtaining the latest Comentario versions, updated periodically (once an hour).
     */
    private readonly _versionData$ = timer(2000, 3600 * 1000)
        .pipe(
            // Fetch the version data
            switchMap(() => this.api.configVersionsGet()),
            // Turn any error into undefined
            catchError(() => of(undefined)),
            // Cache the last result
            shareReplay(1));

    private _staticConfig?: InstanceStaticConfig;
    private _pluginConfig?: InstancePluginConfig;

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
     * Plugin instance configuration obtained from the server.
     */
    get pluginConfig(): InstancePluginConfig {
        return this._pluginConfig!;
    }

    /**
     * Latest release metadata, if available. Only available for a superuser.
     */
    get latestRelease(): Observable<ReleaseMetadata | undefined> {
        return this._versionData$.pipe(map(d => d?.latestRelease));

    }

    /**
     * Whether an upgrade is available for the current Comentario version. Only available for a superuser.
     */
    get isUpgradable(): Observable<boolean | undefined> {
        return this._versionData$.pipe(map(d => d?.isUpgradable));
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
