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
let recorder,recordingExit,controller,pending,observer;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});
 recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 const {startObserver}=await import(pathToFileURL(process.env.QA_OBSERVER_PATH).href);observer=await startObserver({sdkRoot,stateDir,outDir:dir,cwd:root});
 row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 if(!logText().includes(derived)||logText().includes('build-for-testing'))throw Error('Explicit native artifact was not the actual runner');
 const initial=await capture('snapshot-initial');await observer.ready();row.pid=initial.nodes.find(n=>n.type==='Application')?.pid;
 let target=button(initial,'Underlying action');
 row.idleProtocol={freshSession:true,priorInteractionCalls:0,setupInput:0};
 const options=route==='selector'?{selector:'id="Underlying action"'}:{ref:'@'+target.ref};
 row.request={method:'client.interactions.press',arguments:{...options},timeoutOverride:false,callerReason:scenario==='cancel'?(route==='selector'?'default AbortController.abort()':'AbortController.abort(new Error)'):'none'};
 if(scenario==='cancel'){controller=new AbortController();options.signal=controller.signal;}
 row.target=target;const offset=logText().length,began=performance.now();row.request.startedAt=new Date().toISOString();save();
 await observer.mark('target');
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
 const outcome=await pending;pending=undefined;await observer.mark('after-target');
 row.request.elapsedMs=performance.now()-began;row.request.finishedAt=new Date().toISOString();row.request.output=outcome;
 row.targetPhaseMarkers=markers(offset);row.completedReadiness=completed(offset);row.targetPhaseTapAccepted=targetTapCommands(row.targetPhaseMarkers);row.requestPhaseEvents=events();
 row.samples.push({kind:route,ms:row.request.elapsedMs,...(outcome.ok?{press:outcome.result}:{error:outcome.error}),nativeMarkers:row.targetPhaseMarkers});save();
 row.admissionTrace=observer.events.filter(e=>e.phase==='target');
 const trace=row.admissionTrace,reads=trace.filter(e=>e.event==='native-readiness');
 if(!outcome.ok||!trace.some(e=>e.event==='motion-baseline'&&e.present===false)||reads.length!==1||reads[0].state!=='ready'||trace.some(e=>e.event==='canonical-refresh-start')||trace.filter(e=>e.event==='tap-dispatch').length!==1)throw Error('Initial idle path was not exactly one ready probe and one input without prior motion baseline');
 await sleep(1100);row.lateObservation={graceMs:1100};
 row.events=events();row.counts=counts(row.events);row.targetTapEvents=row.counts.underlying;row.otherTapEvents=row.counts.overlay;
 const final=await capture('snapshot-final');row.resultLabel=final.nodes.find(n=>n.identifier==='results')?.label;
 await client.capture.screenshot({path:path.join(dir,'final.png')});
 row.success=row.counts.underlying===1&&row.counts.overlay===0;
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
 if(recorder){
  const waitExit=async ms=>{let timer;try{return await Promise.race([recordingExit,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);timer.unref();})]);}finally{clearTimeout(timer);}};
  if(recorder.exitCode===null&&recorder.signalCode===null)recorder.kill('SIGINT');
  let ended=await waitExit(10000),escalated=false;
  if(!ended){escalated=true;recorder.kill('SIGTERM');ended=await waitExit(3000);}
  if(!ended){recorder.kill('SIGKILL');ended=await waitExit(3000);}
  row.recording={...(ended??{cleanupTimedOut:true}),escalated};if(!ended||ended.code!==0||escalated)row.success=false;
 }
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError=errorOutput(error);row.success=false;}
 if(observer)try{row.inspector=await observer.stop();}catch(error){row.inspectorError=errorOutput(error);row.success=false;}
 save();
}
console.log(JSON.stringify({phase,mode,source:row.source,success:row.success,requestMs:row.request?.elapsedMs,requestOutput:row.request?.output,completedReadiness:row.completedReadiness,targetPhaseTapAccepted:row.targetPhaseTapAccepted,counts:row.counts,lateObservation:row.lateObservation,recording:row.recording,failedOracles:row.failedOracles,harnessError:row.harnessError}));
if(!row.success)process.exitCode=1;
