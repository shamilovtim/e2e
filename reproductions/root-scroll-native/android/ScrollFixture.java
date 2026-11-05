package dev.testerarmy.rootscroll;

import android.app.Activity;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class ScrollFixture extends Activity {
  private TextView status;
  private ScrollView scroll;
  private int composerTouches;
  private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
  private void updateStatus() { status.setText("Offset " + scroll.getScrollY() + "; composer touches " + composerTouches); }
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(0xffffffff);
    root.setPadding(dp(12), dp(24), dp(12), 0);
    getWindow().setDecorFitsSystemWindows(false);
    root.setOnApplyWindowInsetsListener((view, insets) -> {
      Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
      Insets ime = insets.getInsets(WindowInsets.Type.ime());
      root.setPadding(dp(12) + bars.left, dp(8) + bars.top, dp(12) + bars.right, Math.max(bars.bottom, ime.bottom));
      return insets;
    });
    status = new TextView(this);
    status.setTextColor(0xff000000);
    root.addView(status, new LinearLayout.LayoutParams(-1, dp(32)));
    EditText notes = new EditText(this);
    notes.setHint("Notes"); notes.setContentDescription("Notes"); notes.setSingleLine(true);
    root.addView(notes, new LinearLayout.LayoutParams(-1, dp(48)));
    FrameLayout content = new FrameLayout(this);
    root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
    scroll = new ScrollView(this);
    scroll.setFillViewport(true);
    LinearLayout rows = new LinearLayout(this);
    rows.setOrientation(LinearLayout.VERTICAL);
    for (int index = 0; index < 40; index++) {
      TextView row = new TextView(this);
      row.setText("Row " + index); row.setTextColor(0xff000000); row.setGravity(Gravity.CENTER_VERTICAL);
      rows.addView(row, new LinearLayout.LayoutParams(-1, dp(80)));
    }
    scroll.addView(rows);
    content.addView(scroll, new FrameLayout.LayoutParams(-1, -1));
    Button composer = new Button(this);
    composer.setText("Composer"); composer.setContentDescription("Composer"); composer.setBackgroundColor(0xffffeb3b);
    composer.setOnTouchListener((view, event) -> { if (event.getAction() == MotionEvent.ACTION_DOWN) { composerTouches++; updateStatus(); } return false; });
    content.addView(composer, new FrameLayout.LayoutParams(-1, dp(64), Gravity.BOTTOM));
    scroll.setOnScrollChangeListener((view, x, y, oldX, oldY) -> updateStatus());
    setContentView(root);
    updateStatus();
  }
}
