import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
for(const key of ['SDK_ENTRY','GEOMETRY_ROOT','GEOMETRY_PHASE','GEOMETRY_DEVICE','NATIVE_XCTESTRUN','NATIVE_DERIVED'])if(!process.env[key])throw Error('Missing explicit '+key);
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root=process.env.GEOMETRY_ROOT,phase=process.env.GEOMETRY_PHASE,udid=process.env.GEOMETRY_DEVICE,app='dev.e2e.readinessgeometry';
const dir=path.join(root,'evidence',phase);fs.mkdirSync(dir,{recursive:true});
const client=createAgentDeviceClient({session:'codex-geometry-'+phase,stateDir:path.join(root,'state-'+phase),cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,sequence:[],externalAbort:false,producerPins:false};let recording=false;
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const error=e=>({message:e.message,code:e.code,details:e.details});
const call=async(name,run)=>{const began=performance.now();try{const result=await run();row[name]={result,ms:performance.now()-began};row.sequence.push(name);save();return result;}catch(e){row[name]={error:error(e),ms:performance.now()-began};row.sequence.push(name);save();throw e;}};
const events=()=>{const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(path.join(container,'Documents/events.json'),'utf8'));};
const count=rows=>rows.filter(r=>r.event==='actionReceivedTap').at(-1)?.count??0;
try{
 await call('open',()=>client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:false}));
 await call('recordStart',()=>client.recording.record({action:'start',path:path.join(dir,'cold-record-start.mp4'),fps:30,hideTouches:true}));recording=true;
 const snapshot=await call('snapshot',()=>client.capture.snapshot({interactiveOnly:true,customActions:false}));
 const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));
 await call('nativeCapture',async()=>{const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({command:'snapshot',appBundleId:app,interactiveOnly:true,customActions:false,raw:false}),signal:AbortSignal.timeout(45000)});return await response.json();});
 row.eventsBefore=events();row.counterBefore=count(row.eventsBefore);save();
 const target=snapshot.nodes.find(n=>n.identifier==='geometry-action');if(!target?.ref)throw Error('Capture did not issue the fixture action ref');row.target=target;save();
 try{await call('refPress',()=>client.interactions.press({ref:'@'+target.ref}));}catch{}
 row.eventsAfterRef=events();row.counterAfterRef=count(row.eventsAfterRef);save();
 try{await call('selectorPress',()=>client.interactions.press({selector:'id=geometry-action'}));}catch{}
 row.eventsAfterSelector=events();row.counterAfterSelector=count(row.eventsAfterSelector);save();
 try{await call('repeatedSnapshot',()=>client.capture.snapshot({interactiveOnly:true,customActions:false}));}catch{}
}catch(e){row.setupError=error(e);save();process.exitCode=1;}
finally{
 if(recording){try{await call('recordStop',()=>client.recording.record({action:'stop'}));recording=false;}catch{process.exitCode=1;}}
 try{row.finalEvents=events();}catch(e){row.finalEventsError=error(e);}
 try{execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'final.png')],{stdio:'ignore'});}catch(e){row.screenshotError=error(e);}
 try{await call('close',()=>client.apps.close({platform:'ios',udid}));}catch{process.exitCode=1;}
 save();
 console.log(JSON.stringify({phase,sequence:row.sequence,quality:row.snapshot?.result?.snapshotQuality,viewport:row.snapshot?.result?.viewport,nativeKind:row.nativeCapture?.result?.data?.snapshotViewport?.kind,nativeQuality:row.nativeCapture?.result?.data?.snapshotQuality,target:row.target?.rect,refResult:row.refPress,selectorResult:row.selectorPress,counters:[row.counterBefore,row.counterAfterRef,row.counterAfterSelector],setupError:row.setupError}));
 process.exit(process.exitCode??0);
}
