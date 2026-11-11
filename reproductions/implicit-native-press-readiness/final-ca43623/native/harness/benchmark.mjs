import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
const {createAgentDeviceClient}=await import(process.env.SDK_ENTRY);
const root='/tmp/codex-sdk-readiness-maintainer-20261111';
const phase=process.env.QA_PHASE;
const mode=process.env.QA_CASE??'clipped';
const udid='6B9D0875-A708-4B60-9FEF-50C53A3356BD',app='dev.e2e.readinessmaintainer';
const dir=root+'/evidence/'+phase;fs.mkdirSync(dir,{recursive:true});
const stateDir=root+'/state-'+phase,session='codex-maintainer-'+phase;
const client=createAgentDeviceClient({session,stateDir,cwd:root,debug:true,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED});
const row={phase,mode,sdkEntry:process.env.SDK_ENTRY,xctestrun:process.env.NATIVE_XCTESTRUN,openOptions:{app,platform:'ios',udid,relaunch:true,foreground:true},samples:[]};let recorder;
const save=()=>fs.writeFileSync(dir+'/result.json',JSON.stringify(row,null,2)+'\n');
const readEvents=()=>{const container=execFileSync('xcrun',['simctl','get_app_container',udid,app,'data'],{encoding:'utf8'}).trim();return JSON.parse(fs.readFileSync(container+'/Documents/events.json','utf8'));};
const logDelta=(before)=>{let text='';try{text=fs.readFileSync(row.open.runnerLogPath,'utf8').slice(before);}catch{}const lines=text.split('\n').filter(l=>l.includes('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED')||l.includes('AGENT_DEVICE_RUNNER_COMMAND_COMPLETED'));const accepted=new Map(),commands=[];for(const line of lines){const match=line.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)\S*.*COMMAND_(ACCEPTED|COMPLETED) command=(\S+) commandId=(\S+)/);if(!match)continue;const stamp=Date.parse(match[1].replace(' ','T').slice(0,23)+'Z');if(match[2]==='ACCEPTED')accepted.set(match[4],{stamp,command:match[3]});else if(accepted.has(match[4]))commands.push({command:match[3],nativeMs:stamp-accepted.get(match[4]).stamp});}return {commands,markers:lines};};
const measure=async(kind,id,abortMs=15000)=>{
 let target={selector:'id='+id};if(kind==='ref'){const snapshot=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(dir+'/snapshot-'+row.samples.length+'.json',JSON.stringify(snapshot,null,2)+'\n');const nodes=snapshot.nodes.filter(n=>n.identifier===id);if(nodes.length!==1)throw Error('Expected unique '+id+', got'+nodes.length);target={ref:'@'+nodes[0].ref};}
 const before=fs.existsSync(row.open.runnerLogPath)?fs.readFileSync(row.open.runnerLogPath,'utf8').length:0;
 const sample={kind,id,target};const start=performance.now();try{sample.press=await client.interactions.press({...target,signal:AbortSignal.timeout(abortMs)});}catch(e){sample.error={code:e.code,message:e.message,details:e.details};}sample.ms=performance.now()-start;sample.native=logDelta(before);sample.events=readEvents();row.samples.push(sample);save();console.log(JSON.stringify({phase,kind,id,ms:sample.ms,press:sample.press,error:sample.error,native:sample.native.commands}));return sample;
};
try{
 row.open=await client.apps.open(row.openOptions);save();
 if(mode==='duplicates')await client.interactions.press({selector:'id=portrait'});
 if(mode!=='clipped')await client.interactions.press({selector:'id=mode-'+(mode==='landscape'?'clipped':mode)});
 if(mode==='landscape')await client.interactions.press({selector:'id=landscape'});
 const initial=await client.capture.snapshot({interactiveOnly:true});fs.writeFileSync(dir+'/snapshot-before.json',JSON.stringify(initial,null,2)+'\n');row.initialNodes=initial.nodes.map(n=>({ref:n.ref,type:n.type,label:n.label,identifier:n.identifier,rect:n.rect}));save();console.log(JSON.stringify({phase,mode,nodes:row.initialNodes}));
 recorder=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264',dir+'/video.mp4'],{stdio:['ignore','ignore','pipe']});await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Recorder not ready')),10000);recorder.stderr.on('data',b=>{text+=b;if(text.includes('Recording started')){clearTimeout(timer);resolve();}});recorder.on('error',reject);});
 if(mode==='duplicates'){
  await measure('selector','duplicate-control',1500);
  const snapshot=await client.capture.snapshot({interactiveOnly:true});row.duplicates=snapshot.nodes.filter(n=>n.identifier==='duplicate-control');fs.writeFileSync(dir+'/duplicates.json',JSON.stringify(row.duplicates,null,2)+'\n');
  for(let index=0;index<row.duplicates.length;index++){const fresh=await client.capture.snapshot({interactiveOnly:true});const node=fresh.nodes.filter(n=>n.identifier==='duplicate-control').sort((a,b)=>a.rect.y-b.rect.y)[index];const before=fs.readFileSync(row.open.runnerLogPath,'utf8').length;const sample={kind:'ref',target:{ref:'@'+node.ref},node};const start=performance.now();try{sample.press=await client.interactions.press({...sample.target,signal:AbortSignal.timeout(2000)});}catch(e){sample.error={code:e.code,message:e.message,details:e.details};}sample.ms=performance.now()-start;sample.native=logDelta(before);sample.events=readEvents();row.samples.push(sample);save();console.log(JSON.stringify(sample));}
 }else{
  const id=mode==='large'?'other-000':'clipped-row';
  let failed=false;for(const kind of ['selector','ref']){for(let i=0;i<Number(process.env.QA_RUNS??3);i++){const sample=await measure(kind,id);if(sample.error){failed=true;break;}}if(failed)break;}
  if(!failed){const entry=process.env.SDK_ENTRY.replace(/\/dist\/src\/index\.js$/,'');const cliStart=performance.now();try{row.cli={output:execFileSync('node',[(fs.existsSync(entry+'/dist/src/internal/bin.js')?entry+'/dist/src/internal/bin.js':entry+'/dist/src/bin.js'),'press','id='+id,'--session',session,'--state-dir',stateDir,'--json'],{encoding:'utf8',timeout:20000}),exitCode:0};}catch(e){row.cli={exitCode:e.status,output:e.stdout?.toString(),stderr:e.stderr?.toString(),error:e.message};}row.cli.ms=performance.now()-cliStart;save();}
 }
 if(mode==='duplicates'||!row.samples.some(s=>s.error))execFileSync('node',[root+'/harness/native-probe.mjs',dir+'/native-probe.json','id',mode==='large'?'other-000':mode==='duplicates'?'duplicate-control':'clipped-row'],{env:{...process.env,PROBE_AUTHORIZED:process.env.PROBE_AUTHORIZED??'0',PROBE_RAW:process.env.PROBE_RAW??'0'},stdio:'ignore'});
 recorder.kill('SIGINT');await new Promise(resolve=>recorder.once('exit',resolve));recorder=undefined;
 row.finalScreenshot=await client.capture.screenshot({path:dir+'/final.png'});row.events=readEvents();fs.writeFileSync(dir+'/native-events.json',JSON.stringify(row.events,null,2)+'\n');save();
}finally{if(recorder){recorder.kill('SIGINT');await new Promise(resolve=>recorder.once('exit',resolve));}await client.apps.close({platform:'ios',udid});}
