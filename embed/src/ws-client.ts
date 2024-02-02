import { Utils } from './utils';

export interface WebSocketMessage {
    readonly domain?:        string; // ID of the domain the message is for
    readonly path?:          string; // Path on the domain
    readonly comment?:       string; // ID of the comment
    readonly parentComment?: string; // ID of the parent comment
    readonly action?:        string; // Action
}

/**
 * Client that subscribes to comment updates via WebSockets.
 */
export class WebSocketClient {

    private ws?: WebSocket;
    private connectDelay = 1000;

    private readonly baseUrl: string;

    constructor(
        baseUrl: string,
        private readonly domainId: string,
        private readonly pagePath: string,
        private readonly onIncomingMessage: (msg: WebSocketMessage) => void,
    ) {
        // Determine the base URL by replacing the protocol to websockets
        const u = new URL(baseUrl);
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        this.baseUrl = u.href;

        // Initiate a connection
        this.connect();
    }

    private connect() {
        // Initiate a websocket connection
        this.ws = new WebSocket(Utils.joinUrl(this.baseUrl, 'ws/comments'));

        // Subscribe to the current domain/page whenever the connection is ready
        const msg: WebSocketMessage = {
            domain: this.domainId,
            path:   this.pagePath,
        };
        this.ws.onopen    = () => this.ws?.send(JSON.stringify(msg));
        this.ws.onclose   = e => this.handleClose(e);
        this.ws.onmessage = e => this.handleIncoming(e.data);
        this.ws.onerror   = e => this.handleError(e);

        // Double the next connection delay, maximising it at one minute
        if (this.connectDelay < 60_000) {
            this.connectDelay *= 2;
        }
    }

    private handleClose(e: CloseEvent) {
        console.debug('WebSocketClient: websocket is closed', e);
        this.ws = undefined;

        // Schedule reopening the socket
        setTimeout(() => this.connect(), this.connectDelay);
    }

    private handleIncoming(data: any) {
        // Try to parse the incoming message as JSON-encoded WebSocketMessage
        try {
            this.onIncomingMessage(JSON.parse(data));
        } catch (e) {
            console.error('WebSocketClient: Failed to parse incoming message', e);
        }
    }

    private handleError(e: Event) {
        console.error('WebSocketClient: websocket error', e);
        this.ws?.close();
    }
}
