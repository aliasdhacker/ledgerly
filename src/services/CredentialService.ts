// Secure Credential Service for DriftMoney
// Stores API credentials in secure storage (Keychain on iOS, Keystore on Android)

import * as SecureStore from 'expo-secure-store';

// Secure storage keys
const KEYS = {
  API_USERNAME: 'driftmoney_api_username',
  API_PASSWORD: 'driftmoney_api_password',
  CREDENTIALS_SET: 'driftmoney_credentials_set',
} as const;

export interface ApiCredentials {
  username: string;
  password: string;
}

export const CredentialService = {
  /**
   * Check if credentials have been configured
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const set = await SecureStore.getItemAsync(KEYS.CREDENTIALS_SET);
      return set === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Store API credentials securely
   */
  async setCredentials(username: string, password: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.API_USERNAME, username);
    await SecureStore.setItemAsync(KEYS.API_PASSWORD, password);
    await SecureStore.setItemAsync(KEYS.CREDENTIALS_SET, 'true');
  },

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<ApiCredentials | null> {
    try {
      const username = await SecureStore.getItemAsync(KEYS.API_USERNAME);
      const password = await SecureStore.getItemAsync(KEYS.API_PASSWORD);

      if (username && password) {
        return { username, password };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Get Basic Auth header value
   */
  async getBasicAuthHeader(): Promise<string | null> {
    const credentials = await this.getCredentials();
    if (!credentials) return null;

    const base64 = btoa(`${credentials.username}:${credentials.password}`);
    return `Basic ${base64}`;
  },

  /**
   * Clear stored credentials
   */
  async clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.API_USERNAME);
    await SecureStore.deleteItemAsync(KEYS.API_PASSWORD);
    await SecureStore.deleteItemAsync(KEYS.CREDENTIALS_SET);
  },

  /**
   * Test credentials against an endpoint
   */
  async testCredentials(url: string, username: string, password: string): Promise<boolean> {
    try {
      const base64 = btoa(`${username}:${password}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${base64}`,
        },
      });
      return response.ok || response.status === 401 === false;
    } catch {
      return false;
    }
  },
};

export default CredentialService;
