import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

export async function startObserver({sdkRoot,stateDir,outDir,cwd}) {
 if(fs.existsSync(path.join(stateDir,'daemon.json')))throw Error('Inspector requires a fresh task-owned daemon state directory');
 const require=createRequire(path.join(sdkRoot,'package.json'));
 const {parseSync}=require('oxc-parser');
 const scriptPath=fs.realpathSync(path.join(sdkRoot,'dist/src/runtime-factory.js'));
 const source=fs.readFileSync(scriptPath,'utf8'), parsed=parseSync('runtime-factory.js',source);
 if(parsed.errors.length)throw Error('Built runtime AST failed');
 const functions=parsed.program.body.filter(n=>n.type==='FunctionDeclaration');
 const text=n=>source.slice(n.start,n.end);
 const choose=(label,pred)=>{const found=functions.filter(n=>pred(text(n)));if(found.length!==1)throw Error(label+' function not unique:'+found.length);return found[0];};
 const id=n=>{if(n?.type!=='Identifier')throw Error('Expected identifier');return n.name;};
 const declaration=(fn,pred)=>fn.body.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]).find(pred);
 const points=[];
 const add=(event,node,fields)=>{
  if(!node)throw Error('Missing trace location '+event);
  const prefix=source.slice(0,node.start),line=prefix.split('\n').length-1,column=prefix.length-(prefix.lastIndexOf('\n')+1);
  const condition=`(()=>{try{console.debug('__ADMISSION_PROOF__'+JSON.stringify({event:${JSON.stringify(event)},${fields}}))}catch(e){console.debug('__ADMISSION_PROOF__'+JSON.stringify({event:'trace-error',site:${JSON.stringify(event)},name:e.name}))}return false})()`;
  const owner=functions.find(f=>f.start<=node.start&&f.end>=node.end);if(!owner)throw Error('Trace location has no owning function');points.push({event,lineNumber:line,columnNumber:column,condition,sourceSpan:[node.start,node.end],functionSpan:[owner.start,owner.end],requestedSnippet:text(node).slice(0,160)});
 };
 const admission=choose('admission',s=>s.includes('generation:0,native:')&&s.includes('.readPressReadiness'));
 const screenDecl=declaration(admission,n=>n.init?.type==='AwaitExpression');
 const screen=id(screenDecl.id),opts=id(admission.params[1]);
 add('admission-screen',admission.body.body.find(n=>n.type==='ReturnStatement'),`screening:${screen}.kind,targetKind:${opts}.target.kind`);
 const motionScreen=choose('motion screening',s=>s.includes('.movingTargetBaseline')&&s.includes('firstLookAtMs'));
 const baseline=declaration(motionScreen,n=>text(n).includes('.movingTargetBaseline'));
 const baselineId=id(baseline.id);
 add('motion-baseline',motionScreen.body.body.find(n=>n.type==='IfStatement'),`present:!!${baselineId}`);
 const screenDecision=declaration(motionScreen,n=>text(n).includes('targetShownAtRest:'));
 const decisionId=id(screenDecision.id);
 add('motion-decision',motionScreen.body.body.filter(n=>n.type==='IfStatement')[1],`kind:${decisionId}.kind`);
 const readiness=choose('native readiness',s=>s.includes('source:`native-press-readiness`'));
 const state=id(readiness.params[2]);
 add('native-readiness',readiness.body.body.find(n=>n.type==='IfStatement'),`generation:${state}.generation,liveGeneration:${state}.live.generation,state:${state}.live.state`);
 const motion=choose('motion relook',s=>s.includes('.generation++')&&s.includes('firstLookAtMs')&&s.includes('.previous'));
 const motionState=id(motion.params[3]);
 const verdict=declaration(motion,n=>n.init?.type==='CallExpression');
 const verdictId=id(verdict.id);
 add('motion-look',motion.body.body.filter(n=>n.type==='IfStatement')[1],`generation:${motionState}.generation,verdict:${verdictId}.kind,looksBeforeVerdict:${motionState}.motion.looks`);
 const refresh=choose('canonical refresh',s=>s.includes('.live=void 0')&&s.includes('.generation++'));
 const refreshState=id(refresh.params[3]);
 add('canonical-refresh-start',refresh.body.body[0],`generation:${refreshState}.generation`);
 add('canonical-refresh-complete',refresh.body.body.at(-1),`generation:${refreshState}.generation`);
 const capture=choose('capture leaf',s=>s.includes('.backend.captureSnapshot(')&&s.includes('includeRects:!0')&&s.includes('SESSION_NOT_FOUND'));
 add('capture-start',capture.body.body[0],'');
 add('capture-complete',capture.body.body.find(n=>n.type==='ReturnStatement'),'');
 const tap=choose('tap dispatch',s=>s.includes('.backend.tap(')&&s.includes('when-unknown'));
 const tapOpts=id(tap.params[1]);
 const attempt=tap.body.body.find(n=>n.type==='TryStatement');
 add('tap-dispatch',attempt.block.body[0],`targetKind:${tapOpts}.target.kind`);
 const plan={script:'dist/src/runtime-factory.js',scriptSha256:crypto.createHash('sha256').update(source).digest('hex'),sourceBytes:Buffer.byteLength(source),points,mechanism:'V8 conditional breakpoints: console-only primitive observation, always return false. Built source bytes are unchanged. Timings from this instrumented run are not performance measurements.'};
 fs.writeFileSync(path.join(outDir,'inspector-plan.json'),JSON.stringify(plan,null,2)+'\n');
 const log=fs.openSync(path.join(outDir,'private-daemon-inspector.log'),'w');
 const daemon=spawn(process.execPath,['--inspect-brk=127.0.0.1:0',path.join(sdkRoot,'dist/src/internal/daemon.js')],{cwd,env:{...process.env,AGENT_DEVICE_STATE_DIR:stateDir},stdio:['ignore',log,'pipe']});
 fs.writeFileSync(path.join(outDir,'private-inspector-process.json'),JSON.stringify({pid:daemon.pid,entry:path.join(sdkRoot,'dist/src/internal/daemon.js'),stateDir},null,2)+'\n');
 let ws;
 try {
 let stderr='';daemon.stderr.on('data',b=>{stderr+=b;fs.writeSync(log,b)});
 const end=Date.now()+15000;
 while(!/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/.test(stderr)){if(daemon.exitCode!==null||Date.now()>end)throw Error('Owned inspector daemon did not start');await new Promise(r=>setTimeout(r,20));}
 const url=stderr.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/)[0];ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Inspector WebSocket open timed out')),10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Inspector WebSocket open failed'));},{once:true});});
 let serial=0,phase='setup',unexpectedPauses=0,startupPauses=0,loadedSourceVerified=false;
 const waiting=new Map(),events=[],bindings=[],parseTasks=[];let sourceVerificationError=false;
 const disconnected=()=>{for(const p of waiting.values()){clearTimeout(p.timer);p.reject(Error('Inspector disconnected'));}waiting.clear();};ws.addEventListener('close',disconnected);ws.addEventListener('error',disconnected);
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++serial;const timer=setTimeout(()=>{waiting.delete(n);reject(Error('Inspector command timed out:'+method));},10000);waiting.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
 ws.addEventListener('message',e=>{
  const data=JSON.parse(e.data);
  if(data.id){const p=waiting.get(data.id);waiting.delete(data.id);if(p)clearTimeout(p.timer);if(data.error)p?.reject(Error(JSON.stringify(data.error)));else p?.resolve(data.result);return;}
  const payload=data.params??{};
  if(data.method==='Runtime.consoleAPICalled')for(const a of payload.args??[])if(typeof a.value==='string'&&a.value.startsWith('__ADMISSION_PROOF__')){const observed=JSON.parse(a.value.slice('__ADMISSION_PROOF__'.length));if(observed.event==='phase')phase=observed.name;events.push({sequence:events.length+1,phase,hostMs:performance.now(),...observed});}
  if(data.method==='Debugger.breakpointResolved')bindings.push({breakpointId:payload.breakpointId,location:payload.location});
  if(data.method==='Debugger.scriptParsed'&&payload.url===new URL('file://'+scriptPath).href){parseTasks.push(send('Debugger.getScriptSource',{scriptId:payload.scriptId}).then(d=>{if(d.scriptSource!==source)throw Error('Loaded runtime differs from pinned script');loadedSourceVerified=true;}).catch(()=>{sourceVerificationError=true;}));}
  if(data.method==='Debugger.paused'){
   if(payload.reason==='Break on start'&&startupPauses===0)startupPauses++;else unexpectedPauses++;
   void send('Debugger.resume').catch(()=>{sourceVerificationError=true;});
  }
 });
 await send('Runtime.enable');await send('Debugger.enable');
 for(const p of points){const bound=await send('Debugger.setBreakpointByUrl',{url:new URL('file://'+scriptPath).href,lineNumber:p.lineNumber,columnNumber:p.columnNumber,condition:p.condition});p.breakpointId=bound.breakpointId;for(const loc of bound.locations??[])bindings.push({breakpointId:bound.breakpointId,location:loc});}
 await send('Runtime.runIfWaitingForDebugger');
 const startupEnd=Date.now()+15000;while(!fs.existsSync(path.join(stateDir,'daemon.json'))){if(daemon.exitCode!==null||Date.now()>startupEnd)throw Error('Owned daemon registration did not become ready');await new Promise(r=>setTimeout(r,20));}
 const registered=JSON.parse(fs.readFileSync(path.join(stateDir,'daemon.json'),'utf8'));if(registered.pid!==daemon.pid)throw Error('Daemon registration is not the spawned task-owned child');
 return {
  async ready(){await Promise.all(parseTasks);if(sourceVerificationError||!loadedSourceVerified)throw Error('Loaded script provenance not ready');for(const p of points){const b=bindings.filter(b=>b.breakpointId===p.breakpointId);if(!b.length||b.some(b=>b.location.lineNumber!==0||b.location.columnNumber<p.functionSpan[0]||b.location.columnNumber>=p.functionSpan[1]))throw Error('Unbound or relocated-outside-owner trace point:'+p.event);}},
  async mark(name){await send('Runtime.evaluate',{expression:"console.debug('__ADMISSION_PROOF__'+JSON.stringify({event:'phase',name:"+JSON.stringify(name)+"}))"});},
  events,
  async stop(){
   try{await Promise.all(parseTasks);}catch{sourceVerificationError=true;}
   const receipt={...plan,events,bindings,startupPauses,unexpectedPauses,loadedSourceVerified,conditionsAlwaysFalse:true,allRequestedPointsBound:points.every(p=>bindings.some(b=>b.breakpointId===p.breakpointId)),sourceVerificationError,sourceFileStillMatches:crypto.createHash('sha256').update(fs.readFileSync(scriptPath)).digest('hex')===plan.scriptSha256};
   fs.writeFileSync(path.join(outDir,'inspector-trace.json'),JSON.stringify(receipt,null,2)+'\n');
   if(ws.readyState!==WebSocket.CLOSED)await new Promise(resolve=>{const timer=setTimeout(resolve,3000);ws.addEventListener('close',()=>{clearTimeout(timer);resolve();},{once:true});try{ws.close();}catch{clearTimeout(timer);resolve();}});
   const stop=spawnSync(process.execPath,[path.join(sdkRoot,'bin/agent-device.mjs'),'daemon','stop','--state-dir',stateDir,'--clean','--json'],{cwd,encoding:'utf8',timeout:60000});
   fs.writeFileSync(path.join(outDir,'private-inspector-daemon-stop.log'),(stop.stdout??'')+(stop.stderr??''));
   let escalated=false;const deadline=Date.now()+15000;while(daemon.exitCode===null&&daemon.signalCode===null&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));if(daemon.exitCode===null&&daemon.signalCode===null){escalated=true;daemon.kill('SIGTERM');await new Promise(r=>setTimeout(r,1000));if(daemon.exitCode===null&&daemon.signalCode===null)daemon.kill('SIGKILL');}
   receipt.cleanup={commandExit:stop.status,daemonExit:daemon.exitCode,daemonSignal:daemon.signalCode,escalated};fs.writeFileSync(path.join(outDir,'inspector-trace.json'),JSON.stringify(receipt,null,2)+'\n');fs.closeSync(log);
   if(stop.status!==0||daemon.exitCode!==0||escalated||sourceVerificationError||!receipt.allRequestedPointsBound||unexpectedPauses||!loadedSourceVerified||!receipt.sourceFileStillMatches||events.some(e=>e.event==='trace-error'))throw Error('Inspector proof/cleanup invariant failed');
   return receipt;
  }
 };
 }catch(error){
  if(ws)try{ws.close();}catch{}
  if(daemon.exitCode===null&&daemon.signalCode===null){daemon.kill('SIGTERM');const until=Date.now()+3000;while(daemon.exitCode===null&&daemon.signalCode===null&&Date.now()<until)await new Promise(r=>setTimeout(r,20));if(daemon.exitCode===null&&daemon.signalCode===null){daemon.kill('SIGKILL');await new Promise(r=>setTimeout(r,500));}}
  fs.writeFileSync(path.join(outDir,'private-inspector-setup-failure.json'),JSON.stringify({error:String(error),daemonExit:daemon.exitCode,daemonSignal:daemon.signalCode},null,2)+'\n');try{fs.closeSync(log);}catch{};throw error;
 }
}
