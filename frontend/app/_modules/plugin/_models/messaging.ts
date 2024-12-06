//======================================================================================================================
// Plugin message events
//======================================================================================================================

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
export interface PluginEventPayload {
    /** Event kind. */
    kind: PluginEventKind;
    /** Subscription kinds the plugin is interested in. */
    subscriptionKinds: PluginSubscriptionKind[];
}

//======================================================================================================================
// Comentario => plugin port message events
//======================================================================================================================

/**
 * Payload of an outgoing subscription message event.
 */
export interface ComentarioPortEventPayload<T> {
    /** Event kind. */
    kind: PluginEventKind;
    /** Subscription kind the message is about. */
    subscriptionKind: PluginSubscriptionKind;
    /** The object emitted by the subscription. */
    data: T;
}

//======================================================================================================================
// Plugin ⇒ Comentario port message events
//======================================================================================================================

/** Plugin message event kinds. */
export enum PluginPortEventKind {
    /** Application navigation request. */
    NavigationRequest = 'navigationRequest',
}

/**
 * Base type of port message event payload.
 */
export interface PluginPortEventBase {
    /** Event kind. */
    kind: PluginPortEventKind;
}

/** Payload for the NavigationRequest event. */
export interface PluginPortEventNavigationRequest extends PluginPortEventBase {
    /** Route or commands to navigate to. */
    route: string | any[];
}
