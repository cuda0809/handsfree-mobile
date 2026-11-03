import fs from 'node:fs';
import assert from 'node:assert/strict';

const manifest=fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../android/app/src/main/java/com/handsfree/mobile/MainActivity.java',import.meta.url),'utf8');
const gradle=fs.readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/build-apk.yml',import.meta.url),'utf8');
const icon=fs.readFileSync(new URL('../android/app/src/main/res/drawable/ic_handsfree.xml',import.meta.url),'utf8');
const companyLogo=new URL('../android/app/src/main/res/drawable/kmt_company_logo.png',import.meta.url);

assert.match(manifest,/android\.permission\.RECORD_AUDIO/);
assert.match(manifest,/android:allowBackup="false"/);
assert.match(manifest,/android:windowSoftInputMode="adjustResize"/);
assert.match(manifest,/@drawable\/ic_handsfree/);
assert.match(gradle,/applicationId 'com\.handsfree\.mobile'/);
assert.match(gradle,/applicationIdSuffix '\.preview'/);
assert.match(gradle,/buildConfigField 'String', 'APP_URL'/);
assert.match(main,/isTrustedOrigin/);
assert.match(main,/requestPermissions\(new String\[\]\{Manifest\.permission\.RECORD_AUDIO\}/);
assert.match(main,/setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/);
assert.match(main,/setDecorFitsSystemWindows\(false\)/);
assert.match(main,/WindowInsets\.Type\.ime\(\)/);
assert.match(main,/document\.querySelector\('dialog\[open\]'/);
assert.match(workflow,/sa283preview/);
assert.match(workflow,/HandsFree-REAL-SA2\.8\.3-Preview\.apk/);
assert.match(icon,/@drawable\/kmt_company_logo/);
assert.ok(fs.statSync(companyLogo).size>1000);
console.log('PASS Android stable identity, SA2.8.3 preview lane, company-logo icon, audio permission, backup lock, trusted origin and dialog back handling');
