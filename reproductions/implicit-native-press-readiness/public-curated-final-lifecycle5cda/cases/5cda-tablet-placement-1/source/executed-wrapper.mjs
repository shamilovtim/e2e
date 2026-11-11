import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
const root=process.env.QA_ROOT, phase=process.env.QA_PHASE, sdk=process.env.SDK_ROOT;
const derived=process.env.NATIVE_DERIVED, udid=process.env.QA_DEVICE;
if(!root||!phase||!sdk||!derived||!udid)throw Error('Explicit owned setup configuration required');
const dir=path.join(root,'evidence',phase), manifest=JSON.parse(fs.readFileSync(path.join(derived,'.agent-device-runner-cache.json')));
const {createAgentDeviceClient}=await import(sdk+'/dist/src/index.js');
const client=createAgentDeviceClient({session:'codex-resize-'+phase,stateDir:path.join(root,'state-'+phase),cwd:root,iosXctestrunFile:manifest.artifacts.xctestrunPath,iosXctestDerivedDataPath:derived});
const row={source:process.env.QA_SDK_SOURCE,scope:'One coarse resize after freshly observed full-screen dimensions; no performance result.'};
const save=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');
const recordLog=fs.openSync(path.join(dir,'private-recorder.log'),'w');
const rec=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',path.join(dir,'video.mp4')],{stdio:['ignore','ignore',recordLog]});
const done=new Promise(resolve=>rec.once('exit',(code,signal)=>resolve({code,signal})));
try{
 for(let index=0;;index++){if(fs.readFileSync(path.join(dir,'private-recorder.log'),'utf8').includes('Recording started'))break;if(index===100)throw Error('Recorder failed to start');await new Promise(resolve=>setTimeout(resolve,100));}
 row.open=await client.apps.open({app:'dev.e2e.readinessgeometry',platform:'ios',udid,relaunch:false,foreground:false});
 const installed=execFileSync('xcrun',['simctl','get_app_container',udid,'dev.e2e.readinessgeometry','app'],{encoding:'utf8'}).trim();
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(installed,'GeometryFixture'))).digest('hex')!==process.env.QA_FIXTURE_BINARY_SHA)throw Error('Frozen fixture differs');
 row.before=await client.capture.snapshot({interactiveOnly:true,customActions:true});save();
 if(row.before.viewport?.width!==1032||row.before.viewport?.height!==1376)throw Error('Observed full-screen dimensions do not qualify the grip');
 execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'before.png')],{stdio:'ignore'});
 row.input={x:1022,y:1366,dx:-400,dy:-450,durationMs:900};
 row.pan=await client.interactions.pan(row.input);save();
 row.after=await client.capture.snapshot({interactiveOnly:true,customActions:true});
 execFileSync('xcrun',['simctl','io',udid,'screenshot',path.join(dir,'after.png')],{stdio:'ignore'});
 if(!row.after.viewport||row.after.viewport.width>=1032||row.after.viewport.height>=1376)throw Error('Coarse resize did not establish smaller app dimensions');
}catch(error){row.error={code:error.code,message:error.message,details:error.details};}
finally{
 try{row.close=await client.apps.close({platform:'ios',udid});}catch(error){row.cleanupError={code:error.code,message:error.message};}
 if(rec.exitCode===null&&rec.signalCode===null)rec.kill('SIGINT');row.recording=await done;fs.closeSync(recordLog);
 row.success=!row.error&&!row.cleanupError&&row.recording.code===0;save();
}
console.log(JSON.stringify({success:row.success,viewport:row.after?.viewport,error:row.error,recording:row.recording}));
if(!row.success)process.exitCode=1;
