import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from "rxjs/operators";
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../environments/environment';
import { ApiGeneralService, ClientConfig } from '../../generated-api';

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

    private _clientConfig?: ClientConfig;

    constructor(
        private readonly ngbConfig: NgbConfig,
        private readonly toastConfig: NgbToastConfig,
        private readonly api: ApiGeneralService,
    ) {
        // Detect if the e2e-test is active
        this.isUnderTest = !!window.Cypress;

        // Disable animations with e2e to speed up the tests
        ngbConfig.animation = !this.isUnderTest;
        toastConfig.delay = ConfigService.TOAST_DELAY;
    }

    /**
     * Client configuration obtained from the API.
     */
    get clientConfig(): ClientConfig {
        return this._clientConfig!;
    }

    /**
     * Return the base URL for embedded and linked documentation pages.
     */
    get docsBaseUrl(): string {
        return environment.docsBaseUrl;
    }

    /**
     * Initialise the app configuration.
     */
    init(): Observable<unknown> {
        // Fetch client config
        return this.api.configClientGet().pipe(map(cc => this._clientConfig = cc));
    }
}
