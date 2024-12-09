import { AfterContentInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject, switchMap } from 'rxjs';
import { PluginService } from '../_services/plugin.service';
import { PluginRouteData } from '../../../_models/models';
import { UIPlug } from '../_models/plugs';
import { Animations } from '../../../_utils/animations';
import { PluginConfig } from '../../../../generated-api';

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

    @ViewChild('elementHost', {static: true})
    elementHost?: ElementRef<HTMLDivElement>;

    /** Whether technical error details are shown. */
    showErrorDetails = false;

    /** Plugin availability status. */
    pluginAvailable?: boolean;

    /** Plugin load error, if any. */
    pluginError: any;

    /** Plugin config in use. */
    pluginConfig?: PluginConfig;

    /** Actual UI plug tag in use. */
    private plugTag?: string;

    /** Created custom element. */
    private plugElement?: HTMLElement;

    /** Observable that triggers (re)insertion of the element. */
    private ping$ = new Subject<void>();

    constructor(
        private readonly route: ActivatedRoute,
        private readonly pluginService: PluginService,
    ) {
        this.ping$
            // Trigger a status recheck on a ping
            .pipe(
                switchMap(() => {
                    // Make sure there's a plugin ID and a component tag
                    const data = this.route.snapshot.data as PluginRouteData | undefined;
                    const id = this.plug?.pluginId ?? data?.plugin.id;
                    this.plugTag = this.plug?.componentTag ?? data?.plug.componentTag;
                    if (!id || !this.plugTag) {
                        return EMPTY;
                    }

                    // Request the plugin's status
                    const ps = this.pluginService.pluginStatus(id);
                    this.pluginConfig = ps?.config;
                    return ps?.status ?? EMPTY;
                }))
            .subscribe({
                next: b => {
                    this.pluginAvailable = b;

                    // Remove any existing plug
                    this.removeElement();

                    // Recreate the element, if the plugin is operational
                    if (this.plugTag && this.pluginAvailable && this.elementHost) {
                        this.plugElement = this.pluginService.insertElement(this.elementHost.nativeElement, this.plugTag);
                    }
                },
                error: err => this.pluginError = err,
            });
    }

    ngAfterContentInit(): void {
        this.ping$.next();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.plug) {
            this.ping$.next();
        }
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
}
