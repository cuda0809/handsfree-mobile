// HandsFree Mobile REAL 0.5 — read-only mobile plan/history snapshot.
// Source: OS v3 connector read on 2026-09-11. This file is a fallback/reference
// only until authenticated LIVE Sheets read is enabled. It never writes data.
const AS_OF='2026-09-11';
const SOURCE='OS_V3_CONNECTOR_SNAPSHOT';

const planSegments=[
 {month:'2026-09',projectId:'LAB-260109K-004',customer:'데모기',model:'APM-20K (연속순환믹서)',due:'2026-09-16',pm:'이기환',purchase:'세니타리 입고대기',segments:[
  {from:'2026-09-01',to:'2026-09-15',process:'조립',note:'월간계획 기준 · 세니타리 입고대기 별도 확인'},
  {from:'2026-09-16',to:'2026-09-16',process:'출고예정'},
  {from:'2026-09-17',to:'2026-09-18',process:'테스트',note:'출고예정 이후 테스트 계획이 있어 일정 확인 필요'}]},
 {month:'2026-09',projectId:'260601A-039-01',customer:'트루메카(대덕전자)',model:'PDM - 1KV - A',due:'고객사 연기',pm:'김재석',purchase:'고객사 연기/PM협의',segments:[{from:'2026-09-03',to:'2026-09-03',process:'납품',status:'PM협의',note:'고객사 사정으로 일정 연기 · 납기 미정'}]},
 {month:'2026-09',projectId:'260601A-039-02',customer:'트루메카(대덕전자)',model:'PDM - 1KV - A',due:'고객사 연기',pm:'김재석',purchase:'고객사 연기/PM협의',segments:[{from:'2026-09-03',to:'2026-09-03',process:'납품',status:'PM협의',note:'고객사 사정으로 일정 연기 · 납기 미정'}]},
 {month:'2026-09',projectId:'260623A-043',customer:'미코',model:'KDM - 200 (Custom)',due:'2026-10-30',pm:'서정완',purchase:'일정 적합',segments:[
  {from:'2026-09-10',to:'2026-09-10',process:'자재수령'},{from:'2026-09-11',to:'2026-09-14',process:'조립'},{from:'2026-09-15',to:'2026-09-15',process:'전장'},{from:'2026-09-16',to:'2026-09-16',process:'프로그램'},{from:'2026-09-17',to:'2026-09-18',process:'테스트'},{from:'2026-09-21',to:'2026-09-21',process:'검수'}]},
 {month:'2026-09',projectId:'260626A-046',customer:'한국재료연구원',model:'KRM - 100D2',due:'2026-09-20',pm:'조나단',purchase:'입고 지연 재확인',segments:[
  {from:'2026-09-01',to:'2026-09-04',process:'조립'},{from:'2026-09-09',to:'2026-09-09',process:'전장',status:'일정연기',note:'전장 일정 09/07 → 09/09 연기 · 전장품 입고 지연'},{from:'2026-09-08',to:'2026-09-08',process:'프로그램'},{from:'2026-09-09',to:'2026-09-11',process:'테스트'},{from:'2026-09-14',to:'2026-09-14',process:'검수'},{from:'2026-09-18',to:'2026-09-18',process:'납품'}]},
 {month:'2026-09',projectId:'260630A-049',customer:'조인셋',model:'PDM - 10KV',due:'2026-10-28',pm:'김재석',purchase:'일정 적합',segments:[{from:'2026-09-30',to:'2026-09-30',process:'자재수령'}]},
 {month:'2026-09',projectId:'260708A-051',customer:'오랜드바이오',model:'PDM - 300C',due:'2026-09-18',pm:'서정완',purchase:'입고 지연 재확인',segments:[
  {from:'2026-09-01',to:'2026-09-01',process:'조립'},{from:'2026-09-02',to:'2026-09-02',process:'전장'},{from:'2026-09-03',to:'2026-09-03',process:'프로그램'},{from:'2026-09-04',to:'2026-09-04',process:'테스트'},{from:'2026-09-07',to:'2026-09-07',process:'검수'},{from:'2026-09-18',to:'2026-09-18',process:'납품'}]},
 {month:'2026-09',projectId:'260710A-052',customer:'미코',model:'KDM - 150',due:'2026-10-30',pm:'서정완',purchase:'조립 진행중 · 품질 수정 이슈',segments:[
  {from:'2026-09-04',to:'2026-09-04',process:'자재수령'},{from:'2026-09-07',to:'2026-09-08',process:'조립'},{from:'2026-09-09',to:'2026-09-09',process:'전장'},{from:'2026-09-10',to:'2026-09-10',process:'프로그램'},{from:'2026-09-11',to:'2026-09-14',process:'테스트'},{from:'2026-09-15',to:'2026-09-15',process:'검수',note:'43D/26D/82D 끼임·36D 동심 수정품 재검증 필요'}]},
 {month:'2026-09',projectId:'260714A-054',customer:'코스모스랩',model:'DCM - 20K',due:'2026-10-14',pm:'김형섭',purchase:'밀기 검토 +7일',segments:[{from:'2026-09-23',to:'2026-09-23',process:'자재수령'},{from:'2026-09-28',to:'2026-09-29',process:'조립'},{from:'2026-09-30',to:'2026-09-30',process:'자재수령',note:'계획 중복/순서 확인 필요'}]},
 {month:'2026-09',projectId:'260724A-059',customer:'나노실리칸첨단소재',model:'KMCLF - 120 (기류분급기)',due:'2026-10-22',pm:'서정완',purchase:'자재수령 계획 없음',segments:[]},
 {month:'2026-09',projectId:'260727A-060-01',customer:'재고 (SIC) -> 엘지화학',model:'KRM - 50B',due:'2026-09-30',pm:'조나단',purchase:'일정 적합',segments:[
  {from:'2026-09-16',to:'2026-09-16',process:'자재수령'},{from:'2026-09-17',to:'2026-09-17',process:'조립'},{from:'2026-09-18',to:'2026-09-18',process:'전장'},{from:'2026-09-21',to:'2026-09-22',process:'테스트'},{from:'2026-09-23',to:'2026-09-23',process:'검수'},{from:'2026-09-30',to:'2026-09-30',process:'납품'}]},
 ...['02','03','04','05'].map(n=>({month:'2026-09',projectId:`260727A-060-${n}`,customer:n==='02'?'재고 (Zirconia)-> (주)에프엠':n==='03'?'재고 (Zirconia)':'재고 (Steel+Crome)',model:'KRM - 50B',due:'2026-10-27',pm:'조나단',purchase:'일정 적합',segments:[{from:'2026-09-30',to:'2026-09-30',process:'자재수령'}]})),
 ...['01','02','03'].map(n=>({month:'2026-09',projectId:`260727A-061-${n}`,customer:'재고',model:'KDM - 200',due:'2026-10-29',pm:'서정완',purchase:'일정 적합',segments:[
  {from:'2026-09-11',to:'2026-09-11',process:'자재수령'},{from:'2026-09-14',to:'2026-09-15',process:'조립'},{from:'2026-09-16',to:'2026-09-17',process:'전장'},{from:'2026-09-18',to:'2026-09-18',process:'프로그램'},{from:'2026-09-21',to:n==='03'?'2026-09-22':'2026-09-23',process:'테스트'},{from:'2026-09-29',to:'2026-09-29',process:'검수'}]})),
 {month:'2026-09',projectId:'260728A-064',customer:'엔켓',model:'ATM - 0.5B',due:'2026-10-05',pm:'조나단',purchase:'일정 적합',segments:[{from:'2026-09-16',to:'2026-09-16',process:'자재수령'},{from:'2026-09-17',to:'2026-09-18',process:'조립'},{from:'2026-09-21',to:'2026-09-21',process:'전장'},{from:'2026-09-22',to:'2026-09-22',process:'프로그램'},{from:'2026-09-23',to:'2026-09-28',process:'테스트'},{from:'2026-09-30',to:'2026-09-30',process:'검수'}]},
 {month:'2026-09',projectId:'260731A-067',customer:'비츠로셀',model:'Slurry 이송 시스템',due:'2026-09-10',pm:'서정완',purchase:'자재수령 계획 없음',segments:[{from:'2026-09-02',to:'2026-09-02',process:'납품',status:'완료'}]}
];

const historySegments=[
 {month:'2026-08',projectId:'260601A-038',customer:'나노시스',model:'PDM - 500V',segments:[{from:'2026-08-25',to:'2026-08-25',process:'조립'},{from:'2026-08-27',to:'2026-08-27',process:'검수'},{from:'2026-08-30',to:'2026-08-30',process:'납품'}]},
 {month:'2026-08',projectId:'260601A-039-01',customer:'트루메카(대덕전자)',model:'PDM - 1KV - A',segments:[{from:'2026-08-14',to:'2026-08-14',process:'자재수령'},{from:'2026-08-18',to:'2026-08-19',process:'조립'},{from:'2026-08-20',to:'2026-08-21',process:'전장'},{from:'2026-08-24',to:'2026-08-24',process:'프로그램'},{from:'2026-08-25',to:'2026-08-25',process:'조립'},{from:'2026-08-26',to:'2026-08-26',process:'테스트'},{from:'2026-08-28',to:'2026-08-28',process:'검수'}]},
 {month:'2026-08',projectId:'260601A-039-02',customer:'트루메카(대덕전자)',model:'PDM - 1KV - A',segments:[{from:'2026-08-14',to:'2026-08-14',process:'자재수령'},{from:'2026-08-18',to:'2026-08-19',process:'조립'},{from:'2026-08-20',to:'2026-08-21',process:'전장'},{from:'2026-08-24',to:'2026-08-24',process:'프로그램'},{from:'2026-08-25',to:'2026-08-25',process:'조립'},{from:'2026-08-26',to:'2026-08-26',process:'테스트'},{from:'2026-08-28',to:'2026-08-28',process:'검수'}]},
 {month:'2026-08',projectId:'260611A-042',customer:'엠플러스',model:'PLS - 2KC',segments:[{from:'2026-08-03',to:'2026-08-04',process:'조립'},{from:'2026-08-05',to:'2026-08-05',process:'전장'},{from:'2026-08-06',to:'2026-08-06',process:'프로그램'},{from:'2026-08-07',to:'2026-08-07',process:'조립'},{from:'2026-08-10',to:'2026-08-10',process:'테스트'},{from:'2026-08-12',to:'2026-08-12',process:'검수'}]},
 {month:'2026-08',projectId:'260626A-046',customer:'한국재료연구원',model:'KRM - 100D2',segments:[{from:'2026-08-18',to:'2026-08-18',process:'자재수령'},{from:'2026-08-19',to:'2026-08-21',process:'조립'},{from:'2026-08-26',to:'2026-08-26',process:'자재수령'},{from:'2026-08-27',to:'2026-08-31',process:'조립'}]},
 {month:'2026-08',projectId:'260708A-051',customer:'오랜드바이오',model:'PDM - 300C',segments:[{from:'2026-08-28',to:'2026-08-28',process:'자재수령'},{from:'2026-08-31',to:'2026-08-31',process:'조립'}]},
 {month:'2026-08',projectId:'260731A-067',customer:'비츠로셀',model:'Slurry 이송 시스템',segments:[{from:'2026-08-25',to:'2026-08-25',process:'자재수령'},{from:'2026-08-26',to:'2026-08-26',process:'조립'},{from:'2026-08-27',to:'2026-08-27',process:'자재수령'},{from:'2026-08-28',to:'2026-08-28',process:'검수'}]},
 {month:'2026-08',projectId:'250717A-082',customer:'다이아덴트',model:'KRM 80B',segments:[{from:'2026-08-10',to:'2026-08-10',process:'자재수령'},{from:'2026-08-11',to:'2026-08-11',process:'조립'},{from:'2026-08-12',to:'2026-08-24',process:'테스트'},{from:'2026-08-25',to:'2026-08-25',process:'납품'}]}
];

const currentProducts=[
 ['LAB-260109K-004','데모기','APM-20K (연속순환믹서)','2026-09-16','영업제외 이기환 이성호 조용인 이기환','', '64% · 프로젝트업무진행 연관자 자동연동'],
 ['260601A-038','나노시스','PDM - 500V','2026-08-30','양석원 이기환 김재석','완료','계획 없음'],
 ['260601A-039-01','트루메카(대덕전자)','PDM - 1KV - A','고객사 연기','이현지 이성호 조용인 김재석','PM협의','100% · 고객사 사정으로 일정 연기 · 납기 미정'],
 ['260601A-039-02','트루메카(대덕전자)','PDM - 1KV - A','고객사 연기','이현지 이성호 조용인 김재석','PM협의','100% · 고객사 사정으로 일정 연기 · 납기 미정'],
 ['260623A-043','미코','KDM - 200 (Custom)','2026-10-30','이강석 이성호 조용인 서정완','','25%'],
 ['260626A-046','한국재료연구원','KRM - 100D2','2026-09-20','양석원 이승혜 장현준 노진호 조나단','','82%'],
 ['260630A-049','조인셋','PDM - 10KV','2026-10-28','본부장님 김태경 이성호 조용인 김재석','','0%'],
 ['260708A-051','오랜드바이오','PDM - 300C','2026-09-18','이재한 이현지 이성호 조용인 서정완','','83%'],
 ['260710A-052','미코','KDM - 150','2026-10-30','이재한 김정기 이성호 조용인 서정완','','75%'],
 ['260714A-054','코스모스랩','DCM - 20K','2026-10-14','부대표님 이현지 이상준 김은국 김형섭','','0%'],
 ['260724A-059','나노실리칸첨단소재','KMCLF - 120 (기류분급기)','2026-10-22','이재한 전영표 이상준 김은국 서정완','','계획 없음'],
 ['260727A-060-01','재고 (SIC) -> 엘지화학','KRM - 50B','2026-09-30','장현준 노진호 조나단','','0%'],
 ['260727A-060-02','재고 (Zirconia)-> (주)에프엠','KRM - 50B','2026-10-27','장현준 노진호 조나단','','0%'],
 ['260727A-060-03','재고 (Zirconia)','KRM - 50B','2026-10-27','장현준 노진호 조나단','','0%'],
 ['260727A-060-04','재고 (Steel+Crome)','KRM - 50B','2026-10-27','장현준 노진호 조나단','','0%'],
 ['260727A-060-05','재고 (Steel+Crome)','KRM - 50B','2026-10-27','장현준 노진호 조나단','','0%'],
 ['260727A-061-01','재고','KDM - 200','2026-10-29','이성호 조용인 서정완','','10%'],
 ['260727A-061-02','재고','KDM - 200','2026-10-29','이성호 조용인 서정완','','10%'],
 ['260727A-061-03','재고','KDM - 200','2026-10-29','이성호 조용인 서정완','','11%'],
 ['260728A-064','엔켓','ATM - 0.5B','2026-10-05','이재한 이승혜 장현준 김은국 조나단','','0%'],
 ['260731A-067','비츠로셀','Slurry 이송 시스템','2026-09-10','이영주 김태경 이상준 서정완','완료','100%'],
 ['260806A-067-03','재고 -> (주) 에프엠','IMX - 150','2026-10-27','장현준 김은국 서정완','','계획 없음'],
 ['260818A-069','노루페인트','PDM - 1KV','2026-11-10','이영주 이성호 김은국 김재석','','계획 없음'],
 ['260901A-072','카본티엔씨','Disper 분산기','2026-12-01','부대표님 이현지 이상준 노진호 김형섭','','계획 없음'],
 ['260908A-074','셀락바이오','PLM - 0.6K','2026-11-30','','운영중','계획 없음 · 담당자 근거 없음']
].map(([projectId,customer,model,due,people,state,detail])=>({type:'CURRENT_PRODUCT',projectId,customer,model,due,people,state,detail,source:'HF_VIEW_통합검색'}));

function flatPlan(list=planSegments){
 return list.flatMap(p=>(p.segments||[]).map((s,i)=>({type:'PLAN',month:p.month,projectId:p.projectId,customer:p.customer,model:p.model,due:p.due,pm:p.pm,purchase:p.purchase,date:s.from,endDate:s.to,process:s.process,status:s.status||null,detail:s.note||null,source:SOURCE,id:`${p.projectId}|${s.from}|${s.process}|${i}`})));
}
function flatHistory(){return historySegments.flatMap(p=>(p.segments||[]).map((s,i)=>({type:'HISTORY_PLAN',month:p.month,projectId:p.projectId,customer:p.customer,model:p.model,date:s.from,endDate:s.to,process:s.process,status:s.status||null,detail:s.note||null,source:'HF_VIEW_월간조회',id:`H|${p.projectId}|${s.from}|${s.process}|${i}`})));}

module.exports={AS_OF,SOURCE,planSegments,historySegments,currentProducts,flatPlan,flatHistory};
