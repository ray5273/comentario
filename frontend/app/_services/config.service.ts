import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { NgbConfig, NgbToastConfig } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../environments/environment';
import { ApiGenericService, ClientConfig, IdentityProvider } from '../../generated-api';

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
        private readonly api: ApiGenericService,
    ) {
        // Detect if the e2e-test is active
        this.isUnderTest = !!(window as any).Cypress;

        // Disable animations with e2e to speed up the tests
        ngbConfig.animation = !this.isUnderTest;
        toastConfig.delay = ConfigService.TOAST_DELAY;
    }

    /**
     * All identity providers available for this Comentario instance, including local, SSO, and federated ones.
     */
    get allIdps(): IdentityProvider[] {
        return [
            {id: '',    name: $localize`Local (password-based)`},
            {id: 'sso', name: `Single Sign-On`},
            ...this.clientConfig.idps,
        ];
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
    init(): Observable<any> {
        // Fetch client config
        return this.api.configClientGet().pipe(tap(cc => this._clientConfig = cc));
    }
}
