package com.handsfree.mobile;

import android.annotation.SuppressLint;
import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String APP_URL = BuildConfig.APP_URL;
    private static final int AUDIO_PERMISSION_REQUEST = 4102;
    private WebView webView;
    private PermissionRequest pendingAudioRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(23,105,86));
        getWindow().setNavigationBarColor(Color.WHITE);
        webView = new WebView(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            webView.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                Insets ime = windowInsets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return windowInsets;
            });
        } else webView.setFitsSystemWindows(true);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (request == pendingAudioRequest) pendingAudioRequest = null;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                applyFastLoginPatch(view, url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyFastLoginPatch(view, url);
                applyUiPatch(view);
                applyDataSafetyPatch(view, url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    showLoadError("NETWORK " + error.getErrorCode());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request != null && request.isForMainFrame() && response.getStatusCode() >= 400) {
                    showLoadError("HTTP " + response.getStatusCode());
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void applyFastLoginPatch(WebView view, String url) {
        if (url == null || !url.contains("/login.html")) return;
        String js =
            "(()=>{const setup=document.getElementById('setup'),status=document.getElementById('status');"
          + "if(setup)setup.hidden=false;"
          + "if(status&&/확인하는 중|확인 중/.test(status.textContent||''))status.textContent='이름과 4자리 PIN을 바로 입력할 수 있습니다.';"
          + "})();";
        view.evaluateJavascript(js, null);
    }

    private void applyDataSafetyPatch(WebView view, String url) {
        if (url == null || !url.contains("/kmt-sa2/") || url.contains("/login.html")) return;
        String js = new String(
            android.util.Base64.decode("KCgpPT57CiAgY29uc3Qgbm9ybVRleHQ9dj0+U3RyaW5nKHZ8fCcnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1tcc1wtXy8oKS7Ct10vZywnJyk7CiAgY29uc3QgY2FuZGlkYXRlPShyYXcsaW5kZXg9MCk9PnsKICAgIGNvbnN0IHRleHQ9U3RyaW5nKHJhd3x8JycpLnRyaW0oKSwgbj1ub3JtVGV4dCh0ZXh0KTsKICAgIGlmKCF0ZXh0KXJldHVybiBudWxsOwogICAgaWYoL+y2nOqzoOyZhOujjHzrgqntkojsmYTro4x87Lac6rOgXHMq7JmE66OMfOuCqe2SiFxzKuyZhOujjC8udGVzdChuKSlyZXR1cm4ge3Njb3JlOjEwMCxpbmRleCx0eXBlOidERUxJVkVSWScsc3RhdGU6J+y2nOqzoCDsmYTro4wnLHN0YXR1czonQ0xPU0VEJ307CiAgICBpZigv7J6s6rKA7IiYXHMqKD867KeE7ZaJfOynhO2WieykkXzspJEpfOyerOqygOyImOykkS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjg4LGluZGV4LHR5cGU6J0lOU1BFQ1RJT04nLHN0YXRlOifsnqzqsoDsiJgg7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/rp4jqsJDsobDrpr1ccyooPzrsp4Ttlol87KeE7ZaJ7KSRfOykkSl866eI6rCQ7KGw66a97KSRLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6ODgsaW5kZXgsdHlwZTonUFJPR1JFU1MnLHN0YXRlOifrp4jqsJDsobDrpr0g7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/snqzsobDrpr1ccyooPzrsp4Ttlol87KeE7ZaJ7KSRfOykkSl87J6s7KGw66a97KSRLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6OTAsaW5kZXgsdHlwZTonUkVXT1JLJyxzdGF0ZTon7J6s7KGw66a9IOynhO2WiScsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7J6s7J6R7JeFXHMqKD867KeE7ZaJfOynhO2WieykkXzspJEpfOyerOyekeyXheykkS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjkwLGluZGV4LHR5cGU6J1JFV09SSycsc3RhdGU6J+yerOyekeyXhSDsp4TtloknLHN0YXR1czonT1BFTid9OwogICAgaWYoL+yhsOumvVxzKig/OuynhO2WiXzsp4TtlonspJF87KSRKXzsobDrpr3sp4TtlonspJF87KGw66a97KSRLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6ODYsaW5kZXgsdHlwZTonUFJPR1JFU1MnLHN0YXRlOifsobDrpr0g7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/soITsnqVccyooPzrsp4Ttlol87KeE7ZaJ7KSRfOykkSl867Cw7ISgXHMqKD867KeE7ZaJfOynhO2WieykkXzspJEpfOyghOyepeykkS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjg2LGluZGV4LHR5cGU6J1BST0dSRVNTJyxzdGF0ZTon7KCE7J6lIOynhO2WiScsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7ZSE66Gc6re4656oKD8667CNKT9ccyooPzrsp4Ttlol87KeE7ZaJ7KSRfOykkSl87ZSE66Gc6re4656o7KSRLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6ODYsaW5kZXgsdHlwZTonUFJPR1JFU1MnLHN0YXRlOiftlITroZzqt7jrnqgg7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/qsoDsiJhccyooPzrsp4Ttlol87KeE7ZaJ7KSRfOykkSl86rKA7IiY7KeE7ZaJ7KSRfOqygOyImOykkS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjg2LGluZGV4LHR5cGU6J0lOU1BFQ1RJT04nLHN0YXRlOifqsoDsiJgg7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC8oPzrqtazrj5kpP+2FjOyKpO2KuFxzKig/OuynhO2WiXzsp4TtlonspJF87KSRKXzthYzsiqTtirjspJEvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo4NCxpbmRleCx0eXBlOidJTlNQRUNUSU9OJyxzdGF0ZTon7YWM7Iqk7Yq4IOynhO2WiScsc3RhdHVzOidPUEVOJ307CiAgICBpZigv6rCt7IS47YyFXHMqKD867KeE7ZaJfOynhO2WieykkXzspJEpfOqwreyEuO2MheykkS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjg0LGluZGV4LHR5cGU6J1BST0dSRVNTJyxzdGF0ZTon6rCt7IS47YyFIOynhO2WiScsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7J6l67mE7IS47YyFXHMqKD867KeE7ZaJfOynhO2WieykkXzspJEpfOyepeu5hOyFi+2MhVxzKig/OuynhO2WiXzsp4TtlonspJF87KSRKXzshLjtjIXspJF87IWL7YyF7KSRLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6ODQsaW5kZXgsdHlwZTonUFJPR1JFU1MnLHN0YXRlOifsnqXruYTshLjtjIUg7KeE7ZaJJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/tlITroZzqt7jrnqgoPzrrsI0pP1xzKuyImOyglVxzKig/OuuMgOq4sHzrs7TrpZgpLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6NzgsaW5kZXgsdHlwZTonV0FJVCcsc3RhdGU6J+2UhOuhnOq3uOueqCDsiJjsoJXrjIDquLAnLHN0YXR1czonT1BFTid9OwogICAgaWYoL+yerOygnOyekVxzKig/OuyalOyyrXzrjIDquLB87KeE7ZaJ64yA6riwKS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjc0LGluZGV4LHR5cGU6J1JFV09SSycsc3RhdGU6J+yerOygnOyekSDrjIDquLAnLHN0YXR1czonT1BFTid9OwogICAgaWYoL+yerOqwgOqztVxzKig/OuyalOyyrXzrjIDquLApLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6NzQsaW5kZXgsdHlwZTonUkVXT1JLJyxzdGF0ZTon7J6s6rCA6rO1IOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7Lac6rOgXHMqKD8664yA6riwfOuztOulmCl864Kp7ZKIXHMqKD8664yA6riwfOuztOulmCkvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo3NixpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTon7Lac6rOgIOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICBpZigv6rKA7IiYXHMqKD8664yA6riwfOuztOulmCkvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo3NSxpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTon6rKA7IiYIOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7KGw66a9XHMqKD8664yA6riwfOuztOulmCkvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo3NSxpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTon7KGw66a9IOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7KCE7J6lXHMqKD8664yA6riwfOuztOulmCkvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo3NSxpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTon7KCE7J6lIOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICBpZigv7J6F6rOgXHMqKD8664yA6riwfOyngOyXsCl866+47J6F6rOgfOyeheqzoOuMgOq4sC8udGVzdCh0ZXh0KSl7CiAgICAgIGNvbnN0IGNvbXBhY3Q9dGV4dC5yZXBsYWNlKC9ccysvZywnICcpLnJlcGxhY2UoL14uKj9cXVxzKi8sJycpLnRyaW0oKTsKICAgICAgcmV0dXJuIHtzY29yZTo3MixpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTpjb21wYWN0Lmxlbmd0aDw9NDI/Y29tcGFjdDon7J6Q7J6sIOyeheqzoOuMgOq4sCcsc3RhdHVzOidPUEVOJ307CiAgICB9CiAgICBpZigv7J6s6rKA7IiYXHMq7JiI7KCVLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6NTgsaW5kZXgsdHlwZTonSU5TUEVDVElPTicsc3RhdGU6J+yerOqygOyImCDsmIjsoJUnLHN0YXR1czonT1BFTid9OwogICAgaWYoL+qygOyImFxzKuyYiOyglS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjU2LGluZGV4LHR5cGU6J0lOU1BFQ1RJT04nLHN0YXRlOifqsoDsiJgg7JiI7KCVJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC8oPzrqtazrj5kpP+2FjOyKpO2KuFxzKuyYiOyglS8udGVzdCh0ZXh0KSlyZXR1cm4ge3Njb3JlOjU1LGluZGV4LHR5cGU6J0lOU1BFQ1RJT04nLHN0YXRlOifthYzsiqTtirgg7JiI7KCVJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/stpzqs6BccyrsmIjsoJV864Kp7ZKIXHMq7JiI7KCVLy50ZXN0KHRleHQpKXJldHVybiB7c2NvcmU6NTYsaW5kZXgsdHlwZTonUFJPR1JFU1MnLHN0YXRlOifstpzqs6Ag7JiI7KCVJyxzdGF0dXM6J09QRU4nfTsKICAgIGlmKC/snoXqs6BccyrsmIjsoJUvLnRlc3QodGV4dCkpcmV0dXJuIHtzY29yZTo0OCxpbmRleCx0eXBlOidXQUlUJyxzdGF0ZTon7J6Q7J6sIOyeheqzoCDsmIjsoJUnLHN0YXR1czonT1BFTid9OwogICAgY29uc3QgcGFpcnM9WwogICAgICBbL+yerOqygOyImC8sJ+yerOqygOyImCddLFsv66eI6rCQ7KGw66a9Lywn66eI6rCQ7KGw66a9J10sWy/snqzsobDrpr0vLCfsnqzsobDrpr0nXSxbL+qwreyEuO2MhS8sJ+qwreyEuO2MhSddLAogICAgICBbL+2UhOuhnOq3uOueqHztlITroZzqt7jrnpjrsI0vLCftlITroZzqt7jrnqgnXSxbL+yghOyepXzrsLDshKB87KCE6riwLywn7KCE7J6lJ10sWy/qsoDsiJgvLCfqsoDsiJgnXSxbL+q1rOuPme2FjOyKpO2KuHzthYzsiqTtirh87Iuc7ZeYLywn7YWM7Iqk7Yq4J10sCiAgICAgIFsv67O47LK0fOq4sOq1rHztlITroIjsnoR87ISg7KGw66a9fOyhsOumvS8sJ+yhsOumvSddLFsv7Lac6rOgfOuCqe2SiHztj6zsnqUvLCfstpzqs6AnXSxbL+yekOyerHzrtoDtkoh86rCA6rO17ZKIfOyeheqzoC8sJ+yekOyerCddCiAgICBdOwogICAgY29uc3QgcD0ocGFpcnMuZmluZCgoW3JlXSk9PnJlLnRlc3QodGV4dCkpfHxbXSlbMV18fCcnOwogICAgaWYoL+yZhOujjC8udGVzdCh0ZXh0KSYmcClyZXR1cm4ge3Njb3JlOjcwLGluZGV4LHR5cGU6cD09PSfstpzqs6AnPydERUxJVkVSWSc6KFsn6rKA7IiYJywn7J6s6rKA7IiYJywn7YWM7Iqk7Yq4J10uaW5jbHVkZXMocCk/J0lOU1BFQ1RJT04nOidQUk9HUkVTUycpLHN0YXRlOnA9PT0n7Lac6rOgJz8n7Lac6rOgIOyZhOujjCc6cCsnIOyZhOujjCcsc3RhdHVzOnA9PT0n7Lac6rOgJz8nQ0xPU0VEJzonT1BFTid9OwogICAgcmV0dXJuIG51bGw7CiAgfTsKICBjb25zdCBpbnRlcnByZXQ9cmF3PT57CiAgICBjb25zdCBsaW5lcz1TdHJpbmcocmF3fHwnJykuc3BsaXQoL1xyP1xufDsvKS5tYXAodj0+di50cmltKCkpLmZpbHRlcihCb29sZWFuKTsKICAgIGxldCBiZXN0PW51bGwsaGFzSXNzdWU9ZmFsc2U7CiAgICBsaW5lcy5mb3JFYWNoKChsaW5lLGluZGV4KT0+ewogICAgICBpZigv67aI65+JfOydtOyDgXzqsITshK1864iE6529fOusuOygnHzsmKTrpZh87JeQ65+sfOqzoOyepXztjIzshpB87IiY7KCVXHMq7ZWE7JqUfOuCqeq4sFxzKuyImOyglXzsl7DquLAvLnRlc3QobGluZSkpaGFzSXNzdWU9dHJ1ZTsKICAgICAgY29uc3QgYz1jYW5kaWRhdGUobGluZSxpbmRleCk7CiAgICAgIGlmKGMmJighYmVzdHx8Yy5zY29yZT5iZXN0LnNjb3JlfHwoYy5zY29yZT09PWJlc3Quc2NvcmUmJmMuaW5kZXg+YmVzdC5pbmRleCkpKWJlc3Q9YzsKICAgIH0pOwogICAgaWYoYmVzdClyZXR1cm4gey4uLmJlc3QsY2hhbmdlc1N0YXRlOnRydWUsbmF0dXJhbDp0cnVlLGxhYmVsOifsnpDsl7DslrQg7YyQ7KCVIMK3IO2YhOyerOyDge2DnCDihpIgJytiZXN0LnN0YXRlfTsKICAgIGlmKGhhc0lzc3VlKXJldHVybiB7dHlwZTonSVNTVUUnLHN0YXRlOicnLHN0YXR1czonT1BFTicsY2hhbmdlc1N0YXRlOmZhbHNlLG5hdHVyYWw6dHJ1ZSxsYWJlbDon7J6Q7Jew7Ja0IO2MkOyglSDCtyDsnbTsiojrgrTsmqkg7Jew6rKwIMK3IO2YhOyerOyDge2DnCDsnKDsp4AnfTsKICAgIHJldHVybiB7dHlwZTonTk9URScsc3RhdGU6Jycsc3RhdHVzOidPUEVOJyxjaGFuZ2VzU3RhdGU6ZmFsc2UsbmF0dXJhbDp0cnVlLGxhYmVsOifsnpDsl7DslrQg7YyQ7KCVIMK3IOuCtOyaqSDsl7DqsrAgwrcg7ZiE7J6s7IOB7YOcIOycoOyngCd9OwogIH07CiAgd2luZG93LmhmTmF0dXJhbEludGVycHJldD1pbnRlcnByZXQ7CiAgaWYodHlwZW9mIGxhdGVzdFVuaWZpZWRFdmVudEJ5T3JkZXI9PT0nZnVuY3Rpb24nJiYhd2luZG93Ll9faGZPdmVybGF5U2FmZXR5UGF0Y2hlZCl7d2luZG93Ll9faGZPdmVybGF5U2FmZXR5UGF0Y2hlZD10cnVlO3dpbmRvdy5fX2hmVW5zYWZlTGF0ZXN0VW5pZmllZEV2ZW50QnlPcmRlcj1sYXRlc3RVbmlmaWVkRXZlbnRCeU9yZGVyO2xhdGVzdFVuaWZpZWRFdmVudEJ5T3JkZXI9KCk9Pm5ldyBNYXAoKTt9CiAgaWYodHlwZW9mIGNsYXNzaWZ5VW5pZmllZEV2ZW50PT09J2Z1bmN0aW9uJyYmIXdpbmRvdy5fX2hmTmF0dXJhbENsYXNzaWZpZXJQYXRjaGVkKXt3aW5kb3cuX19oZk5hdHVyYWxDbGFzc2lmaWVyUGF0Y2hlZD10cnVlO2NsYXNzaWZ5VW5pZmllZEV2ZW50PXJhdz0+aW50ZXJwcmV0KHJhdyk7fQogIGlmKHR5cGVvZiByZXNvbHZlVW5pZmllZEltcGFjdD09PSdmdW5jdGlvbicmJiF3aW5kb3cuX19oZk5hdHVyYWxJbXBhY3RQYXRjaGVkKXt3aW5kb3cuX19oZk5hdHVyYWxJbXBhY3RQYXRjaGVkPXRydWU7cmVzb2x2ZVVuaWZpZWRJbXBhY3Q9KGN1cnJlbnQsY2xhc3NpZmljYXRpb24sYm9keVRleHQpPT57Y29uc3QgY3VycmVudFN0YXRlPVN0cmluZyhjdXJyZW50Py5zdGF0ZXx8JycpLGN1cnJlbnROZXh0PVN0cmluZyhjdXJyZW50Py5uZXh0QWN0aW9ufHwnJyk7aWYoIWNsYXNzaWZpY2F0aW9uPy5jaGFuZ2VzU3RhdGUpcmV0dXJuIHsuLi5jbGFzc2lmaWNhdGlvbixlZmZlY3RpdmVTdGF0ZTpjdXJyZW50U3RhdGUsZWZmZWN0aXZlTmV4dDpjdXJyZW50TmV4dCxsYWJlbDpjbGFzc2lmaWNhdGlvbj8ubGFiZWx8fCftmITsnqzsg4Htg5wg7Jyg7KeAJ307cmV0dXJuIHsuLi5jbGFzc2lmaWNhdGlvbixlZmZlY3RpdmVTdGF0ZTpjbGFzc2lmaWNhdGlvbi5zdGF0ZSxlZmZlY3RpdmVOZXh0OmNsYXNzaWZpY2F0aW9uLnN0YXR1cz09PSdDTE9TRUQnPycnOmN1cnJlbnROZXh0LGxhYmVsOmNsYXNzaWZpY2F0aW9uLmxhYmVsfTt9O30KICBjb25zdCBsYXRlc3ROb3Rlcz0oKT0+e2NvbnN0IG91dD1uZXcgTWFwKCk7dHJ5e2lmKHR5cGVvZiBub3RlcyE9PSdmdW5jdGlvbicpcmV0dXJuIG91dDtub3RlcygpLmZvckVhY2gocj0+e2lmKCFyfHwhci5ldmVudFR5cGV8fFsnZHJhZnQnLCdyZWplY3RlZCcsJ3NlbmRpbmcnLCd1bmtub3duJ10uaW5jbHVkZXMoU3RyaW5nKHIuc3RhdHVzfHwnJykpKXJldHVybjtjb25zdCBvcmRlcklkPVN0cmluZyhyLm9yZGVySWR8fCcnKS50cmltKCk7aWYoIW9yZGVySWQpcmV0dXJuO2NvbnN0IGF0PURhdGUucGFyc2Uoci5yZXNwb25kZWRBdHx8ci51cGRhdGVkQXR8fHIuY3JlYXRlZEF0fHwwKXx8MDtjb25zdCBwcmV2PW91dC5nZXQob3JkZXJJZCkscHQ9cHJldj8oRGF0ZS5wYXJzZShwcmV2LnJlc3BvbmRlZEF0fHxwcmV2LnVwZGF0ZWRBdHx8cHJldi5jcmVhdGVkQXR8fDApfHwwKTowO2lmKCFwcmV2fHxhdD49cHQpb3V0LnNldChvcmRlcklkLHIpO30pO31jYXRjaChfKXt9cmV0dXJuIG91dDt9OwogIGlmKHR5cGVvZiBvcGVyYXRpb25hbFJvd3M9PT0nZnVuY3Rpb24nJiYhd2luZG93Ll9faGZPcGVyYXRpb25hbE5hdHVyYWxQYXRjaGVkKXt3aW5kb3cuX19oZk9wZXJhdGlvbmFsTmF0dXJhbFBhdGNoZWQ9dHJ1ZTtjb25zdCBiYXNlUm93cz1vcGVyYXRpb25hbFJvd3M7b3BlcmF0aW9uYWxSb3dzPWZ1bmN0aW9uKGluY2x1ZGVDb21wbGV0ZWQ9dHJ1ZSl7Y29uc3Qgcm93cz1iYXNlUm93cyhpbmNsdWRlQ29tcGxldGVkKSxsb2NhbD1sYXRlc3ROb3RlcygpO3JldHVybiByb3dzLm1hcCh4PT57Y29uc3Qgcj1sb2NhbC5nZXQoU3RyaW5nKHgub3JkZXJJZHx8JycpKSxzZXJ2ZXJJc3N1ZT1TdHJpbmcoeC5yZWNlbnRFdmVudHx8eC5jYXVzZXx8JycpLnRyaW0oKTtpZighcilyZXR1cm4gey4uLngsY2F1c2U6c2VydmVySXNzdWV8fFN0cmluZyh4LmNhdXNlfHwnJykscmVjZW50RXZlbnQ6c2VydmVySXNzdWV8fFN0cmluZyh4LnJlY2VudEV2ZW50fHwnJyl9O2NvbnN0IHJhdz1TdHJpbmcoci50ZXh0fHwnJykudHJpbSgpLGludGVycD1pbnRlcnByZXQocmF3KTtjb25zdCBub3RlQXQ9RGF0ZS5wYXJzZShyLnJlc3BvbmRlZEF0fHxyLnVwZGF0ZWRBdHx8ci5jcmVhdGVkQXR8fDApfHwwO2NvbnN0IHNvdXJjZUF0PURhdGUucGFyc2UoeC5zb3VyY2VMYXRlc3RVcGRhdGV8fHgudXBkYXRlZEF0fHwwKXx8MDtjb25zdCB1c2VTdGF0ZT1pbnRlcnAuY2hhbmdlc1N0YXRlJiZub3RlQXQ+PXNvdXJjZUF0O3JldHVybiB7Li4ueCxjYXVzZTpyYXd8fHNlcnZlcklzc3VlLHJlY2VudEV2ZW50OnJhd3x8c2VydmVySXNzdWUscmVjZW50RXZlbnRBdDpyLnJlc3BvbmRlZEF0fHxyLnVwZGF0ZWRBdHx8ci5jcmVhdGVkQXR8fHgucmVjZW50RXZlbnRBdHx8Jycsc3RhdGU6dXNlU3RhdGU/aW50ZXJwLnN0YXRlOnguc3RhdGV9O30pO307fQogIGlmKHR5cGVvZiBhcHBseVByb2plY3RNZXRhPT09J2Z1bmN0aW9uJyYmIXdpbmRvdy5fX2hmTWV0YUlzc3VlUGF0Y2hlZCl7d2luZG93Ll9faGZNZXRhSXNzdWVQYXRjaGVkPXRydWU7Y29uc3QgYmFzZU1ldGE9YXBwbHlQcm9qZWN0TWV0YTthcHBseVByb2plY3RNZXRhPWZ1bmN0aW9uKHByb2plY3RzLHNvdXJjZSl7Y29uc3QgcmVzdWx0PWJhc2VNZXRhKHByb2plY3RzLHNvdXJjZSk7dHJ5e2lmKHNvdXJjZT09PSdjb3JlJyYmQXJyYXkuaXNBcnJheShwcm9qZWN0cykmJnR5cGVvZiBpdGVtcyE9PSd1bmRlZmluZWQnKXtjb25zdCBtYXA9bmV3IE1hcChwcm9qZWN0cy5tYXAocD0+W1N0cmluZyhwLm9yZGVySWR8fCcnKSxwXSkpO2l0ZW1zPWl0ZW1zLm1hcCgoeCxpZCk9Pntjb25zdCBwPW1hcC5nZXQoU3RyaW5nKHgub3JkZXJJZHx8JycpKTtpZighcClyZXR1cm4gey4uLngsaWR9O2NvbnN0IHJlY2VudD1TdHJpbmcocC5yZWNlbnRFdmVudHx8cC5jdXJyZW50SXNzdWV8fCcnKS50cmltKCk7cmV0dXJuIHJlY2VudD97Li4ueCxjYXVzZTpyZWNlbnQscmVjZW50RXZlbnQ6cmVjZW50LHJlY2VudEV2ZW50QXQ6U3RyaW5nKHAucmVjZW50RXZlbnRBdHx8JycpLGlkfTp7Li4ueCxpZH07fSk7fX1jYXRjaChfKXt9cmV0dXJuIHJlc3VsdDt9O30KICBpZih0eXBlb2YgYXBpPT09J2Z1bmN0aW9uJyYmIXdpbmRvdy5fX2hmQXBpU2FmZXR5UGF0Y2hlZCl7d2luZG93Ll9faGZBcGlTYWZldHlQYXRjaGVkPXRydWU7Y29uc3Qgb3JpZ2luYWxBcGk9YXBpO2FwaT1hc3luYyBmdW5jdGlvbihwYXRoLGJvZHksdGltZW91dCl7bGV0IG5leHQ9Ym9keTtpZihwYXRoPT09Jy9hcGkvc2EyLXdyaXRlJyYmYm9keSYmU3RyaW5nKGJvZHkuc291cmNlfHwnJykuaW5jbHVkZXMoJ1VOSUZJRURfRVZFTlQnKSYmYm9keS50YXJnZXRIaW50JiZib2R5LnRleHQpe2NvbnN0IHRhcmdldD1TdHJpbmcoYm9keS50YXJnZXRIaW50fHwnJykudHJpbSgpO2xldCBwYXJ0cz1TdHJpbmcoYm9keS50ZXh0fHwnJykuc3BsaXQoL1xyP1xufDsvKS5tYXAodj0+di50cmltKCkpLmZpbHRlcihCb29sZWFuKTtpZihwYXJ0cy5sZW5ndGgmJnBhcnRzWzBdLnN0YXJ0c1dpdGgodGFyZ2V0KSl7bGV0IGZpcnN0PXBhcnRzWzBdLnNsaWNlKHRhcmdldC5sZW5ndGgpLnRyaW0oKTtpZihmaXJzdC5zdGFydHNXaXRoKCdbJykpe2NvbnN0IGs9Zmlyc3QuaW5kZXhPZignXScpO2lmKGs+PTApZmlyc3Q9Zmlyc3Quc2xpY2UoaysxKS50cmltKCk7fXBhcnRzWzBdPWZpcnN0O31wYXJ0cz1wYXJ0cy5maWx0ZXIoQm9vbGVhbik7bmV4dD17Li4uYm9keSx0ZXh0OnBhcnRzLm1hcChsaW5lPT50YXJnZXQrJyAnK2xpbmUpLmpvaW4oJ1xuJyl9O31yZXR1cm4gb3JpZ2luYWxBcGkocGF0aCxuZXh0LHRpbWVvdXQpO307fQogIGNvbnN0IGxpbmtlZElzc3VlRm9yT3JkZXI9b3JkZXJJZD0+e3RyeXtjb25zdCByb3c9dHlwZW9mIG9wZXJhdGlvbmFsUm93cz09PSdmdW5jdGlvbic/b3BlcmF0aW9uYWxSb3dzKHRydWUpLmZpbmQoeD0+U3RyaW5nKHgub3JkZXJJZHx8JycpPT09U3RyaW5nKG9yZGVySWR8fCcnKSk6bnVsbDtyZXR1cm4gcm93P1N0cmluZyhyb3cucmVjZW50RXZlbnR8fHJvdy5jYXVzZXx8JycpLnRyaW0oKTonJzt9Y2F0Y2goXyl7cmV0dXJuICcnO319OwogIGNvbnN0IGRlY29yYXRlUHJvamVjdD0oKT0+e3RyeXtjb25zdCBvdmVydmlldz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE92ZXJ2aWV3Jyk7aWYoIW92ZXJ2aWV3KXJldHVybjtjb25zdCBzbWFsbD1vdmVydmlldy5xdWVyeVNlbGVjdG9yKCcuaHlicmlkLXByb2plY3QtY2FyZD5zbWFsbCcpO2NvbnN0IG09U3RyaW5nKHNtYWxsPy50ZXh0Q29udGVudHx8JycpLm1hdGNoKC9KT0IgTk9cLlxzKihbXsK3XHNdKykvKTtjb25zdCBvcmRlcklkPW0/LlsxXXx8Jyc7aWYoIW9yZGVySWQpcmV0dXJuO2NvbnN0IHRleHQ9bGlua2VkSXNzdWVGb3JPcmRlcihvcmRlcklkKSxjYXJkPW92ZXJ2aWV3LnF1ZXJ5U2VsZWN0b3IoJy5oeWJyaWQtcHJvamVjdC1jYXJkJyksc3RhdGU9Y2FyZD8ucXVlcnlTZWxlY3RvcignLmh5YnJpZC1zdGF0ZScpO2xldCBib3g9Y2FyZD8ucXVlcnlTZWxlY3RvcignLmhmLW5hdGl2ZS1saW5rZWQtaXNzdWUnKTtpZighdGV4dCl7Ym94Py5yZW1vdmUoKTtyZXR1cm47fWlmKCFib3gpe2JveD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtib3guY2xhc3NOYW1lPSdoZi1uYXRpdmUtbGlua2VkLWlzc3VlJztib3guaW5uZXJIVE1MPSc8c21hbGw+7LWc6re8IOydtOyKiC/sp4Ttlok8L3NtYWxsPjxwPjwvcD4nO3N0YXRlPy5hZnRlcihib3gpO31jb25zdCBwPWJveC5xdWVyeVNlbGVjdG9yKCdwJyk7aWYocClwLnRleHRDb250ZW50PXRleHQ7fWNhdGNoKF8pe319OwogIGlmKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGZOYXR1cmFsSXNzdWVTdHlsZScpKXtjb25zdCBzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7cy5pZD0naGZOYXR1cmFsSXNzdWVTdHlsZSc7cy50ZXh0Q29udGVudD0nLmhmLW5hdGl2ZS1saW5rZWQtaXNzdWV7bWFyZ2luLXRvcDo5cHg7cGFkZGluZzo5cHggMTBweDtib3JkZXItcmFkaXVzOjlweDtiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjEyKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsLjEyKX0uaGYtbmF0aXZlLWxpbmtlZC1pc3N1ZSBzbWFsbHtkaXNwbGF5OmJsb2NrO2NvbG9yOiNiOWNiZDQ7Zm9udC1zaXplOjhweDtmb250LXdlaWdodDo5MDA7bWFyZ2luLWJvdHRvbTo0cHh9LmhmLW5hdGl2ZS1saW5rZWQtaXNzdWUgcHttYXJnaW46MCFpbXBvcnRhbnQ7Y29sb3I6I2ZmZiFpbXBvcnRhbnQ7Zm9udC1zaXplOjEwcHghaW1wb3J0YW50O2xpbmUtaGVpZ2h0OjEuNTUhaW1wb3J0YW50O3doaXRlLXNwYWNlOnByZS1saW5lO292ZXJmbG93LXdyYXA6YW55d2hlcmV9Jztkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHMpO30KICBpZighd2luZG93Ll9faGZOYXR1cmFsT2JzZXJ2ZXIpe3dpbmRvdy5fX2hmTmF0dXJhbE9ic2VydmVyPW5ldyBNdXRhdGlvbk9ic2VydmVyKCgpPT5kZWNvcmF0ZVByb2plY3QoKSk7d2luZG93Ll9faGZOYXR1cmFsT2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LHtjaGlsZExpc3Q6dHJ1ZSxzdWJ0cmVlOnRydWV9KTt9CiAgaWYoIXdpbmRvdy5fX2hmTmF0dXJhbFJlcmVuZGVyZWQmJnR5cGVvZiBzY3JlZW49PT0nc3RyaW5nJyl7d2luZG93Ll9faGZOYXR1cmFsUmVyZW5kZXJlZD10cnVlO3NldFRpbWVvdXQoKCk9Pnt0cnl7aWYoc2NyZWVuPT09J2hvbWUnJiZ0eXBlb2YgaG9tZT09PSdmdW5jdGlvbicpaG9tZSgpO2Vsc2UgaWYoc2NyZWVuPT09J3BsYW4nJiZ0eXBlb2YgcHJvZHVjdGlvblBsYW49PT0nZnVuY3Rpb24nKXByb2R1Y3Rpb25QbGFuKHR5cGVvZiBwcm9kdWN0aW9uUGxhbk1vZGU9PT0nc3RyaW5nJz9wcm9kdWN0aW9uUGxhbk1vZGU6J3BsYW4nLHRydWUpO2Vsc2UgaWYoc2NyZWVuPT09J3Byb2plY3RzJyYmdHlwZW9mIHByb2plY3RzPT09J2Z1bmN0aW9uJylwcm9qZWN0cyh0eXBlb2YgZmlsdGVyPT09J3N0cmluZyc/ZmlsdGVyOidhY3RpdmUnLHRydWUpO2Vsc2UgaWYoc2NyZWVuPT09J2lzc3VlcycmJnR5cGVvZiB0b2RheUlzc3Vlcz09PSdmdW5jdGlvbicpdG9kYXlJc3N1ZXMoKTtkZWNvcmF0ZVByb2plY3QoKTt9Y2F0Y2goXyl7fX0sMTAwKTt9CiAgc2V0VGltZW91dChkZWNvcmF0ZVByb2plY3QsMzUwKTtzZXRUaW1lb3V0KGRlY29yYXRlUHJvamVjdCwxMDAwKTsKfSkoKQ==", android.util.Base64.DEFAULT),
            java.nio.charset.StandardCharsets.UTF_8
        );
        view.evaluateJavascript(js, null);
    }

    private void applyUiPatch(WebView view) {');"
          + "const firstRe=new RegExp('^'+escRe(target)+'\\\\s*\\\\[[^\\\\]]+\\\\]\\\\s*');const parts=raw.split(/\\r?\\n|;/).map(v=>v.trim()).filter(Boolean);if(parts.length){parts[0]=parts[0].replace(firstRe,'').trim();}"
          + "const safe=parts.filter(Boolean).map(line=>target+' '+line).join('\\n');next={...body,text:safe};}"
          + "return originalApi(path,next,timeout);};"
          + "}"
          + "if(!window.__hfSafetyRerendered&&typeof screen==='string'){window.__hfSafetyRerendered=true;setTimeout(()=>{try{if(screen==='home'&&typeof home==='function')home();else if(screen==='plan'&&typeof productionPlan==='function')productionPlan(typeof productionPlanMode==='string'?productionPlanMode:'plan',true);else if(screen==='projects'&&typeof projects==='function')projects(typeof filter==='string'?filter:'active',true);else if(screen==='issues'&&typeof todayIssues==='function')todayIssues();}catch(_){ }},80);}"
          + "}catch(_){ }"
          + "};patch();setTimeout(patch,300);setTimeout(patch,900);})();";
        view.evaluateJavascript(js, null);
    }

    private void applyUiPatch(WebView view) {
        String js =
            "(()=>{"
          + "const place=()=>{"
          + "const demo=document.querySelector('.demo'),nav=document.querySelector('.bottom');if(!demo||!nav)return;"
          + "let status=document.querySelector('.hf-native-connection');if(!status){status=document.createElement('div');status.className='hf-native-connection';}"
          + "const span=demo.querySelector('span');if(span)status.replaceChildren(span);"
          + "demo.after(status);status.after(nav);"
          + "document.querySelector('.top > button[aria-label=\\\"처리함 열기\\\"]')?.remove();"
          + "const p=[...document.querySelectorAll('.top > button.icon')].find(b=>b.getAttribute('aria-label')!=='처리함 열기');"
          + "if(p){p.textContent='로그인';p.setAttribute('aria-label','로그인');p.onclick=()=>location.href='./login.html';}"
          + "const brand=document.querySelector('.kmt-brand small');if(brand)brand.style.whiteSpace='nowrap';"
          + "};"
          + "let s=document.getElementById('hfNativeUiPatch');"
          + "if(!s){s=document.createElement('style');s.id='hfNativeUiPatch';"
          + "s.textContent='.demo{display:block!important;margin:0 17px!important;padding:8px 0 6px!important;border-bottom:0!important}.demo>b{display:block!important}.hf-native-connection{margin:0 17px 8px;padding:2px 0 8px;border-bottom:1px solid #d9dfe2;color:#66737c;font-size:10px;line-height:1.35}.bottom{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;width:calc(100% - 28px)!important;min-height:68px!important;margin:0 14px 6px!important;z-index:4!important}.app{padding-bottom:100px!important}main{padding-bottom:84px!important}.hybrid-voice-fab{bottom:18px!important;right:16px!important}.kmt-brand small{white-space:nowrap!important;letter-spacing:0!important}.top>button.icon{min-width:58px!important;width:auto!important;padding:0 10px!important;font-size:11px!important;font-weight:800!important}';"
          + "document.head.appendChild(s);}"
          + "const demo=document.querySelector('.demo');"
          + "if(demo&&!window.__hfTopNavObserver){window.__hfTopNavObserver=new MutationObserver(()=>place());window.__hfTopNavObserver.observe(demo,{childList:true});}"
          + "place();setTimeout(place,350);setTimeout(place,1000);"
          + "})();";
        view.evaluateJavascript(js, null);
    }

    private boolean isTrustedOrigin(Uri origin) {
        Uri app = Uri.parse(APP_URL);
        return origin != null && "https".equalsIgnoreCase(origin.getScheme())
            && app.getHost() != null && app.getHost().equalsIgnoreCase(origin.getHost());
    }

    private void handleWebPermission(PermissionRequest request) {
        if (!isTrustedOrigin(request.getOrigin())) { request.deny(); return; }
        boolean audioOnly = request.getResources().length == 1
            && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(request.getResources()[0]);
        if (!audioOnly) { request.deny(); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingAudioRequest = request;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != AUDIO_PERMISSION_REQUEST || pendingAudioRequest == null) return;
        PermissionRequest request = pendingAudioRequest;
        pendingAudioRequest = null;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else request.deny();
    }

    private void showLoadError(String code) {
        String html = "<html><body style='font-family:sans-serif;padding:28px'>"
            + "<h2>HandsFree 연결 오류</h2>"
            + "<p>" + code + "</p>"
            + "<button style='font-size:18px;padding:12px 18px' onclick=\"location.href='" + APP_URL + "'\">다시 연결</button>"
            + "</body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true}return false})()", value -> {
                if (!"true".equals(value)) navigateBackOrFinish();
            });
            return;
        }
        super.onBackPressed();
    }

    private void navigateBackOrFinish() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
