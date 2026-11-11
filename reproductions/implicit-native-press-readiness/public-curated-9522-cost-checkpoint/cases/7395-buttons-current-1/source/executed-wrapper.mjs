import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync, spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=process.env.QA_ROOT;
const phase=process.env.QA_PHASE;
const mode=process.env.QA_MODE;
const sdkRoot=process.env.SDK_ROOT;
const derived=process.env.NATIVE_DERIVED;
const udid=JSON.parse(fs.readFileSync(path.join(root,'owned-device-state-private.json'),'utf8')).find(entry=>entry.role==='phone')?.udid;
const app='dev.e2e.readinessvariants';
const targetType=mode==='buttons'?'Button':'Other';
if(!root||!phase||!['anonymous','buttons','shared','missing'].includes(mode)||!sdkRoot||!derived||!udid||!process.env.QA_SDK_SOURCE||!process.env.QA_NATIVE_FP||!process.env.QA_FIXTURE_BINARY_SHA||!process.env.QA_JS_MANIFEST) throw Error('Explicit source/native/runtime/fixture and owned-phone inputs are required');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:sdkRoot,encoding:'utf8'}).trim()!==process.env.QA_SDK_SOURCE||execFileSync('git',['status','--porcelain=v1'],{cwd:sdkRoot,encoding:'utf8'}).trim())throw Error('SDK source is not the expected clean commit');
const runtime=JSON.parse(fs.readFileSync(process.env.QA_JS_MANIFEST,'utf8'));
if(runtime.head!==process.env.QA_SDK_SOURCE)throw Error('Runtime manifest names another source');
for(const file of runtime.files){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(sdkRoot,file.path))).digest('hex')!==file.sha256)throw Error('Runtime byte mismatch: '+file.path);}

const dir=path.join(root,'evidence',phase);fs.mkdirSync(dir,{recursive:true});
const stateDir=path.join(root,'state-'+phase),session='codex-variant-'+phase;
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
if(manifest.runnerSourceFingerprint!==process.env.QA_NATIVE_FP)throw Error('Native source fingerprint does not match the expected build');
const artifact=manifest.artifacts.entries.find(x=>x.path.endsWith('xctest/AgentDeviceRunnerUITests'));
const binaryHash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(derived,artifact.path))).digest('hex');
if(binaryHash()!==artifact.digest)throw Error('Native binary does not match its recorded manifest');
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const client=createAgentDeviceClient({session,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,mode,sdkSource:process.env.QA_SDK_SOURCE,nativeBuiltAt:process.env.QA_NATIVE_BUILT_AT,nativeFingerprint:manifest.runnerSourceFingerprint,nativeBinarySha256:artifact.digest,samples:[]};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const events=()=>{const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(path.join(container,'Documents/events.json'),'utf8'));};
const logText=()=>row.open?.runnerLogPath&&fs.existsSync(row.open.runnerLogPath)?fs.readFileSync(row.open.runnerLogPath,'utf8'):'';
const nativeMarkers=offset=>logText().slice(offset).split('\n').filter(x=>x.includes('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED')||x.includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED'));
const capture=async name=>{const snapshot=await client.capture.snapshot({interactiveOnly:false});fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(snapshot,null,2)+'\n');return snapshot;};
const target=snapshot=>{
 const matches=snapshot.nodes.filter(n=>n.type===targetType&&Math.abs(n.rect?.x-24)<=1&&Math.abs(n.rect?.y-220)<=1&&Math.abs(n.rect?.height-40)<=1&&Math.abs(n.rect?.width-345)<=1);
 if(matches.length!==1)throw Error('Expected exactly one first-row Other by actual frame; got '+matches.length);
 const node=matches[0];
 if(mode==='anonymous'&&node.identifier)throw Error('Anonymous Other target acquired an identifier');
 if(mode==='buttons'&&(node.identifier||node.label||node.value))throw Error('Anonymous Button target acquired identity content');
 if(mode==='shared'&&(node.identifier!=='shared-row'||node.label!=='Shared row 000'))throw Error('Shared target identity differs from fixture');
 if(mode==='missing'&&(node.identifier!=='missing-target'||node.label!=='Volatile value target'))throw Error('Missing target identity differs from fixture');
 return node;
};
const observeNative=async()=>{
 const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));
 const began=performance.now();
 const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({command:'snapshot',interactiveOnly:false,customActions:true,raw:true,appBundleId:app}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 const nodes=result.data?.nodes??[];
 const first=nodes.filter(n=>n.type===targetType&&Math.abs(n.rect?.x-24)<=1&&Math.abs(n.rect?.y-220)<=1&&Math.abs(n.rect?.height-40)<=1);
 return {ms:performance.now()-began,ok:result.ok,error:result.error,nodeCount:nodes.length,otherCount:nodes.filter(n=>n.type==='Other').length,sameTypeCount:nodes.filter(n=>n.type===targetType).length,firstRows:first.map(n=>({type:n.type,identifier:n.identifier,label:n.label,value:n.value,rect:n.rect,nativePressTarget:n.nativePressTarget})),snapshotQuality:result.data?.snapshotQuality};
};
let recorder,recordingExit;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});
 recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 const start=performance.now();row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});row.coldOpenMs=performance.now()-start;
 const installed=execFileSync('xcrun',['simctl','get_app_container',udid,app,'app'],{encoding:'utf8'}).trim();
 row.fixtureBinarySha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(installed,'ReadinessVariants'))).digest('hex');
 if(row.fixtureBinarySha256!==process.env.QA_FIXTURE_BINARY_SHA)throw Error('Frozen fixture binary mismatch');
 save();
 if(!logText().includes(derived))throw Error('Actual runner log does not name the pinned native derived root');
 if(logText().includes('build-for-testing'))throw Error('Unexpected native auto-build while using explicit artifact');
 row.orientationSetup=JSON.parse(execFileSync('node',[path.join(sdkRoot,'bin/agent-device.mjs'),'orientation','portrait','--session',session,'--state-dir',stateDir,'--json'],{encoding:'utf8',timeout:15000}));
 const setup=performance.now();await client.interactions.press({selector:'id=mode-'+mode});row.nativeModeSetupMs=performance.now()-setup;save();
 const initial=await capture('snapshot-initial');row.initialViewport=initial.viewport;if(!initial.viewport||initial.viewport.width>=initial.viewport.height)throw Error('Matched portrait setup not established');row.initialTarget=target(initial);row.nativeObservation=await observeNative();save();
 if(!row.nativeObservation.ok)throw Error('Actual native observation failed');
 if(row.nativeObservation.sameTypeCount<500)throw Error('Fixture did not expose at least500 same-type native nodes');
 const nativeTarget=row.nativeObservation.firstRows;
 if(nativeTarget.length!==1)throw Error('Native snapshot does not contain one first-row target');
 const rawBinding=nativeTarget[0].nativePressTarget;
 if(['anonymous','buttons'].includes(mode)&&rawBinding&&(rawBinding.identifier||rawBinding.label))throw Error('Native raw anonymous binding acquired an identifier or label');
 row.nativeObservation.rawBindingAvailable=!!rawBinding;
 if(!rawBinding)row.nativeObservation.labelQualification='Legacy native wire label may include presentation synthesis; not raw XCUI label proof.';
 if(mode==='anonymous'&&nativeTarget[0].value!=='Shared icon value')throw Error('Native anonymous Other target lost common neutral value');
 if(mode==='buttons'&&nativeTarget[0].value)throw Error('Native anonymous Button target acquired a value');
 if(mode!=='missing'){
  for(let index=0;index<Number(process.env.QA_RUNS??3);index++){
   const node=target(await capture('snapshot-ref-'+index));const offset=logText().length;const sample={kind:'ref',target:node};const began=performance.now();
   try{sample.press=await client.interactions.press({ref:'@'+node.ref,signal:AbortSignal.timeout(Number(process.env.QA_OBSERVATION_MS??15000))});}catch(error){sample.error={code:error.code,message:error.message,details:error.details};}
   sample.ms=performance.now()-began;sample.nativeMarkers=nativeMarkers(offset);sample.nativeEvents=events();row.samples.push(sample);save();console.log(JSON.stringify({phase,mode,kind:'ref',ms:sample.ms,error:sample.error}));
   if(sample.error)break;
  }
 }
 if(!row.samples.some(x=>x.error)){
  const node=target(await capture('snapshot-before-cli'));const offset=logText().length;const began=performance.now();
  try{row.cli={exitCode:0,stdout:execFileSync('node',[path.join(sdkRoot,'bin/agent-device.mjs'),'press','@'+node.ref,'--session',session,'--state-dir',stateDir,'--json'],{encoding:'utf8',timeout:15000})};}
  catch(error){row.cli={exitCode:error.status,stdout:error.stdout?.toString(),stderr:error.stderr?.toString(),signal:error.signal,processError:error.message};}
  row.cli.ms=performance.now()-began;row.cli.nativeMarkers=nativeMarkers(offset);row.cli.nativeEvents=events();
  try{row.cli.parsed=JSON.parse(row.cli.stdout||row.cli.stderr||'');}catch{}
  save();
 }
 row.events=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.events,null,2)+'\n');
 row.targetTapEvents=row.events.filter(x=>x.event==='controlReceivedTap'&&x.row===0).length;
 row.otherTapEvents=row.events.filter(x=>x.event==='controlReceivedTap'&&x.row!==0).length;
 row.nativeBinaryUnchanged=binaryHash()===artifact.digest;
 await client.capture.screenshot({path:path.join(dir,'final.png')});
 const refusal=row.cli?.parsed?.error?.details??row.cli?.parsed?.details;
 row.success=mode==='missing'?row.cli?.exitCode!==0&&row.cli.ms<1000&&refusal?.reason==='target_not_ready'&&refusal?.readiness==='missing'&&refusal?.dispatched==='no'&&row.targetTapEvents===0&&row.otherTapEvents===0&&!row.cli.nativeMarkers.some(x=>/COMMAND_ACCEPTED command=tap(?: |$)/.test(x)):row.samples.length===Number(process.env.QA_RUNS??3)&&!row.samples.some(x=>x.error)&&row.cli?.exitCode===0&&row.targetTapEvents===Number(process.env.QA_RUNS??3)+1&&row.otherTapEvents===0;
}catch(error){row.harnessError={message:error.message,code:error.code,details:error.details,cause:error.cause?{code:error.cause.code,message:error.cause.message}:undefined};row.success=false;}
finally{
 try{row.events=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.events,null,2)+'\n');}catch{}
 if(row.harnessError){try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'failure.png')],{stdio:'ignore'});}catch{}}
 save();
 if(recorder){if(recorder.exitCode===null&&recorder.signalCode===null)recorder.kill('SIGINT');row.recording=await Promise.race([recordingExit,new Promise(resolve=>{const timer=setTimeout(()=>resolve({cleanupTimedOut:true}),10000);timer.unref();})]);}
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError={message:error.message,code:error.code,details:error.details};}
 save();
}
console.log(JSON.stringify({phase,mode,success:row.success,coldOpenMs:row.coldOpenMs,refs:row.samples.map(x=>({ms:x.ms,error:x.error})),cli:row.cli,targetTapEvents:row.targetTapEvents,otherTapEvents:row.otherTapEvents,harnessError:row.harnessError}));
if(!row.success)process.exitCode=1;
