const {AS_OF,projects,events,issues} = require('../../core/data');

const text = v => JSON.stringify(v).toLowerCase();
module.exports = (req,res) => {
  const q=String(req.query?.q||'').trim().toLowerCase();
  const projectMatches=q?projects.filter(x=>text(x).includes(q)):[];
  const eventMatches=q?events.filter(x=>text(x).includes(q)):[];
  const issueMatches=q?issues.filter(x=>text(x).includes(q)):[];
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true, mode:'core-reference', readOnly:true, asOf:AS_OF, query:q,
    projects:projectMatches, events:eventMatches, issues:issueMatches,
    count:projectMatches.length+eventMatches.length+issueMatches.length
  });
};
