package com.handsfree.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.browser.customtabs.CustomTabsIntent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://handsfree-mobile-alpha-02.vercel.app/kmt/?app=202609297";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        showLauncher();
        if (savedInstanceState == null) openBrowser();
    }

    private void showLauncher() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding * 2, padding, padding);
        TextView title = new TextView(this);
        title.setText("핸즈프리 REAL\n개인 로그인과 업무 처리는 브라우저에서 이어집니다.");
        title.setTextSize(20);
        layout.addView(title);
        Button start = new Button(this);
        start.setText("업무 계속하기");
        start.setOnClickListener(v -> openBrowser());
        layout.addView(start);
        TextView note = new TextView(this);
        note.setText("기존 설치앱에만 보관한 초안은 아래에서 확인하세요. 브라우저로 자동 이동되거나 전송되지 않습니다.");
        layout.addView(note);
        Button drafts = new Button(this);
        drafts.setText("기존 앱에 보관한 내용 확인");
        drafts.setOnClickListener(v -> openLegacyDrafts());
        layout.addView(drafts);
        setContentView(layout);
    }

    private void openBrowser() {
        try {
            new CustomTabsIntent.Builder().setShowTitle(true).build()
                .launchUrl(this, Uri.parse(APP_URL));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "로그인을 지원하는 브라우저를 열 수 없습니다. Chrome 사용 가능 여부를 확인하세요.", Toast.LENGTH_LONG).show();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void openLegacyDrafts() {
        if (webView != null) {
            setContentView(webView);
            return;
        }

        webView = new WebView(this);
        webView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMediaPlaybackRequiresUserGesture(false);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            private boolean mainLoaded = false;

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (request.isForMainFrame() && (!"https".equals(url.getScheme())
                        || !"handsfree-mobile-alpha-02.vercel.app".equals(url.getHost())
                        || url.getPath().endsWith("/login.html"))) {
                    openBrowser();
                    return true;
                }
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                mainLoaded = false;
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                mainLoaded = true;
                super.onPageFinished(view, url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    showLoadError("NETWORK " + error.getErrorCode(), request.getUrl().toString());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request != null && request.isForMainFrame() && response.getStatusCode() >= 400) {
                    showLoadError("HTTP " + response.getStatusCode(), request.getUrl().toString());
                }
            }
        });

        webView.loadUrl(APP_URL);
    }

    private void showLoadError(String code, String url) {
        String html = "<html><body style='font-family:sans-serif;padding:28px'>"
            + "<h2>HandsFree 연결 오류</h2>"
            + "<p>" + code + "</p>"
            + "<button style='font-size:18px;padding:12px 18px' onclick=\"location.href='" + APP_URL + "'\">다시 연결</button>"
            + "</body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.isShown() && webView.canGoBack()) {
            webView.goBack();
        } else if (webView != null && webView.isShown()) {
            showLauncher();
        } else {
            super.onBackPressed();
        }
    }
}
