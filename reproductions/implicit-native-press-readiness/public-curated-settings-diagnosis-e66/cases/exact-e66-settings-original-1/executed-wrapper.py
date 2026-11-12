from pathlib import Path
import subprocess,json,hashlib,os,sys,time,signal,shutil
qa=Path('LOCAL_INPUT_PATH');kind=sys.argv[1];sources={x['kind']:x for x in json.loads((qa/'exact-source-checkouts-private.json').read_text())};entry=sources[kind];root=Path(entry['path']);phase=kind+'-settings-original-1';out=qa/'evidence'/phase;out.mkdir(parents=True,exist_ok=False)
owned=json.loads(Path('LOCAL_INPUT_PATH').read_text());phone=next(x for x in owned if x['role']=='phone');assert phone['createdByThisTask'] and phone['bootedByThisTask'];udid=phone['udid'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();git=lambda *a:subprocess.check_output(['git',*a],cwd=root,text=True).strip();assert git('rev-parse','HEAD')==entry['sha'] and not git('status','--porcelain=v1')
manifest=json.loads((root/'.tmp/ci-native-derived/.agent-device-runner-cache.json').read_text());derived=root/'.tmp/ci-native-derived';art=manifest['artifacts']
for f in art['entries']:
 p=derived/f['path'];assert p.is_file() and not p.is_symlink() and sha(p)==f['digest']
assert sha(Path(art['xctestrunPath']))==art['xctestrunDigest']
files=[];links=[]
for p in sorted((root/'dist').rglob('*')):
 if p.is_symlink():links.append(str(p.relative_to(root)))
 elif p.is_file() and p.suffix in ['.js','.mjs','.cjs']:files.append({'path':str(p.relative_to(root)),'sha256':sha(p),'bytes':p.stat().st_size})
assert not links
(out/'executed-wrapper.py').write_bytes(Path(__file__).read_bytes());guest_preparer=out/'executed-guest-preparer.mjs';guest_preparer.write_bytes(Path('LOCAL_INPUT_PATH').read_bytes())
with (out/'private-guest-prepare.log').open('w') as guest_log:
 subprocess.run(['node','--experimental-strip-types',str(guest_preparer),str(out/'guest-bridge-private-manifest.json')],cwd=root,stdout=guest_log,stderr=subprocess.STDOUT,check=True)
guest=json.loads((out/'guest-bridge-private-manifest.json').read_text());assert guest['head']==entry['sha']
(out/'runtime-js-manifest.json').write_text(json.dumps({'head':entry['sha'],'sourceTree':git('rev-parse','HEAD^{tree}'),'completeEmittedJavaScriptFileSet':True,'symlinksFound':False,'files':files},indent=2)+'\n');shutil.copyfile(root/'.tmp/ci-native-derived/.agent-device-runner-cache.json',out/'private-native-manifest.json');shutil.copyfile(art['xctestrunPath'],out/'executed-native.xctestrun');(out/'source-tree-manifest.txt').write_text(subprocess.check_output(['git','ls-tree','-r','HEAD'],cwd=root,text=True));(out/'source-delta-from-base.patch').write_bytes(subprocess.check_output(['git','diff','--binary','eec35e9622c339a21b1a588794254f6bdf50d476','HEAD'],cwd=root));shutil.copyfile(root/'test/integration/replays/ios/simulator/01-settings.ad',out/'executed-replay.ad');(out/'owned-device-state-private.json').write_text(json.dumps(phone,indent=2)+'\n')
launch=[{'path':str(p.relative_to(root)),'sha256':sha(p)} for p in [root/'bin/agent-device.mjs',root/'package.json',root/'scripts/build-entries.ts',root/'scripts/build-xcuitest-apple.sh']];state=qa/('state-'+phase);cmd=['node',str(root/'bin/agent-device.mjs'),'test','test/integration/replays/ios/simulator/01-settings.ad','--udid',udid,'--retries','2','--debug','--state-dir',str(state),'--artifacts-dir',str(out/'artifacts'),'--report-junit',str(out/'report.xml')]
inputs={'head':entry['sha'],'sourceTree':git('rev-parse','HEAD^{tree}'),'comparisonBase':'eec35e9622c339a21b1a588794254f6bdf50d476','runtimeJavaScriptFiles':len(files),'runtimeManifestSha256':sha(out/'runtime-js-manifest.json'),'nativeFingerprint':manifest['runnerSourceFingerprint'],'nativeBuiltAt':entry['sha'],'nativeArtifactsVerified':len(art['entries']),'xctestrunSha256':art['xctestrunDigest'],'replaySha256':sha(out/'executed-replay.ad'),'wrapperSha256':sha(out/'executed-wrapper.py'),'runtimeLaunchInputs':launch,'guestBridge':{k:guest[k] for k in ['sourceHash','cacheKey','binarySha256','sourceFiles','buildCommitUnknownForExistingCache']},'guestPreparerSha256':sha(guest_preparer),'instrumentationUsed':False,'protocol':'One ordinary unchanged01-settings.ad CLI invocation with the same existing2retrysetting as CI, separate owned state; no extra read/interaction before it. Native builds fresh and source-matched. Exact eec/e66 ordinary replay comparison on localiOS27.0 versus hosted26.2. Read normal postOpenObservation after execution; no host/runtime or observable-AX parity claim unless the actual verdict supports it.','archivedBeforeRun':True};(out/'execution-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n');(out/'private-command.json').write_text(json.dumps(cmd,indent=2)+'\n')
(out/'native-env').mkdir(exist_ok=True)
env=os.environ.copy();env.update(AGENT_DEVICE_IOS_XCTESTRUN_FILE=art['xctestrunPath'],AGENT_DEVICE_IOS_XCTEST_DERIVED_DATA_PATH=str(derived),AGENT_DEVICE_IOS_XCTEST_ENV_DIR=str(out/'native-env'))
result={'case':phase,'source':entry['sha'],'success':False,'sourceBefore':git('rev-parse','HEAD'),'statusBefore':git('status','--porcelain=v1')};rec=None
try:
 with (out/'private-recorder.log').open('w') as f:
  rec=subprocess.Popen(['xcrun','simctl','io',udid,'recordVideo','--codec=h264',str(out/'video.mp4')],stdout=f,stderr=subprocess.STDOUT)
 time.sleep(.8);assert rec.poll() is None
 with (out/'private-run.log').open('w') as f:
  start=time.monotonic();run=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=300);result['elapsedSeconds']=time.monotonic()-start;result['wrapperExitCode']=run.returncode
 subprocess.run(['xcrun','simctl','io',udid,'screenshot',str(out/'final.png')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
 result['success']=run.returncode==0
except Exception as e:
 result['harnessError']={'name':type(e).__name__,'message':str(e)}
finally:
 with (out/'private-daemon-cleanup.log').open('w') as f:
  stop=subprocess.run(['node',str(root/'bin/agent-device.mjs'),'daemon','stop','--state-dir',str(state),'--clean','--json'],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=60);result['daemonCleanupExitCode']=stop.returncode
 if rec:
  if rec.poll() is None:rec.send_signal(signal.SIGINT)
  try:rec.wait(timeout=10)
  except subprocess.TimeoutExpired:
   result['recorderEscalated']=True;rec.terminate()
   try:rec.wait(timeout=3)
   except subprocess.TimeoutExpired:rec.kill();rec.wait(timeout=3)
  result['recorderExitCode']=rec.returncode
 result['sourceAfter']=git('rev-parse','HEAD');result['statusAfter']=git('status','--porcelain=v1');result['success']=result['success'] and result.get('daemonCleanupExitCode')==0 and result.get('recorderExitCode')==0 and not result.get('recorderEscalated',False) and result['sourceAfter']==entry['sha'] and result['statusAfter']=='';(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));sys.exit(0 if result['success'] else 1)
