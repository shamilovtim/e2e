import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,mode=process.env.QA_MODE;
const sdkRoot=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED;
if(!root||!phase||!['ipad','clipped','landscape','duplicates','exact'].includes(mode)||!sdkRoot||!derived||!process.env.QA_SDK_SOURCE||!process.env.QA_NATIVE_FP||!process.env.QA_FIXTURE_BINARY_SHA||!process.env.QA_JS_MANIFEST)throw Error('Explicit frozen source, artifact, fixture and runtime configuration required');
const owned=JSON.parse(fs.readFileSync(path.join(root,'owned-device-state-private.json'),'utf8'));
const udid=owned.find(entry=>entry.role===(mode==='ipad'?'ipad':'phone'))?.udid;
if(!udid)throw Error('Missing owned device configuration');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:sdkRoot,encoding:'utf8'}).trim()!==process.env.QA_SDK_SOURCE||execFileSync('git',['status','--porcelain=v1'],{cwd:sdkRoot,encoding:'utf8'}).trim())throw Error('Source is not the expected clean commit');
const runtime=JSON.parse(fs.readFileSync(process.env.QA_JS_MANIFEST,'utf8'));if(runtime.head!==process.env.QA_SDK_SOURCE)throw Error('Runtime source mismatch');
for(const file of runtime.files){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(sdkRoot,file.path))).digest('hex')!==file.sha256)throw Error('Runtime byte mismatch');}
const app=mode==='exact'?'dev.e2e.overlayreadinessvariants':mode==='ipad'?'dev.e2e.readinessgeometry':'dev.e2e.readinessmaintainer';
const dir=path.join(root,'evidence',phase);fs.mkdirSync(dir,{recursive:true});
const session='codex-frame-'+phase,stateDir=path.join(root,'state-'+phase);
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
if(manifest.runnerSourceFingerprint!==process.env.QA_NATIVE_FP)throw Error('Native source fingerprint mismatch');
const binary=manifest.artifacts.entries.find(x=>x.path.endsWith('xctest/AgentDeviceRunnerUITests'));
const binaryHash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(derived,binary.path))).digest('hex');
if(binaryHash()!==binary.digest)throw Error('Native artifact digest mismatch');
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const client=createAgentDeviceClient({session,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,mode,app,sdkSource:process.env.QA_SDK_SOURCE,nativeBuiltAt:process.env.QA_NATIVE_BUILT_AT,nativeFingerprint:manifest.runnerSourceFingerprint,nativeBinarySha256:binary.digest,samples:[]};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const events=()=>{const c=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(path.join(c,'Documents/events.json'),'utf8'));};
const logText=()=>row.open?.runnerLogPath&&fs.existsSync(row.open.runnerLogPath)?fs.readFileSync(row.open.runnerLogPath,'utf8'):'';
const markers=offset=>logText().slice(offset).split('\n').filter(x=>x.includes('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED')||x.includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED'));
const capture=async(name,extra={})=>{const snapshot=await client.capture.snapshot({interactiveOnly:true,...extra});fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(snapshot,null,2)+'\n');return snapshot;};
const native=async command=>{const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));const began=performance.now();const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({...command,appBundleId:app}),signal:AbortSignal.timeout(15000)});return {ms:performance.now()-began,result:await response.json()};};
const center=node=>({x:Math.round(node.rect.x+node.rect.width/2),y:Math.round(node.rect.y+node.rect.height/2)});
const sameRect=(a,b)=>a&&b&&['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<=1);
const diagnose=async(id,point)=>{
 const selected=await native({command:'querySelector',selectorKey:'id',selectorValue:id});
 const raw=await native({command:'snapshot',interactiveOnly:mode==='ipad',customActions:true,raw:mode!=='ipad'});
 const windowTree=mode==='ipad'?await native({command:'snapshot',interactiveOnly:false,customActions:true,raw:true}):raw;
 const sourceNodes=(raw.result.data?.nodes??[]).filter(n=>n.identifier===id).sort((a,b)=>a.rect.y-b.rect.y);
 const strict=[];
 for(const node of sourceNodes){
  if(!node.nativePressTarget)throw Error('Native raw capture omitted source binding');
  const target={...node.nativePressTarget,point:point??center(node)};
  strict.push({target,observation:await native({command:'pressReadiness',authorizedTarget:target})});
 }
 return {liveElementRead:selected,rawSnapshotQuality:raw.result.data?.snapshotQuality,rawWindowRects:(windowTree.result.data?.nodes??[]).filter(n=>n.type==='Window').map(n=>n.nativePressTarget?.rect??n.rect),nativeWindowTreeQuality:windowTree.result.data?.snapshotQuality,sourceRootRects:(raw.result.data?.nodes??[]).filter(n=>n.type==='Application').map(n=>n.nativePressTarget?.rect??n.rect),rawNodes:sourceNodes,strict};
};
const press=async(label,target,ms=6000)=>{const offset=logText().length,began=performance.now();const sample={label,target};try{sample.press=await client.interactions.press({...target,signal:AbortSignal.timeout(ms)});}catch(error){sample.error={code:error.code,message:error.message,details:error.details};}sample.ms=performance.now()-began;sample.nativeMarkers=markers(offset);sample.events=events();row.samples.push(sample);save();return sample;};
let recorder,recordingExit;
try{
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore','pipe']});recordingExit=new Promise(resolve=>recorder.once('exit',(code,signal)=>resolve({code,signal})));
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{text+=chunk;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.once('error',reject);});
 const began=performance.now();row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:mode!=='ipad'});row.coldOpenMs=performance.now()-began;
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'app'],{encoding:'utf8'}).trim();const info=execFileSync('plutil',['-extract','CFBundleExecutable','raw','-o','-',path.join(container,'Info.plist')],{encoding:'utf8'}).trim();row.fixtureBinarySha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(container,info))).digest('hex');if(row.fixtureBinarySha256!==process.env.QA_FIXTURE_BINARY_SHA)throw Error('Frozen fixture mismatch');
 if(!logText().includes(derived)||logText().includes('build-for-testing'))throw Error('Actual runner did not use only pinned external native artifact');
 if(mode==='duplicates'){await client.interactions.press({selector:'id=portrait'});await client.interactions.press({selector:'id=mode-duplicates'});}
 else if(mode==='landscape'){
  await client.interactions.press({selector:'id=landscape'});
  const deadline=Date.now()+3000;
  while(true){const s=await capture('orientation-setup');if(s.viewport?.width>s.viewport?.height)break;if(Date.now()>=deadline)throw Error('Landscape setup did not report landscape viewport');}
 }
 // A native capture warms the read route before private diagnostics, avoiding lazy-start races.
 row.warmNativeCapture=await capture('snapshot-native-warm',{customActions:true});
 const snapshot=mode==='ipad'?row.warmNativeCapture:await capture('snapshot-before');
 if(mode==='ipad')fs.writeFileSync(path.join(dir,'snapshot-before.json'),JSON.stringify(snapshot,null,2)+'\n');
 if(mode==='duplicates'||mode==='exact'){
  const id=mode==='exact'?'overlap':'duplicate-control';const targets=snapshot.nodes.filter(n=>n.identifier===id).sort((a,b)=>a.rect.y-b.rect.y);
  if(targets.length!==2)throw Error('Expected exactly two duplicate controls');row.targets=targets;row.diagnostic=await diagnose(id);
  const states=row.diagnostic.strict.map(x=>x.observation.result.data?.pressReadiness);
  if(mode==='exact'){
   if(states.length!==2||states.some(x=>x!=='ambiguous'))throw Error('Exact duplicate strict reads were not ambiguous');
   const selector=await press('selector-ambiguity',{selector:'id='+id});
   const fresh=await capture('snapshot-ref');const target=fresh.nodes.filter(n=>n.identifier===id).at(-1);const ref=await press('ref-ambiguity',{ref:'@'+target.ref});
   if(selector.error?.code!=='AMBIGUOUS_MATCH'||ref.error?.details?.readiness!=='ambiguous'||ref.error?.details?.dispatched!=='no')throw Error('Exact duplicate input refusal did not retain typed ambiguity');
  }else{
   if(states[0]!=='blocked'||states[1]!=='ready')throw Error('Distinct duplicate strict states were not blocked/ready');
   const selector=await press('selector-ambiguity',{selector:'id='+id});
   const blockedSnapshot=await capture('snapshot-blocked-ref');const blockedTarget=blockedSnapshot.nodes.filter(n=>n.identifier===id).sort((a,b)=>a.rect.y-b.rect.y)[0];
   const blocked=await press('blocked-ref-observation',{ref:'@'+blockedTarget.ref},1500);
   if(!blocked.nativeMarkers.some(x=>x.includes('COMMAND_ACCEPTED command=pressReadiness')))throw Error('Blocked ref did not reach native readiness');
   if(selector.error?.code!=='AMBIGUOUS_MATCH'||!blocked.error)throw Error('Blocked/ambiguous duplicate unexpectedly dispatched');
   const fresh=await capture('snapshot-ready-ref');const target=fresh.nodes.filter(n=>n.identifier===id).sort((a,b)=>a.rect.y-b.rect.y)[1];const ready=await press('ready-ref',{ref:'@'+target.ref});if(ready.error)throw Error('Ready duplicate did not dispatch');
  }
 }else{
  const id=mode==='ipad'?'geometry-action':'clipped-row';const target=snapshot.nodes.find(n=>n.identifier===id);if(!target)throw Error('Missing frame target');row.target=target;
  row.diagnostic=await diagnose(id,center(target));if(row.diagnostic.strict.length!==1)throw Error('Frame diagnostic did not find one native binding');
  const binding=row.diagnostic.strict[0].target;const state=row.diagnostic.strict[0].observation.result.data?.pressReadiness;const live=row.diagnostic.liveElementRead.result.data?.nodes?.[0];
  row.frameComparison={publicVisibleRect:target.rect,canonicalPoint:center(target),nativeSourceRect:binding.rect,nativeLiveElementRect:live?.rect,nativeRectsMatch:sameRect(binding.rect,live?.rect),strictReadiness:state};
  if(!row.frameComparison.nativeRectsMatch||state!=='ready')throw Error('Snapshot-attributes frame did not corroborate live element frame as ready');
  if(mode==='ipad'){row.placement={inferredRootViewOrigin:{x:binding.rect.x-240,y:binding.rect.y-90},nativeWindowRects:row.diagnostic.rawWindowRects,sourceRootRects:row.diagnostic.sourceRootRects,qualification:'actionScreenFrame fixture event is window-local and is not used as screen proof.'};row.placement.verifiedByNativeWindow=row.placement.nativeWindowRects.some(r=>r.x>1&&r.y>1&&r.x<=binding.rect.x&&r.y<=binding.rect.y&&r.x+r.width>=binding.rect.x+binding.rect.width&&r.y+r.height>=binding.rect.y+binding.rect.height);if(!row.placement.verifiedByNativeWindow)throw Error('iPad native window geometry did not prove nonzero placed window');execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'placed-before.png')],{stdio:'ignore'});}
  const fresh=mode==='ipad'?snapshot:await capture('snapshot-before-press');const selected=fresh.nodes.find(n=>n.identifier===id);const action=await press('frame-ref',{ref:'@'+selected.ref});if(action.error)throw Error('Normal frame ref press failed');
  row.actualInputPoint={x:action.press.x,y:action.press.y};
 }
 row.events=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.events,null,2)+'\n');
 if(mode==='duplicates')row.success=row.events.filter(x=>x.event==='duplicateBReceivedTap').length===1&&!row.events.some(x=>x.event==='duplicateAReceivedTap'||x.event==='coverReceivedTouch');
 else if(mode==='exact')row.success=!row.events.some(x=>['underlyingReceivedTap','decoyReceivedTap','overlayReceivedTouch'].includes(x.event));
 else row.success=row.events.filter(x=>x.event===(mode==='ipad'?'actionReceivedTap':'clippedRowReceivedTap')).length===1;
 if(!row.success)throw Error('Native event recipient oracle did not match expected control');
 row.nativeBinaryUnchanged=binaryHash()===binary.digest;
 await client.capture.screenshot({path:path.join(dir,'final.png')});
}catch(error){row.error={message:error.message,code:error.code,details:error.details,cause:error.cause?{code:error.cause.code,message:error.cause.message}:undefined};row.success=false;}
finally{
 try{row.events=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.events,null,2)+'\n');}catch{}
 if(row.error){try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'failure.png')],{stdio:'ignore'});}catch{}}
 save();if(recorder){if(recorder.exitCode===null&&recorder.signalCode===null)recorder.kill('SIGINT');row.recording=await Promise.race([recordingExit,new Promise(resolve=>{const timer=setTimeout(()=>resolve({cleanupTimedOut:true}),10000);timer.unref();})]);}
 try{await client.apps.close({platform:'ios',udid});row.sessionClosed=true;}catch(error){row.cleanupError={message:error.message,code:error.code,details:error.details};}save();
}
console.log(JSON.stringify({phase,mode,success:row.success,frameComparison:row.frameComparison,samples:row.samples.map(x=>({label:x.label,ms:x.ms,error:x.error,press:x.press})),events:row.events,error:row.error}));if(!row.success)process.exitCode=1;
