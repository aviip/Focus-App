package expo.modules.focusnative

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.accessibility.AccessibilityEvent

class FocusAccessibilityService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private var current: String? = null
  private val tickMs = 5_000L

  private val tick = object : Runnable {
    override fun run() {
      val pm = getSystemService(POWER_SERVICE) as PowerManager
      val pkg = current
      if (pkg != null && pm.isInteractive && Prefs.isLimited(this@FocusAccessibilityService, pkg)) {
        Prefs.addUsage(this@FocusAccessibilityService, pkg, tickMs)
        if (Prefs.isBlocked(this@FocusAccessibilityService, pkg)) showBlock(pkg)
      }
      handler.postDelayed(this, tickMs)
    }
  }

  override fun onServiceConnected() {
    handler.removeCallbacks(tick)
    handler.postDelayed(tick, tickMs)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) { current = null; return }
    if (pkg == "com.android.systemui" || pkg == "android" || pkg.contains("inputmethod")) return
    current = pkg
    if (Prefs.isBlocked(this, pkg)) showBlock(pkg)
  }

  private fun showBlock(pkg: String) {
    startActivity(
      Intent(this, BlockActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        .putExtra("pkg", pkg)
    )
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    super.onDestroy()
  }
}
