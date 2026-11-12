import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,udid=process.env.QA_DEVICE,sdk=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,app='dev.e2e.readinessgeometry';
if(!root||!phase||!udid||!sdk||!derived)throw Error('Explicit owned placement inputs required');
const dir=path.join(root,'evidence',phase),stateDir=path.join(root,'state-'+phase);
const nativeManifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdk,'dist/src/index.js')).href);
const client=createAgentDeviceClient({session:'codex-placement-'+phase,stateDir,cwd:root,iosXctestrunFile:nativeManifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived,debug:true});
const row={phase,setupOnly:true,coarseGestureLimit:1,source:process.env.QA_SDK_SOURCE};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const capture=async name=>{const s=await client.capture.snapshot({interactiveOnly:true,customActions:true});fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(s,null,2)+'\n');return s;};
const native=async()=>{const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({command:'snapshot',appBundleId:app,interactiveOnly:false,customActions:true,raw:true}),signal:AbortSignal.timeout(15000)});return await response.json();};
const windows=result=>(result.data?.nodes??[]).filter(n=>n.type==='Window').map(n=>n.nativePressTarget?.rect??n.rect);
const positive=r=>r&&['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0;
const same=(a,b)=>a&&b&&['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<=1);
const healthy=r=>r.ok&&r.data?.snapshotQuality?.state==='healthy'&&r.data?.snapshotViewport?.kind==='reported';
let recorder,recordingExit;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 row.before=await capture('snapshot-before-placement');row.nativeBefore=await native();
 const box=row.nativeBefore.data?.snapshotViewport?.rect;
 row.windowsBefore=windows(row.nativeBefore);
 if(!healthy(row.nativeBefore)||!positive(box)||!row.before.viewport||Math.abs(box.width-row.before.viewport.width)>1||Math.abs(box.height-row.before.viewport.height)>1)throw Error('Healthy reported logical viewport was not established');
 await client.capture.screenshot({path:path.join(dir,'before.png')});const png=fs.readFileSync(path.join(dir,'before.png'));row.screenshotPixels={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
 if(row.windowsBefore.some(r=>positive(r)&&r.x>1&&r.y>1)){row.alreadyPlaced=true;}
 else{
  if(box.x!==0||box.y!==0||box.width>=box.height||!row.windowsBefore.some(r=>same(r,box)))throw Error('Whole portrait fullscreen window in reported logical coordinates was not established');
  row.setupPan={x:box.width-10,y:box.height-10,dx:-400,dy:-450,durationMs:900};row.coordinateSource='Reported native viewport and matching full window, corroborated by SDK viewport; screenshot pixels are recorded separately and not used as input coordinates.';save();
  row.panResult=await client.interactions.pan(row.setupPan);
 }
 row.after=await capture('snapshot-after-placement');row.nativeAfter=await native();row.windowsAfter=windows(row.nativeAfter);
 const placed=row.windowsAfter.find(r=>positive(r)&&r.x>1&&r.y>1);
 if(!healthy(row.nativeAfter)||!placed)throw Error('One coarse setup did not establish a reported nonzero window');
 row.placedWindow=placed;
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();row.events=JSON.parse(fs.readFileSync(path.join(container,'Documents/events.json'),'utf8'));
 row.targetTapEvents=row.events.filter(e=>e.event==='actionReceivedTap').length;
 row.setupInputEvents=row.events.filter(e=>/Received(?:Tap|Touch)/.test(e.event)||['inputFocusBegan','inputChanged'].includes(e.event));
 row.success=row.targetTapEvents===0;
 await client.capture.screenshot({path:path.join(dir,'final.png')});
}catch(error){row.error={message:error.message,code:error.code,details:error.details};row.success=false;try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'failure.png')],{stdio:'ignore'});}catch{}}
finally{
 save();if(recorder){
  row.recorderCleanupAttempts=[];
  for(const [signal,waitMs] of [['SIGINT',10000],['SIGTERM',3000],['SIGKILL',3000]]){
   if(recorder.exitCode===null&&recorder.signalCode===null)recorder.kill(signal);
   let timer;try{row.recording=await Promise.race([recordingExit,new Promise(resolve=>{timer=setTimeout(()=>resolve({cleanupTimedOut:true}),waitMs);timer.unref();})]);}finally{clearTimeout(timer);}
   row.recorderCleanupAttempts.push({signal,result:row.recording});
   if(!row.recording.cleanupTimedOut)break;
   row.recordingCleanupTimedOut=true;
  }
 }
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError={message:error.message,code:error.code,details:error.details};}
 row.success=Boolean(row.success&&row.recording?.code===0&&!row.recordingCleanupTimedOut&&row.sessionClosed);save();
}
console.log(JSON.stringify({phase,success:row.success,setupPan:row.setupPan,placedWindow:row.placedWindow,targetTapEvents:row.targetTapEvents,error:row.error}));if(!row.success)process.exitCode=1;
