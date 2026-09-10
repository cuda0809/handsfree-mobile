const {getCore}=require('../core/provider');
module.exports=async(req,res)=>{const core=await getCore();res.setHeader('Cache-Control','no-store');res.status(200).json({ok:true,mode:core.sourceHealth().mode,readOnly:true,now:core.AS_OF,metrics:core.metrics(),data:core.activeProjects().map(core.toLegacy),source:core.sourceHealth()});};
