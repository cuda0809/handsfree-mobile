
2026-10-24 저장 신뢰성 및 연구소 이관 운영 반영
확인된 결함 수정·배포 완료(전체 시스템 완료와 구분).
운영 Apps Script 프로젝트 1Voge6yTRY5DqBCpIbqqWUERpJUttDBMhZwpmlkTiyUvaRMLoAhuyPfWv를 실제 확인. Vercel HF_REAL_READ_URL과 배포 ID 일치 확인. 버전34→35(접수번호 동일성)→36(감사된 상태 공통조회)→37(실제 월말 경계 보호). 기존 URL·권한·PIN 유지.
수정: submissionId가 있으면 과거 동일문장 저장으로 대체 인정 금지. 감사된 현재상태가 집계 Core 지연 때문에 사라지지 않도록 서버 공통조회 연결. 더 최신의 확정 상태 Event 및 원장 변경 보호. 현재 상태 수정 버튼 연결. 연구소 이관을 고객 출고와 구분하고 과거 납기 긴급표시 제외, 미해결 이력은 유지. 프로젝트/계획/오늘이슈 분류 일치.
실제 업무 반영: LAB-260109K-004 / PRJ-00091, ISS-20260907-011 현재상태=연구소 이관 완료, MONITOR 유지, 다음행동=연구소 후속 관리 · 기존 미해결 이력 확인. 실제 이관일 미확정, 2026-10-24는 상태 확인일. 상태저장 요청 f7bc77ad-1a5e-4638-9da7-be464dacfcdd. 앱 저장 성공→서버 재조회→운영 원장 A2:S2 일치→앱 재접속→오늘이슈/프로젝트/계획 표시 확인. 출고실적·과거 이슈 삭제 없음.
검증: 접수번호 4, 상태감사 투영 3, 생산분류 4, 월경계 8 = 관련 19개 통과. 실제 통신차단/동시 편집/다른 사용자 계정 테스트는 이번 작업에서 수행하지 않음. 이를 전체 무장애 보장으로 표현하지 않음. 생산B 양방향 시트 연결·제약 기반 자동계획은 별도 미완료 범위.
웹 MOBILE26.1 / commit 1005e06f3930741bfb658d5e5387a51a9de8b8f0 / task/live-save-state-20261024. Vercel dpl_896LdcV5Yayhn6Sf5EzyWksJtYcq READY. 설치 주소 유지, 재설치 불필요.
복구: Apps Script 동일 배포 버전34(전체 변경 이전) 또는36(월경계 전). 웹 alias를 dpl_AZmton17nisd1yu2eYyTbuV5RL1C로 복구. 업무 상태 변경은 감사이력 보존하며 새 수정으로 되돌림; 저장된 이력 삭제 금지.
운영 주소: https://handsfree-mobile-alpha-02-git-codex-real-l-fbac1c-cuda0809-8210.vercel.app/kmt-sa2/
