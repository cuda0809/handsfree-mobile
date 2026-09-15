/**
 * HandsFree REAL 0.8 — V2 Mobile SAFE WRITE Bridge (standalone)
 *
 * Add ONLY this file to the Apps Script project that currently serves
 * HF_REAL_LIVE_READ_V2 / the configured HF_REAL_READ_URL.
 *
 * It intentionally does NOT depend on HF_REAL_SAFE_WRITE_V081 being in the
 * same Apps Script project. It only validates the safety gate, appends the
 * canonical FIELD_INPUT queue row, and lets the existing SAFE WRITE queue
 * processor (same project or separate trigger project) process it.
 */
const HF_MOBILE_BRIDGE = Object.freeze({
  VERSION: 'HF_REAL_SAFE_WRITE_V081',
  SSID: '1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM',
  TZ: 'Asia/Seoul',
  TOKEN_KEY: 'HF_REAL_READ_TOKEN',
  QUEUE: 'HF_DATA_입력대기열',
  QUEUE_ID: 1907002003,
  NORM: 'HF_DATA_입력정규화',
  NORM_ID: 1907002006,
  SAFETY: 'HF_SYS_운영안전',
  SAFETY_ID: 1907002001
});

function doPost(e) {
  try {
    const cfg = HF_MOBILE_BRIDGE;
    const expected = PropertiesService.getScriptProperties().getProperty(cfg.TOKEN_KEY);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const supplied = String(body.token || '');

    if (!expected || supplied !== expected) {
      return hfMobileJson_({ok:false, schema:'HF_REAL_READ_V2', error:'unauthorized'});
    }
    if (String(body.op || '') !== 'safe_write') {
      return hfMobileJson_({ok:false, schema:'HF_REAL_READ_V2', error:'unsupported_operation'});
    }

    const raw = String(body.text || '').trim().slice(0, 1000);
    if (!raw) {
      return hfMobileJson_({ok:false, schema:'HF_REAL_READ_V2', error:'empty_text'});
    }

    const ss = SpreadsheetApp.openById(cfg.SSID);
    if (ss.getId() !== cfg.SSID) throw new Error('SAFE_GATE_SPREADSHEET_ID_MISMATCH');

    if (!/^OPEN\b/.test(hfMobileSafety_(ss, 'Field Input Safe Write'))) {
      return hfMobileJson_({
        ok:false,
        schema:'HF_REAL_READ_V2',
        error:'safe_write_not_ready',
        ack:'Field Input Safe Write가 OPEN이 아닙니다.'
      });
    }

    const q = hfMobileSheet_(ss, cfg.QUEUE, cfg.QUEUE_ID);
    const now = new Date();
    const day = Utilities.formatDate(now, cfg.TZ, 'yyyyMMdd');
    const targetHint = String(body.targetHint || '').trim().slice(0, 200);
    const dedupe = hfMobileSha256_(['FIELD_INPUT', day, hfMobileNorm_(targetHint), hfMobileNorm_(raw)].join('|'));
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(8000)) {
      return hfMobileJson_({ok:false, schema:'HF_REAL_READ_V2', error:'queue_lock_busy'});
    }
    let queueRow;
    let requestId;
    try {
    const prior = hfMobileFindDedupe_(q, dedupe);

    if (prior) {
      return hfMobileJson_({
        ok:true,
        schema:'HF_REAL_READ_V2',
        applied:false,
        status:'DUPLICATE',
        requestId:String(q.getRange(prior, 1).getDisplayValue() || ''),
        ack:'동일 내용이 오늘 이미 등록되어 중복 반영하지 않았습니다.'
      });
    }

    const requester = String(body.requester || 'Emotion').trim().slice(0, 80);
    const channel = String(body.source || 'MOBILE').trim().slice(0, 40);
    requestId =
      'HF-' + Utilities.formatDate(now, cfg.TZ, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 8);

    const payload = JSON.stringify({
      version: cfg.VERSION,
      source: 'FIELD_INPUT',
      inputSheet: 'MOBILE',
      inputRow: 0,
      raw: raw,
      channel: channel,
      requester: requester,
      targetHint: targetHint
    });

    queueRow = hfMobileBlankRow_(q, 2, 1);
    hfMobileEnsureRows_(q, queueRow);
    q.getRange(queueRow, 1, 1, 15).setValues([[
      requestId,
      hfMobileDt_(now),
      'FIELD_INPUT',
      requester || 'MOBILE_USER',
      payload,
      'QUEUED',
      dedupe,
      0,
      '', '', '', '', '',
      hfMobilePriority_(raw),
      '모바일 Queue 등록'
    ]]);
    SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    if (typeof processHandsFreeSafeWriteQueue === 'function') {
      try {
        processHandsFreeSafeWriteQueue();
        SpreadsheetApp.flush();
      } catch (_) {}
    }

    const qStatus = String(q.getRange(queueRow, 6).getDisplayValue() || 'QUEUED');
    const qResult = String(q.getRange(queueRow, 12).getDisplayValue() || '');
    const qError = String(q.getRange(queueRow, 13).getDisplayValue() || '');
    const qAck = String(q.getRange(queueRow, 15).getDisplayValue() || '');

    if (qStatus === 'FAILED') {
      return hfMobileJson_({
        ok:false,
        schema:'HF_REAL_READ_V2',
        error:qError || 'safe_write_failed',
        status:'FAILED',
        requestId:requestId,
        ack:qAck || qResult
      });
    }

    const normStatus = hfMobileNormStatus_(ss, requestId);
    const finalStatus = normStatus || qStatus || 'QUEUED';
    if (finalStatus === 'FAILED') {
      return hfMobileJson_({
        ok:false,
        schema:'HF_REAL_READ_V2',
        error:qError || 'safe_write_failed',
        status:'FAILED',
        requestId:requestId,
        ack:qAck || qResult
      });
    }
    return hfMobileJson_({
      ok:true,
      schema:'HF_REAL_READ_V2',
      applied:finalStatus === 'WRITTEN',
      status:finalStatus,
      requestId:requestId,
      ack:qAck || qResult || (finalStatus === 'QUEUED' ? '접수완료 · SAFE WRITE 처리대기' : finalStatus)
    });

  } catch (err) {
    return hfMobileJson_({
      ok:false,
      schema:'HF_REAL_READ_V2',
      error:String(err && err.message ? err.message : err)
    });
  }
}

function hfMobileNormStatus_(ss, requestId) {
  const sh = hfMobileSheet_(ss, HF_MOBILE_BRIDGE.NORM, HF_MOBILE_BRIDGE.NORM_ID);
  const last = sh.getLastRow();
  if (last < 2) return '';
  const values = sh.getRange(2, 1, last - 1, 18).getDisplayValues();
  let status = '';
  values.forEach(r => {
    if (String(r[0] || '').indexOf(requestId + '-E') === 0) {
      const s = String(r[17] || '');
      if (s === 'FAILED') status = 'FAILED';
      else if (s === 'REVIEW' && status !== 'FAILED') status = 'REVIEW';
      else if (s === 'EXCLUDED' && !['FAILED','REVIEW'].includes(status)) status = 'EXCLUDED';
      else if (s === 'WRITTEN' && !status) status = 'WRITTEN';
    }
  });
  return status;
}

function hfMobileSafety_(ss, key) {
  const sh = hfMobileSheet_(ss, HF_MOBILE_BRIDGE.SAFETY, HF_MOBILE_BRIDGE.SAFETY_ID);
  const last = sh.getLastRow();
  if (last < 1) return '';
  const values = sh.getRange(1, 1, last, 2).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === key) return String(values[i][1] || '');
  }
  return '';
}

function hfMobileSheet_(ss, name, id) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('MISSING_SHEET:' + name);
  if (id != null && sh.getSheetId() !== id) throw new Error('SHEET_ID_MISMATCH:' + name);
  return sh;
}

function hfMobileFindDedupe_(sh, key) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const values = sh.getRange(2, 7, last - 1, 1).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0] || '') === key) return i + 2;
  }
  return 0;
}

function hfMobileBlankRow_(sh, start, col) {
  const n = Math.max(sh.getMaxRows() - start + 1, 1);
  const values = sh.getRange(start, col, n, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (!String(values[i][0] || '').trim()) return start + i;
  }
  return sh.getMaxRows() + 1;
}

function hfMobileEnsureRows_(sh, row) {
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), Math.max(100, row - sh.getMaxRows()));
}

function hfMobilePriority_(raw) {
  return /긴급|즉시|오늘중|납기임박|출고막힘|라인정지/.test(hfMobileNorm_(raw)) ? 'HIGH' : 'NORMAL';
}

function hfMobileNorm_(v) {
  return String(v == null ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim();
}

function hfMobileSha256_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  return bytes.map(x => ('0' + (x < 0 ? x + 256 : x).toString(16)).slice(-2)).join('');
}

function hfMobileDt_(d) {
  return Utilities.formatDate(d, HF_MOBILE_BRIDGE.TZ, 'yyyy-MM-dd HH:mm:ss z');
}

function hfMobileJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
