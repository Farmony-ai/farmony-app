// 🌾 Firebase SMS Service - Clean and Simple SMS-only OTP Authentication
// This service uses Firebase Authentication for SMS-based OTP.
//
// Prerequisites:
// 1. Install native deps: `@react-native-firebase/app` & `@react-native-firebase/auth`
// 2. Add your google-services.json (Android) & GoogleService-Info.plist (iOS)
// 3. Enable Phone Authentication in the Firebase console
//
// The code below is intentionally written in "plain english" style with
// generous comments so that future developers can follow the flow easily.

import { getAuth, signInWithPhoneNumber, PhoneAuthProvider, type ConfirmationResult, type UserCredential } from '@react-native-firebase/auth';
import './firebase'; // Ensure Firebase [DEFAULT] app is initialised before any auth call

class FirebaseSMSService {
  private readonly auth = getAuth();

  async sendOTP(phoneWithPlus: string): Promise<ConfirmationResult> {
    try {
      console.log('📨 [FirebaseSMS] Sending OTP to', phoneWithPlus);
      const confirmation = await signInWithPhoneNumber(this.auth, phoneWithPlus);
      console.log('✅ [FirebaseSMS] OTP dispatched');
      return confirmation;
    } catch (e: any) {
      console.error('❌ [FirebaseSMS] FULL ERROR OBJECT:', e);
      console.error('❌ [FirebaseSMS] ERROR CODE:', e?.code);
      throw new Error(`Failed to send SMS OTP. Code: ${e.code ?? 'unknown'}`);
    }
  }

  async verifyOTP(
    confirmation: ConfirmationResult,
    otp: string,
  ): Promise<UserCredential> {
    try {
      console.log('🔍 [FirebaseSMS] Verifying OTP');
      const credential = await confirmation.confirm(otp);
      if (!credential) {
        throw new Error('OTP verification returned null credential');
      }
      console.log('✅ [FirebaseSMS] OTP verified');
      return credential;
    } catch (error: any) {
      console.error('❌ [FirebaseSMS] OTP verification failed:', error?.code);
      throw new Error('Invalid OTP');
    }
  }
}

const firebaseSMSService = new FirebaseSMSService();
export default firebaseSMSService; 