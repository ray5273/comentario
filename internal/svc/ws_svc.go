package svc

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"sync"
	"time"
)

const (
	wsWriteTimeout   = 10 * time.Second      // Time allowed to send a message to the peer
	wsPongWait       = 60 * time.Second      // Time allowed to read the next pong message from the peer
	wsPingInterval   = (wsPongWait * 9) / 10 // Interval for pinging the peer. Must be shorter than wsPongWait
	wsMaxMessageSize = 2999                  // Maximum allowed incoming/outgoing message size. Must accommodate a complete wsMsgPayload
)

type WebSocketCommentAction string

const (
	WSCommentActionNew    WebSocketCommentAction = "new"
	WSCommentActionUpdate WebSocketCommentAction = "update"
)

// TheWebSocketsService is a global WebSocketsService implementation
var TheWebSocketsService WebSocketsService = &webSocketsService{
	clients:    make(map[*wsClient]bool),
	send:       make(chan *wsMsgPayload),
	register:   make(chan *wsClient),
	unregister: make(chan *wsClient),
	quit:       make(chan bool),
}

// WebSocketsService is a service interface for managing WebSocket subscriptions
type WebSocketsService interface {
	// Add a new WebSocket subscription
	Add(conn *websocket.Conn)
	// Init the service
	Init() error
	// Send a message to relevant clients
	Send(domainID, commentID, parentCommentID *uuid.UUID, path string, action WebSocketCommentAction)
	// Shutdown the service
	Shutdown()
}

//----------------------------------------------------------------------------------------------------------------------

// wsMsgPayload is the WebSocket message payload
type wsMsgPayload struct {
	DomainID        uuid.UUID              `json:"domain"`        // ID of the domain the message is for
	Path            string                 `json:"path"`          // Path on the domain
	CommentID       *uuid.UUID             `json:"comment"`       // Optional ID of the comment (outgoing messages only)
	ParentCommentID *uuid.UUID             `json:"parentComment"` // Optional ID of the parent comment (outgoing messages only)
	Action          WebSocketCommentAction `json:"action"`        // Optional action (outgoing messages only)
}

//----------------------------------------------------------------------------------------------------------------------

// webSocketsService is a blueprint WebSocketsService implementation
type webSocketsService struct {
	clients    map[*wsClient]bool // Map of all registered clients
	send       chan *wsMsgPayload // Channel accepting messages for the clients
	register   chan *wsClient     // Register requests from the clients
	unregister chan *wsClient     // Unregister requests from the clients
	quit       chan bool          // Channel for shutting down the service
}

func (svc *webSocketsService) Add(conn *websocket.Conn) {
	// Register a new client
	c := &wsClient{wss: svc, conn: conn, send: make(chan *wsMsgPayload, 100)}
	svc.register <- c

	// Start the client's reader and writer loops in the background
	go c.readMessages()
	go c.writeMessages()
}

func (svc *webSocketsService) Init() error {
	logger.Debugf("webSocketsService: initialising")

	// Run the worker routine in the background
	go svc.run()
	return nil
}

func (svc *webSocketsService) Send(domainID, commentID, parentCommentID *uuid.UUID, path string, action WebSocketCommentAction) {
	logger.Debugf("webSocketsService.Send(%s, %s, %s, %q, %q)", domainID, commentID, parentCommentID, path, action)
	svc.send <- &wsMsgPayload{
		DomainID:        *domainID,
		CommentID:       commentID,
		ParentCommentID: parentCommentID,
		Path:            path,
		Action:          action,
	}
}

func (svc *webSocketsService) Shutdown() {
	logger.Debugf("webSocketsService.Shutdown()")
	close(svc.quit)
}

// addClient adds a new client
func (svc *webSocketsService) addClient(c *wsClient) {
	logger.Debug("webSocketsService.addClient()") // Makes no sense to log client data as it's still pristine and hence indistinguishable
	svc.clients[c] = true
}

// removeClient removes a registered client
func (svc *webSocketsService) removeClient(c *wsClient) {
	logger.Debugf("webSocketsService.removeClient(%v)", c)

	// Close the client's connection channel
	close(c.send)

	// Remove the client from the map
	delete(svc.clients, c)
}

// run is the main worker routine of the service
func (svc *webSocketsService) run() {
	for {
		select {
		// New client is added
		case c := <-svc.register:
			svc.addClient(c)

		// Client is removed
		case c := <-svc.unregister:
			svc.removeClient(c)

		// Incoming message
		case m := <-svc.send:
			svc.sendMessage(m)

		// Shutting down
		case <-svc.quit:
			logger.Debugf("webSocketsService: shutting down")
			return
		}
	}
}

// sendMessage sends a message to all clients
func (svc *webSocketsService) sendMessage(m *wsMsgPayload) {
	// Iterate all registered clients
	for c := range svc.clients {
		select {
		// Send the message
		case c.send <- m:
		// Failed to send (channel closed)
		default:
			svc.removeClient(c)
		}
	}
}

//----------------------------------------------------------------------------------------------------------------------

// wsClient holds a connection to a websocket client
type wsClient struct {
	wss         *webSocketsService // The manager instance that owns this client
	conn        *websocket.Conn    // The websocket connection
	send        chan *wsMsgPayload // Buffered channel of outbound messages
	subMU       sync.Mutex         // Mutex for the subscription parameters
	subDomainID uuid.UUID          // ID of the domain the subscription is for
	subPath     string             // Path on the domain the subscription is for
}

func (c *wsClient) String() string {
	c.subMU.Lock()
	defer c.subMU.Unlock()
	return fmt.Sprintf("wsClient{subDomainID: %s, subPath: %q}", c.subDomainID, c.subPath)
}

// handleIncoming handles an incoming message
func (c *wsClient) handleIncoming(data []byte) {
	// Try to unmarshal the JSON payload. Ignore the message if this fails
	var msg wsMsgPayload
	if err := json.Unmarshal(data, &msg); err != nil {
		logger.Errorf("webSocketsService.handleIncoming: Unmarshal() failed: %v", err)
		return
	}

	// The message is supposed to communicate the subscription details
	c.subMU.Lock()
	c.subDomainID = msg.DomainID
	c.subPath = msg.Path
	c.subMU.Unlock()

	// Log the event AFTER the lock is released
	logger.Debugf("Acquired subscription by %s", c)
}

// handleOutgoing sends an outgoing message
func (c *wsClient) handleOutgoing(msg *wsMsgPayload) error {
	// Ignore if the message isn't intended for this subscriber
	if !c.isSubscribed(msg) {
		return nil
	}

	// Marshal the message into a JSON string
	b, err := json.Marshal(msg)
	if err != nil {
		logger.Errorf("wsClient.handleOutgoing: Marshal() failed: %v", err)
		return err
	}

	// Open a new writer
	if w, err := c.conn.NextWriter(websocket.TextMessage); err != nil {
		return err

		// Write the message
	} else if _, err := w.Write(b); err != nil {
		return err

	} else {
		// Close the writer to send out the message
		return w.Close()
	}
}

// isSubscribed checks if the message is intended for this subscriber
func (c *wsClient) isSubscribed(msg *wsMsgPayload) bool {
	c.subMU.Lock()
	defer c.subMU.Unlock()
	return msg.DomainID == c.subDomainID && msg.Path == c.subPath
}

// readMessages continuously reads incoming messages from the websocket and notifies the service
func (c *wsClient) readMessages() {
	// Shut down as soon as the read loop is done
	defer c.shutdown()

	// Set up the connection
	c.conn.SetReadLimit(wsMaxMessageSize)
	c.updatePongDeadline()

	// Set up a ping responder
	c.conn.SetPongHandler(func(string) error { c.updatePongDeadline(); return nil })

	// Loop until the connection is closed
	for {
		// Read the next message
		_, m, err := c.conn.ReadMessage()
		if err != nil {
			// Log if it's an unexpected error
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Warningf("wsClient.readMessages: unexpected error from ReadMessage(): %v", err)
			}
			return
		}

		// Handle the incoming message
		c.handleIncoming(m)
	}
}

// shutdown closes the websocket connection and deregisters the client
func (c *wsClient) shutdown() {
	c.wss.unregister <- c
	_ = c.conn.Close()
}

// updatePongDeadline updates the pong deadline according to wsPongWait
func (c *wsClient) updatePongDeadline() {
	_ = c.conn.SetReadDeadline(time.Now().Add(wsPongWait))
}

// updateWriteDeadline updates the write deadline according to wsWriteTimeout
func (c *wsClient) updateWriteDeadline() {
	_ = c.conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
}

// writeMessages continuously writes outbound messages to the websocket client
func (c *wsClient) writeMessages() {
	// Prepare a ping ticker
	ticker := time.NewTicker(wsPingInterval)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	// Loop until the connection is closed
	for {
		select {
		// Outgoing message arrived
		case msg, ok := <-c.send:
			c.updateWriteDeadline()

			// Notify the peer and exit if the send channel is closed
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send the message
			if err := c.handleOutgoing(msg); err != nil {
				logger.Warningf("wsClient.writeMessages: handleOutgoing() failed: %v", err)
				return
			}

		// Ping the peer
		case <-ticker.C:
			c.updateWriteDeadline()
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
