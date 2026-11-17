package expo.modules.focusnative

import android.content.Context
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object Prefs {
  private fun sp(c: Context) = c.getSharedPreferences("focus_prefs", Context.MODE_PRIVATE)
  private fun day() = SimpleDateFormat("yyyyMMdd", Locale.US).format(Date())

  fun setConfig(c: Context, json: String) = sp(c).edit().putString("config", json).apply()

  private fun config(c: Context): JSONObject =
    try { JSONObject(sp(c).getString("config", "{}") ?: "{}") } catch (e: Exception) { JSONObject() }

  fun isLimited(c: Context, pkg: String): Boolean =
    config(c).optJSONObject("limits")?.has(pkg) == true

  fun addUsage(c: Context, pkg: String, ms: Long) {
    val key = "u_${day()}_$pkg"
    sp(c).edit().putLong(key, sp(c).getLong(key, 0L) + ms).apply()
  }

  fun usage(c: Context, pkg: String): Long = sp(c).getLong("u_${day()}_$pkg", 0L)

  fun todayUsage(c: Context): Map<String, Double> {
    val prefix = "u_${day()}_"
    val out = HashMap<String, Double>()
    for ((k, v) in sp(c).all) {
      if (k.startsWith(prefix) && v is Long) out[k.removePrefix(prefix)] = v.toDouble()
    }
    return out
  }

  fun isBlocked(c: Context, pkg: String): Boolean {
    val cfg = config(c)
    val limits = cfg.optJSONObject("limits") ?: return false
    if (!limits.has(pkg)) return false
    if (cfg.optLong("sessionEnd", 0L) > System.currentTimeMillis()) return true
    val minutes = limits.optInt(pkg, 0)
    return minutes > 0 && usage(c, pkg) >= minutes * 60_000L
  }
}
