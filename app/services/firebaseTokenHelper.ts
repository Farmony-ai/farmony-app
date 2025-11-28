/**
 * Firebase Token Helper
 *
 * This service helps manage Firebase custom tokens received from the backend
 * and exchange them for ID tokens with RBAC claims.
 *
 * Flow:
 * 1. Backend sends custom Firebase token after OTP verification
 * 2. Client exchanges custom token for ID token using Firebase SDK
 * 3. ID token contains RBAC claims (role, isProvider, isSeeker, isAdmin, etc.)
 * 4. Use ID token for authenticated API requests
 */

import { getAuth, signInWithCustomToken } from '@react-native-firebase/auth';
import './firebase'; // Ensure Firebase is initialized

class FirebaseTokenHelper {
  private readonly auth = getAuth();
  private initialized = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        this.initialized = true;
        console.log('✅ [FirebaseTokenHelper] Auth state initialized. User:', user ? user.uid : 'null');
        resolve();
        unsubscribe(); // We only need to know when it's *first* initialized
      });
    });
  }

  /**
   * Wait for Firebase Auth to initialize
   */
  async waitForAuthReady(): Promise<void> {
    if (this.initialized) return;
    console.log('⏳ [FirebaseTokenHelper] Waiting for auth initialization...');
    await this.initPromise;
    console.log('✅ [FirebaseTokenHelper] Auth initialization complete');
  }

  /**
   * Exchange a custom token (received from backend) for a Firebase ID token
   * The custom token contains RBAC claims set by the backend
   */
  async signInWithCustomToken(customToken: string): Promise<string> {
    try {
      console.log('🔄 [FirebaseTokenHelper] Signing in with custom token');
      const userCredential = await signInWithCustomToken(this.auth, customToken);

      // Get ID token with custom claims
      const idToken = await userCredential.user.getIdToken();
      console.log('✅ [FirebaseTokenHelper] Got ID token with RBAC claims');

      return idToken;
    } catch (error: any) {
      console.error('❌ [FirebaseTokenHelper] Failed to sign in with custom token:', error);
      throw new Error(`Failed to exchange custom token: ${error.message}`);
    }
  }

  /**
   * Get fresh ID token from currently authenticated user
   * Use forceRefresh=true to get a new token even if current one hasn't expired
   */
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      const currentUser = this.auth.currentUser;

      if (!currentUser) {
        console.warn('⚠️ [FirebaseTokenHelper] No authenticated user');
        return null;
      }

      const idToken = await currentUser.getIdToken(forceRefresh);
      console.log(`✅ [FirebaseTokenHelper] Got ID token (forceRefresh: ${forceRefresh})`);

      return idToken;
    } catch (error: any) {
      console.error('❌ [FirebaseTokenHelper] Failed to get ID token:', error);
      return null;
    }
  }

  /**
   * Get ID token result with decoded claims
   * Useful for inspecting RBAC claims (role, isProvider, isSeeker, etc.)
   */
  async getIdTokenResult(forceRefresh: boolean = false) {
    try {
      const currentUser = this.auth.currentUser;

      if (!currentUser) {
        console.warn('⚠️ [FirebaseTokenHelper] No authenticated user');
        return null;
      }

      const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
      console.log('✅ [FirebaseTokenHelper] Got ID token result with claims');

      return tokenResult;
    } catch (error: any) {
      console.error('❌ [FirebaseTokenHelper] Failed to get ID token result:', error);
      return null;
    }
  }

  /**
   * Sign out from Firebase
   */
  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      console.log('✅ [FirebaseTokenHelper] Signed out from Firebase');
    } catch (error: any) {
      console.error('❌ [FirebaseTokenHelper] Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current Firebase user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }
}

const firebaseTokenHelper = new FirebaseTokenHelper();
export default firebaseTokenHelper;
