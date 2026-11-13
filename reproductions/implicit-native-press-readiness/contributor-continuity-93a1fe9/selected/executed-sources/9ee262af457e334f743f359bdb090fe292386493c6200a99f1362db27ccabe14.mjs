import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,mode=process.env.QA_MODE,sdkRoot=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,device=process.env.QA_DEVICE;
const [kind,route]=String(mode).split('-');
if(!root||!phase||!sdkRoot||!derived||!device||!['label','identifier','switch'].includes(kind)||!['ref','selector'].includes(route))throw Error('Explicit contributor case inputs required');
const dir=path.join(root,'evidence',phase),stateDir=path.join(root,'state-'+phase),app='dev.e2e.semanticfixture';
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
const client=createAgentDeviceClient({session:'codex-contributors-'+phase,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,kind,route,source:process.env.QA_SDK_SOURCE,producerOverride:false,setupNativeReplaceIsIntentionalInput:true,recordingOwnedByParentDriver:true};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const error=e=>({name:e.name,code:e.code,message:e.message,details:e.details});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const runnerLog=open=>{const file=open?.runnerLogPath;if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Readable actual runner log required for input proof');return {file,stat:fs.statSync(file),text:fs.readFileSync(file,'utf8')};};
const native=async body=>{const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',device+'.json'),'utf8'));const r=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({...body,appBundleId:app}),signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok||!data.ok)throw Error('Native setup/read refused: '+JSON.stringify(data.error));return data;};
const nativeSnapshot=()=>native({command:'snapshot',interactiveOnly:false,customActions:false,raw:false});
const rawCell=s=>{const nodes=s.data?.nodes?.filter(n=>n.type==='Cell'&&n.nativePressTarget?.type===75)??[];if(nodes.length!==1)throw Error('One raw native Cell required');const n=nodes[0].nativePressTarget;return {type:n.type,identifier:n.identifier??null,label:n.label??null,value:n.value??null,rect:n.rect};};
const witness=s=>s.data?.nodes?.find(n=>n.identifier==='agent-device-tap-witness-presses')?.label;
const target=s=>{const matches=s.nodes.filter(n=>n.type===(kind==='switch'?'Switch':'Cell')&&n.identifier==='derived-label-action'&&n.label==='Original row');if(matches.length!==1||!matches[0].ref)throw Error('Unique projected target not established');return matches[0];};
const qualify=s=>{const b=s.snapshotDiagnostics?.stats?.backends;if(!b||!b['simulator-ax-bridge']||Object.keys(b).some(k=>k!=='simulator-ax-bridge'))throw Error('Ordinary GuestAX producer not established');return b;};
const selector=kind==='label'?'role="Cell" && label="Original row"':`role="${kind==='switch'?'Switch':'Cell'}" && id="derived-label-action"`;
const options=t=>route==='ref'?{ref:'@'+t.ref}:{selector};
const flags=['--agent-device-derived-label',...(kind==='label'?[]:['--agent-device-derived-identifier']),...(kind==='switch'?['--agent-device-derived-switch']:[])];
let observer;
try{
 const {startObserver}=await import(pathToFileURL(process.env.QA_OBSERVER_PATH).href);observer=await startObserver({sdkRoot,stateDir,outDir:dir,cwd:root});
 row.healthyOpen=await client.apps.open({app,platform:'ios',udid:device,relaunch:true,foreground:true,launchArgs:flags});
 const healthy=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(path.join(dir,'snapshot-healthy.json'),JSON.stringify(healthy,null,2)+'\n');row.healthyProducer=qualify(healthy);await observer.ready();row.healthyTarget=target(healthy);row.healthyNativeBefore=await nativeSnapshot();
 const healthyLog=runnerLog(row.healthyOpen);row.healthyLogIdentity={file:healthyLog.file,inode:healthyLog.stat.ino,offset:healthyLog.text.length};
 await observer.mark('healthy');row.healthyPress=await client.interactions.press(options(row.healthyTarget));await observer.mark('after-healthy');row.healthyNative=await nativeSnapshot();
 row.healthyTrace=observer.events.filter(e=>e.phase==='healthy');const healthyAfterLog=runnerLog(row.healthyOpen);if(healthyAfterLog.stat.ino!==healthyLog.stat.ino||healthyAfterLog.text.length<healthyLog.text.length)throw Error('Healthy runner log identity changed');row.healthySdkTapDispatches=row.healthyTrace.filter(e=>e.event==='tap-dispatch').length;row.healthyNativeTapAccepted=healthyAfterLog.text.slice(healthyLog.text.length).split('\n').filter(s=>/COMMAND_ACCEPTED command=tap(?: |$)/.test(s)).length;if(row.healthySdkTapDispatches!==1||row.healthyNativeTapAccepted!==1)throw Error('Healthy request must dispatch exactly one SDK/native tap');const healthyBinding=row.healthyTrace.find(e=>e.event==='native-readiness'&&e.state==='ready')?.binding;row.healthyContributorProof=Array.isArray(healthyBinding?.contributors)&&healthyBinding.contributors.some(c=>c.type===9&&c.identifier==='derived-label-action')&&(kind==='switch'?healthyBinding.contributorsScope==='window':healthyBinding.type===75);if(!row.healthyContributorProof)throw Error('Actual GuestAX promoted parent/contributor proof not established');
 if(kind!=='switch'&&witness(row.healthyNative)!=='presses=1')throw Error('Healthy intended recipient did not receive one input');
 if(kind==='switch'){const value=s=>s.data.nodes.find(n=>n.type==='Switch')?.value;row.healthySwitchValues=[value(row.healthyNativeBefore),value(row.healthyNative)];if(String(row.healthySwitchValues[0])!=='0'||String(row.healthySwitchValues[1])!=='1')throw Error('Healthy intended Switch did not change value');}
 row.healthySessionClosed=await client.apps.close({platform:'ios',udid:device});
 row.open=await client.apps.open({app,platform:'ios',udid:device,relaunch:true,foreground:true,launchArgs:flags});
 const captured=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(path.join(dir,'snapshot-captured.json'),JSON.stringify(captured,null,2)+'\n');row.producer=qualify(captured);row.target=target(captured);row.nativeBefore=await nativeSnapshot();row.rawBefore=rawCell(row.nativeBefore);
 if(row.rawBefore.identifier!==null||row.rawBefore.label!==null||witness(row.nativeBefore)!=='presses=0')throw Error('Anonymous untouched parent setup not established');
 row.replaceQuery=await native({command:'querySelector',selectorKey:'id',selectorValue:'replace-derived-label'});
 const replace=row.replaceQuery.data?.nodes;if(row.replaceQuery.data?.found!==true||replace?.length!==1||replace[0].hittable!==true||!replace[0].rect)throw Error('Unique hittable native Replace control not established');
 const rect=replace[0].rect;row.intentionalReplace={command:'tap',x:rect.x+rect.width/2,y:rect.y+rect.height/2};row.replaceReply=await native(row.intentionalReplace);
 row.nativeAfter=await nativeSnapshot();row.rawAfter=rawCell(row.nativeAfter);
 if(JSON.stringify(row.rawAfter)!==JSON.stringify(row.rawBefore)||witness(row.nativeAfter)!=='presses=0')throw Error('Raw parent continuity/zero target input setup not established');
 const replacement=row.nativeAfter.data.nodes.find(n=>n.identifier===(kind==='label'?'derived-label-action':'replacement-derived-action'));
 if(!replacement||replacement.label!==(kind==='label'?'Replacement row':'Original row'))throw Error('Semantic replacement not established');
 const beforeLog=runnerLog(row.open);if(!beforeLog.text.includes(derived))throw Error('Actual runner is not the pinned production product');const targetLogOffset=beforeLog.text.length;row.targetLogIdentity={file:beforeLog.file,inode:beforeLog.stat.ino,offset:targetLogOffset};row.request={method:'client.interactions.press',arguments:options(row.target)};save();await observer.mark('target');
 const start=performance.now();try{row.request.output={ok:true,result:await client.interactions.press(options(row.target))};}catch(e){row.request.output={ok:false,error:error(e)};}row.request.elapsedMs=performance.now()-start;await observer.mark('after-target');
 row.targetTrace=observer.events.filter(e=>e.phase==='target');
 row.nativeFinal=await nativeSnapshot();await sleep(1100);row.nativeLate=await nativeSnapshot();
 row.targetTapDispatches=row.targetTrace.filter(e=>e.event==='tap-dispatch').length;row.changedReadings=row.targetTrace.filter(e=>e.event==='native-readiness'&&e.state==='semantic-changed');
 const afterLog=runnerLog(row.open);if(afterLog.stat.ino!==beforeLog.stat.ino||afterLog.text.length<targetLogOffset)throw Error('Target runner log identity changed');row.targetNativeTapAccepted=afterLog.text.slice(targetLogOffset).split('\n').filter(s=>/COMMAND_ACCEPTED command=tap(?: |$)/.test(s)).length;
 const details=row.request.output.error?.details;
 row.typedRefusal=row.request.output.error?.code==='COMMAND_FAILED'&&details?.dispatched==='no'&&(route==='ref'?details.reason==='target_not_ready'&&details.readiness==='changed':details.reason==='selector_not_found');
 const starts=row.targetTrace.filter(e=>e.event==='canonical-refresh-start');
 const firstChange=row.changedReadings[0];
 const begin=starts[0];const end=begin&&row.targetTrace.find(e=>e.event==='canonical-refresh-complete'&&e.sequence>begin.sequence);
 const during=begin?row.targetTrace.filter(e=>e.sequence>begin.sequence&&(!end||e.sequence<end.sequence)):[];
 row.refreshProof={refreshStarts:starts.length,changedBeforeRefresh:!!firstChange&&!!begin&&firstChange.sequence<begin.sequence,capturesInsideRefresh:during.filter(e=>e.event==='capture-start').length,completedCapturesInsideRefresh:during.filter(e=>e.event==='capture-complete').length,generationBefore:begin?.generation,generationAfter:end?.generation,canonicalResolutionCompleted:!!end,initialCaptures:row.targetTrace.filter(e=>e.event==='capture-start'&&(!begin||e.sequence<begin.sequence)).length};
 const firstBinding=firstChange?.binding;row.contributorProofEstablished=Array.isArray(firstBinding?.contributors)&&firstBinding.contributors.length>0&&(kind!=='switch'||firstBinding.contributorsScope==='window');
 row.nativeReadingsAfterChange=firstChange?row.targetTrace.filter(e=>e.event==='native-readiness'&&e.sequence>firstChange.sequence).length:0;
 const routeProof=route==='ref'?row.changedReadings.length===1&&row.refreshProof.changedBeforeRefresh&&starts.length===1&&row.refreshProof.capturesInsideRefresh===1&&row.refreshProof.completedCapturesInsideRefresh===1&&row.contributorProofEstablished&&row.nativeReadingsAfterChange===0&&begin.generation===firstChange.generation&&!end:row.targetTrace.filter(e=>e.event==='native-readiness').length===0&&starts.length===0&&row.refreshProof.initialCaptures===1;
 row.success=!row.request.output.ok&&row.typedRefusal&&routeProof&&row.targetTapDispatches===0&&row.targetNativeTapAccepted===0&&witness(row.nativeFinal)==='presses=0'&&witness(row.nativeLate)==='presses=0';
 if(kind==='switch'){
  const toggle=s=>s.data.nodes.find(n=>n.type==='Switch');row.switchValueBefore=toggle(row.nativeAfter)?.value;row.switchValueAfter=toggle(row.nativeLate)?.value;row.success=row.success&&row.switchValueBefore!==undefined&&row.switchValueBefore===row.switchValueAfter;
 }
}catch(e){row.harnessError=error(e);row.success=false;}
finally{
 try{await client.apps.close({platform:'ios',udid:device});row.sessionClosed=true;}catch(e){row.cleanupError=error(e);row.success=false;}
 if(observer)try{row.inspector=await observer.stop();}catch(e){row.inspectorError=error(e);row.success=false;}save();
}
console.log(JSON.stringify({phase,kind,route,source:row.source,success:row.success,producer:row.producer,request:row.request,changedReadings:row.changedReadings?.length,targetTapDispatches:row.targetTapDispatches,refreshProof:row.refreshProof,typedRefusal:row.typedRefusal,targetNativeTapAccepted:row.targetNativeTapAccepted,contributorProofEstablished:row.contributorProofEstablished,recording:row.recording,harnessError:row.harnessError}));if(!row.success)process.exitCode=1;
