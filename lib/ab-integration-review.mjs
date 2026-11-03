// Read-only reconciliation. This module never writes operational data or assigns IDs.
const text=v=>String(v??'').trim();
export function prepareABReview(audit){
 const rows=[],seen=new Set(),ids=new Set();
 for(const source of audit.rows){
  const team=text(source.team);if(!['A','B'].includes(team))continue;
  const row={...source,canonicalJob:text(source.normalizedJob),action:source.projectId?'KEEP':'ADD_REVIEW',sourceRefs:[`생산DB!${source.sourceRow}`]};
  if(row.sourceRow===150&&row.canonicalJob==='260626A-044-01'){
   row.canonicalJob='260626A-044-02';row.projectId=null;row.action='SPLIT_REVIEW';
   row.review='사용자 확인: 01/02 별도 장비. 260611 표기는 별도 원본 참조로 보존; 날짜·상태 승계 금지';
  }
  if(row.canonicalJob==='260623A-042'){
   const prior=(audit.coreOnly||[]).filter(x=>x.job==='260611A-042'&&x.team===team&&text(x.customer)===text(row.customer)&&text(x.model)===text(row.model));
   if(prior.length!==1)throw Error('unresolved_042_identity');
   row.projectId=prior[0].projectId;row.canonicalJob=prior[0].job;row.action='KEEP_ALIAS_REVIEW';
   row.review='작업번호 충돌: 기존 Project_ID/작업번호 유지, 원본 번호를 별칭 근거로 보존';
  }
  if(!row.canonicalJob||seen.has(row.canonicalJob))throw Error('duplicate_review_job');
  seen.add(row.canonicalJob);
  if(row.projectId){if(ids.has(row.projectId))throw Error('duplicate_review_project_id');ids.add(row.projectId);}
  rows.push(row);
 }
 const counts={A:0,B:0},actions={};
 for(const row of rows){counts[row.team]++;actions[row.action]=(actions[row.action]||0)+1;}
 return {status:'SHADOW_ONLY_NOT_APPLIED',sourceCheckedAt:audit.checkedAt,counts,actions,rows,
  limitations:['적용 직전 최신 원본·Core·제품마스터 재대조 필요','현재 상태·실출고일·Project_ID를 생성하지 않음','건수는 대조된 작업번호 행 수이며 제작완료 대수가 아님']};
}

// Selection is a view filter; it does not grant or revoke access rights.
export function selectABRows(rows,selection='B'){
 if(!['A','B','ALL'].includes(selection))throw Error('invalid_team_selection');
 return rows.filter(x=>selection==='ALL'?['A','B'].includes(text(x.team)):text(x.team)===selection);
}
