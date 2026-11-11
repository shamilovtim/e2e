import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const udid=process.env.GEOMETRY_DEVICE??'444343EA-314F-44BB-9BC8-3B8FB8E1AA8D';
const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));
const output=process.argv[2];
const read=async command=>{
 const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},body:JSON.stringify({...command,appBundleId:'dev.e2e.readinessgeometry'}),signal:AbortSignal.timeout(20000)});
 return await response.json();
};
const snapshot=await read({command:'snapshot',interactiveOnly:true,customActions:true,raw:false});
const queries={};for(const label of process.argv.slice(3)){const [key,...parts]=label.split(':');queries[label]=await read({command:'querySelector',selectorKey:parts.length?key:'label',selectorValue:parts.length?parts.join(':'):label});}
fs.writeFileSync(output,JSON.stringify({snapshot,queries},null,2)+'\n');
const nodes=snapshot.data?.nodes??[];
console.log(JSON.stringify({file:output,ok:snapshot.ok,keys:Object.keys(snapshot),nodes:nodes.filter(n=>process.argv.slice(3).some(s=>s===n.label||s==='id:'+n.identifier)).map(n=>({type:n.type,label:n.label,rect:n.rect,source:n.nativePressTarget})),queries}));
