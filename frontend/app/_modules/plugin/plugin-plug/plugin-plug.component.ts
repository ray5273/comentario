import { AfterContentInit, Component, computed, effect, ElementRef, input, signal, ViewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Observable, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { PluginService } from '../_services/plugin.service';
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
        NgbCollapse,
        FaIconComponent,
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

    /** Configuration of the plugin. */
    readonly pluginConfig = computed<PluginConfig | undefined>(() => {
        const id = this.pluginId();
        return id ? this.pluginService.pluginConfig(id) : undefined;
    });

    /** Plugin availability observable. */
    private readonly pluginAvailable$ = computed<Observable<boolean>>(() => {
        const id = this.pluginId();
        return id ? this.pluginService.pluginAvailable(id) : EMPTY;
    });

    /** Plugin availability status. */
    readonly pluginAvailable = toSignal(
        toObservable(this.pluginAvailable$).pipe(switchMap(o => o), catchError(err => this.handlePluginError(err))));

    /** Plugin load error, if any. */
    readonly pluginError = signal<any>(undefined);

    @ViewChild('elementHost', {static: true})
    elementHost?: ElementRef<HTMLDivElement>;

    /** Whether technical error details are collapsed. */
    collapseErrorDetails = true;

    /** Created custom element. */
    private plugElement?: HTMLElement;

    // Icons
    readonly faAngleDown = faAngleDown;

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
        const tag = this.plugTag();
        const avail = this.pluginAvailable();

        // Remove any existing plug
        this.removeElement();

        // Recreate the element, if the plugin is operational
        if (tag && avail && this.elementHost) {
            this.plugElement = this.pluginService.insertElement(this.elementHost.nativeElement, tag);
        }
    }

    /**
     * Catch the provided error and emit it as the pluginError signal.
     * @param err Error to handle.
     * @private
     */
    private handlePluginError(err: any): Observable<never> {
        this.pluginError.set(err);
        return EMPTY;
    }
}
