/**
 * TokenRefreshService
 *
 * Handles automatic background token refresh to prevent expiration
 * Firebase ID tokens expire after 1 hour, so we refresh them proactively
 */

import firebaseTokenHelper from './firebaseTokenHelper';
import TokenStorage from '../utils/TokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TokenRefreshService {
  private refreshIntervalId: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes (before 1 hour expiry)
  private readonly MIN_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // Don't refresh more than once per 30 minutes
  private lastRefreshTime: number = 0;

  /**
   * Start automatic token refresh
   * Refreshes token every 45 minutes to prevent expiration
   */
  start(): void {
    if (this.refreshIntervalId) {
      console.log('⚠️ [TokenRefreshService] Already running');
      return;
    }

    console.log('✅ [TokenRefreshService] Starting automatic token refresh');

    // Immediate refresh on start (if needed)
    this.refreshTokenIfNeeded();

    // Set up periodic refresh
    this.refreshIntervalId = setInterval(() => {
      this.refreshTokenIfNeeded();
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Stop automatic token refresh
   */
  stop(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      console.log('✅ [TokenRefreshService] Stopped automatic token refresh');
    }
  }

  /**
   * Manually trigger token refresh
   */
  async forceRefresh(): Promise<boolean> {
    console.log('🔄 [TokenRefreshService] Force refreshing token');
    return this.refreshToken();
  }

  /**
   * Refresh token if needed (based on time since last refresh)
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;

    // Don't refresh if we refreshed recently
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL_MS) {
      console.log(`⏭️ [TokenRefreshService] Skipping refresh (last refresh ${Math.round(timeSinceLastRefresh / 60000)} minutes ago)`);
      return;
    }

    // Check if user is authenticated
    if (!firebaseTokenHelper.isAuthenticated()) {
      console.log('⚠️ [TokenRefreshService] No authenticated user, stopping refresh');
      this.stop();
      return;
    }

    await this.refreshToken();
  }

  /**
   * Perform the actual token refresh
   */
  private async refreshToken(): Promise<boolean> {
    try {
      console.log('🔄 [TokenRefreshService] Refreshing Firebase ID token');

      // Get fresh ID token from Firebase
      const newIdToken = await firebaseTokenHelper.getIdToken(true);

      if (!newIdToken) {
        console.error('❌ [TokenRefreshService] Failed to get new ID token');
        return false;
      }

      // Save new token
      const refreshToken = await TokenStorage.getRefreshToken() || '';
      await TokenStorage.saveTokens({
        accessToken: newIdToken,
        refreshToken: refreshToken,
        expiresIn: 3600, // Firebase tokens expire in 1 hour
        tokenType: 'Bearer',
      });

      // Also save to legacy storage for backward compatibility
      await AsyncStorage.setItem('access_token', newIdToken);
      await AsyncStorage.setItem('token', newIdToken);

      this.lastRefreshTime = Date.now();
      console.log('✅ [TokenRefreshService] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ [TokenRefreshService] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get time until next scheduled refresh (in minutes)
   */
  getTimeUntilNextRefresh(): number {
    if (!this.refreshIntervalId) {
      return -1;
    }

    const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
    const timeUntilNext = this.REFRESH_INTERVAL_MS - timeSinceLastRefresh;
    return Math.max(0, Math.round(timeUntilNext / 60000));
  }
}

const tokenRefreshService = new TokenRefreshService();
export default tokenRefreshService;
