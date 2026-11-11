import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,mode=process.env.QA_MODE;
const sdk=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,udid=process.env.QA_DEVICE;
const source=process.env.QA_SDK_SOURCE,expectedFp=process.env.QA_NATIVE_FP;
const expectedFixture=process.env.QA_FIXTURE_BINARY_SHA;
if(!root||!phase||!['values','alias','tree-ref'].includes(mode)||!sdk||!derived||!udid||!source||!expectedFp||!expectedFixture)throw Error('Explicit final source, native artifact, fixture and owned-device configuration required');
const entries=JSON.parse(fs.readFileSync(path.join(root,'owned-device-state-private.json')));const owned={phone:entries.find(x=>x.role==='phone')?.udid,ipad:entries.find(x=>x.role==='ipad')?.udid};
if(udid!==(mode==='values'?owned.phone:owned.ipad))throw Error('Unexpected device for final proof route');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:sdk,encoding:'utf8'}).trim()!==source||execFileSync('git',['status','--porcelain=v1'],{cwd:sdk,encoding:'utf8'}).trim())throw Error('Final source is not the expected clean frozen commit');
const runtime=JSON.parse(fs.readFileSync(process.env.QA_JS_MANIFEST,'utf8'));if(runtime.head!==source)throw Error('Runtime source mismatch');for(const file of runtime.files){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(sdk,file.path))).digest('hex')!==file.sha256)throw Error('Runtime byte mismatch');}
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json')));
const binary=manifest.artifacts.entries.find(x=>x.path.endsWith('xctest/AgentDeviceRunnerUITests'));
const binaryHash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(derived,binary.path))).digest('hex');
if(manifest.runnerSourceFingerprint!==expectedFp||binaryHash()!==binary.digest)throw Error('Native artifact fingerprint or binary does not match');
const app='dev.e2e.readinessgeometry',dir=path.join(root,'evidence',phase);
fs.mkdirSync(dir,{recursive:true});
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdk,'dist/src/index.js')));
const client=createAgentDeviceClient({session:'codex-final-'+phase,stateDir:path.join(root,'state-'+phase),cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,mode,source,nativeBuiltFrom:source,nativeFingerprint:expectedFp,nativeBinarySha256:binary.digest,fixtureBinarySha256:expectedFixture,focusRoutes:[],setup:[],contentChangeReads:[]};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const eventRows=()=>{const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(path.join(container,'Documents/events.json')));};
const native=async command=>{const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json')));const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({...command,appBundleId:app}),signal:AbortSignal.timeout(15000)});return await response.json();};
const setup=async(id,label)=>{
 const before=eventRows().length;const result=await client.interactions.press({selector:'id='+id,signal:AbortSignal.timeout(6000)});
 const events=eventRows().slice(before);row.setup.push({label,id,result,events});save();
 if(id==='setup-set-actual-text'&&!events.some(e=>e.event==='setupSetActualText'&&e.actualText==='Geometry input'&&e.length===14))throw Error('Qualified setup did not set the actual placeholder-text contents');
 if(id==='setup-clear-actual-text'&&!events.some(e=>e.event==='setupClearActualText'&&e.actualText===''&&e.length===0))throw Error('Qualified setup did not clear actual input contents');
};
const sameRect=(a,b)=>a&&b&&['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<=1);
const captureInput=async(raw,expectedValue)=>{
 const captured=await native({command:'snapshot',interactiveOnly:false,customActions:!raw,raw});
 const node=captured.data?.nodes?.find(n=>n.identifier==='geometry-input');
 if(!captured.ok||!node?.nativePressTarget)throw Error('Actual native input capture omitted its binding');
 if(node.nativePressTarget.value!==undefined)throw Error('Text-entry contents leaked into press binding');
 return {raw,node,quality:captured.data.snapshotQuality,binding:node.nativePressTarget};
};
const verifyRead=async(captured,expected,label)=>{
 const before=eventRows().length;const began=performance.now();
 // Send the captured binding unchanged. No placeholder substitution or synthetic identity.
 const response=await native({command:'pressReadiness',authorizedTarget:captured.binding});
 const sample={label,captured,response,ms:performance.now()-began,events:eventRows().slice(before)};
 row.contentChangeReads.push(sample);save();
 if(!response.ok||response.data?.pressReadiness!==expected)throw Error(label+' did not return '+expected);
 if(sample.events.length)throw Error('Read-only readiness unexpectedly produced fixture input events');
};
const verifyFocus=async(label,raw)=>{
 await setup('hide-keyboard','End editing before ordinary focus proof');
 const before=eventRows().length,sample={label};
 let options={selector:'id=geometry-input',signal:AbortSignal.timeout(6000)};
 if(raw!==undefined){
  const captureOptions=raw?{interactiveOnly:true,raw:true}:{interactiveOnly:true,customActions:true};
  const snapshot=await client.capture.snapshot(captureOptions);
  sample.sdkCaptureQuality=snapshot.snapshotQuality;sample.sdkCaptureWarnings=snapshot.warnings;sample.sdkCaptureDiagnostics=snapshot.snapshotDiagnostics;
  if(label==='actual-runner-tree-ref'&&snapshot.snapshotQuality?.backend!=='tree')throw Error('The actual SDK ref producer was not runner tree; no tree-ref claim made');
  const field=snapshot.nodes.find(n=>n.identifier==='geometry-input');
  if(!field?.ref)throw Error('Actual SDK capture omitted input ref');
  sample.publicField=field;sample.captureOptions=captureOptions;
  sample.nativeSource=await captureInput(raw,'');
  options={ref:'@'+field.ref,signal:AbortSignal.timeout(6000)};
 }
 const began=performance.now();row.focusRoutes.push(sample);
 try{
  sample.press=await client.interactions.press(options);sample.ms=performance.now()-began;
  sample.events=eventRows().slice(before);
  const after=await client.capture.snapshot({interactiveOnly:true,customActions:true});
  sample.afterField=after.nodes.find(n=>n.identifier==='geometry-input');sample.keyboardKeys=after.nodes.filter(n=>n.type==='Key').length;
  // System keyboard keys can be outside the qualified placed app-window capture.
  sample.focusOracle=mode==='tree-ref'?'recipient-event-and-focused-state':'recipient-event-focused-state-and-captured-keyboard';
  if(sample.events.filter(e=>e.event==='inputFocusBegan'&&e.actualText==='').length!==1||sample.afterField?.focused!==true||(mode!=='tree-ref'&&sample.keyboardKeys<1))throw Error('Ordinary '+label+' did not focus the actual empty input exactly once');
 }catch(error){
  sample.ms=performance.now()-began;sample.events=eventRows().slice(before);sample.error={code:error.code,message:error.message,details:error.details};save();
  if(process.env.QA_CONTINUE_FOCUS_FAILURES==='1')return;
  throw error;
 }
 save();
};
let recorder,recordingExit;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Video recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 const began=performance.now();row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:mode==='values'});row.coldOpenMs=performance.now()-began;
 const installed=execFileSync('xcrun',['simctl','get_app_container',udid,app,'app'],{encoding:'utf8'}).trim();
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(installed,'GeometryFixture'))).digest('hex')!==expectedFixture)throw Error('Installed geometry v2 fixture binary differs');
 await client.capture.snapshot({interactiveOnly:true,customActions:true});
 const log=fs.readFileSync(row.open.runnerLogPath,'utf8');if(!log.includes(derived)||log.includes('build-for-testing'))throw Error('Runner did not use only the pinned final artifact');
 if(mode==='values'){
  await setup('landscape','Rotate generic input fixture to the reproduced failing orientation');
  let last;const deadline=Date.now()+5000;
  do{const s=await client.capture.snapshot({interactiveOnly:true});const v=s.viewport;row.viewport=v;if(v?.width>v?.height&&last&&Math.abs(v.width-last.width)<1&&Math.abs(v.height-last.height)<1)break;last=v;if(Date.now()>deadline)throw Error('Landscape did not settle');}while(true);
  await verifyFocus('ordinary-selector');
  await verifyFocus('actual-private-AX-ref',false);
  await verifyFocus('actual-tree-ref',true);
  await setup('hide-keyboard','End empty-field editing before explicit content setup');
  await setup('setup-set-actual-text','Set real input contents exactly equal to placeholder text');
  const actual=[await captureInput(false,'Geometry input'),await captureInput(true,'Geometry input')];row.actualPlaceholderTextBindings=actual;
  for(const captured of actual)await verifyRead(captured,'ready','Actual text equal to placeholder remains actual nonempty contents');
  await setup('setup-clear-actual-text','Clear actual contents through qualified fixture setup');
  row.liveAccessorAfterClear=await native({command:'querySelector',selectorKey:'id',selectorValue:'geometry-input'});
  if(row.liveAccessorAfterClear.data?.nodes?.[0]?.value!=='Geometry input')throw Error('Live display accessor no longer exposes placeholder after actual contents clear');
  const empty=[await captureInput(false,''),await captureInput(true,'')];row.emptyBindingsAfterClear=empty;
  for(const captured of actual)await verifyRead(captured,'ready','Text-entry binding survives actual contents clear');
  await setup('setup-set-actual-text','Set actual placeholder text after capturing empty bindings');
  row.realTextAfterReverse=[await captureInput(false,'Geometry input'),await captureInput(true,'Geometry input')];
  for(const captured of empty)await verifyRead(captured,'ready','Text-entry binding survives actual placeholder-text contents');
  row.success=!row.focusRoutes.some(sample=>sample.error);
 }else if(mode==='tree-ref'){
  row.scope='Actual runner-tree SDK ref via naturally windowed guest-bridge fallback; native backend must be observed, not inferred from raw format.';
  const windows=await native({command:'snapshot',interactiveOnly:false,customActions:true,raw:true});
  row.nativeWindowRects=windows.data?.nodes?.filter(n=>n.type==='Window').map(n=>n.nativePressTarget?.rect??n.rect)??[];
  if(!windows.ok||!row.nativeWindowRects.some(r=>r.x>1&&r.y>1))throw Error('Placed app window was not independently observed');
  await verifyFocus('actual-runner-tree-ref',true);
  row.success=!row.focusRoutes.some(sample=>sample.error);
 }else{
  const windowTree=await native({command:'snapshot',interactiveOnly:false,customActions:true,raw:true});
  const windows=windowTree.data?.nodes?.filter(n=>n.type==='Window').map(n=>n.nativePressTarget?.rect??n.rect)??[];
  const window=windows.find(r=>r.x>1&&r.y>1);row.nativeWindowRects=windows;
  if(!window||Math.abs(window.x-241)>1||Math.abs(window.y-224)>1)throw Error('Alias setup requires independently observed native window origin241,224; no extra-candidate claim made');
  row.intendedLiveBeforeAlias=await native({command:'querySelector',selectorKey:'id',selectorValue:'geometry-action'});
  await setup('setup-alias-mode','Expose distinct diagnostic alias for independent live frame read');
  row.aliasLiveBeforeIdentityChange=await native({command:'querySelector',selectorKey:'id',selectorValue:'geometry-alias-diagnostic'});
  await setup('setup-alias-mode','Change actual alias control to the same native id and label');
  const snapshot=await client.capture.snapshot({interactiveOnly:true,customActions:true});
  const captured=await native({command:'snapshot',interactiveOnly:false,customActions:true,raw:false});
  row.nativeSourceQuality=captured.data?.snapshotQuality;
  row.nativeTargets=captured.data?.nodes?.filter(n=>n.identifier==='geometry-action')??[];
  if(row.nativeTargets.length!==2)throw Error('Alias fixture did not capture exactly two same-id controls');
  const intendedLive=row.intendedLiveBeforeAlias.data?.nodes?.[0]?.rect;
  const aliasLive=row.aliasLiveBeforeIdentityChange.data?.nodes?.[0]?.rect;
  const intended=row.nativeTargets.find(n=>sameRect(n.nativePressTarget?.rect,intendedLive));
  const alias=row.nativeTargets.find(n=>sameRect(n.nativePressTarget?.rect,aliasLive));
  if(!intended||!alias||intended===alias)throw Error('Captured control frames did not retain both independent live frames');
  if(!sameRect(intendedLive,{x:window.x+240,y:window.y+90,width:220,height:42})||!sameRect(aliasLive,{x:window.x+481,y:window.y+314,width:220,height:42}))throw Error('Alias geometry does not match constructed local/global case');
  const a=intended.nativePressTarget,b=alias.nativePressTarget;
  if(['type','identifier','label','value'].some(k=>(a[k]??'')!==(b[k]??'')))throw Error('Alias native identity tuple differs');
  row.geometryQualification='Constructed extra-candidate geometry from fixed fixture local frames, positive native window origin and independent live/captured frame pairs. Production prefilter count is not directly observed.';
  row.readiness=await native({command:'pressReadiness',authorizedTarget:a});
  if(row.readiness.data?.pressReadiness!=='ready')throw Error('Intended target did not remain uniquely ready with alias present');
  const selected=snapshot.nodes.find(n=>n.identifier==='geometry-action'&&sameRect(n.rect,intendedLive));
  if(!selected?.ref)throw Error('Actual SDK capture did not mint intended target ref');
  const before=eventRows().length;row.press=await client.interactions.press({ref:'@'+selected.ref,signal:AbortSignal.timeout(6000)});row.inputEvents=eventRows().slice(before);
  row.success=row.inputEvents.filter(e=>e.event==='actionReceivedTap').length===1&&!row.inputEvents.some(e=>e.event==='aliasReceivedTap');
  if(!row.success)throw Error('Alias case did not deliver one intended and zero alias actions');
 }
 row.nativeBinaryUnchanged=binaryHash()===binary.digest;
 if(!row.nativeBinaryUnchanged)throw Error('Pinned native binary changed during final proof');
}catch(error){row.success=false;row.error={code:error.code,message:error.message,details:error.details};}
finally{
 try{row.events=eventRows();}catch{}
 try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,row.success?'final.png':'failure.png')],{stdio:'ignore'});}catch{}
 save();if(recorder&&recorder.exitCode===null&&recorder.signalCode===null)recorder.kill('SIGINT');
 if(recordingExit){
  row.recording=await Promise.race([recordingExit,new Promise(resolve=>{const timer=setTimeout(()=>resolve({cleanupTimedOut:true}),10000);timer.unref();})]);
  if(row.recording.cleanupTimedOut){
   row.success=false;
   row.recordingCleanupFailure={reason:'video_cleanup_timeout',graceMs:10000,classification:'Harness recorder cleanup failure; retain the original or partial video. This is not a product input timeout.'};
   // This ChildProcess is the recorder created above; never search for or signal other recorders.
   if(recorder.exitCode===null&&recorder.signalCode===null)row.recordingCleanupFailure.sigkillSent=recorder.kill('SIGKILL');
   row.recordingCleanupFailure.afterKill=await Promise.race([recordingExit,new Promise(resolve=>{const timer=setTimeout(()=>resolve({reapTimedOut:true}),3000);timer.unref();})]);
   if(row.recordingCleanupFailure.afterKill.reapTimedOut){
    // Keep the failed result bounded even if the OS has not delivered this child's exit event.
    recorder.stderr?.destroy();recorder.unref();
   }
  }
 }
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError={code:error.code,message:error.message};}save();
}
console.log(JSON.stringify({phase,mode,success:row.success,focusRoutes:row.focusRoutes.map(r=>({label:r.label,ms:r.ms})),readiness:row.readiness,error:row.error}));
if(!row.success)process.exitCode=1;
