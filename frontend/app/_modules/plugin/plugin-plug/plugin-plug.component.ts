import { AfterContentInit, Component, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PluginService } from '../_services/plugin.service';
import { PluginRouteData } from '../../../_models/models';
import { UIPlug } from '../_models/plugs';
import { Animations } from '../../../_utils/animations';

@Component({
    selector: 'app-plugin-plug',
    templateUrl: './plugin-plug.component.html',
    animations: [Animations.fadeInOut('fast')],
})
export class PluginPlugComponent implements AfterContentInit, OnChanges {

    /**
     * Plug to create a component for. If empty, assumes the current RouteData is to be used.
     */
    @Input()
    plug?: UIPlug;

    /** Whether technical error details are shown. */
    showErrorDetails = false;

    /** Any error occurred during plugin load. */
    readonly loadError = this.pluginService.loadError;

    private plugElement?: HTMLElement;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly element: ElementRef,
        private readonly pluginService: PluginService,
    ) {}

    /** Plugin ID in use. */
    get pluginId(): string {
        return this.plug?.pluginId ?? (this.route.snapshot.data as PluginRouteData)?.plugin.id ?? '<UNKNOWN>';
    }

    ngAfterContentInit(): void {
        this.reinsertElement();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.plug) {
            this.reinsertElement();
        }
    }

    /**
     * Remove the existing plug element, if any.
     * @private
     */
    private removeElement(): void {
        if (this.plugElement) {
            (this.element.nativeElement as HTMLElement).removeChild(this.plugElement);
            this.plugElement = undefined;
        }
    }

    /**
     * Insert or reinsert the required plug element.
     * @private
     */
    private reinsertElement(): void {
        // Remove any existing plug
        this.removeElement();

        // Skip element creation if there was a plugin load error
        if (!this.loadError) {
            // Determine which plug to use: fall back to the RouteData if no plug explicitly provided
            const plug = this.plug ?? (this.route.snapshot.data as PluginRouteData)?.plug;
            if (!plug) {
                throw Error('No plug provided and no RouteData is available');
            }

            // Add a new element for the plug
            this.plugElement = this.pluginService.insertElement(this.element.nativeElement, plug.componentTag);
        }
    }
}
