import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-geometry-20261111';
const phase=process.env.GEOMETRY_PHASE;
const udid='AE130B7C-C960-40DA-BEDC-5113F3DEE99A';
const app='dev.e2e.readinessgeometry';
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const client=createAgentDeviceClient({session:'codex-geometry-'+phase,stateDir:root+'/state-'+phase,cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,openOptions:{app,platform:'ios',udid,relaunch:true,foreground:false},pressTarget:{selector:'id=geometry-action'},observationAbortMs:6000};
let recording=false;
try{
 row.open=await client.apps.open(row.openOptions);
 await client.recording.record({action:'start',path:dir+'/video.mp4',fps:30,hideTouches:true});recording=true;
 const start=performance.now();
 try{row.press=await client.interactions.press({...row.pressTarget,signal:AbortSignal.timeout(6000)});}catch(e){row.error={message:e.message,code:e.code,details:e.details};}
 row.pressMs=performance.now()-start;
 await client.recording.record({action:'stop'});recording=false;
 const data=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
 row.events=JSON.parse(fs.readFileSync(data+'/Documents/events.json','utf8'));
 fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');
 fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');
 console.log(JSON.stringify(row));
}catch(e){console.log(JSON.stringify({error:e.message,details:e.details}));throw e;}
finally{if(recording)await client.recording.record({action:'stop'});await client.apps.close({platform:'ios',udid});}
