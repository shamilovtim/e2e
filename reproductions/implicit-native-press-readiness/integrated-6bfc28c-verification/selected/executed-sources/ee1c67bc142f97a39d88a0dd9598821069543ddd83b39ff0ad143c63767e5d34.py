from pathlib import Path
import argparse,hashlib,json,os,shutil,signal,subprocess,sys,time
p=argparse.ArgumentParser();p.add_argument('phase');p.add_argument('mode');p.add_argument('--head',required=True);p.add_argument('--derived',type=Path,required=True);p.add_argument('--fixture-derived',type=Path,required=True);p.add_argument('--runtime-manifest',type=Path,required=True);p.add_argument('--guest-manifest',type=Path,required=True);a=p.parse_args()
qa=Path(__file__).resolve().parent.parent;root=Path('/path/to/sdk-candidate');out=qa/'evidence'/a.phase;out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();git=lambda *v:subprocess.check_output(['git',*v],cwd=root,text=True).strip()
assert git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1')
runtime=json.loads(a.runtime_manifest.read_text());assert runtime['head']==a.head
actual=[];assert not (root/'dist').is_symlink()
for q in sorted((root/'dist').rglob('*')):
 assert not q.is_symlink()
 if q.is_file() and q.suffix in ['.js','.mjs','.cjs']:actual.append({'path':str(q.relative_to(root)),'sha256':sha(q),'bytes':q.stat().st_size})
assert actual==runtime['files']
fp=subprocess.check_output(['node','--experimental-strip-types','--input-type=module','-e','import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts";console.log(computeRunnerSourceFingerprint(process.cwd()));'],cwd=root,text=True).strip()
manifests={}
for kind,derived in [('production',a.derived),('fixture',a.fixture_derived)]:
 f=derived/'.agent-device-runner-cache.json';m=json.loads(f.read_text());assert m['runnerSourceFingerprint']==fp
 for e in m['artifacts']['entries']:
  q=derived/e['path'];assert q.is_file() and not q.is_symlink() and sha(q)==e['digest']
 x=Path(m['artifacts']['xctestrunPath']);assert not x.is_symlink() and sha(x)==m['artifacts']['xctestrunDigest'];shutil.copyfile(f,out/('private-'+kind+'-native-manifest.json'));shutil.copyfile(x,out/('executed-'+kind+'.xctestrun'));manifests[kind]=m
owned=json.loads(Path('/path/to/current-proof/owned-device-state-private.json').read_text());phone=next(x for x in owned if x['role']=='phone');assert phone['createdByThisTask'] and phone['bootedByThisTask'];device=phone['udid']
installed=Path(subprocess.check_output(['xcrun','simctl','get_app_container',device,'dev.e2e.semanticfixture','app'],text=True).strip());fixture=next(e for e in manifests['fixture']['artifacts']['entries'] if e['path'].endswith('/AgentDeviceRunner.app/AgentDeviceRunner'));assert sha(installed/'AgentDeviceRunner')==fixture['digest']
guest=json.loads(a.guest_manifest.read_text());assert guest['head']==a.head and not Path(guest['path']).is_symlink() and sha(Path(guest['path']))==guest['binarySha256']
for e in guest['sourceFiles']:assert sha(root/e['path'])==e['sha256']
for source,name in [(Path(__file__),'executed-driver.py'),(qa/'harness/run-guest-contributors.mjs','executed-wrapper.mjs'),(qa/'harness/inspector-contributor.mjs','executed-inspector.mjs'),(a.runtime_manifest,'runtime-js-manifest.json'),(a.guest_manifest,'guest-bridge-private-manifest.json')]:shutil.copyfile(source,out/name)
(out/'source-tree-manifest.txt').write_text(subprocess.check_output(['git','ls-tree','-r','HEAD'],cwd=root,text=True));(out/'source-delta-from-base.patch').write_bytes(subprocess.check_output(['git','diff','--binary','ddbfc855661fa9d29b8c836057b7f5b099bcad44','HEAD'],cwd=root));(out/'owned-device-state-private.json').write_text(json.dumps(phone,indent=2)+'\n')
launch=[]
for rel in ['bin/agent-device.mjs','package.json','scripts/build-entries.ts','scripts/build-xcuitest-apple.sh']:
 q=out/'runtime-inputs'/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/rel,q);launch.append({'path':rel,'sha256':sha(q)})
inputs={'head':a.head,'sourceTree':git('rev-parse','HEAD^{tree}'),'mode':a.mode,'nativeBuiltAt':a.head,'fixtureBuiltAt':a.head,'nativeFingerprint':fp,'nativeArtifactsVerified':len(manifests['production']['artifacts']['entries']),'fixtureArtifactsVerified':len(manifests['fixture']['artifacts']['entries']),'fixtureBinarySha256':fixture['digest'],'runtimeJSFiles':len(actual),'runtimeCompleteFileSetVerified':True,'runtimeSymlinksFound':False,'runtimeManifestSha256':sha(out/'runtime-js-manifest.json'),'wrapperSha256':sha(out/'executed-wrapper.mjs'),'driverSha256':sha(out/'executed-driver.py'),'observerSha256':sha(out/'executed-inspector.mjs'),'runtimeLaunchInputs':launch,'guestBridge':{k:guest[k] for k in ['sourceHash','cacheKey','binarySha256','sourceFiles']},'archivedBeforeRun':True};(out/'execution-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
env=os.environ.copy();env.update(QA_ROOT=str(qa),QA_PHASE=a.phase,QA_MODE=a.mode,SDK_ROOT=str(root),NATIVE_DERIVED=str(a.derived),QA_SDK_SOURCE=a.head,QA_DEVICE=device,QA_OBSERVER_PATH=str(out/'executed-inspector.mjs'))
result={'source':a.head,'case':a.phase};rec=None;node=None

def group_alive():
 if not node:return False
 try:os.killpg(node.pid,0);return True
 except ProcessLookupError:return False

def stop_group():
 if not group_alive():return
 result['nodeGroupEscalated']=True
 for sig,seconds in [(signal.SIGTERM,3),(signal.SIGKILL,3)]:
  if not group_alive():break
  os.killpg(node.pid,sig)
  end=time.monotonic()+seconds
  while group_alive() and time.monotonic()<end:time.sleep(.05)
 if node.poll() is None:node.wait(timeout=3)
 result['nodeGroupStillAlive']=group_alive()

try:
 with (out/'private-recorder.log').open('w') as log:rec=subprocess.Popen(['xcrun','simctl','io',device,'recordVideo','--codec=h264',str(out/'video.mp4')],stdout=log,stderr=subprocess.STDOUT)
 end=time.monotonic()+10
 while 'Recording started' not in (out/'private-recorder.log').read_text():
  if rec.poll() is not None or time.monotonic()>=end:raise RuntimeError('Parent-owned recorder did not start')
  time.sleep(.05)
 with (out/'private-run.log').open('w') as log:
  node=subprocess.Popen(['node',str(out/'executed-wrapper.mjs')],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  (out/'private-owned-node.json').write_text(json.dumps({'pid':node.pid,'processGroup':node.pid},indent=2)+'\n')
  try:result['exitCode']=node.wait(timeout=300)
  except subprocess.TimeoutExpired:
   result['nodeTimedOut']=True;stop_group();result['exitCode']=node.poll()
except Exception as e:result['harnessError']={'name':type(e).__name__,'message':str(e)}
finally:
 try:
  with (out/'private-daemon-cleanup.log').open('w') as log:result['daemonCleanupExitCode']=subprocess.run(['node',str(root/'bin/agent-device.mjs'),'daemon','stop','--state-dir',str(qa/('state-'+a.phase)),'--clean','--json'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=60).returncode
 except Exception as e:result['daemonCleanupError']={'name':type(e).__name__,'message':str(e)}
 try:stop_group()
 except Exception as e:result['nodeGroupCleanupError']={'name':type(e).__name__,'message':str(e)}
 if rec:
  if rec.poll() is None:rec.send_signal(signal.SIGINT)
  try:rec.wait(timeout=10)
  except subprocess.TimeoutExpired:
   result['recorderEscalated']=True;rec.terminate()
   try:rec.wait(timeout=3)
   except subprocess.TimeoutExpired:rec.kill();rec.wait(timeout=3)
  result['recorderExitCode']=rec.returncode
 result['sourceUnchanged']=git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1')
 data=json.loads((out/'result.json').read_text()) if (out/'result.json').exists() else {}
 if (out/'result.json').exists():shutil.copyfile(out/'result.json',out/'node-result.json')
 result['success']=data.get('success') is True and result.get('exitCode')==0 and result.get('daemonCleanupExitCode')==0 and result.get('recorderExitCode')==0 and result['sourceUnchanged'] and not any(result.get(k) for k in ['nodeTimedOut','nodeGroupEscalated','nodeGroupStillAlive','nodeGroupCleanupError','recorderEscalated','daemonCleanupError','harnessError'])
 data.update(parentDriver=result,recording={'code':result.get('recorderExitCode'),'escalated':result.get('recorderEscalated',False),'ownedBy':'Python driver'},success=result['success']);(out/'result.json').write_text(json.dumps(data,indent=2)+'\n');(out/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));sys.exit(0 if result['success'] else 1)
