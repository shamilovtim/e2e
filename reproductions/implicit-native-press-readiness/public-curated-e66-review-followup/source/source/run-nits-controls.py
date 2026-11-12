from pathlib import Path
import json, subprocess, tempfile, hashlib
r=Path('LOCAL_INPUT_PATH');repo=Path('LOCAL_INPUT_PATH');patch=r/'nits-frozen.patch';sha=lambda b:hashlib.sha256(b).hexdigest()
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip();before=subprocess.check_output(['git','diff','--binary'],cwd=repo);assert before==patch.read_bytes();d=Path(tempfile.mkdtemp(prefix='codex-sdk4391-nits-controls-',dir='/tmp'));receipt={'base':head,'patchSha256':sha(before),'steps':[]};(r/'nits-controls-private-dir.txt').write_text(str(d))
files=['packages/command-runtime/src/commands/interaction/runtime/moving-target-gate.test.ts','packages/command-runtime/src/commands/interaction/runtime/pre-dispatch-admission-readiness.test.ts','packages/daemon/src/core/__tests__/snapshot-capture.test.ts'];admission=Path('packages/command-runtime/src/commands/interaction/runtime/pre-dispatch-admission.ts');capture=Path('packages/daemon/src/core/snapshot-capture.ts')
def record(): (r/'nits-controls-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
def command(name,cmd,expect=0):
 with (r/(name+'.log')).open('w') as f: result=subprocess.run(cmd,cwd=d,stdout=f,stderr=subprocess.STDOUT)
 receipt['steps'].append({'name':name,'command':cmd,'exitCode':result.returncode});record();assert result.returncode==expect,(name,result.returncode)
def tests(name,selection,pattern=None,expect=0):
 out=r/(name+'.json');cmd=['pnpm','exec','vitest','run','--project','unit-core',*selection]
 if pattern:cmd+=['-t',pattern]
 cmd+=['--reporter=json','--outputFile='+str(out)];command(name,cmd,expect);a=json.loads(out.read_text());receipt['steps'][-1].update({'passed':a['numPassedTests'],'failed':a['numFailedTests'],'pending':a['numPendingTests'],'reportSha256':sha(out.read_bytes()),'failedTests':[{'name':x['fullName'],'messages':x['failureMessages']} for f in a['testResults'] for x in f['assertionResults'] if x['status']=='failed']});record()
subprocess.run(['git','worktree','add','--detach',str(d),head],cwd=repo,check=True);subprocess.run(['git','apply',str(patch)],cwd=d,check=True)
command('nits-controls-install',['caffeinate','-i','pnpm','install','--frozen-lockfile']);command('nits-controls-build',['caffeinate','-i','pnpm','build']);tests('nits-controls-green',files)
original={p:(d/p).read_bytes() for p in [admission,capture]}
for p in original:(d/p).write_bytes(subprocess.check_output(['git','show',head+':'+str(p)],cwd=repo))
tests('nits-controls-old-runtime-red',files,expect=1)
assert receipt['steps'][-1]['failed']==2
for p,b in original.items():(d/p).write_bytes(b)
tests('nits-controls-old-runtime-restored',files)
a=(d/admission).read_text();needle="nativeReadiness === 'when-unknown' && !!runtime.backend.readPressReadiness";assert a.count(needle)==1;(d/admission).write_text(a.replace(needle,'!!runtime.backend.readPressReadiness'))
tests('nits-controls-ignore-intent-red',[files[1]],'non-default tap intent',expect=1);assert receipt['steps'][-1]['failed']==6
(d/admission).write_bytes(original[admission]);tests('nits-controls-restored',files)
receipt['reviewedHeadAfter']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip();receipt['reviewedPatchAfterSha256']=sha(subprocess.check_output(['git','diff','--binary'],cwd=repo));assert receipt['reviewedHeadAfter']==head and receipt['reviewedPatchAfterSha256']==sha(before)
subprocess.run(['git','worktree','remove','--force',str(d)],cwd=repo,check=True);receipt['ownWorktreeRemoved']=True;record();print(json.dumps({'steps':[(x['name'],x['exitCode'],x.get('passed'),x.get('failed')) for x in receipt['steps']],'ownWorktreeRemoved':True}))
