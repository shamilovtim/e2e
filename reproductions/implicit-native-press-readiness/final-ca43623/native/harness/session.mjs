import fs from 'node:fs';
import readline from 'node:readline';
import {execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root=process.env.GEOMETRY_ROOT;
const phase=process.env.GEOMETRY_PHASE??'before';
const app=process.env.QA_APP??'dev.e2e.readinessmaintainer';
const udid=process.env.GEOMETRY_DEVICE??'6B9D0875-A708-4B60-9FEF-50C53A3356BD';
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const client=createAgentDeviceClient({session:'codex-geometry-'+phase,stateDir:root+'/state-'+phase,cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
let sequence=0;
for await(const line of readline.createInterface({input:process.stdin})){
 let c;try{c=JSON.parse(line);}catch{continue;}
 const file=dir+'/'+String(++sequence).padStart(2,'0')+'-'+c.action;
 const began=performance.now();
 try{
  let result;
  if(c.action==='open')result=await client.apps.open({app:c.app??app,platform:'ios',udid,relaunch:c.relaunch??true,foreground:c.foreground??true});
  if(c.action==='snapshot')result=await client.capture.snapshot({interactiveOnly:true,customActions:true,...c.options});
  if(c.action==='pan')result=await client.interactions.pan(c.target);
  if(c.action==='press')result=await client.interactions.press({...c.target,...c.options,...(c.abortMs?{signal:AbortSignal.timeout(c.abortMs)}:{})});
  if(c.action==='record-start')result=await client.recording.record({action:'start',path:dir+'/'+c.name+'.mp4',fps:30,hideTouches:true});
  if(c.action==='record-stop')result=await client.recording.record({action:'stop'});
  if(c.action==='close')result=await client.apps.close({platform:'ios',udid});
  if(c.action==='events'){
   const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
   result=JSON.parse(fs.readFileSync(container+'/Documents/events.json','utf8'));
  }
  fs.writeFileSync(file+'.json',JSON.stringify({command:c,ms:performance.now()-began,result},null,2)+'\n');
  console.log(JSON.stringify({ok:true,file:file+'.json',ms:performance.now()-began,...(result?.nodes?{nodes:result.nodes.map(n=>({ref:n.ref,type:n.type,label:n.label,id:n.identifier,rect:n.rect}))}:{}),...(result?.snapshot?{nodes:result.snapshot.nodes.map(n=>({ref:n.ref,type:n.type,label:n.label,id:n.identifier,rect:n.rect}))}:{}),...(c.action==='events'?{eventCount:result.length}:{} )}));
  if(c.action==='close')break;
 }catch(e){const error={message:e.message,code:e.code,details:e.details};fs.writeFileSync(file+'.json',JSON.stringify({command:c,ms:performance.now()-began,error},null,2)+'\n');console.log(JSON.stringify({ok:false,file:file+'.json',error}));}
}
