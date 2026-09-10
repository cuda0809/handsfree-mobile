const {AS_OF,projects,decisions,metrics,toLegacy,openIssues} = require('../../core/data');

module.exports = (req,res) => {
  const decisionItems = decisions().slice(0,5).map(d => ({
    id:d.id,
    projectId:d.projectId,
    severity:d.severity,
    title:d.title,
    decision:d.decision,
    nextAction:d.nextAction
  }));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    mode:'core-reference',
    readOnly:true,
    asOf:AS_OF,
    metrics:metrics(),
    decisions:decisionItems,
    projects:projects.map(toLegacy),
    openIssues:openIssues().length,
    source:'REAL_CORE_V0_1_NORMALIZED_V3_SNAPSHOT'
  });
};
