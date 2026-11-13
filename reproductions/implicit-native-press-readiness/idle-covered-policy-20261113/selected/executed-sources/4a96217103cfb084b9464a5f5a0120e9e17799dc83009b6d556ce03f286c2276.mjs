import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,arm=process.env.QA_MODE;
const sdkRoot=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,udid=process.env.QA_DEVICE;
if(!root||!phase||!sdkRoot||!derived||!udid||!['always-read','idle-skip'].includes(arm))throw Error('Explicit owned idle-cover inputs required');
const dir=path.join(root,'evidence',phase),stateDir=path.join(root,'state-'+phase),app='dev.e2e.overlay1563';
const inputs=JSON.parse(fs.readFileSync(path.join(dir,'execution-inputs.json'),'utf8'));
if(!inputs.runtimeCompleteFileSetVerified||inputs.runtimeSymlinksFound||inputs.nativeArtifactsVerified!==11)throw Error('Complete pre-run runtime/native provenance required');
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const client=createAgentDeviceClient({session:'codex-idle-covered-'+phase,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={phase,arm,source:process.env.QA_SDK_SOURCE,nativeBuiltAt:process.env.QA_NATIVE_BUILT_AT,fixtureBinarySha256:process.env.QA_FIXTURE_BINARY_SHA,recordingOwnedByParentDriver:true,producerOverride:false,declaredCallerAbortMs:2000,publicTimeoutOverride:false,scope:'Public SDK selector press with a common explicit caller signal. This does not test the default daemon deadline.'};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const errorOutput=e=>({code:e.code,message:e.message,details:e.details,name:e.name});
const button=(s,label)=>{const found=s.nodes.filter(n=>n.type==='Button'&&n.label===label);if(found.length!==1)throw Error('Expected unique fixture button '+label);return found[0];};
const capture=async name=>{const s=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(s,null,2)+'\n');return s;};
const events=()=>{const folder=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();const file=path.join(folder,'Documents','events-'+row.setupPID+'.json');if(!fs.existsSync(file))throw Error('Actual fixture PID event file unavailable');return JSON.parse(fs.readFileSync(file,'utf8'));};
const counts=rows=>({underlying:rows.filter(e=>e.event==='underlyingReceivedTap').length,overlay:rows.filter(e=>e.event==='overlayReceivedTouch').length});
const logText=()=>{const f=row.targetOpen?.runnerLogPath??row.setupOpen?.runnerLogPath;if(!f||!fs.existsSync(f)||!fs.statSync(f).isFile())throw Error('Readable actual runner log required');return fs.readFileSync(f,'utf8');};
const targetMarkers=offset=>{const text=logText(),stat=fs.statSync(row.targetOpen.runnerLogPath);if(stat.ino!==row.targetLogIdentity.inode||text.length<offset||stat.size<offset)throw Error('Target runner log rotated or truncated; native input count unavailable');row.targetLogIdentityRechecked={sameInode:true,notTruncated:true};return text.slice(offset).split('\n').filter(s=>s.includes('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED')||s.includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED'));};
const tapCount=lines=>lines.filter(s=>/COMMAND_ACCEPTED command=tap(?: |$)/.test(s)).length;
const warm=async()=>{try{return {ok:true,result:await client.command.alert({action:'get'})};}catch(e){if(e.details?.reason!=='alert-not-found'&&e.details?.runnerErrorCode!=='ALERT_NOT_FOUND')throw e;return {ok:false,expectedAbsent:true,error:errorOutput(e)};}};
let observer,controller,timer,pending;
try{
 if(process.env.QA_PARENT_RECORDING!=='1')throw Error('Parent-owned recording required');
 const {startObserver}=await import(pathToFileURL(process.env.QA_OBSERVER_PATH).href);observer=await startObserver({sdkRoot,stateDir,outDir:dir,cwd:root});
 row.setupOpen=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 row.setupWarmup=await warm();const first=await capture('snapshot-before-setup');await observer.ready();
 row.setupPID=first.nodes.find(n=>n.type==='Application')?.pid;if(!Number.isInteger(row.setupPID))throw Error('Actual setup application PID required');
 row.originalTarget=button(first,'Underlying action');row.initialEvents=events();
 if(counts(row.initialEvents).underlying!==0||counts(row.initialEvents).overlay!==0)throw Error('Fresh fixture counters required');
 await observer.mark('intentional-cover-setup');row.setupPress=await client.interactions.press({selector:'id="Open slow fade overlay"'});
 row.coverEvents=events();if(row.coverEvents.filter(e=>e.event==='fadeOverlayOpened').length!==1||row.coverEvents.some(e=>e.event==='fadeDismissBegin'||e.event==='fadeDismissComplete'))throw Error('Persistent cover setup unavailable');
 row.setupSessionClosed=await client.apps.close({});
 await observer.mark('fresh-record-open');row.targetOpen=await client.apps.open({app,platform:'ios',udid,relaunch:false,foreground:true});
 row.targetWarmup=await warm();const covered=await capture('snapshot-fresh-record-covered');await observer.ready();
 row.targetPID=covered.nodes.find(n=>n.type==='Application')?.pid;row.target=button(covered,'Underlying action');button(covered,'Close overlay');
 row.freshRecord={sameAlias:true,normalCloseWithoutApp:true,relaunch:false,priorInteractionCalls:0,setupInput:0,samePID:row.setupPID===row.targetPID};
 row.eventsBeforeTarget=events();row.countsBeforeTarget=counts(row.eventsBeforeTarget);
 const sameRect=JSON.stringify(['x','y','width','height'].map(k=>row.originalTarget.rect[k]))===JSON.stringify(['x','y','width','height'].map(k=>row.target.rect[k]));
 row.preconditionEstablished=row.freshRecord.samePID&&sameRect&&row.eventsBeforeTarget.filter(e=>e.event==='fadeOverlayOpened').length===1&&!row.eventsBeforeTarget.some(e=>e.event==='fadeDismissBegin'||e.event==='fadeDismissComplete')&&row.countsBeforeTarget.underlying===0&&row.countsBeforeTarget.overlay===0;
 if(!row.preconditionEstablished)throw Error('Same process, persistent cover, original rectangle and zero fresh-record input were not established');
 const logfile=row.targetOpen.runnerLogPath;row.targetLogIdentity={inode:fs.statSync(logfile).ino,offset:logText().length};
 const offset=row.targetLogIdentity.offset;controller=new AbortController();
 const callerAborted=new Promise(resolve=>controller.signal.addEventListener('abort',resolve,{once:true}));
 row.request={method:'client.interactions.press',arguments:{selector:'id="Underlying action"'},callerSignal:'AbortController.abort(new Error) after declared2000ms'};
 await observer.mark('target');
 const began=performance.now();row.request.startedAt=new Date().toISOString();
 timer=setTimeout(()=>{row.callerAbortElapsedMs=performance.now()-began;controller.abort(new Error('Declared two-second caller cancellation'));save();},2000);
 pending=client.interactions.press({selector:'id="Underlying action"',signal:controller.signal}).then(result=>({ok:true,result}),error=>({ok:false,error:errorOutput(error)}));
 row.request.output=await pending;pending=undefined;row.request.elapsedMs=performance.now()-began;row.request.finishedAt=new Date().toISOString();
 await callerAborted;await observer.mark('after-target');
 row.callerSignalAborted=controller.signal.aborted;row.targetTrace=observer.events.filter(e=>e.phase==='target');row.targetPhaseMarkers=targetMarkers(offset);row.targetNativeTapAccepted=tapCount(row.targetPhaseMarkers);row.eventsAfterTarget=events();row.countsAfterTarget=counts(row.eventsAfterTarget);
 const trace=row.targetTrace,reads=trace.filter(e=>e.event==='native-readiness');row.actualReadinessStates=reads.map(e=>e.state);row.targetSdkTapDispatches=trace.filter(e=>e.event==='tap-dispatch').length;
 const screens=trace.filter(e=>e.event==='admission-screen');row.resolvedPoint=screens[0]?.point;row.capturedBinding=screens[0]?.binding;
 const expectedFrame={x:24,y:360,width:340,height:48},expectedPoint={x:194,y:384};
 // This fixture's target is unclipped and uses fixed screen coordinates in its root controller.
 row.geometryProof={expectedUnclippedFrame:expectedFrame,expectedPoint,publicSetupFrameMatches:['x','y','width','height'].every(k=>row.originalTarget.rect?.[k]===expectedFrame[k]),publicFreshFrameMatches:['x','y','width','height'].every(k=>row.target.rect?.[k]===expectedFrame[k]),nativeTypeAndIdentifierMatch:row.capturedBinding?.type===9&&row.capturedBinding?.identifier==='Underlying action',nativeFullFrameMatches:['x','y','width','height'].every(k=>row.capturedBinding?.rect?.[k]===expectedFrame[k]),resolvedPointMatches:row.resolvedPoint?.x===expectedPoint.x&&row.resolvedPoint?.y===expectedPoint.y,controlReplyPointMatches:arm!=='idle-skip'||(row.request.output.ok&&row.request.output.result.x===expectedPoint.x&&row.request.output.result.y===expectedPoint.y)};
 row.originalPointProof=Object.entries(row.geometryProof).filter(([key])=>key!=='expectedUnclippedFrame'&&key!=='expectedPoint').every(([,value])=>value===true);
 row.actualIdleEstablished=trace.some(e=>e.event==='motion-baseline'&&e.present===false)&&screens.length===1&&(arm==='always-read'?screens[0].screening==='pass':screens[0].screening==='idle');
 row.noRefresh=trace.every(e=>e.event!=='canonical-refresh-start');row.targetInputSafety=row.targetNativeTapAccepted===0&&row.targetSdkTapDispatches===0&&row.countsAfterTarget.underlying===0&&row.countsAfterTarget.overlay===0;
 row.unsafeRecipientObserved=row.request.output.ok&&row.targetNativeTapAccepted===1&&row.targetSdkTapDispatches===1&&row.countsAfterTarget.underlying===0&&row.countsAfterTarget.overlay===1;
 row.expectedArmEvidence=arm==='always-read'?(!row.request.output.ok&&row.request.output.error.details?.reason==='request_canceled'&&reads.length>=2&&reads.every(e=>e.state==='blocked')&&row.targetInputSafety):(reads.length===0&&row.unsafeRecipientObserved);
 save();
 // This release is a separate intentional input after the tested target request ended.
 await observer.mark('intentional-cover-release');row.releasePress=await client.interactions.press({selector:'id="Close overlay"'});
 const releaseBegan=performance.now();while(!events().some(e=>e.event==='fadeDismissComplete')){if(performance.now()-releaseBegan>10000)throw Error('Ordinary release did not complete within the fixture bound');await sleep(50);}
 await sleep(1100);row.finalEvents=events();row.finalCounts=counts(row.finalEvents);row.lateObservation={fadeDismissComplete:true,graceMs:1100,underlyingUnchanged:row.finalCounts.underlying===row.countsAfterTarget.underlying,overlayUnchanged:row.finalCounts.overlay===row.countsAfterTarget.overlay};
 row.proofQualified=row.preconditionEstablished&&row.originalPointProof&&row.actualIdleEstablished&&row.noRefresh&&row.expectedArmEvidence&&row.callerSignalAborted&&row.lateObservation.underlyingUnchanged&&row.lateObservation.overlayUnchanged;
 row.safetyValid=row.proofQualified&&row.targetInputSafety;row.counterexampleObserved=row.proofQualified&&row.unsafeRecipientObserved;
 row.success=row.safetyValid;
 await capture('snapshot-final');await client.capture.screenshot({path:path.join(dir,'final.png')});
}catch(e){row.harnessError=errorOutput(e);row.success=false;try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'failure.png')],{stdio:'ignore'});}catch{}}
finally{
 if(timer)clearTimeout(timer);
 if(pending){if(controller&&!controller.signal.aborted)controller.abort(new Error('Harness cleanup'));try{await pending;}catch{};}
 try{row.finalEvents=events();fs.writeFileSync(path.join(dir,'native-events.json'),JSON.stringify(row.finalEvents,null,2)+'\n');}catch(e){row.finalEventsError=errorOutput(e);row.success=false;}
 try{await client.apps.close({});row.sessionClosed=true;}catch(e){row.cleanupError=errorOutput(e);row.success=false;}
 if(observer)try{row.inspector=await observer.stop();}catch(e){row.inspectorError=errorOutput(e);row.success=false;}
 if(row.harnessError||row.cleanupError||row.inspectorError||row.finalEventsError||!row.sessionClosed||!row.inspector?.loadedSourceVerified||!row.inspector?.sourceFileStillMatches){row.proofQualified=false;row.safetyValid=false;row.counterexampleObserved=false;row.success=false;}
 save();
}
console.log(JSON.stringify({phase,arm,source:row.source,proofQualified:row.proofQualified,safetyValid:row.safetyValid,counterexampleObserved:row.counterexampleObserved,success:row.success,output:row.request?.output,actualReadinessStates:row.actualReadinessStates,targetSdkTapDispatches:row.targetSdkTapDispatches,targetNativeTapAccepted:row.targetNativeTapAccepted,counts:row.finalCounts,harnessError:row.harnessError}));
if(!row.success)process.exitCode=1;
