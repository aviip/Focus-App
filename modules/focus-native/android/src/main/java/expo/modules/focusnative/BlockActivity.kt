package expo.modules.focusnative

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val pkg = intent.getStringExtra("pkg") ?: ""
    val label = try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: Exception) { "This app" }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0B0F14"))
      setPadding(64, 64, 64, 64)
    }
    root.addView(TextView(this).apply {
      text = "$label is blocked"
      textSize = 26f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = "Your Focus limit or session is active. Take a breath and come back later."
      textSize = 16f
      setTextColor(Color.parseColor("#9AA7B4"))
      gravity = Gravity.CENTER
      setPadding(0, 32, 0, 48)
    })
    root.addView(Button(this).apply {
      text = "Go home"
      setOnClickListener { goHome() }
    })
    setContentView(root)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() = goHome()

  private fun goHome() {
    startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finish()
  }
}
