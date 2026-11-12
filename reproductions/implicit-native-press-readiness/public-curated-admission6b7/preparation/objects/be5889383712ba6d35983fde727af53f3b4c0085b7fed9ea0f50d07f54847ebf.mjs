import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,mode=process.env.QA_MODE;
const sdkRoot=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,udid=process.env.QA_DEVICE;
const [route,scenario]=String(mode).split('-');
if(!root||!phase||!sdkRoot||!derived||!udid||!['selector','ref'].includes(route)||!['ready','deadline','cancel'].includes(scenario))throw Error('Explicit owned lifecycle inputs required');
const dir=path.join(root,'evidence',phase),stateDir=path.join(root,'state-'+phase),app='dev.e2e.overlay1563';
const inputs=JSON.parse(fs.readFileSync(path.join(dir,'execution-inputs.json'),'utf8'));
if(!inputs.runtimeCompleteFileSetVerified||inputs.runtimeSymlinksFound||inputs.nativeArtifactsVerified!==11)throw Error('Complete pre-run runtime/native provenance required');
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const client=createAgentDeviceClient({session:'codex-lifecycle-'+phase,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,mode,route,scenario,source:process.env.QA_SDK_SOURCE,nativeBuiltAt:process.env.QA_NATIVE_BUILT_AT,fixtureBinarySha256:process.env.QA_FIXTURE_BINARY_SHA,samples:[],publicTimeoutOverride:false,externalCallerSignal:scenario==='cancel',declaredDefaultClientEnvelopeMs:90000,declaredOrdinaryDaemonResultPolicyMs:60000};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const logText=()=>row.open?.runnerLogPath&&fs.existsSync(row.open.runnerLogPath)?fs.readFileSync(row.open.runnerLogPath,'utf8'):'';
const markers=offset=>logText().slice(offset).split('\n').filter(s=>s.includes('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED')||s.includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED'));
const completed=offset=>markers(offset).filter(s=>s.includes('COMMAND_COMPLETED command=pressReadiness')).length;
const targetTapCommands=lines=>lines.filter(s=>/COMMAND_ACCEPTED command=tap(?: |$)/.test(s)).length;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const button=(snapshot,label)=>{const matches=snapshot.nodes.filter(n=>n.type==='Button'&&n.label===label);if(matches.length!==1)throw Error('Expected unique fixture button '+label);return matches[0];};
const capture=async name=>{const s=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(s,null,2)+'\n');return s;};
const events=()=>{const folder=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();const name=row.pid&&fs.existsSync(path.join(folder,'Documents','events-'+row.pid+'.json'))?'events-'+row.pid+'.json':'events.json';row.nativeEventsFile=name;return JSON.parse(fs.readFileSync(path.join(folder,'Documents',name),'utf8'));};
const counts=rows=>({underlying:rows.filter(e=>e.event==='underlyingReceivedTap').length,overlay:rows.filter(e=>e.event==='overlayReceivedTouch').length});
const errorOutput=error=>({code:error.code,message:error.message,details:error.details,name:error.name});
let recorder,recordingExit,controller,pending;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});
 recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 if(!logText().includes(derived)||logText().includes('build-for-testing'))throw Error('Explicit native artifact was not the actual runner');
 const initial=await capture('snapshot-initial');row.pid=initial.nodes.find(n=>n.type==='Application')?.pid;
 row.openOverlay=await client.interactions.press({ref:'@'+button(initial,'Open slow fade overlay').ref});
 const covered=await capture('snapshot-covered');
 row.coveredTarget=button(covered,'Underlying action');
 if(row.coveredTarget.identifier!=='Underlying action')throw Error('Frozen underlying identity changed');
 row.coveredEvents=events();
 if(counts(row.coveredEvents).underlying!==0||row.coveredEvents.some(e=>e.event==='fadeDismissBegin'))throw Error('Persistent blocked setup not established');
 let target=row.coveredTarget;
 if(scenario==='ready'){
  row.closeOverlay=await client.interactions.press({ref:'@'+button(covered,'Close overlay').ref});
  target=button(await capture('snapshot-fading'),'Underlying action');
 }
 const options=route==='selector'?{selector:'id="Underlying action"'}:{ref:'@'+target.ref};
 row.request={method:'client.interactions.press',arguments:{...options},timeoutOverride:false,callerReason:scenario==='cancel'?(route==='selector'?'default AbortController.abort()':'AbortController.abort(new Error)'):'none'};
 if(scenario==='cancel'){controller=new AbortController();options.signal=controller.signal;}
 row.target=target;const offset=logText().length,began=performance.now();row.request.startedAt=new Date().toISOString();save();
 let settled=false;
 pending=client.interactions.press(options).then(result=>({ok:true,result}),error=>({ok:false,error:errorOutput(error)})).then(value=>{settled=true;return value;});
 if(controller){
  const setupEnd=performance.now()+15000;
  while(completed(offset)<2){
   if(settled)throw Error('Target request settled before two completed readiness reads');
   if(performance.now()>=setupEnd)throw Error('Two completed blocked-readiness observations were not established');
   await sleep(50);
  }
  row.cancelAfterCompletedReadiness=completed(offset);row.blockedPrecondition='Only blocked readiness repeats; two completed target-phase reads precede cancellation.';
  if(route==='selector')controller.abort();else controller.abort(new Error('plain caller cancellation'));
  row.actualCallerReason={name:controller.signal.reason?.name,message:controller.signal.reason?.message};save();
 }
 const outcome=await pending;pending=undefined;
 row.request.elapsedMs=performance.now()-began;row.request.finishedAt=new Date().toISOString();row.request.output=outcome;
 row.targetPhaseMarkers=markers(offset);row.completedReadiness=completed(offset);row.targetPhaseTapAccepted=targetTapCommands(row.targetPhaseMarkers);row.requestPhaseEvents=events();
 row.samples.push({kind:route,ms:row.request.elapsedMs,...(outcome.ok?{press:outcome.result}:{error:outcome.error}),nativeMarkers:row.targetPhaseMarkers});save();
 if(row.completedReadiness<2)throw Error('No blocked-to-next-read production readiness sequence was established');
 if(scenario==='ready'){
  if(!outcome.ok)throw Error('Blocked-to-ready request failed');
  const dismiss=row.requestPhaseEvents.findIndex(e=>e.event==='fadeDismissComplete'),tap=row.requestPhaseEvents.findIndex(e=>e.event==='underlyingReceivedTap');
  if(dismiss<0||tap<=dismiss)throw Error('Underlying tap preceded completed fade dismissal');
 }else{
  if(outcome.ok)row.unexpectedSuccess=true;
  const details=outcome.error?.details;
  row.classificationValid=scenario==='deadline'?details?.reason==='daemon_request_timeout'&&details?.check==='native-readiness'&&details?.readiness==='blocked'&&details?.dispatched==='no':details?.reason==='request_canceled';
  row.deadlineDurationValid=scenario!=='deadline'||row.request.elapsedMs>=45000&&row.request.elapsedMs<90000;
  row.targetPhaseZeroInput=row.targetPhaseTapAccepted===0&&counts(row.requestPhaseEvents).underlying===0&&counts(row.requestPhaseEvents).overlay===0;
  row.coverHeldUntilRefusal=!row.requestPhaseEvents.some(e=>e.event==='fadeDismissBegin');
  // This separate, intentional setup input exposes any delayed underlying input after refusal.
  const releaseSnapshot=await capture('snapshot-before-release');
  row.releaseAfterRefusal={method:'client.interactions.press',ref:'@'+button(releaseSnapshot,'Close overlay').ref};
  row.releaseAfterRefusal.result=await client.interactions.press({ref:row.releaseAfterRefusal.ref});
 }
 const lateStart=performance.now(),end=lateStart+10000;
 while(!events().some(e=>e.event==='fadeDismissComplete')){if(performance.now()>=end)throw Error('Actual fade dismissal did not complete');await sleep(50);}
 row.lateObservation={dismissalObserved:true,graceMs:1100};await sleep(1100);row.lateObservation.actualElapsedMs=performance.now()-lateStart;
 row.events=events();row.counts=counts(row.events);row.targetTapEvents=row.counts.underlying;row.otherTapEvents=row.counts.overlay;
 const final=await capture('snapshot-final');row.resultLabel=final.nodes.find(n=>n.identifier==='results')?.label;
 await client.capture.screenshot({path:path.join(dir,'final.png')});
 row.success=row.counts.underlying===(scenario==='ready'?1:0)&&row.counts.overlay===0;
 if(scenario!=='ready'){
  row.failedOracles=[];
  if(!row.classificationValid)row.failedOracles.push('Strict cancellation/deadline output classification');
  if(!row.deadlineDurationValid)row.failedOracles.push('Ordinary deadline duration must be within45to90seconds');
  if(!row.targetPhaseZeroInput)row.failedOracles.push('No target-phase native input');
  if(!row.coverHeldUntilRefusal)row.failedOracles.push('Persistent cover remains until refusal');
  if(row.counts.underlying!==0||row.counts.overlay!==0)row.failedOracles.push('No late input after explicit release and fade/grace');
  row.success=row.success&&row.failedOracles.length===0;
 }
}catch(error){
 if(pending&&controller&&!controller.signal.aborted){controller.abort(new Error('Harness precondition not established'));await pending;pending=undefined;}
 row.harnessError=errorOutput(error);row.success=false;
 try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'failure.png')],{stdio:'ignore'});}catch{}
}finally{
 try{row.events=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.events,null,2)+'\n');}catch{}
 if(recorder){if(recorder.exitCode===null&&recorder.signalCode===null)recorder.kill('SIGINT');row.recording=await Promise.race([recordingExit,new Promise(resolve=>{const timer=setTimeout(()=>resolve({cleanupTimedOut:true}),10000);timer.unref();})]);}
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError=errorOutput(error);}
 save();
}
console.log(JSON.stringify({phase,mode,source:row.source,success:row.success,requestMs:row.request?.elapsedMs,requestOutput:row.request?.output,completedReadiness:row.completedReadiness,targetPhaseTapAccepted:row.targetPhaseTapAccepted,counts:row.counts,lateObservation:row.lateObservation,recording:row.recording,failedOracles:row.failedOracles,harnessError:row.harnessError}));
if(!row.success)process.exitCode=1;
