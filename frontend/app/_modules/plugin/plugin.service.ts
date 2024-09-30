import { Inject, Injectable } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { Route, Router } from '@angular/router';
import { merge, Observable, Subject, switchMap, takeUntil, tap, throwError, timeout } from 'rxjs';
import { PluginPlugComponent } from './plugin-plug/plugin-plug.component';
import { ConfigService } from '../../_services/config.service';
import { LANGUAGE } from '../../../environments/languages';
import { Language, PluginRouteData } from '../../_models/models';
import { InstancePluginConfig, PluginConfig, PluginUIPlugConfig } from '../../../generated-api';

/** An easy-to-consume data structure describing a UI plug. */
export interface UIPlug {
    /** ID of the plugin. */
    pluginId: string;
    /** Plugin's path. */
    pluginPath: string;
    /** Location of the plug. */
    location: string;
    /** Plug's label in the current language. */
    label: string;
    /** Plug's component tag. */
    componentTag: string;
    /** Plug's path. */
    path: string;
}

@Injectable({
    providedIn: 'root',
})
export class PluginService {

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        @Inject(LANGUAGE) private readonly lang: Language,
        private readonly router: Router,
        private readonly configSvc: ConfigService,
    ) {}

    /**
     * Update the currently configured routing data by adding plugin routes to the list.
     */
    private updateRoutes(pluginCfg: InstancePluginConfig) {
        // Prepare plugin routes
        const routes = pluginCfg.plugins
                ?.flatMap(plugin => plugin.uiPlugs?.map(plug => this.getPlugRoute(plugin, plug)) ?? []);

        // If there's any route, replace the plugin routes with an up-to-date route list
        if (routes?.length) {
            this.router.resetConfig(
                this.router.config.map(r => r.path === 'plugin' ? {...r, children: routes} : r));
        }
    }

    /**
     * Initialise the service
     */
    init(): Observable<unknown> {
        // Because this is invoked as a part of the app init process, we need to wait for the config to arrive
        const loaded = new Subject<void>();
        return this.configSvc.config$
            .pipe(
                // Reload the routing config when ready
                tap(cfg => this.updateRoutes(cfg.pluginConfig)),
                // Embed the necessary plugin resources, waiting for all of them to complete loading or error
                switchMap(cfg =>
                    merge(
                        cfg.pluginConfig.plugins?.flatMap(plugin => this.pluginResources(cfg.staticConfig.baseUrl, plugin)) ??
                        // Complete immediately when no resource is needed
                        [])
                        .pipe(
                            // Signal the load completion to the outer observable
                            tap({complete: () => loaded.next()}))),
                // Force the outer observable to complete after the inner (merge()) has
                takeUntil(loaded));
    }

    /**
     * Return a list of plugin configurations, each containing only UI plugs for the specified location.
     * @param location UI plug locations to keep.
     */
    uiPlugsForLocation(location: string): UIPlug[] | undefined {
        const defLang = this.configSvc.staticConfig.defaultLangId;

        // Returns a label for the current app language, if any, or otherwise for the default language
        const findLabel = (plug: PluginUIPlugConfig): string =>
            plug.labels.find(l => l.language === this.lang.code)?.text ??
            plug.labels.find(l => l.language === defLang)?.text ??
            '<UNKNOWN_PLUG_LABEL>';

        // Since this method is invoked AFTER the app is initialised, it's safe to refer to the pluginConfig here
        return this.configSvc.pluginConfig.plugins
            // Make a flat list of all plugin plugs
            ?.flatMap(plugin =>
                plugin.uiPlugs
                    ?.filter(plug => plug.location === location)
                    .map(plug => ({
                        pluginId:     plugin.id,
                        pluginPath:   plugin.path,
                        location:     plug.location,
                        label:        findLabel(plug),
                        componentTag: plug.componentTag,
                        path:         plug.path,
                    })) ??
                []);
    }

    /**
     * Add an arbitrary element the current DOM.
     * @param parent Parent element.
     * @param tag Element tag to instantiate.
     * @param attrs Any additional element attributes.
     * @return Observable for the script load or error.
     */
    insertElement(parent: HTMLElement, tag: string, attrs?: Record<string, any>): HTMLElement {
        const el = this.doc.createElement(tag);
        if (attrs) {
            Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
        }
        parent.appendChild(el);
        return el;
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

    /**
     * Return a route spec for the given plugin and UI plug.
     */
    private getPlugRoute = (plugin: PluginConfig, plug: PluginUIPlugConfig): Route => {
        return {
            path:      `${plugin.path}/${plug.path}`,
            component: PluginPlugComponent,
            data:      {plugin, plug} as PluginRouteData,
        };
    };
}
