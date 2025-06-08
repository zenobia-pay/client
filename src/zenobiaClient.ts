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
  private maxReconnectAttempts = 6;
  private transferId: string | null = null;
  private signature: string | null = null;
  private wsBaseUrl: string;
  private onStatusCallback: WebSocketStatusCallback | null = null;
  private onErrorCallback: WebSocketErrorCallback | null = null;
  private onConnectionCallback: WebSocketConnectionCallback | null = null;

  constructor(isTest: boolean = false) {
    this.wsBaseUrl = isTest
      ? "transfer-status-test.zenobiapay.com"
      : "transfer-status.zenobiapay.com";
  }

  getSignature(): string | null {
    return this.signature;
  }

  getTransferId(): string | null {
    return this.transferId;
  }

  /**
   * Creates a transfer request
   * @param url API endpoint for creating the transfer
   * @param metadata Arbitrary JSON object containing transfer metadata
   * @returns The transfer response object
   */
  async createTransfer(
    url: string,
    metadata: Record<string, any>
  ): Promise<TransferResponse> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transfer request");
      }

      // Parse the transfer response
      const transfer: TransferResponse = await response.json();
      this.transferId = transfer.transferRequestId;
      this.signature = transfer.signature;

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
   * @param transferId The ID of the transfer to listen to
   * @param signature The signature for authenticating the WebSocket connection
   * @param onStatus Callback for status updates
   * @param onError Callback for error messages
   * @param onConnection Callback for connection status
   */
  listenToTransfer(
    transferId: string,
    signature: string,
    onStatus?: WebSocketStatusCallback,
    onError?: WebSocketErrorCallback,
    onConnection?: WebSocketConnectionCallback
  ): void {
    this.transferId = transferId;
    this.signature = signature;
    if (onStatus) this.onStatusCallback = onStatus;
    if (onError) this.onErrorCallback = onError;
    if (onConnection) this.onConnectionCallback = onConnection;

    this.connectWebSocket();
  }

  /**
   * Creates a transfer request and establishes a WebSocket connection to listen for status updates
   * @param url API endpoint for creating the transfer
   * @param metadata Arbitrary JSON object containing transfer metadata
   * @param onStatus Callback for status updates
   * @param onError Callback for error messages
   * @param onConnection Callback for connection status
   * @returns The transfer response object
   */
  async createTransferAndListen(
    url: string,
    metadata: Record<string, any>,
    onStatus?: WebSocketStatusCallback,
    onError?: WebSocketErrorCallback,
    onConnection?: WebSocketConnectionCallback
  ): Promise<TransferResponse> {
    const transfer = await this.createTransfer(url, metadata);
    this.listenToTransfer(
      transfer.transferRequestId,
      transfer.signature,
      onStatus,
      onError,
      onConnection
    );
    return transfer;
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
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${this.wsBaseUrl}/transfers/${this.transferId}/ws?token=${this.signature}`;

      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      socket.onopen = () => {
        this.notifyConnectionStatus(true);
        this.reconnectAttempts = 0;
      };

      socket.onclose = (event) => {
        this.notifyConnectionStatus(false);
        this.socket = null;

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

          if (data.type === "status" && data.transfer) {
            this.notifyStatus(data.transfer);
          } else if (data.type === "error" && data.message) {
            this.notifyError(data.message);
          } else if (data.type === "ping") {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "pong" }));
            }
          }
        } catch (err) {
          this.notifyError("Failed to parse message");
        }
      };
    } catch (error) {
      this.notifyError("Failed to establish WebSocket connection");
    }
  }

  /**
   * Attempts to reconnect to the WebSocket with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;

    const reconnectDelay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000
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
