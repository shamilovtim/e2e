import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.env.QA_ROOT,phase=process.env.QA_PHASE,sdkRoot=process.env.SDK_ROOT,derived=process.env.NATIVE_DERIVED,udid=process.env.QA_DEVICE;
const route=String(process.env.QA_MODE).split('-')[0],expectedReads=Number(process.env.QA_EXPECT_NATIVE_READS);
if(!root||!phase||!sdkRoot||!derived||!udid||!['selector','ref'].includes(route)||![0,1].includes(expectedReads))throw Error('Explicit isolated idle comparison inputs required');
const dir=path.join(root,'evidence',phase),stateDir=path.join(root,'state-'+phase),app='dev.e2e.overlay1563';
const manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json'),'utf8'));
const {createAgentDeviceClient}=await import(pathToFileURL(path.join(sdkRoot,'dist/src/index.js')).href);
const row={phase,route,source:process.env.QA_SDK_SOURCE,nativeBuiltAt:process.env.QA_NATIVE_BUILT_AT,observerUsed:false,recordingOwnedByParentDriver:true,expectedReadinessReads:expectedReads,samples:[],protocol:'Three measured first presses, each after normal close/reopen creates a fresh ordinary session record at the same session alias after relaunch, read-only public alert get to initialize the XCTest runner, and one public snapshot. No input precedes the measured press in its session. Native transport is warm; this is not a warmed target/latency SLO. Cases serialized base before head per route.'};
let client;
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const errorOutput=e=>({code:e.code,message:e.message,details:e.details,name:e.name});
const counts=events=>({underlying:events.filter(e=>e.event==='underlyingReceivedTap').length,overlay:events.filter(e=>e.event==='overlayReceivedTouch').length});
try{
 if(process.env.QA_PARENT_RECORDING!=='1')throw Error('Warm proof requires parent-owned recording');
 for(let sample=0;sample<3;sample++){
  client=createAgentDeviceClient({session:'codex-idle-'+phase,stateDir,cwd:root,debug:true,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
  const open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
  const logExistedBeforeNativeWarmup=fs.existsSync(open.runnerLogPath);let readOnlyWarmup;try{readOnlyWarmup={ok:true,result:await client.command.alert({action:'get'})}}catch(e){if(e.details?.reason==='alert-not-found'||e.details?.runnerErrorCode==='ALERT_NOT_FOUND')readOnlyWarmup={ok:false,expectedAbsent:true,error:errorOutput(e)};else throw e;}
  const log=()=>fs.readFileSync(open.runnerLogPath,'utf8');if(!log().includes(derived)||log().includes('build-for-testing'))throw Error('Actual native artifact mismatch');
  const snapshot=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(path.join(dir,'initial-'+(sample+1)+'.json'),JSON.stringify(snapshot,null,2)+'\n');
  const matches=snapshot.nodes.filter(n=>n.type==='Button'&&n.label==='Underlying action');if(matches.length!==1)throw Error('Unique initial target missing');
  const pid=snapshot.nodes.find(n=>n.type==='Application')?.pid,folder=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
  const eventPath=path.join(folder,'Documents','events-'+pid+'.json');
  const before=JSON.parse(fs.readFileSync(eventPath,'utf8'));if(counts(before).underlying||counts(before).overlay||before.some(e=>e.event==='fadeOverlayOpened'))throw Error('Measured session not pristine');
  const options=route==='selector'?{selector:'id="Underlying action"'}:{ref:'@'+matches[0].ref};
  const offset=log().length,began=performance.now();let output;
  try{output={ok:true,result:await client.interactions.press(options)}}catch(e){output={ok:false,error:errorOutput(e)}}
  const elapsedMs=performance.now()-began,lines=log().slice(offset).split('\n'),accepted=lines.filter(s=>s.includes('COMMAND_ACCEPTED command='));
  const reads=accepted.filter(s=>/command=pressReadiness(?: |$)/.test(s)).length,taps=accepted.filter(s=>/command=tap(?: |$)/.test(s)).length;
  const events=JSON.parse(fs.readFileSync(eventPath,'utf8')),delivered=counts(events);fs.writeFileSync(path.join(dir,'native-events-'+(sample+1)+'.json'),JSON.stringify(events,null,2)+'\n');
  const entry={kind:route,sample:sample+1,warmup:sample<0,ms:elapsedMs,output,nativeReadinessReads:reads,nativeTapCommands:taps,counts:delivered,priorSessionInteractionCalls:0,logExistedBeforeNativeWarmup,readOnlyWarmup,nativeEvents:events};
  row.samples.push(entry);save();
  if(!output.ok||reads!==expectedReads||taps!==1||delivered.underlying!==1||delivered.overlay!==0)throw Error('First-press idle comparison oracle failed');
  await client.apps.close({platform:'ios',udid});client=undefined;
 }
 const times=row.samples.map(s=>s.ms).sort((a,b)=>a-b);row.medianMs=times[1];row.targetTapEvents=row.samples.reduce((n,s)=>n+s.counts.underlying,0);row.otherTapEvents=row.samples.reduce((n,s)=>n+s.counts.overlay,0);row.success=true;
}catch(e){row.success=false;row.harnessError=errorOutput(e);}
finally{
 if(client)try{await client.apps.close({platform:'ios',udid});client=undefined;}catch(e){row.cleanupError=errorOutput(e);row.success=false;}
 row.sessionClosed=!client;save();
}
console.log(JSON.stringify({phase,source:row.source,success:row.success,samples:row.samples.map(s=>({ms:s.ms,reads:s.nativeReadinessReads,taps:s.nativeTapCommands,counts:s.counts})),medianMs:row.medianMs,recording:row.recording,harnessError:row.harnessError}));if(!row.success)process.exitCode=1;
