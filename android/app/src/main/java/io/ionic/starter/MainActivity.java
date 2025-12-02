package io.ionic.starter;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.WindowManager;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 🔥 FIX CRÍTICO PARA XIAOMI/MIUI: permitir focus en WebView
        android.webkit.WebView webView = this.bridge.getWebView();

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        webView.requestFocusFromTouch();

        // 🔥 Permite que el teclado empuje correctamente la UI
        getWindow().setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
            WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
        );
    }
}
