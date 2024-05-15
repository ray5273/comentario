import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, switchMap, tap, timer } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import * as semver from 'semver';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { ApiGeneralService, InstanceStaticConfig } from '../../generated-api';
import { DynamicConfig } from '../_models/config';

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        Cypress?: never; // Set when run under Cypress
    }
}

/**
 * Release metadata as presented by the GitLab API.
 */
export interface ReleaseMetadata {
    name:     string;
    tag_name: string;
    tag_path: string;
    _links: {
        self: string;
    }
}

@Injectable({
    providedIn: 'root',
})
export class ConfigService {

    /**
     * ID of Comentario GitLab project.
     */
    static readonly GITLAB_PROJECT_ID = '42486427';

    /**
     * URL of the releases endpoint.
     */
    static readonly GITLAB_RELEASES_URL = `https://gitlab.com/api/v4/projects/${ConfigService.GITLAB_PROJECT_ID}/releases/`;

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

    /**
     * Observable for obtaining the latest stable Comentario release metadata. It gets updated once in 6 hours, and
     * emits an empty string if fetching version failed.
     */
    readonly stableRelease: Observable<ReleaseMetadata | undefined> = timer(3000, 6 * 3600 * 1000)
        .pipe(
            // Fetch the latest released version
            switchMap(() => this.http.get<ReleaseMetadata[]>(ConfigService.GITLAB_RELEASES_URL)),
            // Turn any error into undefined
            catchError(() => of(undefined)),
            // Extract the latest release version (tag)
            map(releases => Array.isArray(releases) && releases.length > 0 ? releases[0] as ReleaseMetadata : undefined),
            // Update the upgrade availability
            tap(r => {
                const cur    = semver.coerce(this._staticConfig?.version);
                const stable = semver.coerce(r?.tag_name);
                this.upgradeAvailable.next(cur && stable ? semver.gt(stable, cur) : undefined);
            }),
            // Cache the last result
            shareReplay(1));

    /**
     * Whether a newer stable Comentario version is available.
     */
    readonly upgradeAvailable = new BehaviorSubject<boolean | undefined>(undefined);

    private _staticConfig?: InstanceStaticConfig;

    constructor(
        ngbConfig: NgbConfig,
        toastConfig: NgbToastConfig,
        private readonly http: HttpClient,
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
