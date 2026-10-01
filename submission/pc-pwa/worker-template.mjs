const END=Date.parse('2026-10-11T10:30:00+09:00');
const types={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',css:'text/css; charset=utf-8'};
const expiredHtml='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HandsFree · 게스트 사용기간 종료</title><body style="font-family:system-ui;text-align:center;padding:60px"><h1>게스트 사용기간이 종료되었습니다</h1><p>HandsFree REAL 심사용 데모는 2026년 10월 11일 10:30 KST까지 제공됩니다.</p></body></html>';
export default {async fetch(request){
 const url=new URL(request.url),now=Date.now();const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'"};
 if(!['GET','HEAD'].includes(request.method))return new Response('Read-only demo',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(url.pathname==='/clock')return new Response(request.method==='HEAD'?null:JSON.stringify({now,expiresAt:END}),{status:now>=END?410:200,headers:{...headers,'Content-Type':'application/json'}});
 const name=url.pathname==='/'?'/index.html':url.pathname;
 if(now>=END&&(name==='/index.html'||name.endsWith('.js')&&name!=='/sw.js'))return new Response(request.method==='HEAD'?null:expiredHtml,{status:410,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 if(!Object.hasOwn(FILES,name))return new Response('Not found',{status:404,headers});
 const bytes=Uint8Array.from(atob(FILES[name]),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'Content-Type':types[name.split('.').pop()]||'application/octet-stream'}});
}};
