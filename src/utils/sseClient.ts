export class SSEClient {
  private url: string;
  private token: string | null;
  private reconnectInterval: number;
  private maxReconnectInterval: number;
  private listeners: Record<string, Array<(event: any) => void>>;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null;
  private reconnectTimeout: NodeJS.Timeout | null;
  private isConnected: boolean;
  private buffer: string;
  private shouldReconnect: boolean;

  constructor(url: string) {
    this.url = url;
    this.token = this.getToken();
    this.reconnectInterval = 1000;
    this.maxReconnectInterval = 10000;
    this.listeners = {};
    this.reader = null;
    this.reconnectTimeout = null;
    this.isConnected = false;
    this.buffer = '';
    this.shouldReconnect = true;
  }

  private getToken(): string | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        return parsedUser.accessToken || null;
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        return null;
      }
    }
    return null;
  }

  public connect(): void {
    this.connectWithOptions('GET', null);
  }

  public connectWithPost(body: FormData | Record<string, any>): void {
    this.connectWithOptions('POST', body);
  }

  private connectWithOptions(method: 'GET' | 'POST', body: FormData | Record<string, any> | null): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close existing connection if any
    this.disconnect();

    // Reset shouldReconnect flag for new connection
    this.shouldReconnect = true;

    // Get fresh token
    this.token = this.getToken();

    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData - browser will set it automatically with boundary
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers
    };

    // Add body for POST requests
    if (method === 'POST' && body) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    fetch(this.url, fetchOptions)
    .then(response => {
      // Check if response is OK and has a body
      if (response.status === 200 && response.body) {
        // Check if Content-Type is text/event-stream or null/undefined (some servers don't set it correctly)
        const contentType = response.headers.get('Content-Type');
        const isSSE = !contentType || contentType === 'text/event-stream' || contentType.startsWith('text/event-stream');
        
        if (isSSE) {
          ;
          this.isConnected = true;
          this.reconnectInterval = 1000; // Reset reconnect interval

          const reader = response.body.getReader();
          if (reader) {
            this.reader = reader;
            this.readStream();
          } else {
            console.error('Failed to get stream reader');
            this.triggerEvent('error', { message: 'Failed to get stream reader' });
            this.scheduleReconnect();
          }
        } else {
          console.error('SSE connection failed: Invalid Content-Type', contentType);
          this.triggerEvent('error', {
            message: 'SSE connection failed: Invalid Content-Type',
            status: response.status,
            statusText: response.statusText,
            contentType: contentType
          });
          this.scheduleReconnect();
        }
      } else {
        console.error('SSE connection failed:', response.status, response.statusText);
        this.triggerEvent('error', {
          message: 'SSE connection failed',
          status: response.status,
          statusText: response.statusText
        });
        this.scheduleReconnect();
      }
    })
    .catch(error => {
      console.error('Fetch error:', error);
      this.triggerEvent('error', { message: 'Fetch error', error: error });
      this.scheduleReconnect();
    });
  }

  private async readStream(): Promise<void> {
    if (!this.reader) return;

    try {
      const { done, value } = await this.reader.read();
      
      if (done) {
        ;
        // Process any remaining buffer content before finishing
        if (this.buffer.trim()) {
          ;
          this.processBuffer();
        }
        ;
        this.isConnected = false;
        // Don't automatically reconnect when stream is done naturally
        // Only reconnect on error
        return;
      }

      const decoder = new TextDecoder('utf-8');
      ;
      const decoded = decoder.decode(value, { stream: true });
      ;
      this.buffer += decoded;
      ;
      this.processBuffer();

      // Clean up processed buffer
      // Keep the last incomplete event in the buffer for next read
      ;
      // Find the last complete event separator
      const lastDoubleNewline = this.buffer.lastIndexOf('\n\n');
      const lastWindowsDoubleNewline = this.buffer.lastIndexOf('\r\n\r\n');
      const lastEventSeparatorIndex = Math.max(lastDoubleNewline, lastWindowsDoubleNewline);
      
      if (lastEventSeparatorIndex !== -1) {
        // Keep everything after the last complete event separator
        const separatorLength = lastEventSeparatorIndex === lastWindowsDoubleNewline ? 4 : 2;
        this.buffer = this.buffer.substring(lastEventSeparatorIndex + separatorLength);
        ;
      } else {
        // If no event separator, keep the entire buffer for next read
        // This handles the case where we have an incomplete event
        ;
      }

      // Continue reading
      this.readStream();
    } catch (error) {
      console.error('Stream reading error:', error);
      this.isConnected = false;
      this.triggerEvent('error', { message: 'Stream reading error', error: error });
      this.scheduleReconnect();
    }
  }

  private processBuffer(): void {
    ;
    // If buffer is empty or just whitespace, nothing to process
    if (!this.buffer.trim()) {
      ;
      return;
    }
    
    // Split by event separators (\n\n or \r\n\r\n)
    // We need to handle both types of line endings
    const eventSeparator = /\r?\n\r?\n/;
    const events = this.buffer.split(eventSeparator);
    ;
    
    // Check if buffer ends with a complete event separator
    // This determines if the last event is complete or partial
    const endsWithEventSeparator = this.buffer.match(/(\r?\n\r?\n)$/g) !== null;
    ;
    
    // If buffer ends with separator, all events are complete
    // If not, the last event is incomplete and should be kept in buffer for next read
    const processableEventsCount = endsWithEventSeparator ? events.length : events.length - 1;
    ;
    
    // Process all complete events
    for (let i = 0; i < processableEventsCount; i++) {
      const eventData = events[i].trim();
      ;
      if (eventData === '') continue;

      this.processEvent(eventData);
    }
  }

  private processEvent(eventData: string): void {
    ;
    const lines = eventData.split('\n');
    let event = 'message'; // Default event type
    let id: string | null = null;
    let data = '';
    let retry: number | null = null;

    lines.forEach(line => {
      if (line.startsWith('event:')) {
        event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        // Remove the 'data:' prefix and add to data with a newline
        // Data fields can span multiple lines, so we preserve the structure
        data += line.substring(5); // Keep the space after ':' if any
        // Add newline to separate multiple data lines as per SSE spec
        data += '\n';
      } else if (line.startsWith('id:')) {
        id = line.substring(3).trim();
      } else if (line.startsWith('retry:')) {
        retry = parseInt(line.substring(6).trim(), 10);
      }
      // Ignore comment lines (starting with ':') and empty lines
    });

    // Remove trailing newline from data if present (SSE spec)
    if (data.endsWith('\n')) {
      data = data.slice(0, -1);
    }

    if (retry) {
      this.reconnectInterval = retry;
    }

    // Trigger event listeners
    this.triggerEvent(event, { data, id: id });
  }
  private triggerEvent(eventName: string, eventData: any): void {
    const eventObject = { 
      ...eventData, 
      event: eventName 
    };
    
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(eventObject);
        } catch (e) {
          console.error(`Error in SSE listener for event '${eventName}':`, e);
        }
      });
    }
  }
  

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }
    
    ;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      // Exponential backoff, capped at maxReconnectInterval
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
    }, this.reconnectInterval);
  }

  public on(eventName: string, callback: (event: any) => void): void {
    ;
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    ;
  }

  public off(eventName: string, callback: (event: any) => void): void {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }
  }
  
  public isConnectedState(): boolean {
    return this.isConnected;
  }
  
  public disconnect(): void {
    ;
    this.isConnected = false;
    this.shouldReconnect = false;
    
    if (this.reader) {
      this.reader.cancel().catch(err => {
        console.error('Error cancelling reader:', err);
      });
      this.reader = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.buffer = '';
  }
}

export default SSEClient;