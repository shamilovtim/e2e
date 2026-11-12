from pathlib import Path
import hashlib,json,subprocess,signal,time,sys,shutil
qa=Path('LOCAL_INPUT_PATH');root=Path('LOCAL_INPUT_PATH');phase=sys.argv[1];derived=root/'.tmp'/sys.argv[2];out=qa/'evidence'/phase;out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();git=lambda *a:subprocess.check_output(['git',*a],cwd=root,text=True).strip();head=git('rev-parse','HEAD');assert head=='e66ec2a063b5fde0ff74609322bee54535003478'
patch=subprocess.check_output(['git','diff','--binary'],cwd=root);(out/'source-delta.patch').write_bytes(patch);status=git('status','--porcelain=v1')
manifest=json.loads((derived/'.agent-device-runner-cache.json').read_text());fingerprint=subprocess.check_output(['node','--experimental-strip-types','--input-type=module','-e','import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts"; console.log(computeRunnerSourceFingerprint(process.cwd()));'],cwd=root,text=True).strip();assert fingerprint==manifest['runnerSourceFingerprint']
for f in manifest['artifacts']['entries']:assert (derived/f['path']).is_file() and sha(derived/f['path'])==f['digest']
assert sha(Path(manifest['artifacts']['xctestrunPath']))==manifest['artifacts']['xctestrunDigest']
owned=json.loads(Path('LOCAL_INPUT_PATH').read_text());phone=next(x for x in owned if x['role']=='phone');assert phone['createdByThisTask'] and phone['bootedByThisTask'];device=phone['udid']
(out/'executed-wrapper.py').write_bytes(Path(__file__).read_bytes());shutil.copyfile(derived/'.agent-device-runner-cache.json',out/'private-native-manifest.json');shutil.copyfile(manifest['artifacts']['xctestrunPath'],out/'executed-native.xctestrun');(out/'source-tree-manifest.txt').write_text(subprocess.check_output(['git','ls-tree','-r','HEAD'],cwd=root,text=True));(out/'private-device.json').write_text(json.dumps(phone,indent=2)+'\n')
files=[]
for p in sorted((root/'dist').rglob('*')):
 assert not p.is_symlink()
 if p.is_file() and p.suffix in ['.js','.mjs','.cjs']:files.append({'path':str(p.relative_to(root)),'sha256':sha(p)})
(out/'runtime-js-manifest.json').write_text(json.dumps({'head':head,'files':files,'completeFileSet':True},indent=2)+'\n')
test='testReadinessRefusesAReplacementAnonymousCellWithADifferentSynthesizedLabel';inputs={'head':head,'sourcePatchSha256':hashlib.sha256(patch).hexdigest(),'sourceTree':git('rev-parse','HEAD^{tree}'),'test':test,'runtimeJavaScriptFiles':len(files),'nativeFingerprint':fingerprint,'nativeArtifactsVerified':len(manifest['artifacts']['entries']),'xctestrunSha256':manifest['artifacts']['xctestrunDigest'],'wrapperSha256':sha(out/'executed-wrapper.py'),'archivedBeforeRun':True};(out/'execution-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
cmd=['xcodebuild','test-without-building','-xctestrun',manifest['artifacts']['xctestrunPath'],'-destination','platform=iOS Simulator,id='+device,'-parallel-testing-enabled','NO','-test-timeouts-enabled','YES','-default-test-execution-time-allowance','60','-maximum-test-execution-time-allowance','60','-resultBundlePath',str(out/'selected.xcresult'),'-only-testing:AgentDeviceRunnerUITests/RunnerTests/'+test];(out/'private-command.json').write_text(json.dumps(cmd,indent=2)+'\n');result={**inputs};rec=None
try:
 with (out/'private-recorder.log').open('w') as log:rec=subprocess.Popen(['xcrun','simctl','io',device,'recordVideo','--codec=h264',str(out/'video.mp4')],stdout=log,stderr=subprocess.STDOUT)
 time.sleep(.8);assert rec.poll() is None
 with (out/'private-xcodebuild.log').open('w') as log:
  result['exitCode']=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=300).returncode
except Exception as e:result['harnessError']={'name':type(e).__name__,'message':str(e)}
finally:
 if rec:
  if rec.poll() is None:rec.send_signal(signal.SIGINT)
  try:rec.wait(timeout=10)
  except subprocess.TimeoutExpired:
   result['recorderEscalated']=True;rec.terminate()
   try:rec.wait(timeout=3)
   except subprocess.TimeoutExpired:rec.kill();rec.wait(timeout=3)
  result['recorderExitCode']=rec.returncode
 result['sourceUnchanged']=git('rev-parse','HEAD')==head and git('status','--porcelain=v1')==status and subprocess.check_output(['git','diff','--binary'],cwd=root)==patch
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));sys.exit(0 if result.get('exitCode')==0 and result.get('sourceUnchanged') and result.get('recorderExitCode')==0 else 1)
