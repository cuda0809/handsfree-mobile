const {planSegments,historySegments,AS_OF,SOURCE}=require('../../core/read-snapshot');
const norm=v=>String(v??'').toLowerCase().replace(/\s+/g,'');
module.exports=async(req,res)=>{
 const month=String(req.query?.month||'2026-09').trim();
 const q=norm(req.query?.q||'');
 const projectId=String(req.query?.projectId||'').trim();
 const all=[...planSegments,...historySegments];
 let plans=all.filter(x=>!month||x.month===month);
 if(projectId) plans=plans.filter(x=>x.projectId===projectId);
 if(q) plans=plans.filter(x=>norm(JSON.stringify(x)).includes(q));
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({ok:true,readOnly:true,asOf:AS_OF,source:{mode:'connector-snapshot',label:SOURCE,live:false},month,plans,count:plans.length});
};
