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
