import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root',
})
export class PluginService {

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        configSvc: ConfigService,
    ) {
        // Embed the necessary plugin resources
        configSvc.pluginConfig.plugins?.forEach(cfg =>
            cfg.uiResources?.forEach(res => {
                switch (res.type) {
                    case 'script':
                        this.insertScript(res.url);
                        break;
                    default:
                        throw Error(`Unrecognised resource type '${res.type}' for plugin '${cfg.id}'`);
                }
            }));
    }

    /**
     * Add a script node to the current DOM.
     * @param url URL of the script resource.
     */
    insertScript(url: string) {
        const script = this.doc.createElement('script');
        script.src = url;
        script.async = true;
        this.doc.body.appendChild(script);
    }
}
