const {getCore}=require('../../core/provider');
module.exports=async(req,res)=>{const core=await getCore({force:String(req.query?.refresh||'')==='1'});res.setHeader('Cache-Control','no-store');res.status(200).json({ok:true,source:core.sourceHealth(),capacity:core.currentCapacity()});};
