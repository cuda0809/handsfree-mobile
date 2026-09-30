/** HandsFree CORE unified-operation sync
 * Source of truth for app READ: HF_CORE_통합운영
 * - 1 JOB NO. = 1 equipment lifecycle row.
 * - Preserve Project_ID once assigned.
 * - External source sheets are read-only.
 * - HandsFree EVENT/AUDIT remain append-only history.
 * Install into the existing HandsFree Apps Script project, then run setupHfCoreSyncTriggers() once.
 */
var HF_CORE_SYNC=Object.freeze({
  TARGET_ID:'1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM',
  WEEKLY_ID:'1HXkpUZRfQtmxiKOv58yI50D985hryjWCidgFdDWA4Zg',
  CORE:'HF_CORE_통합운영',
  SOURCES:'HF_SYS_연동소스',
  LOG:'HF_SYS_동기화로그',
  ISSUE:'HF_DATA_이슈원장',
  TZ:'Asia/Seoul'
});

function setupHfCoreSyncTriggers(){
  ['hfCoreDailySync','hfCoreSourceWatch'].forEach(function(name){
    ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()===name)ScriptApp.deleteTrigger(t);});
  });
  ScriptApp.newTrigger('hfCoreDailySync').timeBased().atHour(6).nearMinute(30).everyDays(1).create();
  ScriptApp.newTrigger('hfCoreSourceWatch').timeBased().everyHours(2).create();
  PropertiesService.getScriptProperties().setProperty('HF_CORE_SYNC_INSTALLED_AT',new Date().toISOString());
  return hfCoreDailySync();
}

function hfCoreDailySync(){return hfCoreSync_('DAILY_FULL');}

function hfCoreSourceWatch(){
  var props=PropertiesService.getScriptProperties(),file=DriveApp.getFileById(HF_CORE_SYNC.WEEKLY_ID);
  var modified=file.getLastUpdated().toISOString(),prior=props.getProperty('HF_WEEKLY_SOURCE_MODIFIED')||'';
  if(prior===modified)return {ok:true,skipped:true,reason:'source_unchanged',modified:modified};
  var result=hfCoreSync_('SOURCE_CHANGED');
  if(result&&result.ok)props.setProperty('HF_WEEKLY_SOURCE_MODIFIED',modified);
  return result;
}

function hfCoreSync_(mode){
  var started=new Date(),syncId='CORE-'+Utilities.formatDate(started,HF_CORE_SYNC.TZ,'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,6);
  var target=SpreadsheetApp.openById(HF_CORE_SYNC.TARGET_ID),weekly=SpreadsheetApp.openById(HF_CORE_SYNC.WEEKLY_ID);
  try{
    var prod=hfCoreRows_(weekly,'생산DB',13,26);
    var sched=hfCoreRows_(weekly,'생산일정',11,12);
    var purch=hfCoreRows_(weekly,'구매진행 현황',6,23);
    var elec=hfCoreRows_(weekly,'생산기술전장품',8,21);
    var qual=hfCoreRows_(weekly,'품질관리',9,26);
    var proj=hfCoreRows_(weekly,'프로젝트 업무진행 현황',11,11);
    var pm=hfCoreRows_(weekly,'PM팀',1,7);
    var rnd=hfCoreRows_(weekly,'연구소',1,9);
    var issue=hfCoreRows_(target,HF_CORE_SYNC.ISSUE,2,19);

    var schedMap=hfCoreMap_(sched,3),purchMap=hfCoreMap_(purch,2),elecMap=hfCoreMap_(elec,3),qualMap=hfCoreMap_(qual,3),projMap=hfCoreMap_(proj,1);
    var issueMap={};issue.forEach(function(r){
      var job=String(r[3]||'').trim(),status=String(r[8]||'');
      if(!job||/-\*$/.test(job)||['OPEN','MONITOR','CLOSED'].indexOf(status)<0)return;
      var prev=issueMap[job];if(!prev||String(r[9]||'')>=String(prev[9]||''))issueMap[job]=r;
    });

    var existing=hfCoreExistingIds_(target),base={},ordered=[];
    prod.forEach(function(r){var job=String(r[3]||'').trim();if(!hfCoreValidJob_(job)||base[job])return;base[job]={kind:'PROD',row:r};ordered.push(job);});
    pm.forEach(function(r){var job=String(r[0]||'').trim();if(!hfCoreValidJob_(job)||base[job])return;base[job]={kind:'PM',row:r};ordered.push(job);});
    rnd.forEach(function(r){var job=String(r[1]||'').trim();if(!hfCoreValidJob_(job)||base[job])return;base[job]={kind:'RND',row:r};ordered.push(job);});

    var nowText=Utilities.formatDate(new Date(),HF_CORE_SYNC.TZ,'yyyy-MM-dd HH:mm:ss'),out=[],conflicts=0;
    ordered.forEach(function(job){
      var src=base[job],b=src.kind==='PROD'?src.row:[],s=schedMap[job],p=purchMap[job],e=elecMap[job],q=qualMap[job],pr=projMap[job],i=issueMap[job];
      var pmRow=src.kind==='PM'?src.row:null,rndRow=src.kind==='RND'?src.row:null;
      var projectId=existing[job]||('PRJ-'+Utilities.getUuid().slice(0,8).toUpperCase());
      var team=String(b[1]||pmRow&&pmRow[1]||''),customer=String(b[4]||pmRow&&pmRow[2]||''),model=String(b[5]||pmRow&&pmRow[3]||rndRow&&rndRow[2]||'');
      var qty=String(b[6]||''),due=String(b[8]||pmRow&&pmRow[4]||''),pmName=String(pr&&pr[6]||b[2]||''),design=String(pr&&pr[7]||''),buyer=String(p&&p[5]||pr&&pr[8]||''),production=String(pr&&pr[9]||''),quality=String(pr&&pr[10]||'');
      var scheduleState=String(s&&s[9]||''),hfState=String(i&&i[16]||''),currentState=hfState||scheduleState||String(rndRow&&rndRow[4]||'');
      var nextAction=String(i&&i[18]||''),currentIssue=String(i&&(i[10]||i[15])||pmRow&&pmRow[5]||rndRow&&rndRow[7]||'');
      var shipment=String(s&&s[10]||''),completed=!!shipment||/출고\s*완료|납품\s*완료/.test(hfState+' '+scheduleState);
      var currentStage=completed?'출고':hfCoreStage_(i&&i[6],currentState,nextAction,e);
      if(completed){currentState='출고완료';nextAction='';}
      var qualityState=String(q&&q[11]||'')||(String(q&&q[9]||'').trim()?'검수완료':'');
      var purchaseProgress=hfCorePurchasePct_(p)||String(b[17]||''),missing=String(p&&p[21]||'');
      var confidence=completed?'HIGH·CLOSED':i?'HIGH·HF_CURRENT':(s||p||e||q)?'MEDIUM·MULTI_SOURCE':src.kind==='PROD'?'BASE_ONLY':'PARTIAL_SOURCE';
      if(hfState&&scheduleState&&hfCoreNorm_(hfState)!==hfCoreNorm_(scheduleState)){confidence+='·SOURCE_CONFLICT';conflicts++;}
      if(Number(qty)>1&&!/-\d+$/.test(job))confidence+='·CHECK_QTY_SPLIT';

      out.push([
        projectId,job,team,customer,model,qty,due,pmName,design,buyer,production,quality,
        hfCoreDesignState_(b),String(b[11]||''),String(b[13]||''),String(b[14]||''),
        String(p&&p[7]||b[15]||''),String(p&&p[8]||b[16]||''),purchaseProgress,missing,
        String(b[22]||b[21]||''),String(b[25]||''),String(e&&e[16]||''),String(e&&e[20]||''),qualityState,
        completed?'출고완료':scheduleState,currentStage,currentState,nextAction,currentIssue,
        String(pmRow&&pmRow[5]||rndRow&&rndRow[6]||''),'',
        String(b[23]||''),String(e&&e[14]||''),String(e&&e[18]||''),String(q&&q[8]||''),String(b[8]||''),shipment,
        confidence,nowText
      ]);
    });

    var core=target.getSheetByName(HF_CORE_SYNC.CORE);if(!core)throw Error('missing_core_sheet');
    if(core.getLastRow()>1)core.getRange(2,1,core.getLastRow()-1,40).clearContent();
    if(out.length){if(core.getMaxRows()<out.length+1)core.insertRowsAfter(core.getMaxRows(),out.length+1-core.getMaxRows());core.getRange(2,1,out.length,40).setValues(out);}
    hfCoreMarkSources_(target,nowText,'SUCCESS');
    hfCoreLog_(target,[syncId,started.toISOString(),new Date().toISOString(),mode,'MULTI_SOURCE',String(prod.length),String(out.length),String(out.length),String(conflicts),'SUCCESS','','AppsScript']);
    SpreadsheetApp.flush();
    return {ok:true,syncId:syncId,mode:mode,rows:out.length,conflicts:conflicts};
  }catch(err){
    try{hfCoreMarkSources_(target,Utilities.formatDate(new Date(),HF_CORE_SYNC.TZ,'yyyy-MM-dd HH:mm:ss'),'ERROR');hfCoreLog_(target,[syncId,started.toISOString(),new Date().toISOString(),mode,'MULTI_SOURCE','','','','','ERROR',String(err&&err.message||err),'AppsScript']);}catch(_){}
    throw err;
  }
}

function hfCoreRows_(ss,name,startRow,cols){var sh=ss.getSheetByName(name);if(!sh)return[];var last=sh.getLastRow();if(last<startRow)return[];return sh.getRange(startRow,1,last-startRow+1,Math.min(cols,sh.getMaxColumns())).getDisplayValues();}
function hfCoreValidJob_(v){return /^[A-Z]{0,4}-?\d{6}[A-Z]?-?\d{3}(?:-\d+|-REPARE)?$/i.test(String(v||'').trim())||/^LAB-\d+/i.test(String(v||'').trim())||/^PT-\d+/i.test(String(v||'').trim());}
function hfCoreMap_(rows,index){var out={};rows.forEach(function(r){var k=String(r[index]||'').trim();if(k&&hfCoreValidJob_(k))out[k]=r;});return out;}
function hfCoreNorm_(v){return String(v||'').toLowerCase().replace(/[\s\-_/().·]/g,'');}
function hfCorePurchasePct_(r){if(!r)return'';var total=Number(String(r[19]||'').replace(/[^\d.-]/g,'')),got=Number(String(r[20]||'').replace(/[^\d.-]/g,''));return isFinite(total)&&total>0&&isFinite(got)?Math.round(got/total*1000)/10+'%':'';}
function hfCoreDesignState_(r){if(!r||!r.length)return'';if(String(r[12]||'').indexOf('완료')>=0||String(r[13]||'').trim())return'완료';if(String(r[10]||'').trim()||String(r[11]||'').trim())return'진행';return'대기';}
function hfCoreStage_(issueProcess,state,next,e){var t=hfCoreNorm_([state,next,issueProcess].join(' '));if(/출고|납품|포장/.test(t))return'출고';if(/검수|점검|테스트|시험/.test(t))return'검수';if(/프로그램|프로그래밍/.test(t))return'프로그램';if(/전장|배선|전기/.test(t))return'전장';if(/조립|갭|세팅|기구/.test(t))return'조립';if(/설계/.test(t))return'설계';if(/자재|입고|구매/.test(t))return'자재';if(e&&String(e[20]||'').indexOf('완료')>=0)return'검수';return String(issueProcess||'');}
function hfCoreExistingIds_(ss){var sh=ss.getSheetByName(HF_CORE_SYNC.CORE),out={};if(!sh||sh.getLastRow()<2)return out;sh.getRange(2,1,sh.getLastRow()-1,2).getDisplayValues().forEach(function(r){var id=String(r[0]||''),job=String(r[1]||'');if(id&&job)out[job]=id;});return out;}
function hfCoreMarkSources_(ss,when,status){var sh=ss.getSheetByName(HF_CORE_SYNC.SOURCES);if(!sh||sh.getLastRow()<2)return;var vals=sh.getRange(2,1,sh.getLastRow()-1,16).getDisplayValues();vals.forEach(function(r,i){if(String(r[1]).toUpperCase()==='TRUE'){sh.getRange(i+2,14).setValue(when);sh.getRange(i+2,15).setValue(status);}});}
function hfCoreLog_(ss,row){var sh=ss.getSheetByName(HF_CORE_SYNC.LOG);if(!sh)return;sh.appendRow(row);}
