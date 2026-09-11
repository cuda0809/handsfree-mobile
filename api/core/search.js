const {getCore}=require('../../core/provider');
const {currentProducts,flatPlan,flatHistory,AS_OF:SNAP_AS_OF}=require('../../core/read-snapshot');
const norm=v=>String(v??'').toLowerCase().replace(/[()\[\]{}.,/\\_-]/g,' ').replace(/\s+/g,' ').trim();
const tokens=q=>norm(q).split(' ').filter(Boolean);
const matches=(x,ts)=>{const h=norm(JSON.stringify(x));return ts.length&&ts.every(t=>h.includes(t));};
const uniq=(list,keyFn)=>{const seen=new Set();return list.filter(x=>{const k=keyFn(x);if(seen.has(k))return false;seen.add(k);return true;});};
module.exports=async(req,res)=>{
 const core=await getCore(),q=String(req.query?.q||'').trim(),ts=tokens(q);
 const pick=list=>q?(list||[]).filter(x=>matches(x,ts)):[];
 const projects=pick(core.projects),events=pick(core.events),issues=pick(core.issues),changes=pick(core.changes),capacity=pick(core.capacity);
 const records=uniq([
   ...pick(currentProducts),...pick(flatPlan()),...pick(flatHistory())
 ],x=>`${x.type}|${x.id||x.projectId}|${x.date||x.due||''}|${x.process||''}`);
 const count=projects.length+events.length+issues.length+changes.length+capacity.length+records.length;
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({ok:true,mode:core.sourceHealth().mode,readOnly:true,asOf:core.AS_OF||SNAP_AS_OF,query:q,projects,events,issues,changes,capacity,records,count,source:core.sourceHealth(),snapshotAsOf:SNAP_AS_OF});
};
