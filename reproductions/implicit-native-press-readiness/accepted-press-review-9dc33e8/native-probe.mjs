import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
const root=process.env.PROBE_ROOT;
const udid=process.env.PROBE_DEVICE;
if(!root||!udid||!process.env.MOBILE_ROOT||!process.env.SDK_ENTRY)throw Error('Missing explicit probe roots/device');
fs.mkdirSync(root,{recursive:true});
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const {buildEngine}=await import(process.env.MOBILE_ROOT+'/dist/engine.js');
const {AgentDeviceSurface}=await import(process.env.MOBILE_ROOT+'/dist/surface.js');
const state=root+'/sdk-state';const session='public-accepted-press';
const client=createAgentDeviceClient({session,stateDir:state,cwd:root,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const engine=buildEngine(new AgentDeviceSurface({platform:'ios',device:udid,session,transition:0,settle:false,videoTouches:false},()=>client));
const events=[];const row={mobile:process.env.MOBILE_HEAD,sdk:'965e77bc0462516aa535a8f3060cb4b465fe86b5',nativeFingerprint:'a55f494d33fd59f188ce6e7d8734aabf83d3491042f52bb448d8815031facca3',recording:process.env.ENGINE_RECORDING==='1',qualitativeOnly:true,events};
const fresh=()=>new AbortController().signal;
const operation=(attemptId,signal=fresh())=>({signal,timeoutMs:60000,runId:'public-native-probe',attemptId,origin:'test'});
const context=attemptId=>({attemptId,artifactsDir:root+'/'+attemptId,signal:fresh(),resolveSecret:async()=>{throw Error('No secrets');},appLog(){},screen(){},environment(){},navigation(){}});
const save=(name,value)=>fs.writeFileSync(root+'/'+name,JSON.stringify(value,null,2)+'\n');
const mark=(event,fields={})=>{const value={event,at:Date.now(),iso:new Date().toISOString(),...fields};events.push(value);console.log(JSON.stringify(value));save('result.json',row);};
const runnerLog=state+'/sessions/'+session+'/runner.log';
const getLog=()=>fs.existsSync(runnerLog)?fs.readFileSync(runnerLog,'utf8'):'';
let container,oldPid,newPid,video,pressing,active=false;
const native=(pid)=>{try{return JSON.parse(fs.readFileSync(path.join(container,'Documents',`events-${pid}.json`),'utf8'));}catch{return null;}};
async function beginExternalVideo(){
 video=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264','--force',root+'/video.mp4'],{stdio:['ignore','ignore','pipe']});let log='';video.stderr.setEncoding('utf8');
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video did not start')),15000);video.stderr.on('data',s=>{log+=s;if(log.includes('Recording started')){clearTimeout(timer);resolve();}});video.once('error',reject);video.once('exit',code=>{if(code!==null&&code!==0){clearTimeout(timer);reject(Error('Video exited '+code+': '+log));}});});
 video.stderr.on('data',()=>{});
}
async function endExternalVideo(){if(!video)return;const own=video;video=undefined;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video cleanup timed out')),30000);own.once('exit',()=>{clearTimeout(timer);resolve();});own.kill('SIGINT');});}
async function waitAccepted(offset){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){
  const text=getLog().slice(offset);const match=text.match(/AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED command=(sequence|doubleTap) commandId=([^\s]+)/);
  if(match)return{command:match[1],commandId:match[2]};
  await new Promise(resolve=>setTimeout(resolve,5));
 }
 throw Error('No accepted native double-tap sequence observed');
}
try{
 await engine.init({runId:'public-native-probe',targetName:'fixture',projectRoot:root,app:{bundleId:'dev.e2e.overlay1563'},env:{},headed:false,workerSlot:0,log(){},signal:fresh()});
 await engine.startAttempt(context('a1'));active=true;
 await engine.session.restart(operation('a1'));
 // Public customActions capture warms the real native producer. The action below still uses normal e2e locate/perform.
 await client.capture.snapshot({interactiveOnly:true,customActions:true});
 const first=await client.capture.snapshot({interactiveOnly:true});oldPid=first.nodes.find(n=>n.type==='Application')?.pid;
 if(!oldPid)throw Error('Fixture PID missing');row.oldPid=oldPid;
 container=execFileSync('xcrun',['simctl','get_app_container',udid,'dev.e2e.overlay1563','data'],{encoding:'utf8'}).trim();
 const [target]=await engine.locate({kind:'query',query:{kind:'testId',value:{kind:'string',value:'Underlying action',exact:true}}},operation('a1'));
 if(!target)throw Error('Underlying action missing');
 if(row.recording)await engine.artifacts.startVideo(operation('a1'));else await beginExternalVideo();
 const offset=getLog().length;
 const controller=new AbortController();
 mark('press-requested');
 pressing=engine.perform(target.ref,{kind:'doubleTap'},operation('a1',controller.signal)).then(()=>mark('press-resolved'),error=>{row.pressError={code:error.code,message:error.message};mark('press-rejected',{code:error.code});});
 const accepted=await waitAccepted(offset);row.accepted=accepted;mark('native-command-accepted',{...accepted,nativeEvents:native(oldPid)});
 controller.abort();mark('caller-aborted');await pressing;
 if(row.recording){mark('recording-stop-requested');row.videoResult=await engine.artifacts.stopVideo(operation('a1'));mark('recording-stop-completed');}
 mark('end-attempt-requested');await engine.endAttempt({signal:fresh(),timeoutMs:180000});active=false;mark('end-attempt-completed');
 mark('next-attempt-requested');await engine.startAttempt(context('a2'));active=true;mark('next-attempt-started',{oldNativeEvents:native(oldPid),nativeCommandCompleted:getLog().slice(offset).includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED command='+accepted.command+' commandId='+accepted.commandId)});
 mark('next-app-open-requested');await engine.session.restart(operation('a2'));mark('next-app-open-completed',{oldNativeEvents:native(oldPid)});
 const second=await client.capture.snapshot({interactiveOnly:true});newPid=second.nodes.find(n=>n.type==='Application')?.pid;row.newPid=newPid;
 const [nextTarget]=await engine.locate({kind:'query',query:{kind:'testId',value:{kind:'string',value:'Underlying action',exact:true}}},operation('a2'));
 mark('next-input-requested');await engine.perform(nextTarget.ref,{kind:'tap'},operation('a2'));mark('next-input-completed');
 const final=await client.capture.snapshot({interactiveOnly:true});row.finalResult=final.nodes.find(n=>n.identifier==='results')?.label;
 row.oldNativeEvents=native(oldPid);row.newNativeEvents=native(newPid);
 save('old-native-events.json',row.oldNativeEvents);save('new-native-events.json',row.newNativeEvents);
 fs.writeFileSync(root+'/runner.log',getLog());
 const start=events.find(e=>e.event==='next-attempt-started');row.localAdmissionPrecededNativeCompletion=start.nativeCommandCompleted===false;
 row.nextAppReceivedOnlyOwnInput=row.finalResult==='Underlying taps: 1\nOverlay touches: 0';
 row.success=Boolean(accepted)&&row.nextAppReceivedOnlyOwnInput;
 mark('probe-completed',{success:row.success,localAdmissionPrecededNativeCompletion:row.localAdmissionPrecededNativeCompletion,finalResult:row.finalResult});
 if(!row.success)process.exitCode=1;
}catch(error){row.error={code:error.code,message:error.message,stack:error.stack};mark('probe-error',row.error);process.exitCode=1;}
finally{
 if(active)await engine.endAttempt({signal:fresh(),timeoutMs:180000}).catch(error=>mark('cleanup-attempt-error',{message:error.message}));
 await engine.dispose({signal:fresh(),timeoutMs:180000}).catch(error=>mark('cleanup-engine-error',{message:error.message}));
 await endExternalVideo().catch(error=>{row.videoCleanupError=error.message;process.exitCode=1;});
 if(fs.existsSync(runnerLog))fs.writeFileSync(root+'/runner.log',getLog());
 save('result.json',row);
}
