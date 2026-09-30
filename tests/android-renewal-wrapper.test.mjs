import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=new URL('../android-renewal/',import.meta.url);
const manifest=fs.readFileSync(new URL('app/src/main/AndroidManifest.xml',base),'utf8');
const main=fs.readFileSync(new URL('app/src/main/java/com/handsfree/mobile/MainActivity.java',base),'utf8');
const gradle=fs.readFileSync(new URL('app/build.gradle',base),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/build-renewal-apk.yml',import.meta.url),'utf8');
const companyLogo=new URL('app/src/main/res/drawable/kmt_company_logo.png',base);

assert.match(manifest,/android\.permission\.RECORD_AUDIO/);
assert.match(manifest,/@drawable\/ic_handsfree/);
assert.match(gradle,/applicationId 'com\.handsfree\.renewal'/);
assert.match(gradle,/handsfree-renewal\/\?app=renewal03/);
assert.match(gradle,/versionName '0\.3\.0'/);
assert.match(gradle,/핸즈프리 리뉴얼/);
assert.match(main,/package com\.handsfree\.renewal/);
assert.match(main,/isTrustedOrigin/);
assert.match(workflow,/HandsFree-Renewal-0\.3-Preview\.apk/);
assert.ok(fs.statSync(companyLogo).size>1000);
console.log('PASS Renewal has a separate package, KMT icon, fixed Preview URL, audio permission and APK lane');
