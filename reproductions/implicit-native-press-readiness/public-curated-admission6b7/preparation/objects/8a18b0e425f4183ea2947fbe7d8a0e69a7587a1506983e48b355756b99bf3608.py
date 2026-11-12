from pathlib import Path
import json,subprocess,hashlib
root=Path('LOCAL_INPUT_PATH');out=Path('LOCAL_INPUT_PATH');p=root/'packages/contracts/src/snapshot-private-evidence.ts';original=p.read_bytes();(out/'construction-control-original.ts').write_bytes(original)
receipt={'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'initialStatus':subprocess.check_output(['git','status','--porcelain=v1'],cwd=root,text=True),'steps':[]}
def run(name):
 cmd=['pnpm','exec','vitest','run','--project','unit-core','packages/contracts/src/snapshot-private-evidence.test.ts','packages/command-runtime/src/commands/interaction/runtime/target-visibility-stages-screen-origin.test.ts','--reporter=json','--outputFile='+str(out/(name+'.json'))]
 with (out/(name+'.log')).open('w') as log: result=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 data=json.loads((out/(name+'.json')).read_text());receipt['steps'].append({'name':name,'command':cmd,'exit':result.returncode,'passed':data['numPassedTests'],'failed':data['numFailedTests']})
 (out/'construction-control-receipt.json').write_text(json.dumps(receipt,indent=2));print(receipt['steps'][-1],flush=True)
try:
 s=original.decode();needle='  if (initialNodeFacts) attachSnapshotPrivateEvidence(target.nodes, initialNodeFacts);\n';assert s.count(needle)==1;p.write_text(s.replace(needle,''));(out/'construction-control-mutant.ts').write_bytes(p.read_bytes());(out/'construction-control-mutant.patch').write_bytes(subprocess.check_output(['git','diff','--binary'],cwd=root))
 run('construction-control-red')
 p.write_bytes(original);run('construction-control-restored')
finally:
 p.write_bytes(original);receipt['finalStatus']=subprocess.check_output(['git','status','--porcelain=v1'],cwd=root,text=True);receipt['originalSha256']=hashlib.sha256(original).hexdigest();(out/'construction-control-receipt.json').write_text(json.dumps(receipt,indent=2))
