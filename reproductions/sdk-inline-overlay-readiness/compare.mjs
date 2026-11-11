import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createAgentDeviceClient} from 'agent-device';
const root=process.cwd();
const udid=process.env.OVERLAY_DEVICE;
if(!udid)throw Error('Set OVERLAY_DEVICE to a simulator you own');
const client=createAgentDeviceClient({session:'codex-sdk-settle-investigation',stateDir:root+'/driver',cwd:root});
const modes=[['none',{}],['settle150',{settle:true,settleQuietMs:150,timeoutMs:10000}],['settleDefault',{settle:true,timeoutMs:10000}],['settle1000',{settle:true,settleQuietMs:1000,timeoutMs:10000}]];
const summary=[];
function button(snapshot,label){const nodes=snapshot.nodes.filter(n=>n.type==='Button'&&n.label===label);if(nodes.length!==1)throw Error(`Expected one button ${label}, got${nodes.length}`);return nodes[0];}
function save(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
try{
for(const [mode,settle] of modes){
 for(let repeat=0;repeat<3;repeat++){
  const dir=path.join(root,'results',`${mode}-${repeat+1}`);fs.mkdirSync(dir,{recursive:true});
  const opened=await client.apps.open({app:'dev.e2e.overlay1563',platform:'ios',udid,relaunch:true,foreground:true});
  const pid=opened.snapshot.nodes.find(n=>n.type==='Application')?.pid;
  let recording=false;
  try{
   await client.recording.record({action:'start',path:path.join(dir,'video.mp4'),fps:30,hideTouches:true});recording=true;
   await client.interactions.press({ref:'@'+button(opened.snapshot,'Open fade overlay').ref});
   const before=await client.capture.snapshot({interactiveOnly:true});
   const began=performance.now();
   const close=await client.interactions.press({ref:'@'+button(before,'Close overlay').ref,...settle});
   const closeMs=performance.now()-began;
   const after=await client.capture.snapshot({interactiveOnly:true});
   const aimed=button(after,'Underlying action');
   const pressBegan=performance.now();
   const press=await client.interactions.press({ref:'@'+aimed.ref});
   const pressMs=performance.now()-pressBegan;
   // Observe the completed effect only after the tested dispatch; this pause cannot delay that input.
   await new Promise(r=>setTimeout(r,1100));
   const final=await client.capture.snapshot({interactiveOnly:true});
   const result=final.nodes.find(n=>n.identifier==='results')?.label;
   const row={mode,repeat:repeat+1,pid,closeMs,pressMs,result,success:result?.includes('Underlying taps: 1')&&result?.includes('Overlay touches: 0'),presentedSurface:{initial:opened.snapshot.presentedSurface,beforeClose:before.presentedSurface,afterClose:after.presentedSurface,completed:final.presentedSurface},target:{ref:aimed.ref,rect:aimed.rect,hittable:aimed.hittable,interactionBlocked:aimed.interactionBlocked},settle:close.settle,close,press};
   save(path.join(dir,'result.json'),row);
   const container=execFileSync('xcrun',['simctl','get_app_container',udid,'dev.e2e.overlay1563','data'],{encoding:'utf8'}).trim();
   fs.copyFileSync(path.join(container,'Documents',`events-${pid}.json`),path.join(dir,'native-events.json'));
   summary.push(row);save(path.join(root,'summary.json'),summary);
   console.log(JSON.stringify({mode,repeat:repeat+1,result,success:row.success,closeMs:Math.round(closeMs),pressMs:Math.round(pressMs),presentedSurface:row.presentedSurface,settle:close.settle}));
  }finally{if(recording)await client.recording.record({action:'stop'});}
 }
}
} catch(error){console.error(JSON.stringify({error:error.message,code:error.code,details:error.details}));process.exitCode=1;}
