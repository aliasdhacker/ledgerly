import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

class NetworkServiceClass {
  private isConnected: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private subscription: NetInfoSubscription | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Subscribe to network state changes
    this.subscription = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      // Notify listeners only if connection state changed
      if (wasConnected !== this.isConnected) {
        this.notifyListeners();
      }
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.isConnected = state.isConnected ?? false;
    });
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isConnected);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  // Check if currently connected
  getIsConnected(): boolean {
    return this.isConnected;
  }

  // Check connection status (async, fetches fresh state)
  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    return this.isConnected;
  }

  // Add a listener for connection changes
  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Clean up
  destroy() {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners.clear();
  }
}

export const NetworkService = new NetworkServiceClass();
