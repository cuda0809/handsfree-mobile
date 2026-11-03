// Read-only source adapter. It returns a reviewable append package, never a write.
const value=v=>String(v??'').trim();
const column=index=>{let out='';for(index++;index;index=Math.floor((index-1)/26))out=String.fromCharCode(65+(index-1)%26)+out;return out;};
export function prepareAPlan({sourceValues,coreRows,sourceStartRow,month,revision,firstGroupIndex,groupCount}){
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!/^\d{8}$/.test(revision))throw Error('invalid_source_revision');
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const header=sourceValues[firstGroupIndex-2],weekdays=sourceValues[firstGroupIndex-1];
 for(let d=1;d<=days;d++){
  if(value(header?.[d+5])!==`${m}/${d}`||value(weekdays?.[d+5])!=='일월화수목금토'[new Date(Date.UTC(year,m-1,d)).getUTCDay()])throw Error('source_calendar_changed');
 }
 const byJob=new Map();for(const r of coreRows){if(byJob.has(r[1]))throw Error('duplicate_core_job');byJob.set(r[1],r);}
 const records=[],review=[],seenGroups=new Set();
 for(let g=0;g<groupCount;g++){
  const i=firstGroupIndex+g*3,row=sourceValues[i],raw=value(row?.[2]).replace(/\s/g,'');
  if(value(row?.[0])!=='A'||!raw)throw Error('source_group_changed');
  const match=/^(\d{6}A-\d{3})-(\d{2}),(\d{2})$/.exec(raw),jobs=match?[match[1]+'-'+match[2],match[1]+'-'+match[3]]:[raw];
  for(const job of jobs){if(byJob.get(job)?.[2]!=='A'||seenGroups.has(job))throw Error('unresolved_A_source_identity');seenGroups.add(job);}
  if(value(row[4])!=='자재입고'||value(sourceValues[i+1]?.[4])!=='생산조립'||value(sourceValues[i+2]?.[4])!=='전장/납품')throw Error('source_process_rows_changed');
  for(let offset=0;offset<3;offset++)for(let c=6;c<days+6;c++){
   const text=value(sourceValues[i+offset]?.[c]);if(!text)continue;
   let process='';
   if(/^\d+(?:\.\d+)?$/.test(text))process=offset===0?'자재':offset===1?'조립':'';
   else if(/^(TEST|테스트)$/i.test(text))process='테스트';
   else if(/^(검수|전장|프로그램|조립|입고|납품|출고)$/.test(text))process=({입고:'자재',납품:'출고'})[text]||text;
   const sourceRow=sourceStartRow+i+offset,cell=column(c)+sourceRow;
   if(!process){review.push({cell,raw:text,jobs});continue;}
   for(const job of jobs){const core=byJob.get(job),date=month+'-'+String(c-5).padStart(2,'0');
    records.push([`AVERIFIED|${revision}|${job}|${sourceRow}|${c}`,String(year),String(m),date,job,core[3],core[4],core[6],core[7],'',process,'계획',month,'생산A팀 원본',`원본 표시일 수집 · 실적 아님 · 생산A팀!${cell} · ${sourceValues[i+offset][4]} · ${text}`,revision.slice(0,4)+'-'+revision.slice(4,6)+'-'+revision.slice(6,8)]);
   }
  }
 }
 return {status:'PREPARED_NOT_APPLIED',records,review,sourceJobs:[...seenGroups]};
}
