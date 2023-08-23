import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { ApiGeneralService, ComentarioConfig } from '../../generated-api';

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

    private _config?: ComentarioConfig;

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
     * Comentario configuration obtained from the server.
     */
    get config(): ComentarioConfig {
        return this._config!;
    }

    /**
     * Initialise the app configuration.
     */
    init(): Observable<unknown> {
        return this.api.comentarioConfig().pipe(tap(cc => this._config = cc));
    }

    /**
     * Returns whether the length of the provided array (representing a portion of fetched data) is equal to the
     * configured result page size, or greater.
     * @param d The array to check.
     */
    canLoadMore(d: any[] | null | undefined): boolean {
        return (d?.length ?? 0) >= this.config.resultPageSize;
    }
}
