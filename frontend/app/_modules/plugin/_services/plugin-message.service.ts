import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../_services/auth.service';
import { ComentarioPortEventPayload, PluginEventKind, PluginEventPayload, PluginPortEventBase, PluginPortEventKind, PluginPortEventNavigationRequest, PluginSubscriptionKind } from '../_models/messaging';
import { Principal } from '../../../../generated-api';

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

    /** Map of port event handlers by type. */
    private readonly PortEventHandlers: Record<PluginPortEventKind, PluginPortEventHandler<any>> = {
        [PluginPortEventKind.NavigationRequest]: this.handlePE_NavigationRequest,
    };

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
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
        this.authSvc.principal
            .subscribe(p =>
                sender({
                    kind:             PluginEventKind.SubEmission,
                    subscriptionKind: PluginSubscriptionKind.AuthStatus,
                    data:             p,
                }));
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
