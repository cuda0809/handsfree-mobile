# HandsFree Mobile REAL v0.1 — Data Mapping

기준일: 2026-09-10
기준 백데이터: `V3_참조_분할백데이터_20260909`

## 목적

REAL v0.1은 기존 Alpha 03의 PWA/자동배포 구조는 유지하면서, 첫 화면을 `오늘 해야 할 일`과 `지금 위험한 것` 중심으로 재구성한다. 모바일 클라이언트가 Google Sheet를 직접 수정하지 않고, 읽기/쓰기 모두 서버 API를 경유한다.

## 화면 → 데이터 소스

| UI 영역 | 1차 소스 | 사용 필드 | 비고 |
|---|---|---|---|
| 오늘 우선순위 | `HF_VIEW_브리핑소스` | 우선순위, 일자, 구분, 발주번호, 고객/현장, 모델, 공정, 계획대비, 차이일, 업무내용, 참여자, 법칙태그, 결정필요, 분석요약 | `1-HIGH` 우선, 이후 `2-MEDIUM` |
| 장비 카드 | `장비현황` | 발주번호, 고객사, 제품/모델, 납기, 담당, 상태, 진행률, 관리비고 | 완료/PM협의/진행중 구분 |
| 장비 KPI | `장비현황` | 현재 운영, 납기 15일 이내, PM 협의 | 첫 화면 요약 |
| 검색 | `HF_VIEW_통합검색` | 유형, 기준일/월, 발주번호, 고객/현장, 제품/모델, 담당/참여자, 상태/공정/업무, 상세/원문, 출처, 검색텍스트, 검색해석 | 과거+현재 통합 검색 |
| 명령 이력 | `HF_DATA_명령로그` | 일시, 명령유형, 원문명령, 대상, 처리내용, 상태, 비고 | UI 명령 감사 이력 |
| 쓰기 대기열 | `HF_DATA_입력대기열` | Request_ID, Received_At, Source, Requester, Payload, Status, Dedupe_Key, Attempt, Lock_Owner, Started_At, Completed_At, Result, Error, Priority, Ack_Message | 모바일에서 직접 Sheet write 금지 |
| 일정 변경 | `HF_DATA_일정변경누적` | 초기계획, 직전 유효일, 변경후 유효일, 증감/누적일, 사유 | 원계획 불변 |
| 이슈 상태 | `HF_DATA_이슈원장` | Issue_ID, 상태, 원인, 대상, 해결 근거 | OPEN/MONITOR만 활성 브리핑 |
| 인력 CAPA | `HF_DATA_인력CAPA` / `HF_VIEW_인력CAPA` | 가용 FTE, 계획 FTE, GAP, 연차/출장/지원, 영향 프로젝트 | 홈의 인력위험 카드 |

## 쓰기 흐름

`모바일 UI → /api/command → HF_DATA_입력대기열 등록 → HF_SYS_동시입력제어 LOCK → 대상 원장 반영 → 대상 셀 재조회 → HF_DATA_명령로그 기록 → DONE 응답`

고위험 변경(납기, 대규모 일정 이동, 중요한 외부 약속)은 `needsConfirmation=true`로 반환한 뒤 사용자 확정 후 실행한다.

## REAL v0.1 API 계약

### GET `/api/real-dashboard`

```json
{
  "ok": true,
  "mode": "live",
  "now": "2026-09-10 15:47",
  "metrics": {
    "currentEquipment": 25,
    "dueWithin15Days": 4,
    "pmDiscussion": 2,
    "capacityGap": -1
  },
  "capacity": {
    "available": 5,
    "planned": 6,
    "gap": -1,
    "note": "연차 이상준"
  },
  "priorities": [],
  "equipment": []
}
```

### POST `/api/command`

입력:

```json
{"text":"트루메카 자전컵커버 입고 2일 연기","confirmed":false}
```

응답은 조회형이면 `answer`, 변경형이면 필요에 따라 `needsConfirmation`, `summary`, `requestId`, `status`를 반환한다.

## 현재 구현 단계

REAL v0.1 UI는 위 계약으로 서버를 호출하고, API가 아직 연결되지 않았을 때는 `SNAPSHOT` 모드로 전환한다. SNAPSHOT에서는 조회 데모는 가능하지만 실제 Google Sheet 쓰기는 차단한다. 실제 Google 인증/서버 API 연결이 끝나면 동일 UI가 `LIVE`로 전환되도록 설계한다.
