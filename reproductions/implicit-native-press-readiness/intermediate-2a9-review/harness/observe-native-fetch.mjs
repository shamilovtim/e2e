import fs from 'node:fs';
const output=process.env.QA_NATIVE_TRACE_PATH;
const original=globalThis.fetch;
if(output){
 globalThis.fetch=async function(input,init){
  let command;
  try{command=typeof init?.body==='string'?JSON.parse(init.body):undefined;}catch{}
  const selected=command?.appBundleId==='dev.e2e.readinessgeometry'&&['pressReadiness','snapshot','querySelector'].includes(command.command);
  if(selected)fs.appendFileSync(output,JSON.stringify({phase:'request',processId:process.pid,command})+'\n');
  const response=await original.call(this,input,init);
  if(selected){
   const body=await response.clone().json();
   const data=body.data;
   fs.appendFileSync(output,JSON.stringify({phase:'response',processId:process.pid,command:command.command,commandId:command.commandId,ok:body.ok,error:body.error,data:{pressReadiness:data?.pressReadiness,snapshotQuality:data?.snapshotQuality,nodes:data?.nodes?.filter(n=>n.identifier==='geometry-input')}})+'\n');
  }
  return response;
 };
}
