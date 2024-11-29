import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../_services/auth.service';
import { ComentarioMessagePayload, PluginEventKind, PluginMessagePayload, PluginSubscriptionKind } from '../_models/messaging';
import { Principal } from '../../../../generated-api';

type MessageSender<T> = (msg: ComentarioMessagePayload<T>) => void;

/**
 * Service that maintains communication with plugins.
 * WARNING: unstable API!
 */
@Injectable({
    providedIn: 'root',
})
export class PluginMessageService {

    constructor(
        private readonly authSvc: AuthService,
    ) {
        // Subscribe to window message events carrying a port
        fromEvent<MessageEvent>(window, 'message', {capture: false})
            // Only accept valid messages
            .pipe(filter(e => this.validateIncomingEvent(e)))
            // Add requested subscriptions
            .subscribe(e => this.addSubscriptions(e.data, e.ports[0]));
    }

    /**
     * Validate the given incoming message event.
     * @private
     */
    private validateIncomingEvent(e: MessageEvent<PluginMessagePayload>): e is MessageEvent<PluginMessagePayload> {
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
    private addSubscriptions(payload: PluginMessagePayload, port: MessagePort) {
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
}
