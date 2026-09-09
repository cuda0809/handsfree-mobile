# HandsFree Mobile Release Pipeline

Status: structure prepared only. Play Console publication is intentionally deferred.

## Operating rule
- UI baseline remains Alpha 03 unless a deliberate migration is approved.
- Normal feature changes continue through the fixed web/PWA URL.
- Android APK/AAB is a wrapper/distribution layer; it should not require reinstallation for ordinary web UI/data updates.
- If Android-native behavior changes, increment `versionCode` and `versionName` before a new store build.

## Package identity
- Android applicationId: `com.handsfree.mobile`
- Current versionCode: `1`
- Current versionName: `0.3.0`
- Keep the applicationId permanent so future updates install over the same app.

## Release signing policy
Never commit the keystore or passwords to Git.

The manual workflow `.github/workflows/build-release-aab.yml` expects these GitHub Actions secrets:
- `HF_RELEASE_KEYSTORE_BASE64` — base64-encoded release keystore file
- `HF_RELEASE_STORE_PASSWORD`
- `HF_RELEASE_KEY_ALIAS`
- `HF_RELEASE_KEY_PASSWORD`

The release keystore must be backed up securely outside the repository. Losing the signing key can prevent future direct-signed updates unless Play App Signing has already taken over the app-signing key flow.

## Current build lanes
1. `Build HandsFree APK` — debug/test APK. Existing test path; not for trusted company-wide distribution.
2. `Build HandsFree Release AAB` — manual-only release bundle path. It will not run successfully until the four signing secrets above are configured.

## Resume checklist for later
1. Create a dedicated HandsFree upload/release keystore and back it up securely.
2. Add the four signing secrets to GitHub Actions.
3. Increment Android version values if needed.
4. Manually run `Build HandsFree Release AAB` and verify the artifact.
5. Create/verify a Google Play Console developer account.
6. Create the app with package `com.handsfree.mobile`.
7. Enable Play App Signing and confirm the key model before first production/internal-test upload.
8. Upload the generated `HandsFree-Mobile-Release.aab` to Internal testing.
9. Add tester Google accounts / testing group.
10. Install from the Play internal-test link and verify update behavior, WebView/PWA behavior, navigation, Grow command surface, and HandsFree backend connectivity.

## Do not do yet
- Do not create or expose signing passwords in chat or source files.
- Do not upload the current debug APK to Play as the release artifact.
- Do not change `com.handsfree.mobile` casually.
- Do not replace the release keystore after store distribution begins without planning the key-migration path.
- Do not publish to Production before internal testing is stable.
