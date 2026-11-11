import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-geometry-20261111';
const dir=root+'/overlay-cancel';fs.mkdirSync(dir,{recursive:true});
const udid='444343EA-314F-44BB-9BC8-3B8FB8E1AA8D',app='dev.e2e.overlay1563';
const client=createAgentDeviceClient({session:'codex-geometry-overlay-cancel',stateDir:root+'/state-overlay-cancel',cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const button=(s,label)=>{const nodes=s.nodes.filter(n=>n.type==='Button'&&n.label===label);if(nodes.length!==1)throw Error('Expected unique '+label);return nodes[0];};
const row={abortAfterMs:350,observationAfterAbortMs:4200};let recording=false;
try{
 const opened=await client.apps.open({app,platform:'ios',udid,relaunch:true,foreground:true});
 await client.recording.record({action:'start',path:dir+'/video.mp4',fps:30,hideTouches:true});recording=true;
 await client.interactions.press({ref:'@'+button(opened.snapshot,'Open slow fade overlay').ref});
 const overlay=await client.capture.snapshot({interactiveOnly:true});
 row.close=await client.interactions.press({ref:'@'+button(overlay,'Close overlay').ref});
 const snapshot=await client.capture.snapshot({interactiveOnly:true});
 fs.writeFileSync(dir+'/snapshot-before.json',JSON.stringify(snapshot,null,2)+'\n');
 row.target=button(snapshot,'Underlying action');
 const began=performance.now();
 try{row.press=await client.interactions.press({ref:'@'+row.target.ref,signal:AbortSignal.timeout(row.abortAfterMs)});}catch(e){row.error={message:e.message,code:e.code,details:e.details};}
 row.pressMs=performance.now()-began;
 await new Promise(r=>setTimeout(r,row.observationAfterAbortMs));
 row.final=await client.capture.snapshot({interactiveOnly:true});
 await client.recording.record({action:'stop'});recording=false;
 const data=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();
 row.events=JSON.parse(fs.readFileSync(data+'/Documents/events.json','utf8'));
 fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');
 row.success=row.error?.code==='COMMAND_CANCELLED'&&!row.events.some(e=>['underlyingReceivedTap','overlayReceivedTouch'].includes(e.event))&&row.events.some(e=>e.event==='fadeDismissComplete');
 fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify(row));
}finally{if(recording)await client.recording.record({action:'stop'});await client.apps.close({platform:'ios',udid});}
if(!row.success)process.exitCode=1;
