import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TokenStorage - Centralized token management with expiry tracking
 *
 * Features:
 * - Stores access and refresh tokens
 * - Tracks token expiration times
 * - Provides helper methods for token validity checks
 * - Supports sliding window refresh tokens (30 days)
 */

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType?: string;
}

export interface StoredTokenData extends TokenData {
  accessTokenExpiry: number; // timestamp
  refreshTokenExpiry: number; // timestamp
  storedAt: number; // timestamp
}

export class TokenStorage {
  // Storage keys
  private static readonly KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    TOKEN_EXPIRY: 'token_expiry',
    REFRESH_TOKEN_EXPIRY: 'refresh_token_expiry',
    STORED_AT: 'token_stored_at',
    TOKEN_TYPE: 'token_type',
    // Legacy keys for backward compatibility
    LEGACY_TOKEN: 'token',
    LEGACY_USER: 'user',
  };

  // Constants
  private static readonly ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;
  private static readonly AUTO_REFRESH_THRESHOLD_SECONDS = 300; // Refresh if < 5 min left
  private static readonly EXPIRY_BUFFER_SECONDS = 10; // Consider expired 10s early

  /**
   * Save tokens to storage with expiration tracking
   */
  static async saveTokens(tokenData: TokenData): Promise<void> {
    try {
      const now = Date.now();
      const expiresIn = tokenData.expiresIn || this.ACCESS_TOKEN_EXPIRY_SECONDS;

      // Calculate expiry timestamps
      const accessTokenExpiry = now + (expiresIn * 1000);
      const refreshTokenExpiry = now + (this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const items: [string, string][] = [
        [this.KEYS.ACCESS_TOKEN, tokenData.accessToken],
        [this.KEYS.REFRESH_TOKEN, tokenData.refreshToken],
        [this.KEYS.TOKEN_EXPIRY, accessTokenExpiry.toString()],
        [this.KEYS.REFRESH_TOKEN_EXPIRY, refreshTokenExpiry.toString()],
        [this.KEYS.STORED_AT, now.toString()],
        [this.KEYS.TOKEN_TYPE, tokenData.tokenType || 'Bearer'],
        // Legacy support
        [this.KEYS.LEGACY_TOKEN, tokenData.accessToken],
      ];

      await AsyncStorage.multiSet(items);
      console.log('✅ [TokenStorage] Tokens saved successfully');
      console.log(`   Access token expires in: ${Math.floor(expiresIn / 60)} minutes`);
      console.log(`   Refresh token expires in: ${this.REFRESH_TOKEN_EXPIRY_DAYS} days`);
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to save tokens:', error);
      throw error;
    }
  }

  /**
   * Get all stored tokens
   */
  static async getTokens(): Promise<StoredTokenData | null> {
    try {
      const keys = [
        this.KEYS.ACCESS_TOKEN,
        this.KEYS.REFRESH_TOKEN,
        this.KEYS.TOKEN_EXPIRY,
        this.KEYS.REFRESH_TOKEN_EXPIRY,
        this.KEYS.STORED_AT,
        this.KEYS.TOKEN_TYPE,
      ];

      const values = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(values);

      const accessToken = data[this.KEYS.ACCESS_TOKEN];
      const refreshToken = data[this.KEYS.REFRESH_TOKEN];

      if (!accessToken || refreshToken === null || refreshToken === undefined) {
        console.log('ℹ️ [TokenStorage] No tokens found in storage');
        return null;
      }

      const accessTokenExpiry = parseInt(data[this.KEYS.TOKEN_EXPIRY] || '0', 10);
      const refreshTokenExpiry = parseInt(data[this.KEYS.REFRESH_TOKEN_EXPIRY] || '0', 10);
      const storedAt = parseInt(data[this.KEYS.STORED_AT] || '0', 10);
      const tokenType = data[this.KEYS.TOKEN_TYPE] || 'Bearer';

      // Calculate expiresIn from expiry timestamp
      const now = Date.now();
      const expiresIn = Math.max(0, Math.floor((accessTokenExpiry - now) / 1000));

      return {
        accessToken,
        refreshToken,
        expiresIn,
        tokenType,
        accessTokenExpiry,
        refreshTokenExpiry,
        storedAt,
      };
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to get tokens:', error);
      return null;
    }
  }

  /**
   * Get only access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get only refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Check if access token is valid (not expired)
   */
  static async isAccessTokenValid(): Promise<boolean> {
    try {
      const expiryStr = await AsyncStorage.getItem(this.KEYS.TOKEN_EXPIRY);
      if (!expiryStr) return false;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();

      // Consider expired 10 seconds early as buffer
      const isValid = expiry > (now + this.EXPIRY_BUFFER_SECONDS * 1000);

      if (!isValid) {
        console.log('⏰ [TokenStorage] Access token expired or expiring soon');
      }

      return isValid;
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to check token validity:', error);
      return false;
    }
  }

  /**
   * Check if access token needs refresh (< 5 minutes remaining)
   */
  static async shouldRefreshToken(): Promise<boolean> {
    try {
      const expiryStr = await AsyncStorage.getItem(this.KEYS.TOKEN_EXPIRY);
      if (!expiryStr) return true; // No expiry = should refresh

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      const secondsRemaining = (expiry - now) / 1000;

      const shouldRefresh = secondsRemaining < this.AUTO_REFRESH_THRESHOLD_SECONDS;

      if (shouldRefresh) {
        console.log(`🔄 [TokenStorage] Token needs refresh (${Math.floor(secondsRemaining)}s remaining)`);
      }

      return shouldRefresh;
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to check refresh need:', error);
      return true; // Default to refresh on error
    }
  }

  /**
   * Get time until access token expires (in seconds)
   */
  static async getTimeUntilExpiry(): Promise<number> {
    try {
      const expiryStr = await AsyncStorage.getItem(this.KEYS.TOKEN_EXPIRY);
      if (!expiryStr) return 0;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      return Math.max(0, Math.floor((expiry - now) / 1000));
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to get time until expiry:', error);
      return 0;
    }
  }

  /**
   * Check if refresh token is valid (not expired)
   */
  static async isRefreshTokenValid(): Promise<boolean> {
    try {
      const expiryStr = await AsyncStorage.getItem(this.KEYS.REFRESH_TOKEN_EXPIRY);
      if (!expiryStr) return false;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      return expiry > now;
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to check refresh token validity:', error);
      return false;
    }
  }

  /**
   * Clear all tokens from storage
   */
  static async clearTokens(): Promise<void> {
    try {
      const keys = [
        this.KEYS.ACCESS_TOKEN,
        this.KEYS.REFRESH_TOKEN,
        this.KEYS.TOKEN_EXPIRY,
        this.KEYS.REFRESH_TOKEN_EXPIRY,
        this.KEYS.STORED_AT,
        this.KEYS.TOKEN_TYPE,
        this.KEYS.LEGACY_TOKEN,
        this.KEYS.LEGACY_USER,
      ];

      await AsyncStorage.multiRemove(keys);
      console.log('✅ [TokenStorage] Tokens cleared successfully');
    } catch (error) {
      console.error('❌ [TokenStorage] Failed to clear tokens:', error);
      throw error;
    }
  }

  /**
   * Debug: Print current token status
   */
  static async debugTokenStatus(): Promise<void> {
    try {
      const tokens = await this.getTokens();

      if (!tokens) {
        console.log('🔍 [TokenStorage Debug] No tokens stored');
        return;
      }

      const now = Date.now();
      const accessTimeRemaining = Math.floor((tokens.accessTokenExpiry - now) / 1000);
      const refreshTimeRemaining = Math.floor((tokens.refreshTokenExpiry - now) / 1000);

      console.log('🔍 [TokenStorage Debug] ==================');
      console.log(`   Access Token: ${tokens.accessToken.substring(0, 30)}...`);
      console.log(`   Refresh Token: ${tokens.refreshToken.substring(0, 30)}...`);
      console.log(`   Access expires in: ${accessTimeRemaining}s (${Math.floor(accessTimeRemaining / 60)}m)`);
      console.log(`   Refresh expires in: ${refreshTimeRemaining}s (${Math.floor(refreshTimeRemaining / 86400)}d)`);
      console.log(`   Needs refresh: ${await this.shouldRefreshToken()}`);
      console.log(`   Access valid: ${await this.isAccessTokenValid()}`);
      console.log(`   Refresh valid: ${await this.isRefreshTokenValid()}`);
      console.log('========================================');
    } catch (error) {
      console.error('❌ [TokenStorage Debug] Failed:', error);
    }
  }
}

export default TokenStorage;
