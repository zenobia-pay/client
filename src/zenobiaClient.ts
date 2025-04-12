export interface StatementItem {
  name: string;
  amount: number;
}

export interface TransferResponse {
  transferRequestId: string;
  merchantId: string;
  expiry: number;
  signature: string;
}

export interface TransferStatus {
  status: string;
  [key: string]: any;
}

export type WebSocketStatusCallback = (status: TransferStatus) => void;
export type WebSocketErrorCallback = (error: string) => void;
export type WebSocketConnectionCallback = (connected: boolean) => void;

export class ZenobiaClient {
  private socket: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private transferId: string | null = null;
  private signature: string | null = null;
  private wsBaseUrl = "transfer-status.zenobiapay.com";
  private onStatusCallback: WebSocketStatusCallback | null = null;
  private onErrorCallback: WebSocketErrorCallback | null = null;
  private onConnectionCallback: WebSocketConnectionCallback | null = null;

  constructor() {}

  /**
   * Creates a transfer request and establishes a WebSocket connection to listen for status updates
   * @param url API endpoint for creating the transfer
   * @param amount Transfer amount
   * @param statementItems Statement items for the transfer
   * @param onStatus Callback for status updates
   * @param onError Callback for error messages
   * @param onConnection Callback for connection status
   * @returns The transfer response object
   */
  async createTransferAndListen(
    url: string,
    amount: number,
    statementItems: StatementItem[],
    onStatus?: WebSocketStatusCallback,
    onError?: WebSocketErrorCallback,
    onConnection?: WebSocketConnectionCallback
  ): Promise<TransferResponse> {
    // Set callbacks if provided
    if (onStatus) this.onStatusCallback = onStatus;
    if (onError) this.onErrorCallback = onError;
    if (onConnection) this.onConnectionCallback = onConnection;

    try {
      // Create the transfer request
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          statementItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transfer request");
      }

      // Parse the transfer response
      const transfer: TransferResponse = await response.json();
      this.transferId = transfer.transferRequestId;
      this.signature = transfer.signature;

      // Establish WebSocket connection
      this.connectWebSocket();

      return transfer;
    } catch (error) {
      console.error("Error creating transfer request:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create transfer request");
    }
  }

  /**
   * Establishes a WebSocket connection to listen for transfer status updates
   */
  private connectWebSocket(): void {
    // Close any existing socket connection
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.notifyConnectionStatus(false);
    }

    // Only create a new WebSocket if we have a transferId and signature
    if (!this.transferId || !this.signature) {
      console.error(
        "Cannot connect to WebSocket: Missing transfer ID or signature"
      );
      return;
    }

    try {
      // Determine protocol (wss for https, ws for http)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

      // Construct the WebSocket URL in the correct format
      const wsUrl = `${protocol}//${this.wsBaseUrl}/transfers/${this.transferId}/ws?token=${this.signature}`;

      console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

      // Create new WebSocket connection
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      socket.onopen = () => {
        this.notifyConnectionStatus(true);
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        console.log(`WebSocket connected for transfer: ${this.transferId}`);
      };

      socket.onclose = (event) => {
        this.notifyConnectionStatus(false);
        this.socket = null;
        console.log(
          `WebSocket disconnected for transfer: ${this.transferId}`,
          event.code,
          event.reason
        );

        // Try to reconnect if not manually closed
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error(
          `WebSocket error for transfer: ${this.transferId}`,
          error
        );
        this.notifyError("WebSocket error occurred");
      };

      socket.onmessage = (evt) => {
        console.log(
          `WebSocket message received for transfer: ${this.transferId}`,
          evt.data
        );

        try {
          const data = JSON.parse(evt.data);

          // Check the message type and handle accordingly
          if (data.type === "status" && data.transfer) {
            // Status message with transfer data
            console.log(
              `Status update received via WebSocket: ${data.transfer.status}`,
              data.transfer
            );
            this.notifyStatus(data.transfer);
          } else if (data.type === "error" && data.message) {
            // Error message
            console.error(`Error message from server: ${data.message}`);
            this.notifyError(data.message);
          } else if (data.type === "ping") {
            // Respond to ping with pong to keep connection alive
            console.log("Ping received, sending pong");
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "pong" }));
            }
          }
        } catch (err) {
          console.error("Failed to parse message:", err, evt.data);
          this.notifyError("Failed to parse message");
        }
      };
    } catch (error) {
      console.error(`Error setting up WebSocket connection:`, error);
      this.notifyError("Failed to establish WebSocket connection");
    }
  }

  /**
   * Attempts to reconnect to the WebSocket with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;

    // Calculate reconnect delay with exponential backoff, capped at 5 seconds
    const reconnectDelay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      5000
    );

    console.log(
      `Attempting to reconnect in ${reconnectDelay}ms (attempt ${this.reconnectAttempts})`
    );

    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      console.log(
        `Reconnecting to WebSocket (attempt ${this.reconnectAttempts})...`
      );
      this.connectWebSocket();
    }, reconnectDelay);
  }

  /**
   * Closes the WebSocket connection and cancels any pending reconnect
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket && this.socket.readyState < 2) {
      console.log(`Closing WebSocket for transfer: ${this.transferId}`);
      this.socket.close();
      this.socket = null;
      this.notifyConnectionStatus(false);
    }

    this.transferId = null;
    this.signature = null;
  }

  /**
   * Notifies the client of connection status changes
   */
  private notifyConnectionStatus(connected: boolean): void {
    if (this.onConnectionCallback) {
      this.onConnectionCallback(connected);
    }
  }

  /**
   * Notifies the client of status updates
   */
  private notifyStatus(status: TransferStatus): void {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  /**
   * Notifies the client of errors
   */
  private notifyError(error: string): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}
