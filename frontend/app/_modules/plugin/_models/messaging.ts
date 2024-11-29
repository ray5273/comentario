/** Message event kinds. */
export enum PluginEventKind {
    /** Subscription request. */
    SubRequest = 'ComentarioPluginSubscriptionRequest',
    /** Subscription emission. */
    SubEmission = 'ComentarioPluginSubscriptionEmission',
}

/**
 * Plugin message subscription flags.
 */
export enum PluginSubscriptionKind {
    /** Authentication status. */
    AuthStatus = 'AUTH_STATUS',
}

/**
 * Payload of an incoming plugin subscription request message event.
 */
export interface PluginMessagePayload {
    /** Event kind. */
    kind: PluginEventKind;
    /** Subscription kinds the plugin is interested in. */
    subscriptionKinds: PluginSubscriptionKind[];
}

/**
 * Payload of an outgoing subscription message event.
 */
export interface ComentarioMessagePayload<T> {
    /** Event kind. */
    kind: PluginEventKind;
    /** Subscription kind the message is about. */
    subscriptionKind: PluginSubscriptionKind;
    /** The object emitted by the subscription. */
    data: T;
}
