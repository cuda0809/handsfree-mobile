/**
 * HandsFree REAL 0.7 — Apps Script read-only bridge
 * Bound to the private "핸즈프리 OS 버전 3" spreadsheet.
 * Deploy as Web app: Execute as Me / Who has access: Anyone.
 * Access is still protected by a high-entropy token stored in Script Properties.
 */
const HF_SCHEMA = 'HF_REAL_READ_V1';
const HF_SPREADSHEET_ID = '11Wb6Xrh3b917d_cP1r8qj0SuemY9tLOQwnlY6Is8ulw';
const HF_TOKEN_KEY = 'HF_REAL_READ_TOKEN';

const HF_TABLES = {
  productRows:  {sheet:'제품마스터', startRow:4, cols:12, maxRow:1100},
  workRows:     {sheet:'업무이력', startRow:7, cols:9, maxRow:220},
  issueRows:    {sheet:'HF_DATA_이슈원장', startRow:1, cols:16, maxRow:1000},
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

function doGet(e) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty(HF_TOKEN_KEY);
    const supplied = e && e.parameter ? String(e.parameter.token || '') : '';
    if (!expected || supplied !== expected) return json_({ok:false, schema:HF_SCHEMA, error:'unauthorized'});

    const ss = SpreadsheetApp.openById(HF_SPREADSHEET_ID);
    const tz = ss.getSpreadsheetTimeZone() || 'Asia/Seoul';
    const tables = {};
    Object.keys(HF_TABLES).forEach(key => tables[key] = readTable_(ss, HF_TABLES[key], tz));

    return json_({
      ok:true,
      schema:HF_SCHEMA,
      spreadsheetId:HF_SPREADSHEET_ID,
      timezone:tz,
      today:Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
      generatedAt:Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      tables:tables,
      counts:Object.fromEntries(Object.keys(tables).map(k => [k, Math.max(0, tables[k].length - 1)]))
    });
  } catch (err) {
    return json_({ok:false, schema:HF_SCHEMA, error:String(err && err.message ? err.message : err)});
  }
}

function readTable_(ss, cfg, tz) {
  const sheet = ss.getSheetByName(cfg.sheet);
  if (!sheet) throw new Error('Missing sheet: ' + cfg.sheet);
  const last = Math.min(Math.max(cfg.startRow, sheet.getLastRow()), cfg.maxRow);
  const rows = sheet.getRange(cfg.startRow, 1, last - cfg.startRow + 1, cfg.cols).getValues();
  return rows.map(row => row.map(v => normalizeCell_(v, tz)));
}

function normalizeCell_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
