from pathlib import Path
import subprocess, json, hashlib
root=Path('LOCAL_INPUT_PATH'); out=Path('LOCAL_INPUT_PATH');out.mkdir(exist_ok=True)
a=root/'packages/command-runtime/src/commands/interaction/runtime/pre-dispatch-admission.ts';e=root/'packages/contracts/src/snapshot-private-evidence.ts'
original={p:p.read_bytes() for p in [a,e]}
for p,b in original.items():(out/(p.name+'.original')).write_bytes(b)
receipt={'sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'initialStatus':subprocess.check_output(['git','status','--porcelain=v1'],cwd=root,text=True),'steps':[]}
def run(name,files,pattern=None):
 cmd=['pnpm','exec','vitest','run','--project','unit-core',*files]
 if pattern:cmd+=['-t',pattern]
 cmd+=['--reporter=json','--outputFile',str(out/(name+'.json'))]
 with (out/(name+'.log')).open('w') as log:r=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 data=json.loads((out/(name+'.json')).read_text())
 row={'name':name,'command':cmd,'exit':r.returncode,'passed':data['numPassedTests'],'failed':data['numFailedTests'],'pending':data['numPendingTests']};receipt['steps'].append(row)
 (out/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(row),flush=True)
def restore():
 for p,b in original.items():p.write_bytes(b)
files=['packages/command-runtime/src/commands/interaction/runtime/press-readiness.test.ts','packages/command-runtime/src/commands/interaction/runtime/pre-dispatch-admission.test.ts','packages/command-runtime/src/commands/interaction/runtime/target-visibility-stages-screen-origin.test.ts','packages/contracts/src/snapshot-private-evidence.test.ts']
try:
 run('green',files)
 text=original[a].decode();needle='return checkReadiness(runtime, options, state, budget);';assert text.count(needle)==1;a.write_text(text.replace(needle,'return true;'))
 run('omit-fresh-native-proof',files[:1],'fresh canonical generation');restore()
 run('restore-fresh-native-proof',files[:1],'fresh canonical generation')
 text=original[a].decode();needle='  state.live = undefined;\n';assert text.count(needle)==1;a.write_text(text.replace(needle,''))
 run('retain-old-ready-diagnostic',files[1:2],'fresh motion blocker');restore()
 run('restore-live-invalidation',files[1:2],'fresh motion blocker')
 text=original[a].decode();needle='if (readSignal?.aborted && (!(error instanceof AppError) || isRequestCanceledError(error)))';assert text.count(needle)==1;a.write_text(text.replace(needle,'if (readSignal?.aborted)'))
 run('overclassify-unrelated-native-error',files[:1],'unrelated typed native failure');restore()
 run('restore-canonical-cancel-only',files[:1],'unrelated typed native failure')
 text=original[e].decode();start=text.index('  const nodeEvidence =');end=text.index('  if (nativeTargets.size)',start);e.write_text(text[:start]+text[end:])
 run('omit-node-evidence-transfer',files[2:3],'screen authority after compaction');restore()
 run('restored-all',files)
finally:
 restore();receipt['finalStatus']=subprocess.check_output(['git','status','--porcelain=v1'],cwd=root,text=True);receipt['finalSha']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();(out/'receipt.json').write_text(json.dumps(receipt,indent=2))
