import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const udid=process.env.GEOMETRY_DEVICE;
const output=process.argv[2];
if(!udid||!output)throw Error('Require explicit GEOMETRY_DEVICE and output path');
const lease=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.agent-device/apple-runner/leases',udid+'.json'),'utf8'));
const response=await fetch('http://127.0.0.1:'+lease.port+'/command',{
 method:'POST',headers:{'content-type':'application/json','X-Agent-Device-Runner-Token':lease.runnerToken},
 body:JSON.stringify({command:'snapshot',appBundleId:'dev.e2e.readinessgeometry',interactiveOnly:true,customActions:false,raw:false}),
 signal:AbortSignal.timeout(45000)
});
const snapshot=await response.json();
fs.writeFileSync(output,JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({file:output,ok:snapshot.ok,viewport:snapshot.data?.snapshotViewport,quality:snapshot.data?.snapshotQuality,
 action:snapshot.data?.nodes?.find(n=>n.identifier==='geometry-action')}));
