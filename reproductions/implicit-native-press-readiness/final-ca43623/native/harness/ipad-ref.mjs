import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-maintainer-20261111',phase=process.env.QA_PHASE;
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const app='dev.e2e.readinessgeometry',udid='3C02ABAC-069D-43C5-8EE9-C3FA3BD1947E';
const client=createAgentDeviceClient({session:'codex-maintainer-'+phase,stateDir:root+'/state-'+phase,cwd:root,debug:true,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,app,openOptions:{app,platform:'ios',udid,relaunch:true,foreground:false},snapshotOptions:{interactiveOnly:true,customActions:true},observationAbortMs:8000};let recorder;
try{
 row.open=await client.apps.open(row.openOptions);await client.capture.screenshot({path:dir+'/startup.png'});
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',dir+'/video.mp4'],{stdio:['ignore','ignore','pipe']});await new Promise((resolve,reject)=>{let s='';const t=setTimeout(()=>reject(Error('Recorder not ready')),10000);recorder.stderr.on('data',b=>{s+=b;if(s.includes('Recording started')){clearTimeout(t);resolve();}});recorder.on('error',reject);});
 row.snapshot=await client.capture.snapshot(row.snapshotOptions);fs.writeFileSync(dir+'/snapshot-before.json',JSON.stringify(row.snapshot,null,2)+'\n');const target=row.snapshot.nodes.find(n=>n.identifier==='geometry-action');if(!target)throw Error('Missing geometry action');row.target={ref:'@'+target.ref};
 execFileSync('node',[root+'/harness/native-probe.mjs',dir+'/native-probe.json','id','geometry-action'],{env:{...process.env,QA_APP:app,GEOMETRY_DEVICE:udid,PROBE_RAW:'1',PROBE_RAW_STYLE:'regular-native',PROBE_AUTHORIZED:'1'},stdio:'ignore'});
 const began=performance.now();try{row.press=await client.interactions.press({...row.target,signal:AbortSignal.timeout(row.observationAbortMs)});}catch(e){row.error={code:e.code,message:e.message,details:e.details};}row.pressMs=performance.now()-began;
 await new Promise(r=>setTimeout(r,500));recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));recorder=undefined;await client.capture.screenshot({path:dir+'/final.png'});
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();row.events=JSON.parse(fs.readFileSync(container+'/Documents/events.json','utf8'));fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify({phase,target:row.target,press:row.press,error:row.error,pressMs:row.pressMs,events:row.events}));
}finally{if(recorder){recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));}await client.apps.close({platform:'ios',udid});}
