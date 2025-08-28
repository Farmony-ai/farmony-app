package com.ruralshareapp1

import android.os.Bundle;

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
// Removed RNGestureHandlerEnabledRootView usage per migration guide

class MainActivity : ReactActivity() {

  /**
   * Name of the main component registered from JavaScript.
   */
  override fun getMainComponentName(): String = "RuralShareApp"

  /**
   * Delegate that enables the New Architecture flags.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return object : DefaultReactActivityDelegate(
      this,
      mainComponentName,
      fabricEnabled
    ) {
      // Use default root view; JS side wraps with GestureHandlerRootView
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
} 