import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root=process.env.ACCEPTANCE_ROOT??process.cwd()+'/verification-output';
const udid=process.env.OVERLAY_DEVICE;
const app='dev.e2e.readinesscontrols';
const backend=process.env.CAPTURE_BACKEND;
const lane=backend==='native'?'controls-native-custom-actions':'controls-bridge';
const capture=()=>client.capture.snapshot({interactiveOnly:true,...(backend==='native'?{customActions:true}:{})});
const client=createAgentDeviceClient({session:'codex-corrected-'+lane,stateDir:root+'/'+lane+'-state',cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
function save(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function button(s,label){const a=s.nodes.filter(n=>n.type==='Button'&&n.label===label);if(a.length!==1)throw Error(`Expected unique ${label}: ${a.length}`);return a[0];}
const summary=[];
try {
for(const mode of process.env.ACCEPTANCE_CASE?[process.env.ACCEPTANCE_CASE]:['switch','slider']) {
 const dir=root+'/'+lane+'/'+mode;fs.mkdirSync(dir,{recursive:true});let recording=false;
 const opened=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 let pid=opened.snapshot.nodes.find(n=>n.type==='Application')?.pid;
 const row={mode,pid};
 try {
  await client.recording.record({action:'start',path:dir+'/video.mp4',fps:30,hideTouches:true});recording=true;
  if(mode==='moving-child'){
   await client.interactions.press({ref:'@'+button(opened.snapshot,'Open moving child overlay').ref});
   const before=await capture();
   row.close=await client.interactions.press({ref:'@'+button(before,'Close overlay').ref});
  }
  const before=await capture();save(dir+'/snapshot-before.json',before);pid=before.nodes.find(n=>n.type==='Application')?.pid;row.pid=pid;
  const targets=before.nodes.filter(n=>n.identifier===(mode==='switch'?'readiness-toggle':'readiness-slider'));
  if(targets.length!==1)throw Error(`Expected unique ${mode} target, got ${targets.length}`);
  row.target=targets[0];const began=performance.now();
  row.press=await client.interactions.press({ref:'@'+row.target.ref});row.pressMs=performance.now()-began;
  await new Promise(r=>setTimeout(r,1100));
  const final=await capture();save(dir+'/snapshot-after.json',final);
  row.result=final.nodes.find(n=>n.identifier==='results')?.label;
 }catch(e){row.error={message:e.message,code:e.code,details:e.details};await new Promise(r=>setTimeout(r,1100));}
 finally{if(recording)await client.recording.record({action:'stop'});}
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
 fs.copyFileSync(path.join(container,'Documents',pid?`events-${pid}.json`:'events.json'),dir+'/native-events.json');
 const events=JSON.parse(fs.readFileSync(dir+'/native-events.json','utf8'));row.events=events;
 row.success=events.some(e=>e.event===(mode==='switch'?'switchChanged':'sliderReceivedTouch'))&&!events.some(e=>e.event==='overlayReceivedTouch');
 save(dir+'/result.json',row);summary.push(row);save(root+'/'+lane+'-summary.json',summary);
 console.log(JSON.stringify({mode,success:row.success,result:row.result,pressMs:row.pressMs,error:row.error,target:row.target,events}));
}
}finally{await client.apps.close({platform:'ios',udid});}
