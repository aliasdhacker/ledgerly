// Credential Service for DriftMoney
// Provides service credentials injected at build time via expo-constants

import Constants from 'expo-constants';

// Get credentials from app.config.js extra field
const extra = Constants.expoConfig?.extra || {};

export interface ApiCredentials {
  username: string;
  password: string;
}

export const CredentialService = {
  /**
   * Check if service credentials are configured (baked into build)
   */
  hasCredentials(): boolean {
    return !!(extra.apiUsername && extra.apiPassword);
  },

  /**
   * Get the service credentials
   */
  getCredentials(): ApiCredentials | null {
    if (!extra.apiUsername || !extra.apiPassword) {
      return null;
    }
    const masked = extra.apiPassword.length > 2
      ? extra.apiPassword[0] + '*'.repeat(extra.apiPassword.length - 2) + extra.apiPassword[extra.apiPassword.length - 1]
      : '***';
    console.log(`[CredentialService] username="${extra.apiUsername}" password="${masked}" (len=${extra.apiPassword.length})`);
    return {
      username: extra.apiUsername,
      password: extra.apiPassword,
    };
  },

  /**
   * Get Basic Auth header value
   */
  getBasicAuthHeader(): string | null {
    const credentials = this.getCredentials();
    if (!credentials) return null;

    const base64 = btoa(`${credentials.username}:${credentials.password}`);
    return `Basic ${base64}`;
  },

  /**
   * Get configured OCR endpoint
   */
  getOCREndpoint(): string {
    return extra.ocrEndpoint || 'https://api.acarr.org';
  },

  /**
   * Get configured AI endpoint
   */
  getAIEndpoint(): string {
    return extra.aiEndpoint || 'https://ollama.acarr.org';
  },
};

export default CredentialService;
