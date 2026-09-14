/**
 * HandsFree REAL 0.8 — SAFE WRITE bridge V1
 *
 * READ: preserves REAL 0.7 LIVE READ behavior.
 * WRITE: only allows narrowly-scoped current-status updates in HF_DATA_이슈원장.
 *        Every request is queued, deduplicated, normalized and audited.
 *
 * IMPORTANT
 * - No secrets are hard-coded. HF_REAL_READ_TOKEN remains in Script Properties.
 * - Phase 1 never changes ISSUE_ID / Order_ID / Status / Closed_At / Briefing_Active.
 * - High-risk requests (delete/close/delivery/date/quantity/schedule-shift) go to REVIEW_REQUIRED.
 * - Installable edit trigger can route 운영수정센터 A5:A34 Enter edits through the same pipeline.
 */
const HF_SCHEMA = 'HF_REAL_SAFE_WRITE_V1';
const HF_SPREADSHEET_ID = '1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM';
const HF_PARENT_FOLDER_ID = '1o2N5Rg-h7aIDWSQuYA32hmrW0sWj2aRr';
const HF_TOKEN_KEY = 'HF_REAL_READ_TOKEN';
const HF_ISSUE_SHEET = 'HF_DATA_이슈원장';
const HF_QUEUE_SHEET = 'HF_DATA_입력대기열';
const HF_NORMALIZE_SHEET = 'HF_DATA_입력정규화';
const HF_EDIT_SHEET = '운영수정센터';
const HF_EDIT_FIRST_ROW = 5;
const HF_EDIT_LAST_ROW = 34;
const HF_ISSUE_SHEET_ID = 391424214;
const HF_QUEUE_SHEET_ID = 1907002003;
const HF_NORMALIZE_SHEET_ID = 1907002006;

const HF_TABLES = {
  productRows:  {sheet:'제품마스터', startRow:4, cols:12, maxRow:1100},
  workRows:     {sheet:'업무이력', startRow:7, cols:9, maxRow:220},
  issueRows:    {sheet:HF_ISSUE_SHEET, startRow:1, cols:19, maxRow:1000},
  changeRows:   {sheet:'HF_DATA_일정변경누적', startRow:1, cols:20, maxRow:2000},
  capaRows:     {sheet:'HF_VIEW_인력CAPA', startRow:1, cols:18, maxRow:2000},
  briefRows:    {sheet:'HF_VIEW_브리핑소스', startRow:1, cols:14, maxRow:1000},
  analysisRows: {sheet:'HF_DATA_90일분석이력', startRow:1, cols:36, maxRow:2000}
};

function setupHandsFreeReadToken() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty(HF_TOKEN_KEY);
  if (!token) {
    token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty(HF_TOKEN_KEY, token);
  }
  console.log('HF_REAL_READ_TOKEN=' + token);
  return token;
}

function rotateHandsFreeReadToken() {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(HF_TOKEN_KEY, token);
  console.log('HF_REAL_READ_TOKEN=' + token);
  return token;
}

/** Run once after pasting this source into the existing Apps Script project. */
function setupSafeWriteEditTrigger() {
  assertSafeEnvironment_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onEditSafeWrite')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onEditSafeWrite')
    .forSpreadsheet(HF_SPREADSHEET_ID)
    .onEdit()
    .create();
  return 'SAFE WRITE edit trigger installed';
}

/** Installable trigger: 운영수정센터 A5:A34 Enter -> queue -> safe write/review. */
function onEditSafeWrite(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== HF_EDIT_SHEET) return;
    if (range.getColumn() !== 1) return;
    if (range.getRow() < HF_EDIT_FIRST_ROW || range.getRow() > HF_EDIT_LAST_ROW) return;
    const text = String(e.value == null ? '' : e.value).trim();
    if (!text) return;

    const requester = (Session.getActiveUser().getEmail() || 'Sheet User').trim();
    const result = safeWriteRequest_({
      text,
      source: 'SHEET_NL',
      requester,
      targetHint: '',
      sheetRow: range.getRow()
    });

    const statusText = result.ok
      ? (result.applied ? 'DONE · 원본반영' : (result.status || '검토대기'))
      : 'ERROR';
    sheet.getRange(range.getRow(), 11).setValue(statusText);
    sheet.getRange(range.getRow(), 12).setValue(result.ack || result.error || '처리 결과 확인 필요');
  } catch (err) {
    try {
      if (e && e.range) {
        e.range.getSheet().getRange(e.range.getRow(), 11).setValue('ERROR');
        e.range.getSheet().getRange(e.range.getRow(), 12).setValue(String(err && err.message ? err.message : err));
      }
    } catch (_) {}
  }
}

function doGet(e) {
  try {
    authorize_(e && e.parameter ? String(e.parameter.token || '') : '');
    const ss = SpreadsheetApp.openById(HF_SPREADSHEET_ID);
    const tz = ss.getSpreadsheetTimeZone() || 'Asia/Seoul';
    const today = formatDate_(new Date(), tz);
    const tables = {};
    Object.keys(HF_TABLES).forEach(key => tables[key] = readTable_(ss, HF_TABLES[key], tz));

    const currentStatus = buildCurrentStatus_(tables.issueRows, today, tz);
    const sourceLatestDate = currentStatus.reduce((m, x) => x.sourceLatestUpdate > m ? x.sourceLatestUpdate : m, '');

    return json_({
      ok:true,
      schema:HF_SCHEMA,
      spreadsheetId:HF_SPREADSHEET_ID,
      timezone:tz,
      today,
      generatedAt:Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      sourceLatestDate,
      currentStatus,
      counts:{
        currentStatus:currentStatus.length,
        openIssues:currentStatus.filter(x => x.issueStatus === 'OPEN').length
      },
      capabilities:{safeWrite:true, safeWriteVersion:'V1', sheetNaturalInput:true},
      tables
    });
  } catch (err) {
    return json_({ok:false, schema:HF_SCHEMA, error:String(err && err.message ? err.message : err)});
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    authorize_(String(body.token || ''));
    if (String(body.op || '') !== 'safe_write') {
      return json_({ok:false, schema:HF_SCHEMA, error:'unsupported_operation'});
    }
    const result = safeWriteRequest_({
      text: body.text,
      source: body.source || 'MOBILE',
      requester: body.requester || 'Emotion',
      targetHint: body.targetHint || '',
      sheetRow: null
    });
    return json_(Object.assign({schema:HF_SCHEMA}, result));
  } catch (err) {
    return json_({ok:false, schema:HF_SCHEMA, error:String(err && err.message ? err.message : err)});
  }
}

function safeWriteRequest_(req) {
  const text = String(req && req.text || '').trim();
  const source = cleanShort_(req && req.source || 'UNKNOWN', 40);
  const requester = cleanShort_(req && req.requester || 'Unknown', 80);
  const targetHint = cleanShort_(req && req.targetHint || '', 200);
  if (!text) return {ok:false, error:'empty_text', ack:'입력 내용이 비어 있어.'};
  if (text.length > 1000) return {ok:false, error:'text_too_long', ack:'한 번에 1000자 이하로 입력해줘.'};

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return {ok:true, applied:false, status:'QUEUED', ack:'다른 입력을 처리 중이야. 잠시 후 다시 시도해줘.'};
  }

  try {
    const env = assertSafeEnvironment_();
    const ss = env.ss;
    const tz = ss.getSpreadsheetTimeZone() || 'Asia/Seoul';
    const now = new Date();
    const today = formatDate_(now, tz);
    const stamp = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
    const requestId = 'SWR-' + Utilities.formatDate(now, tz, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0,8).toUpperCase();

    const issueSheet = env.issueSheet;
    const queueSheet = env.queueSheet;
    const normSheet = env.normSheet;
    const issueData = issueSheet.getDataRange().getValues();
    const headers = issueData[0].map(String);
    const idx = indexHeaders_(headers);
    requireIssueHeaders_(idx);

    const target = matchIssue_(issueData, idx, text + ' ' + targetHint);
    const proposed = target.match ? parseSafeFields_(text, target.match, today) : {changes:{}, reviewReason:'대상 이슈를 하나로 확정하지 못함'};
    const dedupeKey = sha256_([target.match ? target.match.issueId : 'NO_MATCH', normalizeKey_(text), today].join('|'));

    const duplicate = findDuplicate_(queueSheet, dedupeKey);
    if (duplicate) {
      const ack = '같은 요청이 이미 기록돼 있어. 중복 반영하지 않았어.';
      appendNormalize_(normSheet, {
        requestId, stamp, source, text, today, requester, target, proposed,
        status:'DUPLICATE', dedupeKey, error:''
      });
      return {ok:true, applied:false, status:'DUPLICATE', requestId, ack};
    }

    const payload = {
      text,
      targetHint,
      matchedIssueId: target.match ? target.match.issueId : '',
      matchedOrderId: target.match ? target.match.orderId : '',
      matchScore: target.score,
      changes: proposed.changes || {},
      sourceRow: req && req.sheetRow || null
    };
    const qRow = appendQueue_(queueSheet, {
      requestId, stamp, source, requester, payload, status:'RECEIVED', dedupeKey
    });

    const risky = highRiskReason_(text);
    const reviewReason = risky || proposed.reviewReason || target.reviewReason;
    if (!target.match || reviewReason || !Object.keys(proposed.changes || {}).length) {
      const reason = reviewReason || '안전하게 자동 반영할 필드를 찾지 못함';
      updateQueue_(queueSheet, qRow, 'REVIEW_REQUIRED', '', reason, '검토필요 · ' + reason);
      appendNormalize_(normSheet, {
        requestId, stamp, source, text, today, requester, target, proposed,
        status:'REVIEW_REQUIRED', dedupeKey, error:reason
      });
      return {
        ok:true, applied:false, status:'REVIEW_REQUIRED', requestId,
        matchedIssueId: target.match ? target.match.issueId : '',
        ack:'자동 반영하지 않고 검토대기로 저장했어. ' + reason
      };
    }

    const rowNo = target.match.rowNo;
    const before = snapshotAllowed_(issueData[rowNo - 1], idx);
    const after = applyAllowedChanges_(issueSheet, rowNo, idx, before, proposed.changes, text, stamp, today);
    SpreadsheetApp.flush();
    const verifyRow = issueSheet.getRange(rowNo, 1, 1, 19).getValues()[0];
    const verified = snapshotAllowed_(verifyRow, idx);
    if (!sameAllowed_(after, verified)) {
      throw new Error('write_verification_failed');
    }

    const result = {issueId:target.match.issueId, before, after:verified};
    const ack = target.match.customer + ' · ' + target.match.model + ' (' + target.match.issueId + ') 원본 반영 완료';
    updateQueue_(queueSheet, qRow, 'DONE', JSON.stringify(result), '', ack);
    appendNormalize_(normSheet, {
      requestId, stamp, source, text, today, requester, target, proposed,
      status:'DONE', dedupeKey, error:''
    });
    return {
      ok:true, applied:true, status:'DONE', requestId,
      matchedIssueId:target.match.issueId,
      orderId:target.match.orderId,
      changes:proposed.changes,
      before, after:verified, ack
    };
  } catch (err) {
    return {ok:false, applied:false, status:'ERROR', error:String(err && err.message ? err.message : err), ack:'SAFE WRITE 처리 중 오류가 발생했어.'};
  } finally {
    lock.releaseLock();
  }
}

function assertSafeEnvironment_() {
  const ss = SpreadsheetApp.openById(HF_SPREADSHEET_ID);
  if (ss.getId() !== HF_SPREADSHEET_ID) throw new Error('spreadsheet_id_mismatch');
  const issueSheet = ss.getSheetByName(HF_ISSUE_SHEET);
  const queueSheet = ss.getSheetByName(HF_QUEUE_SHEET);
  const normSheet = ss.getSheetByName(HF_NORMALIZE_SHEET);
  if (!issueSheet || issueSheet.getSheetId() !== HF_ISSUE_SHEET_ID) throw new Error('issue_sheet_mismatch');
  if (!queueSheet || queueSheet.getSheetId() !== HF_QUEUE_SHEET_ID) throw new Error('queue_sheet_mismatch');
  if (!normSheet || normSheet.getSheetId() !== HF_NORMALIZE_SHEET_ID) throw new Error('normalize_sheet_mismatch');

  // Parent-folder gate. If the canonical file is moved, writes stop until the gate is intentionally updated.
  let parentOk = false;
  const parents = DriveApp.getFileById(HF_SPREADSHEET_ID).getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === HF_PARENT_FOLDER_ID) { parentOk = true; break; }
  }
  if (!parentOk) throw new Error('canonical_parent_mismatch');
  return {ss, issueSheet, queueSheet, normSheet};
}

function parseSafeFields_(text, match, today) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const changes = {};
  const futureCut = t.search(/내일부터|내일|모레|다음\s*주|다음주|예정/);
  const nowText = futureCut >= 0 ? t.slice(0, futureCut) : t;

  let state = '';
  if (/수정품.*(입고|도착)|(입고|도착).*(완료|됨|됐|받음)|자재.*(불출|수령).*(완료|받음|됨|됐)/i.test(nowText)) state = '입고완료';
  else if (/조립.*(재개|시작|진행)|조립중/i.test(nowText)) state = '조립진행';
  else if (/조립.*대기/i.test(nowText)) state = '조립대기';
  else if (/전장.*(재개|시작|진행)|전장중/i.test(nowText)) state = '전장진행';
  else if (/전장.*완료/i.test(nowText)) state = '전장완료';
  else if (/테스트.*(시작|진행)|테스트중/i.test(nowText)) state = '테스트진행';
  else if (/테스트.*완료/i.test(nowText)) state = '테스트완료';
  else if (/검수.*(시작|진행)|검수중/i.test(nowText)) state = '검수진행';
  else if (/검수.*완료/i.test(nowText)) state = '검수완료';
  else if (/수정.*(진행|중)|재가공.*(진행|중)/i.test(nowText)) state = '수정중';
  else if (/확인.*완료|이상\s*없음/i.test(nowText)) state = '확인완료';
  else if (/확인.*(필요|중|진행)/i.test(nowText)) state = '확인중';

  if (state && state !== String(match.currentState || '')) {
    changes.Current_State = state;
    changes.State_Since = today;
  }

  let nextAction = extractNextAction_(t);
  if (!nextAction && /수정품.*(입고|도착)/i.test(t) && /조립.*재개/i.test(t)) nextAction = '조립 재개';
  if (!nextAction && /입고.*완료/i.test(t)) nextAction = '입고 확인 후 다음 공정 재개';
  if (nextAction && nextAction !== String(match.nextAction || '')) changes.Next_Action = nextAction;

  if (Object.keys(changes).length) changes.Latest_Update = today;
  return {changes};
}

function extractNextAction_(text) {
  const parts = String(text || '').split(/[.!?。\n]+/).map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (/(내일부터|내일|모레|다음주|다음\s*주|다음\s*조치|이후|후\s+).*(조립|전장|테스트|검수|출고|가공|프로그램|확인|재개|진행|시작)/i.test(p)) return p.slice(0,120);
    if (/(조립|전장|테스트|검수|출고|가공|프로그램).*(재개|시작|진행|예정)/i.test(p) && /내일|모레|예정|후/i.test(p)) return p.slice(0,120);
  }
  return '';
}

function highRiskReason_(text) {
  const t = String(text || '').toLowerCase();
  if (/삭제|지워|종결|닫아|close|closed|납품완료|출고완료|완료처리/.test(t)) return '이슈 종결/삭제 계열은 0.8 1단계 자동반영 금지';
  if (/납기|수량|발주번호|order[_ -]?id/.test(t)) return '납기·수량·식별자 변경은 자동반영 금지';
  if (/\d+\s*일.*(미뤄|연기|당겨)|미뤄|당겨|일정.*변경/.test(t)) return '일정 이동은 일정원장 연동 전까지 검토필요';
  return '';
}

function matchIssue_(rows, idx, raw) {
  const q = normalizeKey_(raw);
  const explicit = String(raw || '').toUpperCase().match(/ISS-\d{8}-\d{3}/);
  const candidates = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const issueId = String(row[idx.ISSUE_ID] || '').trim();
    if (!issueId) continue;
    const status = String(row[idx.Status] || '').trim().toUpperCase();
    if (status !== 'OPEN' && status !== 'MONITOR') continue;
    const orderId = String(row[idx.Order_ID] || '').trim();
    const customer = String(row[idx['고객/현장']] || '').trim();
    const model = String(row[idx['모델']] || '').trim();
    let score = 0;
    if (explicit && issueId.toUpperCase() === explicit[0]) score += 100;
    if (containsKey_(q, orderId, 6)) score += 8;
    if (containsKey_(q, model, 3)) score += 6;
    if (containsKey_(q, customer, 2)) score += 4;
    if (score > 0) {
      candidates.push({
        rowNo:i+1, issueId, orderId, customer, model,
        process:String(row[idx['공정']] || ''), status,
        currentState:String(row[idx.Current_State] || ''),
        stateSince:dateText_(row[idx.State_Since], 'Asia/Seoul'),
        nextAction:String(row[idx.Next_Action] || ''),
        latestUpdate:dateText_(row[idx.Latest_Update], 'Asia/Seoul'),
        note:String(row[idx.Note] || ''),
        score
      });
    }
  }
  candidates.sort((a,b) => b.score - a.score || a.issueId.localeCompare(b.issueId));
  if (!candidates.length) return {match:null, score:0, reviewReason:'일치하는 OPEN/MONITOR 이슈 없음'};
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return {match:null, score:candidates[0].score, reviewReason:'대상 이슈가 둘 이상으로 모호함'};
  }
  if (candidates[0].score < 4) return {match:null, score:candidates[0].score, reviewReason:'대상 일치 신뢰도가 낮음'};
  return {match:candidates[0], score:candidates[0].score, reviewReason:''};
}

function containsKey_(queryNorm, value, minLen) {
  const n = normalizeKey_(value);
  return n.length >= minLen && queryNorm.indexOf(n) >= 0;
}

function snapshotAllowed_(row, idx) {
  return {
    Latest_Update: dateText_(row[idx.Latest_Update], 'Asia/Seoul'),
    Note: String(row[idx.Note] || ''),
    Current_State: String(row[idx.Current_State] || ''),
    State_Since: dateText_(row[idx.State_Since], 'Asia/Seoul'),
    Next_Action: String(row[idx.Next_Action] || '')
  };
}

function applyAllowedChanges_(sheet, rowNo, idx, before, changes, rawText, stamp, today) {
  const after = Object.assign({}, before);
  Object.keys(changes).forEach(k => { if (k in after) after[k] = changes[k]; });
  const auditLine = '[SAFE WRITE ' + stamp + '] ' + String(rawText || '').replace(/\s+/g,' ').trim();
  after.Note = before.Note ? (before.Note + '\n' + auditLine) : auditLine;
  after.Latest_Update = changes.Latest_Update || today;

  sheet.getRange(rowNo, idx.Latest_Update + 1).setValue(after.Latest_Update);
  sheet.getRange(rowNo, idx.Note + 1).setValue(after.Note);
  sheet.getRange(rowNo, idx.Current_State + 1).setValue(after.Current_State);
  sheet.getRange(rowNo, idx.State_Since + 1).setValue(after.State_Since);
  sheet.getRange(rowNo, idx.Next_Action + 1).setValue(after.Next_Action);
  return after;
}

function sameAllowed_(a,b) {
  return ['Latest_Update','Note','Current_State','State_Since','Next_Action'].every(k => String(a[k] || '') === String(b[k] || ''));
}

function appendQueue_(sheet, x) {
  sheet.appendRow([
    x.requestId, x.stamp + ' KST', x.source, x.requester,
    JSON.stringify(x.payload), x.status, x.dedupeKey, 1, 'SAFE_WRITE_V1',
    x.stamp + ' KST', '', '', '', 'NORMAL', '접수됨'
  ]);
  return sheet.getLastRow();
}

function updateQueue_(sheet, row, status, result, error, ack) {
  const tz = SpreadsheetApp.openById(HF_SPREADSHEET_ID).getSpreadsheetTimeZone() || 'Asia/Seoul';
  const stamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss') + ' KST';
  sheet.getRange(row, 6).setValue(status);
  sheet.getRange(row, 11).setValue(stamp);
  sheet.getRange(row, 12).setValue(result || '');
  sheet.getRange(row, 13).setValue(error || '');
  sheet.getRange(row, 15).setValue(ack || '');
}

function appendNormalize_(sheet, x) {
  const m = x.target && x.target.match ? x.target.match : {};
  const changes = x.proposed && x.proposed.changes ? x.proposed.changes : {};
  sheet.appendRow([
    x.requestId, x.stamp + ' KST', x.source, x.text, 1, HF_ISSUE_SHEET,
    x.today, 'SAFE_WRITE', m.customer || '', m.model || '',
    changes.Next_Action || changes.Current_State || '', x.requester, x.text,
    'SAFE_WRITE_V1', x.status === 'DONE',
    [m.issueId || '', m.orderId || ''].filter(Boolean).join(' / '),
    x.target ? Number(x.target.score || 0) : 0, x.status, x.dedupeKey, x.error || ''
  ]);
}

function findDuplicate_(sheet, dedupeKey) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const start = Math.max(2, last - 300);
  const vals = sheet.getRange(start, 6, last - start + 1, 2).getValues(); // Status, Dedupe_Key
  return vals.some(r => String(r[1] || '') === dedupeKey && /DONE|RECEIVED|QUEUED|REVIEW_REQUIRED/.test(String(r[0] || '')));
}

function indexHeaders_(headers) {
  const idx = {};
  headers.forEach((h,i) => idx[String(h).trim()] = i);
  return idx;
}
function requireIssueHeaders_(idx) {
  ['ISSUE_ID','Order_ID','고객/현장','모델','공정','Status','Latest_Update','Note','Current_State','State_Since','Next_Action'].forEach(h => {
    if (idx[h] == null) throw new Error('issue_header_missing:' + h);
  });
}

function authorize_(supplied) {
  const expected = PropertiesService.getScriptProperties().getProperty(HF_TOKEN_KEY);
  if (!expected || String(supplied || '') !== expected) throw new Error('unauthorized');
}
function parseBody_(e) {
  try { return JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}'); }
  catch (_) { return {}; }
}
function cleanShort_(v,n) { return String(v == null ? '' : v).trim().slice(0,n); }
function normalizeKey_(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^0-9a-z가-힣]/g,''); }
function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(b => (b + 256).toString(16).slice(-2)).join('');
}

function readTable_(ss, cfg, tz) {
  const sheet = ss.getSheetByName(cfg.sheet);
  if (!sheet) throw new Error('Missing sheet: ' + cfg.sheet);
  const last = Math.min(Math.max(cfg.startRow, sheet.getLastRow()), cfg.maxRow);
  if (last < cfg.startRow) return [];
  return sheet.getRange(cfg.startRow, 1, last - cfg.startRow + 1, cfg.cols)
    .getValues()
    .map(row => row.map(v => normalizeCell_(v, tz)));
}

function buildCurrentStatus_(issueRows, today, tz) {
  if (!issueRows || issueRows.length < 2) return [];
  const headers = issueRows[0].map(String);
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);
  const required = ['ISSUE_ID','Opened_At','Type','Order_ID','고객/현장','모델','공정','Status','Latest_Update','Resolution','Briefing_Active','Note','Current_State','State_Since','Next_Action'];
  required.forEach(h => { if (idx[h] == null) throw new Error('Issue ledger missing header: ' + h); });

  return issueRows.slice(1)
    .filter(row => String(row[idx['ISSUE_ID']] || '').trim())
    .map(row => issueObject_(row, idx, today, tz))
    .filter(x => x.issueStatus === 'OPEN' && x.briefingActive)
    .sort((a,b) => a.priority - b.priority || b.days - a.days || String(a.customer).localeCompare(String(b.customer), 'ko'));
}

function issueObject_(row, idx, today, tz) {
  const val = h => row[idx[h]];
  const issueId = String(val('ISSUE_ID') || '');
  const type = String(val('Type') || '');
  const orderId = String(val('Order_ID') || '');
  const customer = String(val('고객/현장') || '');
  const model = String(val('모델') || '');
  const process = String(val('공정') || '');
  const issueStatus = String(val('Status') || '');
  const resolution = String(val('Resolution') || '');
  const note = String(val('Note') || '');
  const searchKey = String(val('Search_Key') || '');
  const openedAt = dateText_(val('Opened_At'), tz);
  const latest = dateText_(val('Latest_Update'), tz) || openedAt;
  const briefingActive = bool_(val('Briefing_Active'));
  const text = [type, process, resolution, note, searchKey].join(' ').toLowerCase();
  const explicitState = String(val('Current_State') || '').trim();
  const explicitSince = dateText_(val('State_Since'), tz);
  const explicitNext = String(val('Next_Action') || '').trim();
  const state = explicitState || inferState_(text, process);
  const since = explicitSince || inferSince_(state, openedAt, latest, resolution, note);
  const nextAction = explicitNext || inferNextAction_(state, resolution, note, process);
  const tone = inferTone_(state, type, text);
  const priority = tone === 'hot' ? 1 : tone === 'warn' ? 2 : 3;
  const cause = summarizeCause_(resolution, note, process);
  return {
    issueId, orderId, customer, model, process,
    state, since, days:inclusiveDays_(since, today),
    cause, nextAction, tone, priority,
    issueStatus, briefingActive,
    sourceLatestUpdate:latest,
    sourceOpenedAt:openedAt,
    type
  };
}

function inferState_(text, process) {
  if (/입고\s*대기|자재\s*대기|부품\s*대기|외주.*대기/.test(text)) return '입고대기';
  if (/조립\s*대기/.test(text)) return '조립대기';
  if (/수정\s*(진행|중)|수정품.*대기|수정\s*반출/.test(text)) return '수정중';
  if (/점검.*필요|체크.*필요|점검\s*대기/.test(text)) return '점검대기';
  if (/확인.*진행|확인.*필요|재확인|검증.*필요/.test(text)) return '확인중';
  if (/테스트.*대기|테스트.*필요/.test(text)) return '테스트대기';
  if (/프로그램/.test(process) && /문제|이슈/.test(text)) return '수정중';
  if (/조립/.test(process) && /지연|가공품|수정/.test(text)) return '조립대기';
  if (/자재|입고|구매|외주/.test(process) && /지연|대기/.test(text)) return '입고대기';
  return '확인중';
}
function inferSince_(state, openedAt, latest, resolution, note) { return latest || openedAt; }
function inferNextAction_(state, resolution, note, process) {
  const text = (resolution + ' ' + note).replace(/\s+/g, ' ').trim();
  if (state === '입고대기') {
    if (/연결테스트/.test(text)) return '입고 후 연결테스트·출고준비';
    return '입고 확인 후 다음 공정 재개';
  }
  if (state === '조립대기') return '수정품 확인 후 조립 재개';
  if (state === '수정중') return /프로그램/.test(process + text) ? '수정 완료 후 테스트' : '수정 완료 후 재검증';
  if (state === '점검대기') return /구동|홈잉|레이저/.test(text) ? '점검 후 구동 재확인' : '점검 후 이상 유무 재확인';
  if (state === '테스트대기') return '테스트 후 완료 여부 판단';
  if (/소음/.test(text)) return '소음 확인 후 테스트·출고 판단';
  return '확인 완료 후 다음 공정 판단';
}
function summarizeCause_(resolution, note, process) {
  const r = String(resolution || '').trim();
  const n = String(note || '').trim();
  if (r) return r;
  if (n) return n;
  return process ? process + ' 이슈 확인 필요' : '원인 확인 필요';
}
function inferTone_(state, type, text) {
  if (/품질|quality_issue/.test((type + ' ' + text).toLowerCase())) return 'hot';
  if (/대기|지연|수정|점검/.test(state + ' ' + text)) return 'warn';
  return 'normal';
}
function inclusiveDays_(since, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '') || !/^\d{4}-\d{2}-\d{2}$/.test(today || '')) return 1;
  const a = new Date(since + 'T00:00:00+09:00');
  const b = new Date(today + 'T00:00:00+09:00');
  return Math.max(1, Math.floor((b - a) / 86400000) + 1);
}
function dateText_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return formatDate_(v, tz);
  if (typeof v === 'number' && isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400000);
    return formatDate_(new Date(ms), 'UTC');
  }
  const s = String(v == null ? '' : v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
function formatDate_(d, tz) { return Utilities.formatDate(d, tz || 'Asia/Seoul', 'yyyy-MM-dd'); }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1'; }
function normalizeCell_(v, tz) { if (Object.prototype.toString.call(v) === '[object Date]') return formatDate_(v, tz); return v; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
