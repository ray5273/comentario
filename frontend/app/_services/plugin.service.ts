import { Inject, Injectable } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { merge, Observable, Subject, switchMap, takeUntil, tap, throwError, timeout } from 'rxjs';
import { ConfigService } from './config.service';
import { PluginConfig } from '../../generated-api';

@Injectable({
    providedIn: 'root',
})
export class PluginService {

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly configSvc: ConfigService,
    ) {}

    /**
     * Initialise the service
     */
    init(): Observable<unknown> {
        // Because this is invoked as a part of the app init process, we need to wait for the config to arrive
        const loaded = new Subject<void>();
        return this.configSvc.config$
            .pipe(
                // Embed the necessary plugin resources, waiting for all of them to complete loading or error
                switchMap(cfg =>
                    merge(
                        cfg.pluginConfig.plugins?.flatMap(plugin => this.pluginResources(cfg.staticConfig.baseUrl, plugin)) ??
                        // Complete immediately when no resource is needed
                        [])
                        // Signal the load completion to the outer observable
                        .pipe(tap({complete: () => loaded.next()}))),
                // Force the outer observable to complete after the inner (merge()) has
                takeUntil(loaded));
    }

    /**
     * Embed all the necessary resource of the plugin and return an observable for waiting on each of them.
     * @param baseUrl The base URL (origin) for fetching the resources.
     * @param plugin Plugin whose resource to embed.
     */
    private pluginResources(baseUrl: string, plugin: PluginConfig): Observable<unknown>[] {
        return plugin.uiResources
                ?.map(res => {
                    switch (res.type) {
                        case 'script':
                            return this.insertScript(Location.joinWithSlash(baseUrl, res.url));
                    }
                    return throwError(() => `Unrecognised resource type '${res.type}' for plugin '${plugin.id}'`);
                }) ??
            [];
    }

    /**
     * Add a script node to the current DOM.
     * @param url URL of the script resource.
     * @return Observable for the script load or error.
     */
    private insertScript(url: string): Observable<HTMLScriptElement> {
        // Create a new script node
        const script = this.doc.createElement('script');
        script.src = url;
        script.async = true;

        // Insert the script node into the DOM
        this.doc.body.appendChild(script);

        // Make an observable for the script
        return this.fromScript(script);
    }

    /**
     * Convert the given script element into an observable that emits and completes as soon as the script load is
     * complete, or errors if the script load fails.
     * @param script The script element.
     */
    private fromScript(script: HTMLScriptElement): Observable<HTMLScriptElement> {
        return new Observable<HTMLScriptElement>(sub => {
            script.onload = () => {
                sub.next(script);
                sub.complete();
            };
            script.onerror = error => sub.error({message: 'Script load failed', url: script.src, error});
        })
            // Add a load timeout
            .pipe(timeout({
                first: 30_000,
                meta:  {message: 'Script load timeout', url: script.src},
            }));
    }
}
