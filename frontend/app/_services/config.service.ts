import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith, Observable, tap } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { ApiGeneralService, InstanceDynamicConfigItem, InstanceStaticConfig } from '../../generated-api';

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

    private _staticConfig?: InstanceStaticConfig;

    private readonly _dynamicReload$ = new BehaviorSubject<void>(undefined);

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
     * Dynamic instance configuration obtained from the server.
     */
    get dynamicConfig(): Observable<Map<string, InstanceDynamicConfigItem>> {
        return this.api.configDynamicGet()
            .pipe(
                combineLatestWith(this._dynamicReload$),
                map(([dc]) => new Map<string, InstanceDynamicConfigItem>(dc?.map(i => [i.key, i]))),
                shareReplay(1));
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
        return this.api.configStaticGet().pipe(tap(sc => this._staticConfig = sc));
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
