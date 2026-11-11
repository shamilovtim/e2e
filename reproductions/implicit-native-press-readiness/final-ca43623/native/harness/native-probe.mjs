import fs from 'node:fs';
import os from 'node:os';
const udid=process.env.GEOMETRY_DEVICE??'6B9D0875-A708-4B60-9FEF-50C53A3356BD';
const lease=JSON.parse(fs.readFileSync(os.homedir()+'/.agent-device/apple-runner/leases/'+udid+'.json','utf8'));
const output=process.argv[2];
const read=async command=>{const began=performance.now();const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({...command,appBundleId:process.env.QA_APP??'dev.e2e.readinessmaintainer'}),signal:AbortSignal.timeout(30000)});const result=await response.json();return {ms:performance.now()-began,result};};
const selectorKey=process.argv[3]??'id',selectorValue=process.argv[4]??'clipped-row';
const selected=await read({command:'querySelector',selectorKey,selectorValue});
const snapshotRequest={command:'snapshot',interactiveOnly:process.env.PROBE_RAW_STYLE==='regular-native',customActions:true,raw:process.env.PROBE_RAW_STYLE!=='regular-native'};
const raw=process.env.PROBE_RAW==='1'?await read(snapshotRequest):undefined;
const readinessCommand=process.env.QA_NATIVE_COMMAND??'querySelector';
const row={selected,raw,readinessCommand,snapshotRequest};
if(process.env.PROBE_AUTHORIZED==='1'){
 const rawMatches=(raw?.result.data?.nodes??[]).filter(n=>n.identifier===selectorValue);const selectedNodes=process.env.PROBE_ALL_MATCHES==='1'?rawMatches:readinessCommand==='pressReadiness'?rawMatches.filter(n=>n.nativePressTarget).slice(0,1):selected.result.data?.nodes?.slice(0,1)??[];if(readinessCommand==='pressReadiness'&&selectedNodes.length===0)throw Error('Actual raw native snapshot did not provide a numeric binding');row.strictTargets=[];for(const node of selectedNodes){const target={...(node.nativePressTarget??{type:node.type,identifier:node.identifier,label:node.label,value:node.value,rect:node.rect}),point:process.env.PROBE_POINT?{x:Number(process.env.PROBE_POINT.split(',')[0]),y:Number(process.env.PROBE_POINT.split(',')[1])}:{x:node.rect.x+node.rect.width/2,y:node.rect.y+node.rect.height/2}};if(readinessCommand==='pressReadiness'&&typeof target.type!=='number')throw Error('Native source binding must carry its numeric class');const strict=[];for(let i=0;i<3;i++)strict.push(await read({command:readinessCommand,authorizedTarget:target}));row.strictTargets.push({target,strict});}
}
fs.writeFileSync(output,JSON.stringify(row,null,2)+'\n');
console.log(JSON.stringify({file:output,selected,raw:raw?{ms:raw.ms,ok:raw.result.ok,nodeCount:raw.result.data?.nodes?.length,otherCount:raw.result.data?.nodes?.filter(n=>n.type==='Other').length,snapshotQuality:raw.result.data?.snapshotQuality}:undefined,strictTargets:row.strictTargets}));
