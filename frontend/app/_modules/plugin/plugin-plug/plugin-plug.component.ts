import { AfterContentInit, Component, computed, effect, ElementRef, input, signal, ViewChild } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PluginService, PluginStatus } from '../_services/plugin.service';
import { PluginRouteData } from '../../../_models/models';
import { UIPlug } from '../_models/plugs';
import { Animations } from '../../../_utils/animations';
import { PluginConfig } from '../../../../generated-api';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';

@Component({
    selector: 'app-plugin-plug',
    templateUrl: './plugin-plug.component.html',
    animations: [Animations.fadeInOut('fast')],
    imports: [
        SpinnerDirective,
        JsonPipe,
    ],
})
export class PluginPlugComponent implements AfterContentInit {

    /** Plug to create a component for. If empty, assumes the current RouteData is to be used. */
    readonly plug = input<UIPlug>();

    /** Plugin route data, optionally provided on the current route. */
    readonly routeData = signal<PluginRouteData | undefined>(undefined);

    /** Plugin ID to use. */
    readonly pluginId = computed(() => this.plug()?.pluginId ?? this.routeData()?.plugin?.id);

    /** Plug component tag to use. */
    readonly plugTag = computed(() => this.plug()?.componentTag ?? this.routeData()?.plug?.componentTag);

    /** Status of the plugin. */
    readonly pluginStatus = computed<PluginStatus | undefined>(() => {
        const id = this.pluginId();
        return id ? this.pluginService.pluginStatus(id) : undefined;
    });

    /** Configuration of the plugin. */
    readonly pluginConfig = computed<PluginConfig | undefined>(() => this.pluginStatus()?.config);

    @ViewChild('elementHost', {static: true})
    elementHost?: ElementRef<HTMLDivElement>;

    /** Whether technical error details are shown. */
    showErrorDetails = false;

    /** Plugin availability status. */
    pluginAvailable?: boolean;

    /** Plugin load error, if any. */
    pluginError: any;

    /** Created custom element. */
    private plugElement?: HTMLElement;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly pluginService: PluginService,
    ) {
        effect(() => this.load());
    }

    ngAfterContentInit(): void {
        // Route data must be available at this point
        this.routeData.set(this.route.snapshot.data as PluginRouteData | undefined);
    }

    /**
     * Remove the existing plug element, if any.
     * @private
     */
    private removeElement(): void {
        if (this.plugElement && this.elementHost) {
            this.elementHost.nativeElement.removeChild(this.plugElement);
            this.plugElement = undefined;
        }
    }

    /**
     * Load the specified plugin plug.
     * @private
     */
    private load() {
        // Subscribe to the status changes when available
        this.pluginStatus()?.status.subscribe({
            next: b => {
                this.pluginAvailable = b;

                // Remove any existing plug
                this.removeElement();

                // Recreate the element, if the plugin is operational
                const tag = this.plugTag();
                if (tag && this.pluginAvailable && this.elementHost) {
                    this.plugElement = this.pluginService.insertElement(this.elementHost.nativeElement, tag);
                }
            },
            error: err => this.pluginError = err,
        });
    }
}
