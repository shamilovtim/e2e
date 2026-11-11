import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root=process.env.ACCEPTANCE_ROOT??process.cwd()+'/verification-output';
const udid=process.env.OVERLAY_DEVICE;
const client=createAgentDeviceClient({session:'codex-implicit-variant-acceptance',stateDir:root+'/variant-state',cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const modes=[['duplicate-label-and-id','Open fade overlay','Close overlay'],['anonymous','Open fade overlay','Close overlay'],['overlapping-ambiguous',null,null]];
const summary=[];
function button(s,label){const a=s.nodes.filter(n=>n.type==='Button'&&n.label===label);if(a.length!==1)throw Error(`Expected unique ${label}: ${a.length}`);return a[0];}
function save(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');}
try {
for(const [mode,openLabel,closeLabel] of modes){
 const dir=path.join(root,'variant-results',mode);fs.mkdirSync(dir,{recursive:true});
 const launched=await client.apps.open({app:'dev.e2e.overlayreadinessvariants',platform:'ios',udid,relaunch:true,foreground:true});const opened={...launched,snapshot:await client.capture.snapshot({interactiveOnly:true})};
 let pid=opened.snapshot.nodes.find(n=>n.type==='Application')?.pid;
 const row={mode,pid};let recording=false;
 try {
  await client.recording.record({action:'start',path:dir+'/video.mp4',fps:30,hideTouches:true});recording=true;
  if(openLabel){await client.interactions.press({ref:'@'+button(opened.snapshot,openLabel).ref});const before=await client.capture.snapshot({interactiveOnly:true});const t=performance.now();row.close=await client.interactions.press({ref:'@'+button(before,closeLabel).ref});row.closeMs=performance.now()-t;}
  const after=await client.capture.snapshot({interactiveOnly:true});pid=after.nodes.find(n=>n.type==='Application')?.pid;row.pid=pid;save(dir+'/snapshot.json',after); const targets=after.nodes.filter(n=>n.type==='Button' && Math.abs(n.rect?.y-(mode==='anonymous'?580:mode==='overlapping-ambiguous'?650:430))<1); if(targets.length!==(mode==='overlapping-ambiguous'?2:1))throw Error(`Expected target geometry count: ${targets.length}`); row.capturedTargetCount=targets.length; const target=targets[targets.length-1];row.target=target;
  const t=performance.now();row.press=await client.interactions.press({ref:'@'+target.ref});row.pressMs=performance.now()-t;
  await new Promise(r=>setTimeout(r,1100));
  const final=await client.capture.snapshot({interactiveOnly:true});row.result=final.nodes.find(n=>n.identifier==='results')?.label;
  row.success=row.result?.includes('Underlying taps: 1')&&row.result?.includes('Overlay touches: 0');
 }catch(e){row.error={message:e.message,code:e.code,details:e.details};row.success=false;}finally{if(recording)try{await client.recording.record({action:'stop'});}catch(e){row.recordingError=e.message;}}
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,'dev.e2e.overlayreadinessvariants','data'],{encoding:'utf8'}).trim();
 if(pid)fs.copyFileSync(path.join(container,'Documents',`events-${pid}.json`),dir+'/native-events.json'); const events=JSON.parse(fs.readFileSync(dir+'/native-events.json','utf8')); if(mode==='overlapping-ambiguous')row.success=Boolean(row.error)&&!events.some(e=>['underlyingReceivedTap','overlayReceivedTouch','decoyReceivedTap'].includes(e.event)); else if(events.some(e=>e.event==='decoyReceivedTap'))row.success=false;
 save(dir+'/result.json',row);summary.push(row);save(root+'/variant-summary.json',summary);
 console.log(JSON.stringify({mode,success:row.success,result:row.result,closeMs:Math.round(row.closeMs??0),pressMs:Math.round(row.pressMs??0),error:row.error}));
 if(row.error&&mode!=='overlapping-ambiguous')break;
}
}finally{await client.apps.close({platform:'ios',udid});}
