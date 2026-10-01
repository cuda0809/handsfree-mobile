// Dedicated competition-only handler. Never reads environment variables or production APIs.
import fs from 'node:fs';
import path from 'node:path';
import { createWorker } from '../submission/pc-pwa/worker-template.mjs';
const names=['index.html','mobile.js','theme.js','schedule.js','app-flow.js','guest-data.js','guest-mode.js','hybrid-ui.js','hybrid.css','icon.svg','sw.js','manifest.webmanifest','icon-192.png','icon-512.png'];
const dir=path.join(process.cwd(),'submission/pc-pwa');
const files=Object.fromEntries(names.map(name=>['/'+name,fs.readFileSync(path.join(dir,name)).toString('base64')]));
const worker=createWorker(files);
export default async function handler(req,res){
 const url=new URL(req.url,'https://competition.invalid');
 const route=url.searchParams.get('path');
 if(route!==null){url.pathname='/'+route;url.search='';}
 const response=await worker.fetch(new Request(url,{method:req.method}));
 res.statusCode=response.status;
 for(const [key,value] of response.headers)res.setHeader(key,value);
 res.end(Buffer.from(await response.arrayBuffer()));
}
