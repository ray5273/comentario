import { Injectable } from '@angular/core';
import { BehaviorSubject, first, Observable, of, ReplaySubject, switchMap, tap, timer } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import {
    ApiGeneralService,
    InstanceConfig,
    InstancePluginConfig,
    InstanceStaticConfig,
    ReleaseMetadata,
} from '../../generated-api';
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
    static readonly TOAST_DELAY = 10_000;

    /**
     * Whether the system is running under an end-2-end test.
     */
    readonly isUnderTest: boolean = false;

    /**
     * Observable for instance configuration obtained from the server. Supposed to only be used during app
     * initialisation, because once it's complete one can start using the cached configs (staticConfig etc.)
     */
    readonly config$ = new ReplaySubject<InstanceConfig>(1);

    private readonly _dynamicReload$ = new BehaviorSubject<void>(undefined);

    /**
     * Dynamic instance configuration obtained from the server.
     */
    readonly dynamicConfig = this._dynamicReload$
        .pipe(
            // Fetch the config from the backend
            switchMap(() => this.api.configGet()),
            // Notify the observable
            tap(this.config$),
            // Store its static/plugin parts permanently
            tap(cfg => {
                this._staticConfig = cfg.staticConfig;
                this._pluginConfig = cfg.pluginConfig ?? {};
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
     * Static instance configuration obtained from the server. Only available after the app initialisation has finished.
     */
    get staticConfig(): InstanceStaticConfig {
        if (!this._staticConfig) {
            throw Error('App initialisation is not complete, no static config available yet.');
        }
        return this._staticConfig;
    }

    /**
     * Plugin instance configuration obtained from the server. Only available after the app initialisation has finished.
     */
    get pluginConfig(): InstancePluginConfig {
        if (!this._pluginConfig) {
            throw Error('App initialisation is not complete, no plugin config available yet.');
        }
        return this._pluginConfig;
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
