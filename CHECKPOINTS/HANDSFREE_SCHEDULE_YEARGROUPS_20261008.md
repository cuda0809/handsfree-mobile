# HandsFree 최신 합의 반영 체크포인트 — 2026-10-08

STATUS: PARTIAL. 운영DB 수정·재조회 및 로컬 화면 검증 완료. 원격 코드 업로드와 앱 배포 미완료.

## 적용한 승인 내용
- 260728A-064 / PRJ-00163: 검수 2026-10-16, 출고 계획 2026-10-19. 고객 납기는 이번 요청에서 변경하지 않음.
- 260714A-054 / PRJ-00146: 고객 납기와 출고 계획 2026-10-21.
- 현재 상태 표시는 공통 currentStatusLabel, 일정은 동일한 operationalRows/plan resolver 사용.
- 이전 계획은 삭제하지 않고 planHistory로 보존, 라이프사이클에 변경 전 계획 표시.
- 프로젝트와 납기·출고 화면의 완료 목록: JOB NO. 연도 기준 2026년 펼침, 이전 연도 접음. 검색 결과는 전체 연도 펼침. 연도 미확인 장비는 별도 접음. 분할 JOB은 개별 유지.

## 운영DB 실제 변경
대상: HandsFree_REAL_운영DB_현재본 (1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM).
- HF_DATA_계획원장!A2690:P2706: 승인된 17개 새 snapshot 행. revision 20261008T010000KST. 기존 54번·64번 snapshot 행과 원본 계획 행을 모두 유지.
- HF_CORE_통합운영!G147: 26/ 10/ 14 → 2026-10-21.
- HF_CORE_통합운영!AK147: 2026-10-14 → 2026-10-21.
- 64번 기존 검수/출고 계획 10/01·10/02는 이전 snapshot에서 보존. 새 snapshot에는 10/16·10/19만 현재 계획으로 선택.
- 실제출고일과 완료 상태는 수정하지 않음. Project_ID 유지.
- 새 17행을 정확히 재조회 비교했고, 64번 이전 날짜 10/01·10/02·10/16·10/19 보존 확인.

## 코드와 검증
- 기존 작업폴더: /workspace/scratch/ae6248421864/handsfree-mobile. 기존 미커밋 수정분을 보존.
- 별도 release worktree: /workspace/scratch/8ccd03748371/handsfree-release.
- 기준: 기존 최신 Preview a121bdd14fcdaef1136a1e4eae198dc26113837d. 운영 Production은 확인 당시 a6c591b16107cc655a6663bea077a4345954ff34.
- 작업 브랜치: task/schedule-yeargroups-release-20261008.
- 코드 commit: 5286ddf.
- 변경: kmt-sa2/app-flow.js, production-rules.js, index.html, sw.js; tests/completed-year-groups.test.mjs, page-detail-context.test.mjs.
- 관련 41개 테스트 PASS. 상태/7공정/마감계획/계획 조회/실패 보존/READ 재시도·대기/연도별 검색과 이력 보존.
- 재조회한 수정 데이터를 기존 데이터 fixture에 연결한 전체 렌더 검증: B팀 75개, 오늘·계획·이슈·프로젝트 4화면 렌더 성공. 64/54 상세 일정과 다음 행동 확인.
- 완료 목록 렌더: 2026년 JOB 21개 펼침, 2025년 JOB 20개 접음, 연도 미확인 1개 접음.
- node syntax 및 git diff --check PASS.
- 전체 과거 테스트 시도: 119/135 PASS, 16개 FAIL. 오래된 VM fixture의 누락된 함수와 과거 계약에 대한 소스 문자열 검사, API transport mock 문제 등이 포함되어 전체 PASS로 보고하지 않음.
- 실제 브라우저 검증 미완료: 로컬 브라우저 실행 불가; 설치 다운로드가 유효 zip이 아니어서 반복 설치를 중단. VM 검증을 실제 브라우저·인증 검증으로 주장하지 않음.

## 차단 및 남은 작업
자동 승인 검토가 git push를 차단함. 이유: 사용자의 구현 지시는 확인되지만 cuda0809/handsfree-mobile 원격으로 코드를 보내는 명시적 승인 미확인. 다른 connector/배포 경로로 우회하지 않음.
코드는 로컬 commit으로 보존됐으며 새 브랜치 업로드와 Preview/Production 배포는 완료되지 않음.
운영DB 현재값은 수정했지만, 이후 원본 생산DB 수집기가 54번 납기를 덮어쓰는지는 미검증. 사용자 승인 일정 snapshot과 원본 수집의 우선순위를 후속 운영 확인해야 함.
앱 Script 코드 배포·인증 실데이터 앱 전체 E2E는 이번 작업 완료로 주장하지 않음.

NEXT: 사용자에게 해당 저장소 코드 업로드 및 기존 앱 주소 반영 승인을 받아 push → 배포 검증 → 고정 앱 주소 반영. 동일 수정본으로 진행하며 운영DB 신규 행을 중복 추가하지 않는다.

ROLLBACK: UI는 a121bdd 기준으로 되돌릴 수 있음. 운영DB 롤백이 필요하면 이전 snapshot을 보존한 채 새 superseding revision을 추가하고 G147/AK147의 위 원래값으로 복원하되, 다른 최신 변경 여부를 먼저 확인. 현재 rollback 실행하지 않음.

## 2026-10-08 사용자 승인 후 배포 완료
사용자가 GitHub 코드 업로드와 기존 앱 배포에 “어 해”로 명시 승인.
Git CLI는 자격증명 부재로 실패하여 승인된 GitHub connector로 동일 tree 업로드.
- 원격 commit: 9a48629718f97fe72f4c5340bcf3039899f4dcbc (local HEAD와 동일 tree).
- 원격 branch: task/schedule-yeargroups-release-20261008.
- Preview: dpl_3WznyBrHEXKYjeP31Gkc7bANnBiu READY.
- Production: dpl_8sjXuHfP4Q7mn34Pgts1CF7ttWpS READY, aliasError null.
- 고정 alias: handsfree-mobile-alpha-02.vercel.app, 동일 원격 commit 반영.
- 실제 브라우저 /kmt-sa2/ 화면 로드와 script revision 20261008j1 확인.
- 관련 8개 테스트 파일 재검증 32/32 PASS, git diff --check PASS.
- 브라우저 미로그인으로 인증된 실데이터 전체 흐름 미검증. 화면의 확인 불가는 미인증 상태이며 로그인 후 데이터 정상으로 주장하지 않음.
- 운영DB 중복 변경 없음. main 변경 없음.
- rollback deployment: dpl_EcG4GWc9Rs4U5NCgnnspZsu6F1ks (a6c591b).
배포 상태 COMPLETE. 전체 앱 E2E 상태 PARTIAL.

## 오늘 요약 버튼 목록 필터 수정
현재/우선/완료 클릭 시 오늘 화면에서 선택 집합만 표시. 현재는 진행 중+작업 예정, 우선은 미완료·비재고 P1, 완료는 출고완료. 전체 보기로 복귀. 완료 목록은 공통 JOB-year 그룹 사용: 올해 open, 과거 collapsed, 검색 전체 연도.
변경: app-flow.js, index.html, sw.js, status-consistency.test.mjs. revision 20261008j2.
검증: syntax/diff PASS; 관련 16/16 tests PASS. 실제 Preview 브라우저 현재/완료 클릭과 오늘 선택 목록 유지 확인. 미로그인으로 실데이터 렌더 미검증.
원격 commit 3221cee776668b07a103feb9a3d765dd471206bd, branch task/today-stat-filter-20261008. Production deployment dpl_ENFiAtBLJPCq1UAWj5DjiNcQML8y.
Rollback: dpl_8sjXuHfP4Q7mn34Pgts1CF7ttWpS. 운영DB 변경 없음.

2026-10-08 clarification: Today current excludes planned; completed defaults current JOB year only, historical results available via search. Commit 7c898630f19837db1ffadeb1a1619d8a1b43554f; deployment dpl_EMi2bTeP6Eidw6E5HpYSW4dxWPqV; asset revision 20261008j3. Related 13 tests PASS. No DB changes.

Today selected cards navigation removed: article cards with no onclick/detail handler. Current/urgent/completed buttons only switch local Today card list. Completed defaults current JOB year. 13 tests PASS. Remote d5877ed539503a178023fb0548f44c60e12ae9e1, deployment dpl_CnozTr1JFuBHkLch7xaz4e8ehfZ9, asset 20261008j4.

## PC installer routing discrepancy confirmed and corrected
KMT_HandsFree_PC_Setup_1.0.0.exe in saved zip embeds https://handsfree-mobile-alpha-02-git-codex-real-l-fbac1c-cuda0809-8210.vercel.app/kmt-sa2/?app=mobile. Browser on that exact address reproduced productionPlan()/projects(urgent)/projects(completed), identical to user report and MOBILE15 display. Recent MOBILE10 shortcut zip instead uses root production address; do not assume it is the installed executable.
Assigned existing installed-app alias to dpl_CnozTr1JFuBHkLch7xaz4e8ehfZ9, previously dpl_BdRHZB2pStUbjhSvqtDFNQFuMAHf. No new build, no redirect, same origin preserved. After reload exact installer address has homeStat current/urgent/completed and each click keeps Today subset region, no page navigation. Unauthenticated browser only: full live data still unverified. User must reload existing app for new JavaScript. Rollback alias to previous deployment above if necessary.

## Final installed-address release with original environment scope
Previous alias change to Production caused user connection regression; restored previous dpl_BdRHZB2pStUbjhSvqtDFNQFuMAHf. New unscoped Preview deployments return 503 not_configured. Undecrypted env metadata revealed original credentials scoped to codex/real-live-read-alignment-20260915. No secrets read/decrypted/rotated or config edits.
Created deployment using gitSource.ref=codex/real-live-read-alignment-20260915 and gitSource.sha=d5877ed539503a178023fb0548f44c60e12ae9e1. dpl_6DJ1Q8CZSdYiz9ba9i7RSvVBjjjY READY, /api/sa2-auth 200 ok true user null rather than not_configured. Installed alias now assigned to this deployment. Exact installed-address browser verifies all three homeStat handlers and Today subset regions without navigation. Existing user's authenticated session / PIN activation / live data remain unverified in remote browser. Current cards exclude planned; completed defaults current JOB year, search previous years.
Do not claim full authenticated E2E PASS. Rollback installed alias to dpl_BdRHZB2pStUbjhSvqtDFNQFuMAHf if needed. Production fixed alias remains dpl_CnozTr1JFuBHkLch7xaz4e8ehfZ9.

## 2026-10-08 01:54 KST read endpoint correction
User reported recurring server disconnect. Runtime logs on 6DJ show catalog succeeds but core/plans reject unsupported_operation (HTTP upstream 200 remote_rejection); not a hosting outage. Prior BdRH logs show core success at 01:41 KST. Original branch-scoped READ_URL points to a legacy service. Existing diagnostic READ_URL QTS9KjlhrGnyGMWx is annotated Core read verification v14. Read its decrypted endpoint privately, never emitted values. Sensitive credentials remain unreadable and unchanged. Earlier equality comparisons of blank masked values do NOT establish credential equality.
Preserved legacy sensitive READ_URL A37dBNrEsY3XAbJ6 by moving its scope to existing task/today-stat-filter-20261008; attempted nonexistent backup branch was rejected without mutation. Created encrypted READ_URL on original codex/real-live-read-alignment-20260915 scope with existing v14 endpoint. No key/token/allowed-users changes, no DB writes.
Same source d587 deployed as dpl_5XVd5odzya92WPHUrbWwNZ3iJLaD READY, auth GET 200, installed alias assigned. UI changes preserved. Authenticated core/plans read remains UNVERIFIED until actual app request logs establish success; do not claim complete recovery. Rollback can reassign BdRH alias and restore legacy env branch scope after removing replacement env.

01:58 KST follow-up: 5XV runtime logs establish authenticated core, plans, catalog success at 01:55; core/catalog also success at 01:56. Read endpoint recovery confirmed for these routes (not full WRITE E2E).
User reports priority card 43 layout breaks. Selected card previously duplicated full currentStatusLabel into non-shrinking badge. Fixed all selected cards to use compact P1/current/completed badge, wrap full status and next action inside bounded grid cells, and border-box article width. No project hardcoding/data mutation/navigation. Tests 13/13, syntax/diff PASS. Remote commit d6ba9d4e0f92d0485804d0870535d011dbc81771, installed deployment dpl_48ZgsZmkw8Lg6zPGGQM4JCsU2b8Y READY, asset j5. Actual authenticated 43 card visual verification unavailable. GitHub branch update rejected twice with internal GraphQL errors; commit exists and deployed by exact SHA, task branch still d587, do not repeat blindly.

## PC presentation expansion and immutable prior changes
User explicitly authorized PC expansion, content unchanged, arrangement only; previous fixes immutable. Rule recorded in UPDATE_POLICY.md. Existing hybrid CSS preserved byte-for-byte, desktop media rules appended (>=900px, two columns >=1200px). App width capped 1200px; heading 36px, card title 20px, card body 16px; full status wraps rather than truncates. Original content, app-flow.js, filters, grouping, auth/API/env unchanged. Asset revision j6.
Remote commit 709e427120f32fdedf653309594df848e8cf1f68; deployment dpl_75MmejbmLYJVUBHGHMJymeUdgWhe READY, installed alias assigned. Browser at exact installed address: viewport 1363, app width 1200, heading 36px, no horizontal overflow. Screenshot visually checked. Remote browser unauthenticated, so actual equipment cards unavailable. Local multi-width screenshot attempt blocked by missing Chromium executable; did not download extra browser. Tests 13/13, git diff --check PASS, existing CSS prefix preserved and functional JavaScript untouched. Mobile styles unchanged by guarded additions; mobile runtime screenshot not verified. Rollback installed alias dpl_48ZgsZmkw8Lg6zPGGQM4JCsU2b8Y, preserving working v14 read env.

## Final saved stop point — 2026-10-08 02:06 KST
Emotion requested stop, then final saving only. Do not resume development without a new request. Installed PC app does not require reinstallation for these web UI edits; refresh existing app to load updated assets. Final live source remains 709e427120f32fdedf653309594df848e8cf1f68 / asset 20261008j6 / installed deployment dpl_75MmejbmLYJVUBHGHMJymeUdgWhe. Preserve Today in-place card filters, current working-only classification, active non-stock P1 filter, completed JOB-year behavior, schedule 64/54 agreements/history, v14 READ connection, unchanged credentials, and PC presentation expansion. Documentation save must not change the active app alias or data. Full authenticated WRITE lifecycle E2E remains unverified; only established READ logs and UI checks may be reported as confirmed.
