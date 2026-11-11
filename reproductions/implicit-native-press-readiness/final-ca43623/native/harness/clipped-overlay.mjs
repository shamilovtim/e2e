import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-maintainer-20261111',phase=process.env.QA_PHASE,mode=process.env.QA_CASE??'cancel';
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const app='dev.e2e.readinessclipoverlay',udid='6B9D0875-A708-4B60-9FEF-50C53A3356BD';
const client=createAgentDeviceClient({session:'codex-maintainer-'+phase,stateDir:root+'/state-'+phase,cwd:root,debug:true,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,mode,app,fadeDurationMs:750};let recorder;
const capture=async name=>{const s=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(dir+'/'+name+'.json',JSON.stringify(s,null,2)+'\n');return s;};
const target=s=>{const a=s.nodes.filter(n=>n.identifier==='clipped-row');if(a.length!==1)throw Error('Expected one clippedrow');return a[0];};
const events=()=>{const c=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(c+'/Documents/events.json','utf8'));};
const probe=name=>execFileSync('node',[root+'/harness/native-probe.mjs',dir+'/'+name+'.json','id','clipped-row'],{env:{...process.env,QA_APP:app,PROBE_RAW:'1',PROBE_AUTHORIZED:process.env.PROBE_AUTHORIZED??'1',PROBE_POINT:'197,215'},stdio:'ignore'});
try{
 row.open=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 await client.interactions.press({selector:'id=portrait'});
 row.nativeDiagnosticCapture=await client.capture.snapshot({interactiveOnly:true,customActions:true});
 row.before=target(await capture('snapshot-before'));probe('native-before');
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',dir+'/video.mp4'],{stdio:['ignore','ignore','pipe']});await new Promise((resolve,reject)=>{let s='';const t=setTimeout(()=>reject(Error('Recorder not ready')),10000);recorder.stderr.on('data',b=>{s+=b;if(s.includes('Recording started')){clearTimeout(t);resolve();}});recorder.on('error',reject);});
 await client.interactions.press({selector:'id=mode-duplicates'});
 row.covered=target(await capture('snapshot-covered'));probe('native-covered');
 if(mode==='cancel'){
  const began=performance.now();try{row.pendingPress=await client.interactions.press({selector:'id=clipped-row',signal:AbortSignal.timeout(2000)});}catch(e){row.pendingError={code:e.code,message:e.message,details:e.details};}row.pendingMs=performance.now()-began;row.eventsAfterCancel=events();
  row.dismiss=await client.interactions.press({selector:'id=mode-clipped'});
  await new Promise(r=>setTimeout(r,1200));row.eventsAfterUnblockObservation=events();
 }
 else row.dismiss=await client.interactions.press({selector:'id=mode-clipped'});
 const fresh=await capture(mode==='cancel'?'snapshot-after-unblock':'snapshot-during-fade');row.target=target(fresh);
 const began=performance.now();try{row.press=await client.interactions.press({ref:'@'+row.target.ref,signal:AbortSignal.timeout(8000)});}catch(e){row.error={code:e.code,message:e.message,details:e.details};}row.pressMs=performance.now()-began;
 row.after=target(await capture('snapshot-after'));probe('native-after');
 recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));recorder=undefined;
 await client.capture.screenshot({path:dir+'/final.png'});row.events=events();fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify(row));
}finally{if(recorder){recorder.kill('SIGINT');await new Promise(r=>recorder.once('exit',r));}await client.apps.close({platform:'ios',udid});}
