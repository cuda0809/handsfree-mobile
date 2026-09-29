# HandsFree SIMPLE AUTH COPY SA1

이 브랜치는 운영본을 변경하지 않고 복사한 간편 인증 실험본이다.

## 사용자 흐름
1. 최초 1회 허용 사용자 이메일 + 기존 등록키 입력
2. 서버가 기존 HF_REAL_ALLOWED_USERS 목록에서 권한 확인
3. 등록키는 저장하지 않고, 서버가 서명한 기기 쿠키만 180일 유지
4. 이후 앱 실행 시 자동 연결
5. 상태/일정/현장입력 변경자는 기존 이메일 식별자로 Audit 기록

## 유지되는 것
- REAL READ/WRITE
- owner / writer / reader 권한
- Event / 변경이력 / Audit
- 기존 데이터와 One Project ID 흐름
- 원본 production 브랜치 및 Google OAuth 운영본

## 이번 실험에서 제거한 것
- Google 계정 선택 화면
- Google OAuth origin 설정 의존
- 반복 로그인

## 다음 단계
SA1 사용성이 확인되면 등록키를 공용 앱 키에서 개인별 1회용 활성화 코드로 분리하고, 사용자 관리 화면/시트에서 발급·차단하도록 확장한다.
