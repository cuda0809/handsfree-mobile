import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');
const result={isConnected:true,innerHTML:''};
const data={ok:true,
 annual:[['연도','장비명','대수'],['2025','Mixer','2'],['2025','Tank','4'],['2026','Mill','5']],
 monthly:[['연도','월','장비명','대수'],['2026','8','Mixer','2'],['2026','9','Mill','3'],['2025','12','Tank','4']],
 support:[['일자','구분','고객/현장','모델','업무내용','참여자','원문','등록경로','확정여부','지원분류','분류기준','운영현황표시'],['2026-08-02','타팀지원','A','','조립','김, 이','','','확정','PT지원','','Y'],['2026-09-03','타팀지원','B','','설치','이, 박','','','확정','A/S지원','','Y'],['2026-09-04','타팀지원','C','','검토','최','','','미확정','A/S지원','','Y']]
};
const context=vm.createContext({personalConnected:true,login(){throw Error('unexpected_login');},api:async()=>data,open(){result.isConnected=true;},heading:()=>'',esc:String,scheduleErrors:{},$:id=>id==='appReportResult'?result:null});
vm.runInContext(src.slice(0,src.indexOf('const appWorkBase=')),context);

await context.productionReport();
assert.match(result.innerHTML,/2026년 실제 납품 누적/);
assert.match(result.innerHTML,/8월<\/td><td>2대<\/td><td><b>2대/);
assert.match(result.innerHTML,/9월<\/td><td>3대<\/td><td><b>5대/);
assert.match(result.innerHTML,/과거 연도 합계/);
assert.match(result.innerHTML,/2025년<\/b><strong>6대/);
assert.doesNotMatch(result.innerHTML,/id="reportMonth"/);

await context.supportReport();
assert.match(result.innerHTML,/2026년 타부서 지원/);
assert.match(result.innerHTML,/<strong>3명<\/strong>/);
assert.match(result.innerHTML,/8월<\/b><span>2명/);
assert.match(result.innerHTML,/9월<\/b><span>2명/);
assert.match(result.innerHTML,/확정 2건/);
assert.match(context.reports(),/생산 실적/);
assert.match(context.reports(),/타부서 지원/);
assert.doesNotMatch(context.reports(),/월간 타부서지원|연간 타부서지원/);
console.log('PASS production monthly cumulative and past-year totals; support monthly unique people and annual total share one screen');
