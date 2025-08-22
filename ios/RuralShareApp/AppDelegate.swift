import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseAuth
import GoogleMaps
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // 1) Google Maps first
    GMSServices.provideAPIKey("AIzaSyA_dOZ8Oxb5t3Lm5knvuJdDE_sqgEHWctc") // TODO: restrict this key in GCP

    // 2) Firebase
    FirebaseApp.configure()

    // Helpful debug logs from Firebase (only Debug builds)
    #if DEBUG
    FirebaseConfiguration.shared.setLoggerLevel(.debug)
    #endif

    // Use device language for Auth SMS flows
    Auth.auth().useAppLanguage()

    // Simulator tip: allow testing without real app verification
    #if targetEnvironment(simulator)
    Auth.auth().settings?.isAppVerificationDisabledForTesting = true
    print("⚠️ [Auth] App verification disabled for Simulator testing. Use test phone numbers in Firebase Console.")
    #endif

    // 3) Register for remote notifications (no user prompt required for silent verification)
    UIApplication.shared.registerForRemoteNotifications()

    // Optional: sanity check that URL scheme for reCAPTCHA redirect exists
    self.verifyFirebaseURLScheme()

    // 4) React Native bootstrap
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "RuralShareApp",
      in: window,
      launchOptions: launchOptions
    )
    return true
  }

  // APNs device token -> Firebase Auth (sandbox for Debug, prod for Release/TestFlight)
  func application(_ application: UIApplication,
                   didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    #if DEBUG
    Auth.auth().setAPNSToken(deviceToken, type: .sandbox)
    #else
    Auth.auth().setAPNSToken(deviceToken, type: .prod)
    #endif

    #if DEBUG
    let hex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("✅ APNs device token: \(hex)")
    #endif
  }

  func application(_ application: UIApplication,
                   didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("⚠️ Failed to register for remote notifications: \(error.localizedDescription)")
  }

  // Let Firebase Auth consume the silent push used for phone number verification
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    if Auth.auth().canHandleNotification(userInfo) {
      completionHandler(.noData)
      return
    }
    // Handle your own notifications here if you add any later
    completionHandler(.noData)
  }

  // Fallback handlers for reCAPTCHA / universal links if APNs silent verification can't be used
  func application(_ app: UIApplication,
                   open url: URL,
                   options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if Auth.auth().canHandle(url) {
      print("✅ Firebase Auth handled URL redirect.")
      return true
    }
    // Handle other URL types here (e.g., Google/Facebook sign-in) if needed
    return false
  }

  func application(_ application: UIApplication,
                   continue userActivity: NSUserActivity,
                   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    if let url = userActivity.webpageURL, Auth.auth().canHandle(url) {
      print("✅ Firebase Auth handled universal link.")
      return true
    }
    return false
  }

  // MARK: - Helpers

  /// Checks that the app has a URL scheme matching REVERSED_CLIENT_ID from GoogleService-Info.plist.
  private func verifyFirebaseURLScheme() {
    guard
      let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let dict = NSDictionary(contentsOfFile: path) as? [String: Any],
      let reversed = dict["REVERSED_CLIENT_ID"] as? String
    else {
      print("⚠️ Could not read REVERSED_CLIENT_ID from GoogleService-Info.plist.")
      return
    }

    let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
    let hasScheme = urlTypes.contains { entry in
      let schemes = entry["CFBundleURLSchemes"] as? [String] ?? []
      return schemes.contains(reversed)
    }

    if hasScheme {
      #if DEBUG
      print("✅ URL scheme present for Firebase Auth redirect: \(reversed)")
      #endif
    } else {
      print("""
      ❌ Missing URL scheme for Firebase Auth reCAPTCHA redirect.
         Add a URL Type with scheme: \(reversed)
         (Target → Info → URL Types)
      """)
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
