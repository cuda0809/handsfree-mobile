# HandsFree SIMPLE PIN COPY SA2

운영본과 SA1을 건드리지 않는 별도 실험 브랜치.

사용 흐름:
1. 새 기기에서만 기존 관리자 등록키를 1회 입력
2. 허용 사용자 목록에서 내 이름 선택
3. 숫자 4자리 PIN 설정
4. 180일 서버 세션으로 자동 연결
5. 세션이 풀리면 저장된 서명 복구 토큰 + 4자리 PIN으로 재연결

보안:
- PIN 원문은 서버/저장소/코드에 저장하지 않음
- 복구 토큰은 HF_REAL_APP_KEY로 서명하고 PIN 검증값도 같은 비밀키로 HMAC 처리
- 기기 복구 토큰 단독으로는 로그인할 수 없고 PIN이 함께 필요
- 계정 권한은 기존 HF_REAL_ALLOWED_USERS의 owner/writer/reader를 그대로 사용
- Audit actor는 선택한 기존 사용자 이메일을 유지

사용자 이름:
- HF_REAL_USER_LABELS 환경변수가 있으면 표시 이름으로 사용
- 미설정이고 허용 사용자가 1명이면 '내 계정'
- 여러 명이면 이메일 local-part를 임시 표시
