// HandsFree Mobile REAL 0.3.3 — Korean presentation layer.
// Internal API/data codes stay unchanged. Only user-visible text is translated.
(function(){
  const phraseMap = [
    ['REAL 0.3.2 · V3 parity guarded Project Core','리얼 0.3.3 · V3 정합성 보호 프로젝트 운영엔진'],
    ['REAL 0.3.2 · V3 parity guarded Core','리얼 0.3.3 · V3 정합성 보호 운영엔진'],
    ['REAL 0.3 · Evidence-first Project Core','리얼 0.3 · 근거 우선 프로젝트 운영엔진'],
    ['Evidence-first Project Core','근거 우선 프로젝트 운영엔진'],
    ['Decision Inbox','판단함'],
    ['CURRENT OPERATION','현재 운영'],
    ['Assembly BLOCKED','조립 준비 미완료'],
    ['Assembly READY','조립 준비 완료'],
    ['Assembly UNKNOWN','조립 준비 확인 필요'],
    ['Assembly Ready','조립 준비도'],
    ['Flow BLOCKED','공정 흐름 보류'],
    ['Flow OPEN','공정 흐름 진행 가능'],
    ['Core Source','데이터 원본'],
    ['OS v3 인증 실시간 원장','핸즈프리 V3 인증 실시간 원장'],
    ['OS v3 비공개 운영 소스','핸즈프리 V3 비공개 운영 원본'],
    ['OS V3 LIVE','핸즈프리 V3 실시간'],
    ['OS v3 LIVE','핸즈프리 V3 실시간'],
    ['OS V3','핸즈프리 V3'],
    ['OS v3','핸즈프리 V3'],
    ['Google Sheets READ','구글 시트 읽기'],
    ['CORE READ','운영엔진 읽기'],
    ['PRIVATE SOURCE','비공개 원본'],
    ['REFERENCE READ','검증용 읽기'],
    ['READ ONLY','읽기 전용'],
    ['Project Lifecycle','프로젝트 전체 이력'],
    ['Project/Order ID','프로젝트/발주번호'],
    ['PROJECT / EVENT / ISSUE / CHANGE','프로젝트 / 이력 / 이슈 / 변경'],
    ['Event/Issue/Part/A-S','이력/이슈/부품/A/S'],
    ['Event, Change, Issue, Part, Vendor, A/S','이력, 변경, 이슈, 부품, 협력업체, A/S'],
    ['Next Gate','다음 공정'],
    ['다음 Gate','다음 공정'],
    ['핵심 Blocker','핵심 방해요인'],
    ['품질 Blocker','품질 방해요인'],
    ['Blocking condition','진행 방해 조건'],
    ['Write Gate','쓰기 검증 단계'],
    ['Project Core','프로젝트 운영엔진'],
    ['REAL Core','리얼 운영엔진'],
    ['Core 검색','운영엔진 검색'],
    ['Core 상세','운영엔진 상세'],
    ['Core 확인','운영엔진 확인'],
    ['Core 연결','운영엔진 연결'],
    ['Core 운영','운영엔진 운영'],
    ['LIVE · HandsFree 데이터 쓰기 경로 연결','실시간 · 핸즈프리 데이터 쓰기 경로 연결'],
    ['HandsFree Mobile','핸즈프리 모바일'],
    ['HF REAL','핸즈프리 리얼'],
    ['QUALITY_ISSUE','품질 문제'],
    ['DELAY_CAUSE','지연 원인'],
    ['PLAN_CHANGE','일정 변경'],
    ['RESOURCE_CAPA','인력 여력'],
    ['CUSTOMER_SCHEDULE','고객 일정'],
    ['SUPPLIER_INBOUND','협력업체 입고'],
    ['ACTUAL_DELIVERY','실제 출고'],
    ['PLANNED_DELIVERY','계획 납품'],
    ['PLAN-OVERLOAD','계획 과부하'],
    ['HIGH-RESOURCE','인력 영향 높음'],
    ['MEDIUM-RESOURCE','인력 영향 중간'],
    ['LOW-RESOURCE','인력 영향 낮음'],
    ['GROW','그로우'],
    ['Grow','그로우'],
    ['TODAY','오늘'],
    ['PROJECTS','프로젝트'],
    ['ISSUES','이슈'],
    ['SEARCH','검색'],
    ['PLAN · 기준 계획','기준 계획'],
    ['SUPPLY','자재/외주'],
    ['PRODUCTION','생산'],
    ['SHIPMENT','출고'],
    ['QUALITY','품질'],
    ['OPERATION','운영'],
    ['MONITOR','관찰중'],
    ['BLOCKED','막힘'],
    ['READY','준비완료'],
    ['UNKNOWN','확인필요'],
    ['OPEN','진행중'],
    ['CLOSED','종료'],
    ['CRITICAL','매우 높음'],
    ['HIGH','높음'],
    ['MEDIUM','중간'],
    ['LOW','낮음'],
    ['NORMAL','정상'],
    ['REFERENCE','검증용'],
    ['PRIVATE','비공개'],
    ['LIVE','실시간'],
    ['LOCK','잠금'],
    ['ACTUAL','작업 실적'],
    ['DELIVERY','출고 완료'],
    ['ISSUE','이슈'],
    ['CHANGE','변경'],
    ['EVENT','이력'],
    ['PROJECT','프로젝트'],
    ['CAPA','인력 여력'],
    ['FTE','인력환산'],
    ['FAT','공장인수검사'],
    ['SAT','현장인수검사'],
    ['Next:','다음:'],
    ['READ','읽기']
  ];

  function escapeRx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function translateText(value){
    let out=String(value ?? '');
    for(const [from,to] of phraseMap){
      out=out.replace(new RegExp(escapeRx(from),'g'),to);
    }
    return out;
  }

  function translateElement(el){
    if(!el || el.nodeType!==1) return;
    if(el.matches('script,style,code,pre,textarea')) return;
    for(const attr of ['placeholder','title','aria-label']){
      if(el.hasAttribute(attr)){
        const before=el.getAttribute(attr), after=translateText(before);
        if(after!==before) el.setAttribute(attr,after);
      }
    }
    for(const node of el.childNodes){
      if(node.nodeType===3){
        const before=node.nodeValue, after=translateText(before);
        if(after!==before) node.nodeValue=after;
      }else if(node.nodeType===1){
        translateElement(node);
      }
    }
  }

  function translateDocument(){
    document.title=translateText(document.title);
    translateElement(document.body);
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData'){
        const p=record.target.parentElement;
        if(p && !p.matches('script,style,code,pre,textarea')){
          const before=record.target.nodeValue, after=translateText(before);
          if(after!==before) record.target.nodeValue=after;
        }
      }
      for(const node of record.addedNodes){
        if(node.nodeType===1) translateElement(node);
        else if(node.nodeType===3){
          const before=node.nodeValue, after=translateText(before);
          if(after!==before) node.nodeValue=after;
        }
      }
    }
  });

  window.HF_KO={translateText,translateDocument};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{
    translateDocument(); observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  });
  else {
    translateDocument(); observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
})();
