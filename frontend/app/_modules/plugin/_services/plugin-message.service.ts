import { effect, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../_services/auth.service';
import { ComentarioPortEventPayload, PluginEventKind, PluginEventPayload, PluginPortEventBase, PluginPortEventKind, PluginPortEventNavigationRequest, PluginPortEventReloadPrincipalRequest, PluginPortEventShowToastRequest, PluginSubscriptionKind } from '../_models/messaging';
import { Principal } from '../../../../generated-api';
import { ToastInitProps, ToastService } from '../../../_services/toast.service';
import { DomainEventService } from '../../manage/_services/domain-event.service';
import { DomainEvent } from '../../manage/_models/domain-event';
import { PrincipalService } from '../../../_services/principal.service';

type MessageSender<T> = (msg: ComentarioPortEventPayload<T>) => void;
type PluginPortEventHandler<T extends PluginPortEventBase> = (data: T) => void;

/**
 * Service that maintains communication with plugins.
 * WARNING: unstable API!
 */
@Injectable({
    providedIn: 'root',
})
export class PluginMessageService {

    /** Handle NavigationRequest port message. */
    private readonly handlePE_NavigationRequest: PluginPortEventHandler<PluginPortEventNavigationRequest> = data => {
        // If route is a string, it's a path
        if (typeof data.route === 'string') {
             this.router.navigateByUrl(data.route);

        // If it's an array, consider it a list of commands
        } else if (Array.isArray(data.route)) {
            this.router.navigate(data.route);

        // Bad payload type
        } else {
            throw Error(`Invalid PluginPortEventNavigationRequest.route type (${typeof data.route})`);
        }
    };

    /** Handle ReloadPrincipalRequest port message. */
    private readonly handlePE_ReloadPrincipalRequest: PluginPortEventHandler<PluginPortEventReloadPrincipalRequest> = () =>
        this.authSvc.update();

    /** Handle ShowToastRequest port message. */
    private readonly handlePE_ShowToastRequest: PluginPortEventHandler<PluginPortEventShowToastRequest> = data =>
        this.toastSvc.add(data as ToastInitProps);

    /** Map of port event handlers by type. */
    private readonly PortEventHandlers: Record<PluginPortEventKind, PluginPortEventHandler<any>> = {
        [PluginPortEventKind.NavigationRequest]:      this.handlePE_NavigationRequest,
        [PluginPortEventKind.ReloadPrincipalRequest]: this.handlePE_ReloadPrincipalRequest,
        [PluginPortEventKind.ShowToastRequest]:       this.handlePE_ShowToastRequest,
    };

    constructor(
        private readonly injector: Injector,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly principalSvc: PrincipalService,
        private readonly toastSvc: ToastService,
        private readonly domainEventSvc: DomainEventService,
    ) {
        // Subscribe to window message events carrying a port
        fromEvent<MessageEvent>(window, 'message', {capture: false})
            // Only accept valid messages
            .pipe(filter(e => this.validateIncomingEvent(e)))
            .subscribe(e => {
                // Add requested subscriptions
                const p = e.ports[0];
                this.addSubscriptions(e.data, p);
                // Install a listener on the port to monitor incoming messages
                this.listenOnPort(p);
            });
    }

    /**
     * Validate the given incoming message event.
     * @private
     */
    private validateIncomingEvent(e: MessageEvent<PluginEventPayload>): e is MessageEvent<PluginEventPayload> {
        // Only handle valid subscription request messages
        return typeof e.data === 'object' && e.data.kind === PluginEventKind.SubRequest &&
            // With at least one subscription kind
            e.data.subscriptionKinds?.length > 0 &&
            // With one port
            e.ports.length === 1;
    }

    /**
     * Register new subscriptions for the provided recipient.
     * @private
     */
    private addSubscriptions(payload: PluginEventPayload, port: MessagePort) {
        // Make a 'typed' sender routine for the recipient port
        const sender: MessageSender<any> = msg => port.postMessage(msg);

        // Iterate the requested subscriptions
        payload.subscriptionKinds.forEach(sk => {
            switch (sk) {
                case PluginSubscriptionKind.AuthStatus:
                    this.addAuthStatusSubscription(sender);
                    break;
                case PluginSubscriptionKind.DomainEvents:
                    this.addDomainEventSubscription(sender);
                    break;
                default:
                    throw Error(`Unknown PluginSubscriptionKind: '${sk}'`);
            }
        });
    }

    /**
     * Register new subscription for auth status.
     * @private
     */
    private addAuthStatusSubscription(sender: MessageSender<Principal | undefined>) {
        effect(
            () => sender({
                kind:             PluginEventKind.SubEmission,
                subscriptionKind: PluginSubscriptionKind.AuthStatus,
                data:             this.principalSvc.principal(),
            }),
            {injector: this.injector});
    }

    /**
     * Register new subscription for domain events.
     * @private
     */
    private addDomainEventSubscription(sender: MessageSender<DomainEvent>) {
        this.domainEventSvc.events
            .subscribe(data => sender({kind: PluginEventKind.SubEmission, subscriptionKind: PluginSubscriptionKind.DomainEvents, data}));
    }

    /**
     * Install a listener on the port to monitor incoming messages.
     */
    private listenOnPort(port: MessagePort) {
        fromEvent<MessageEvent<PluginPortEventBase>>(port, 'message', {capture: false})
            // Try to find the appropriate handler, then handle the event
            .subscribe(e => this.PortEventHandlers[e.data.kind]?.(e.data));
        port.start();
    }
}
