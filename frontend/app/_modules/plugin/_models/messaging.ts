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
    /** Domain events. */
    DomainEvents = 'DOMAIN_EVENTS',
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
// Comentario ⇒ plugin port message events
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
    /** Request to reload the current principal. */
    ReloadPrincipalRequest = 'reloadPrincipalRequest',
    /** Request to show a toast notification. */
    ShowToastRequest = 'showToastRequest',
}

/**
 * Base type of port message event payload.
 */
export interface PluginPortEventBase {
    /** Event kind. */
    readonly kind: PluginPortEventKind;
}

/** Payload for the NavigationRequest event. */
export interface PluginPortEventNavigationRequest extends PluginPortEventBase {
    /** Route or commands to navigate to. */
    readonly route: string | any[];
}

/** Payload for the ReloadPrincipalRequest event. */
export type PluginPortEventReloadPrincipalRequest = PluginPortEventBase;

/** Payload for the ShowToastRequest event. */
export interface PluginPortEventShowToastRequest extends PluginPortEventBase {

    /** Notification severity. */
    readonly severity: 'info' | 'success' | 'warning' | 'error';

    /** Optional message ID known to Comentario, like 'this-fish-cannot-be-fried'. */
    readonly messageId?: string;

    /** Optional message text. Must be provided if `messageId` isn't specified. */
    readonly message?: string;

    /** Optional HTTP error code. */
    readonly errorCode?: number;

    /** Optional details. */
    readonly details?: string;

    /** Optional error object. */
    readonly error?: any;

    /** Whether to keep the toast upon the first upcoming route change. */
    readonly keepOnRouteChange?: boolean;
}
