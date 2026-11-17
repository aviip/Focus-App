package expo.modules.focusnative

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocusNativeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocusNative")

    Function("getLaunchableApps") {
      val pm = ctx.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(intent, 0)
        .map { mapOf("packageName" to it.activityInfo.packageName, "label" to it.loadLabel(pm).toString()) }
        .filter { it["packageName"] != ctx.packageName }
        .distinctBy { it["packageName"] }
        .sortedBy { it["label"]?.lowercase() }
    }

    Function("hasUsageAccess") {
      val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= 29)
        ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
      else
        @Suppress("DEPRECATION") ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
      mode == AppOpsManager.MODE_ALLOWED
    }

    Function("isAccessibilityEnabled") {
      val flat = ComponentName(ctx, FocusAccessibilityService::class.java).flattenToString()
      val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      enabled.split(':').any { it.equals(flat, ignoreCase = true) }
    }

    Function("openUsageAccessSettings") {
      ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("openAccessibilitySettings") {
      ctx.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("setConfig") { json: String -> Prefs.setConfig(ctx, json) }

    Function("getTodayUsage") { Prefs.todayUsage(ctx) }
  }
}
