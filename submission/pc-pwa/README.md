# KMT HandsFree Hybrid 0.5 PC 게스트 PWA

STATUS: PARTIAL — 로컬 구현 완료. 공개 배포 및 Windows 실제 설치는 아직 미검증.

기준: 저장소 handsfree-hybrid05-core/hybrid-ui.js의 Hybrid 0.5 Core. 오늘 / 납기 / 프로젝트 / 내 기록 4개 메뉴를 재사용합니다. SA2.8.3 공통 조회 렌더러 위에 기존 Hybrid 0.5 모듈을 로드합니다. 기존 버전명만 바꾼 앱이 아닙니다. 원본 Hybrid 진입 HTML은 운영 사이트 리다이렉트였으므로 심사용 독립 진입으로 교체했습니다.

작업 브랜치: task/competition-pc-pwa-20261001. 운영 main/API/Apps Script/DB 미변경. 샘플 3개 프로젝트만 제공하며 guestApi는 로컬 조회 결과만 반환합니다. 변경 요청은 서버 405 / 앱 403으로 차단. 로그인/PIN/운영 DB 접속 없음. KMT 승인 로고와 지정된 원본 crop을 유지합니다.

만료: 2026-10-11 10:30 KST. 서버 clock와 단조 시계로 확인, 만료 시 HTML/앱 JS/clock은 410. 열린 상세도 닫습니다. 오프라인 재실행은 차단. 인터넷 필요. 이미 다운로드한 소스의 변조 방지는 DRM 범위가 아닙니다.

빌드: node build.mjs. 검증: node verify.mjs. Node 22+, 외부 의존성 없음. dist/server/index.js는 Cloudflare Worker 호환 fetch 모듈입니다. 별도 신규 호스팅에 이 디렉터리만 배포하세요. 원본 운영 저장소 전체를 배포하지 마세요.

설치: 공개 HTTPS 링크를 Edge/Chrome에서 열고 PC 앱 설치 → 브라우저 설치 확인. 확인창은 생략 불가. 시작 메뉴에서 Hybrid 0.5 검색, 바탕화면은 설치 옵션 또는 시작 메뉴에서 끌어 만들기.

현재 배포 제약: Sites 소스 업로드용 터미널 입력이 실행 정책에서 거부됨. 미지정 Vercel 배포는 운영 변경 가능성 때문에 자동 승인 검토에서 거부됨. expected_url은 아직 제출 가능한 공개 링크가 아닙니다.

롤백: 원본 3e06162560642f39bfedd8d36fc1950fe055ef96. 이 브랜치/심사용 신규 사이트만 중지하면 됩니다. 운영 배포 승격이나 main 병합 불필요.
