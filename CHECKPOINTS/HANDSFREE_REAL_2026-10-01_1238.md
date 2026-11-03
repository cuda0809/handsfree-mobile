# HandsFree REAL 체크포인트 — 2026-10-01 12:38 KST

## 현재 중단 지점
사용자 요청으로 여기서 작업을 중단한다. 재개 전까지 추가 코드/DB 수정 금지.

## 현재 확인된 운영DB 상태
- 오늘 이슈 다중줄 입력 복구 완료.
- 2026-10-01 11:10~11:29 입력 14건 원문 보존.
- 분리되어 검토대기로 빠졌던 16개 세부 입력을 원래 JOB NO.에 재연결.
- 복구 대상 13대의 HF_CORE_통합운영 CurrentIssue/RecentEvent 연결 완료.
- 자연어 기준 상태 복원 예:
  - 260728A-064 엔켓 ATM-0.5B → 마감조립 진행
  - 260714A-054 코스모스랩 DCM-20K → 조립 진행
  - 260727A-060-02/03 → 조립 진행
  - 260727A-060-04 → 핸들파트 개선 입고대기
  - 260630A-049 조인셋 → 일부가공품 입고대기
  - 260727A-061-01/02/03 → 조립 진행
  - 260727A-060-01 → 출고 완료
  - 260806A-067-03 IMX-150 → 재검수 예정
- 복구/연결 감사기록 HF_LIGHT_상태감사에 남김.

## 핵심 원칙 재확정
1. 입력 원문은 원문대로 보존한다.
2. 자연어 전체를 해석해 현재상태를 별도로 판단한다.
3. 이슈/문제/메모 내용은 장비의 이슈내용/최근진행에 연결한다.
4. 상태가 명확하지 않은 문장은 현재상태를 억지로 덮어쓰지 않는다.
5. 여러 줄 입력 시 모든 줄은 선택한 동일 JOB NO.에 연결되어야 한다.
6. 화면 표시조건 때문에 데이터가 누락된 것처럼 보이는 일이 없도록 원본과 표시대상을 먼저 대조한다.

## 방금 확인된 누락 원인
- 운영DB에는 이슈/진행내용이 있는 활성 장비가 16대였으나,
  앱 현장 이슈 화면이 issueId 보유 장비 중심으로 필터링되어 12대가 숨겨져 있었음.
- 데이터 삭제가 아니라 표시 필터 문제였음.
- 숨겨졌던 예: 260623A-043, 260630A-049, 260714A-054, 260724A-059,
  260727A-060-02/03/04, 260727A-061-01/02/03, 260728A-064, 260806A-067-03.

## 코드 상태
### Web working branch
- branch: codex/real-live-read-alignment-20260915
- 자연어 상태 해석 + 이슈내용 연동 코드 반영.
- issueId가 없어도 recentEvent/currentIssue/cause가 있는 활성 장비를 현장 이슈/오늘 이슈에 보이도록 필터 수정.
- 최신 관련 커밋:
  - 7e6b89e2890a0317bcba56263b7634494d9a3b5c Stop hiding linked issue equipment without issueId
  - 73dbe32f4d5598889f7c1529b30a6d298df32c50 Show linked issue content on issue cards
  - 65ac1a60dd2d0e50c36926d182130624356208f3 Bust assets for issue visibility fix
  - b33bf02cbc090adad4c3696226a88a9d3a9c85e5 Bump cache for issue visibility fix
- Vercel branch alias는 자연어 연동 버전까지 READY 확인했으나, 마지막 issue visibility 커밋까지 자동배포 반영 여부는 재개 시 다시 확인할 것.

### Android wrapper
- branch: task/hybrid05-brand-only-20261001
- versionCode 290 / versionName 2.9.0-issue-visible
- APK build success:
  - workflow run 36813389243
  - artifact KMT-Production-Proto-IssueVisible-APK
- 사용자 전달 파일: KMT-Production-Proto-IssueVisible.apk

## 재개 시 첫 순서
1. 코드 수정 전에 운영DB 원본과 앱 표시목록을 먼저 대조.
2. Vercel branch alias가 issue visibility 최신 커밋까지 반영됐는지 확인.
3. 앱에서 현장 이슈/오늘 이슈에 16대 기준 누락이 없는지 실화면 확인.
4. 자연어 입력 1건만 소규모 검증:
   - 원문 보존
   - 같은 JOB NO. 연결
   - 이슈내용 표시
   - 자연어 해석 상태
   - 다른 장비/데이터 불변
5. 위 4개 확인 전 대량 수정/재배포 금지.
