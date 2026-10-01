'use strict';
const GUEST_END=Date.parse('2026-10-11T10:30:00+09:00');
let guestDeadline=0,guestVerified=false;
const guestItems=[
{orderId:'DEMO-AMP20K',issueId:'DEMO-I1',customer:'데모 프로젝트',model:'AMP 20K',process:'검수 완료',state:'출고 대기',nextAction:'출고 일정 확인',priority:2,since:'2026-10-01',days:0,cause:'샘플: 최종 포장 및 출고일 확인',due:'2026-10-04',issueStatus:'OPEN'},
{orderId:'DEMO-KRM100D',issueId:'DEMO-I2',customer:'내부 개선 샘플',model:'KRM-100D',process:'프로그램',state:'프로그램 수정 대기',nextAction:'ADC 방식 검토',priority:1,since:'2026-10-01',days:0,cause:'샘플: 갭 세팅 기준 검토',due:'2026-10-06',issueStatus:'OPEN'},
{orderId:'DEMO-KRM80',issueId:'DEMO-I3',customer:'샘플 장비',model:'KRM-80',process:'조립 완료',state:'검수 대기',nextAction:'검수 기준 확인',priority:2,since:'2026-10-01',days:0,cause:'샘플: 최종 검수 예정',due:'2026-10-08',issueStatus:'MONITOR'}];
const guestReady=(async()=>{try{const r=await fetch('./clock',{cache:'no-store'});if(r.status===410){document.getElementById('guestLoading').hidden=true;document.getElementById('guestExpired').hidden=false;return false;}if(!r.ok)throw Error('clock');const c=await r.json();if(c.expiresAt!==GUEST_END||!Number.isFinite(c.now))throw Error('clock');guestDeadline=performance.now()+Math.max(0,GUEST_END-c.now);guestVerified=true;return true;}catch{document.getElementById('guestLoading').textContent='사용기한을 확인하지 못했습니다. 인터넷 연결 후 새로고침해 주세요.';return false;}})();
async function guestApi(route,body={}){
if(!await guestReady||!guestVerified||performance.now()>=guestDeadline)throw Object.assign(Error('guest_expired'),{status:410,data:{error:'guest_expired'}});
if(route==='/api/sa2-real-status')return {ok:true,live:true,test:true,coreRead:true,sourceLatestDate:'2026-10-01 · 심사용 샘플',currentStatus:structuredClone(guestItems)};
if(route==='/api/sa2-lifecycle'&&body.action==='plans'){const x=guestItems.find(i=>i.orderId===body.orderId);const stages=x?[{date:'2026-10-01',start:'2026-10-01',end:'2026-10-02',process:'조립',status:'샘플 계획',sourceMonth:'2026-10',editable:false,blockedReason:'edit_gate_closed'},{date:x.due,start:x.due,end:x.due,process:'출고',status:'샘플 계획',sourceMonth:'2026-10',editable:false,blockedReason:'edit_gate_closed'}]:[];return {ok:true,orderId:body.orderId,records:stages,plans:stages,editingAvailable:false};}
if(route==='/api/sa2-app'&&body.action==='catalog')return {ok:true,projects:structuredClone(guestItems),issues:structuredClone(guestItems)};
if(route==='/api/sa2-app'&&body.action==='history')return {ok:true,orderId:body.orderId,events:[{at:'2026-10-01 10:30 KST',actor:'심사용 샘플',raw:'샘플 장비의 계획과 현재 상태를 연결했습니다.\n운영 기록이 아닙니다.'}]};
if(route==='/api/sa2-app'&&body.action==='reports')return {ok:true,monthly:[['연도','월','수량'],['2026','09','3'],['2026','10','2']],annual:[['연도','종류','수량'],['2025','샘플 장비','12']],support:[['연도','월','인원'],['2026','09','2'],['2026','10','1']]};
throw Object.assign(Error('guest_read_only'),{status:403,data:{error:'guest_read_only'}});
}
