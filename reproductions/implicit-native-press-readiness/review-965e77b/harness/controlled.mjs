import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-geometry-20261111';
const phase=process.env.GEOMETRY_PHASE;
const mode=process.env.QA_MODE??'ref';
const udid=process.env.GEOMETRY_DEVICE??'AE130B7C-C960-40DA-BEDC-5113F3DEE99A';
const app='dev.e2e.readinessgeometry';
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const client=createAgentDeviceClient({session:'codex-geometry-'+phase,stateDir:root+'/state-'+phase,cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,mode,openOptions:{app,platform:'ios',udid,relaunch:true,foreground:false},observationAbortMs:6000,recorder:'External simctl; no SDK snapshot warmup'};
let recorder;
try{
 row.open=await client.apps.open(row.openOptions);
 if(mode==='ref')row.nativeObservationWarmup=await client.command.wait({text:'Native geometry fixture',timeoutMs:8000});
 row.startupScreenshot=await client.capture.screenshot({path:dir+'/startup.png'});
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',dir+'/video.mp4'],{stdio:['ignore','ignore','pipe']});
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Recorder did not start')),10000);recorder.stderr.on('data',chunk=>{output+=chunk.toString();if(output.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.on('error',reject);});
 if(mode==='ref'){
  execFileSync('node',[root+'/harness/probe.mjs',dir+'/native-probe.json','id:geometry-action','id:parent-row'],{env:{...process.env,GEOMETRY_DEVICE:udid},stdio:'ignore'});
  row.snapshot=await client.capture.snapshot({interactiveOnly:true,customActions:true});
  fs.writeFileSync(dir+'/snapshot-before.json',JSON.stringify(row.snapshot,null,2)+'\n');
  const target=row.snapshot.nodes.find(n=>n.identifier==='geometry-action');
  if(!target)throw Error('Missing geometry action');
  row.target={ref:'@'+target.ref};
 }else{row.target={selector:'id=geometry-action'};}
 const start=performance.now();
 try{row.press=await client.interactions.press({...row.target,signal:AbortSignal.timeout(6000)});}catch(e){row.error={message:e.message,code:e.code,details:e.details};}
 row.pressMs=performance.now()-start;
 await new Promise(resolve=>setTimeout(resolve,1200));
 recorder.kill('SIGINT');await new Promise(resolve=>recorder.once('exit',resolve));recorder=undefined;
 row.finalScreenshot=await client.capture.screenshot({path:dir+'/final.png'});
 const data=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
 row.events=JSON.parse(fs.readFileSync(data+'/Documents/events.json','utf8'));
 fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');
 fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');
 console.log(JSON.stringify({phase,mode,target:row.target,press:row.press,error:row.error,pressMs:row.pressMs,events:row.events}));
}finally{if(recorder){recorder.kill('SIGINT');await new Promise(resolve=>recorder.once('exit',resolve));}await client.apps.close({platform:'ios',udid});}
