// HandsFree Mobile REAL 0.4.1 — mobile append-only queue gate.
// POST never writes an operational ledger directly. It may only append to
// HF_DATA_입력대기열 after LIVE read parity + Sheet safety gates pass.
const parityHandler=require('./parity');
const queue=require('../../core/google-sheets-queue');

async function paritySnapshot(){
  let payload=null,statusCode=200;
  const fakeRes={
    setHeader(){},
    status(code){statusCode=code;return this;},
    json(value){payload=value;return this;}
  };
  await parityHandler({query:{refresh:'1'}},fakeRes);
  return {statusCode,payload:payload||{ok:false,readyForWriteGate:false}};
}
function method(req){return String(req.method||'GET').toUpperCase();}
function safeGate(gate){
  if(!gate)return null;
  return {ok:Boolean(gate.ok),reasons:gate.reasons||[],checks:gate.checks||{}};
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex');
  try{
    const verb=method(req);
    if(!['GET','POST'].includes(verb)){
      res.setHeader('Allow','GET, POST');
      return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    }
    const parity=await paritySnapshot();
    let sheetGate=null;
    try{sheetGate=await queue.gateEvidence();}
    catch(e){sheetGate={ok:false,reasons:['SHEET_GATE_READ_FAILED'],checks:{credentials:queue.credentialConfigured()},error:e.message};}
    const readyForAppend=Boolean(parity.payload?.readyForWriteGate&&sheetGate?.ok);

    if(verb==='GET'){
      return res.status(200).json({
        ok:true,
        state:readyForAppend?'READY':'LOCKED',
        target:queue.QUEUE_SHEET,
        mode:'APPEND_ONLY',
        readyForAppend,
        parity:{ok:Boolean(parity.payload?.ok),live:Boolean(parity.payload?.live),readyForWriteGate:Boolean(parity.payload?.readyForWriteGate),source:parity.payload?.source||null},
        sheetGate:safeGate(sheetGate),
        rules:['NO_DIRECT_LEDGER_WRITE','LIVE_READ_REQUIRED','PARITY_PASS_REQUIRED','INTEGRITY_PASS_REQUIRED','CORE_CHECK_PASS_REQUIRED','QUEUE_HEADER_CONTRACT_REQUIRED','EXPLICIT_WRITE_SWITCH_REQUIRED']
      });
    }

    let input;
    try{input=queue.normalizeInput(req.body||{});}
    catch(e){return res.status(400).json({ok:false,error:'INVALID_REQUEST',message:e.message});}

    if(req.body?.dryRun===true){
      return res.status(200).json({
        ok:readyForAppend,
        dryRun:true,
        state:readyForAppend?'READY':'LOCKED',
        target:queue.QUEUE_SHEET,
        validated:{source:input.source,requester:input.requester,kind:input.kind,priority:input.priority,dedupeKey:input.dedupeKey},
        parity:{ok:Boolean(parity.payload?.ok),live:Boolean(parity.payload?.live),readyForWriteGate:Boolean(parity.payload?.readyForWriteGate),source:parity.payload?.source||null},
        sheetGate:safeGate(sheetGate)
      });
    }

    if(!readyForAppend){
      return res.status(423).json({
        ok:false,error:'WRITE_GATE_LOCKED',state:'LOCKED',target:queue.QUEUE_SHEET,
        parity:{ok:Boolean(parity.payload?.ok),live:Boolean(parity.payload?.live),readyForWriteGate:Boolean(parity.payload?.readyForWriteGate),source:parity.payload?.source||null},
        sheetGate:safeGate(sheetGate)
      });
    }
    const result=await queue.enqueue(req.body||{});
    return res.status(result.duplicate?200:202).json({ok:true,...result,target:queue.QUEUE_SHEET,mode:'APPEND_ONLY'});
  }catch(e){
    const locked=e?.code==='WRITE_GATE_LOCKED';
    return res.status(locked?423:500).json({ok:false,error:locked?'WRITE_GATE_LOCKED':'QUEUE_GATE_ERROR',message:e.message,gate:safeGate(e.gate)});
  }
};
