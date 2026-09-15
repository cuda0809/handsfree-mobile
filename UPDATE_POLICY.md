# 모바일핸즈프리 업데이트 정책

- 기준 UI는 현재 Grow가 승인한 Production baseline을 유지한다.
- 앱 주소/설치 아이콘은 유지한다.
- 일반 코드 변경은 `main`에서 직접 수정하지 않는다.
- 기본 흐름은 `작업 브랜치 -> 테스트 -> Vercel Preview/환경 검증 -> Grow 검증 -> 필요 시 Emotion 승인 -> main 병합 -> Production`이다.
- Production 승격이나 운영 구조에 영향을 주는 변경은 Emotion 승인 없이 자동 반영하지 않는다.
- 사용자에게 일반 웹 UI/데이터 업데이트 때문에 새 버전을 다시 설치하도록 요구하지 않는다.
- UI 큰 변경뿐 아니라 API, Apps Script, WRITE, 인증, 데이터계약 변경도 별도 작업 브랜치에서 검증한다.
- 홈 화면 앱은 같은 고정 주소를 열어 승인된 최신 Production 배포본을 사용한다.
- 현재 정상 LIVE 기능은 회귀 방지 기준선으로 취급한다.
- 실패한 새 연동을 구버전 fallback으로 숨기지 않는다. fallback이 필요하면 명시적·관측 가능하게 설계하고 Grow 검증을 거친다.
- 세부 Codex 실행 규칙은 루트 `AGENTS.md`, 최소 테스트 기준은 `CODEX_TEST_RULES.md`를 따른다.
