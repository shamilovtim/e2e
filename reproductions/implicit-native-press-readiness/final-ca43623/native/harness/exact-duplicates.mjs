import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-maintainer-20261111',phase=process.env.QA_PHASE;
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const app='dev.e2e.overlayreadinessvariants',udid='6B9D0875-A708-4B60-9FEF-50C53A3356BD';
const client=createAgentDeviceClient({session:'codex-maintainer-'+phase,stateDir:root+'/state-'+phase,cwd:root,debug:true,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,app};let recorder;
try{
 row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 const snapshot=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(dir+'/snapshot-before.json',JSON.stringify(snapshot,null,2)+'\n');
 row.targets=snapshot.nodes.filter(n=>n.identifier==='overlap');if(row.targets.length!==2)throw Error('Expected two exact overlapping controls');
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',dir+'/video.mp4'],{stdio:['ignore','ignore','pipe']});await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('Recorder not ready')),10000);recorder.stderr.on('data',b=>{s+=b;if(s.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.on('error',reject);});
 row.nativeDiagnosticCapture=await client.capture.snapshot({interactiveOnly:true,customActions:true});
 execFileSync('node',[root+'/harness/native-probe.mjs',dir+'/native-probe.json','id','overlap'],{env:{...process.env,QA_APP:app,PROBE_RAW:'1',PROBE_AUTHORIZED:'1',PROBE_ALL_MATCHES:'1'},stdio:'ignore'});
 for(const kind of ['selector','ref']){const fresh=await client.capture.snapshot({interactiveOnly:true});const nodes=fresh.nodes.filter(n=>n.identifier==='overlap');const target=kind==='selector'?{selector:'id=overlap'}:{ref:'@'+nodes.at(-1).ref};const sample={kind,target};const began=performance.now();try{sample.press=await client.interactions.press({...target,signal:AbortSignal.timeout(6000)});}catch(e){sample.error={code:e.code,message:e.message,details:e.details};}sample.ms=performance.now()-began;(row.samples??=[]).push(sample);}
 recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));recorder=undefined;
 await client.capture.screenshot({path:dir+'/final.png'});
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();row.events=JSON.parse(fs.readFileSync(container+'/Documents/events.json','utf8'));fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify(row));
}finally{if(recorder){recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));}await client.apps.close({platform:'ios',udid});}
