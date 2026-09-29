import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');
const result={isConnected:true,innerHTML:''};
const controls={};
const data={ok:true,
 annual:[['연도','장비명','대수'],['2025','Mixer','2'],['2026','Mill','3']],
 monthly:[['연도','월','장비명','대수'],['2026','8','Mixer','2'],['2026','9','Mill','3'],['2025','12','Tank','4']],
 support:[['일자','구분','고객/현장','모델','업무내용','참여자','원문','등록경로','확정여부','지원분류','분류기준','운영현황표시'],['2026-08-02','타팀지원','A','','조립','김','','','확정','PT지원','','Y'],['2026-09-03','타팀지원','B','','설치','이','','','확정','A/S지원','','Y'],['2026-09-04','타팀지원','C','','검토','박','','','미확정','A/S지원','','Y'],['2025-12-01','타팀지원','D','','지원','최','','','확정','PT지원','','Y']]
};
const context=vm.createContext({
 api:async()=>data,
 open(){result.isConnected=true;},
 heading:()=>'',
 esc:String,
 scheduleErrors:{},
 $:id=>id==='appReportResult'?result:(controls[id]||null)
});
vm.runInContext(src.slice(0,src.indexOf('const appWorkBase=')),context);

await context.productionReport('month');
assert.match(result.innerHTML,/9월/);
assert.doesNotMatch(result.innerHTML,/전체 월/);
assert.match(result.innerHTML,/실제 납품 집계 <b>3대/);

await context.supportReport('month');
assert.match(result.innerHTML,/월간 타부서지원|확정된 타부서 지원/);
assert.match(result.innerHTML,/9월/);
assert.match(result.innerHTML,/확정된 타부서 지원 <b>1건/);

await context.supportReport('year');
assert.doesNotMatch(result.innerHTML,/id="reportMonth"/);
assert.match(result.innerHTML,/확정된 타부서 지원 <b>2건/);
assert.match(context.reports(),/월간 타부서지원/);
assert.match(context.reports(),/연간 타부서지원/);
console.log('PASS monthly defaults to latest actual month; production/support month and year are separate');
