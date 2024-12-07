import { Inject, Injectable } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { Route, Router } from '@angular/router';
import { first, forkJoin, materialize, Observable, switchMap, takeWhile, tap, throwError, timeout, timer } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PluginPlugComponent } from '../plugin-plug/plugin-plug.component';
import { ConfigService } from '../../../_services/config.service';
import { LANGUAGE } from '../../../../environments/languages';
import { Language, PluginRouteData } from '../../../_models/models';
import { InstanceConfig, InstancePluginConfig, PluginConfig, PluginUIPlugConfig } from '../../../../generated-api';
import { UIPlug } from '../_models/plugs';
import { PluginMessageService } from './plugin-message.service';

@Injectable({
    providedIn: 'root',
})
export class PluginService {

    /** Error occurred during plugin resource load. If undefined, the resources have been loaded successfully. */
    loadError: any;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        @Inject(LANGUAGE) private readonly lang: Language,
        private readonly router: Router,
        private readonly configSvc: ConfigService,
        msgSvc: PluginMessageService,
    ) {
        // Include a fake initialiser to prevent service removal. This service must be dependent upon in order to be
        // instantiated
        (() => msgSvc)();
    }

    /**
     * Initialise the service.
     */
    init(): Observable<unknown> {
        // Because this is invoked as a part of the app init process, we need to wait for the config to arrive
        return this.configSvc.config$
            .pipe(
                // Reload the routing config when ready
                tap(cfg => this.updateRoutes(cfg.pluginConfig)),
                // Embed the necessary plugin resources, waiting for all of them to complete loading (or error), and
                // waiting for custom elements to be all defined (or time out)
                switchMap(cfg =>
                    forkJoin([...this.waitForResources(cfg), this.waitForCustomElements(cfg.pluginConfig)])
                        // Convert errors and completion into emissions
                        .pipe(materialize())),
                // Complete the outer observable on the inner's completion or error
                first(),
                // Check if there was a load error
                tap(n => n.kind === 'E' && (this.loadError = n.error)));
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
     * @return The created element.
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
     * Update the currently configured routing data by adding plugin routes to the list.
     */
    private updateRoutes(pluginCfg: InstancePluginConfig) {
        // Prepare plugin routes
        const routes = pluginCfg.plugins
            ?.flatMap(plugin => {
                const paths: any = {};
                return plugin.uiPlugs
                    // Filter out plugs without a path (they're not standalone pages)
                    ?.filter(plug => plug.path)
                    // Filter out repeated paths
                    .filter(plug => paths[plug.path] ? false : (paths[plug.path] = true))
                    // Map to a route
                    .map(plug => this.getPlugRoute(plugin, plug)) ??
                    [];
            });

        // If there's any route, replace the plugin routes with an up-to-date route list
        if (routes?.length) {
            this.router.resetConfig(
                this.router.config.map(r => r.path === 'plugin' ? {...r, children: routes} : r));
        }
    }

    /**
     * Return a route spec for the given plugin and UI plug. The route maps to the PluginPlugComponent, which is used
     * for rendering "standalone" components, i.e. those having an own path.
     */
    private getPlugRoute = (plugin: PluginConfig, plug: PluginUIPlugConfig): Route => {
        return {
            path:      `${plugin.path}/${plug.path}`,
            component: PluginPlugComponent,
            data:      {plugin, plug} as PluginRouteData,
        };
    };

    /**
     * Wait until all the plugin resources are loaded or errored. Complete the result observable once all resources of
     * all plugins finished loading or there's any error.
     */
    private waitForResources(cfg: InstanceConfig): Observable<unknown>[] {
        return cfg.pluginConfig.plugins?.flatMap(plugin => this.pluginResources(cfg.staticConfig.baseUrl, plugin)) ??
            // Complete immediately when no resource is needed
            [];
    }

    /**
     * Wait until all the custom element tags are registered in the CustomElementRegistry. Complete the result
     * observable once all custom element tags are registered, or error if timed out.
     */
    private waitForCustomElements(pluginCfg: InstancePluginConfig): Observable<any> {
        // Make a map of all known plugin component tags
        const tags: Record<string, boolean> = {};
        pluginCfg.plugins?.forEach(plugin =>
            plugin.uiPlugs?.map(p => p.componentTag).forEach(t => t && (tags[t] = true)));

        // Check for undefined custom elements, four times per second, until none left
        let remaining = Object.keys(tags);
        return timer(0, 250)
            .pipe(
                // Remove the tags that are defined now
                tap(() => remaining = remaining.filter(t => !customElements.get(t))),
                // Stop as soon as the list of remaining tags is empty
                takeWhile(() => remaining.length > 0),
                // Convert errors and completion into emissions
                materialize(),
                // Let only errors and completion signals through
                filter(n => n.kind !== 'N'),
                // Grab the first one, then complete
                first(),
                // Wait up to 10 seconds until all components are known
                timeout({
                    first: 10_000,
                    meta: {message: `Timed out waiting for custom elements tags: [${remaining.join(', ')}]`},
                }));
    }
}
