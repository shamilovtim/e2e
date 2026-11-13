from pathlib import Path
import argparse, collections, hashlib, json, re, shutil, signal, subprocess, sys, time
p=argparse.ArgumentParser();p.add_argument('phase');p.add_argument('derived');p.add_argument('--head',required=True);p.add_argument('--tests',nargs='+');a=p.parse_args()
qa=Path(__file__).resolve().parent;root=Path('/path/to/sdk-candidate');derived=root/'.tmp'/a.derived
out=qa/'evidence'/a.phase;out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();git=lambda *v:subprocess.check_output(['git',*v],cwd=root,text=True).strip()
assert git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1')
tests=a.tests or ['testReadinessRefusesAReplacementAnonymousCellWithADifferentSynthesizedLabel','testReadinessValidatesAPromotedSwitchIdentifierInItsCoherentWindow','testSynthesizedPressLabelRequiresTheCapturedLabelSourceInsteadOfAnEqualValue','testNativeBindingKeepsRawLabelsBeforeValueAndChildLabelSynthesis','testNativeReadPrefilterPreservesNormalizedExactIdentity','testAuthorizedPressTargetMatchesGoldenParityTable','testReadinessKeepsAControlWithAnEmptyZeroFrameAuxiliaryWindow','testReadinessCountsOverlappingWindowDuplicatesAndRefusesUnknownGeometry','testReadinessKeepsTextInputBindingAcrossContentChanges','testQuerySelectorPrefersHittableMatchOverNonHittableDuplicate','testAuthorizedReadinessRefusesAReplacementPreparedSurfaceBeforeQuerying']
manifest_path=derived/'.agent-device-runner-cache.json';manifest=json.loads(manifest_path.read_text());art=manifest['artifacts']
fp=subprocess.check_output(['node','--experimental-strip-types','--input-type=module','-e','import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts"; console.log(computeRunnerSourceFingerprint(process.cwd()));'],cwd=root,text=True).strip();assert fp==manifest['runnerSourceFingerprint']
for f in art['entries']:
 q=derived/f['path'];assert q.is_file() and not q.is_symlink() and sha(q)==f['digest']
xctestrun=Path(art['xctestrunPath']);assert xctestrun.is_file() and not xctestrun.is_symlink() and sha(xctestrun)==art['xctestrunDigest']
owned=json.loads(Path('/path/to/current-proof/owned-device-state-private.json').read_text());phone=next(x for x in owned if x['role']=='phone');assert phone['createdByThisTask'] and phone['bootedByThisTask'];device=phone['udid']
(out/'executed-wrapper.py').write_bytes(Path(__file__).read_bytes());shutil.copyfile(manifest_path,out/'private-native-manifest.json');shutil.copyfile(xctestrun,out/'executed-native.xctestrun');(out/'private-device.json').write_text(json.dumps(phone,indent=2)+'\n')
(out/'source-tree-manifest.txt').write_text(subprocess.check_output(['git','ls-tree','-r','HEAD'],cwd=root,text=True));(out/'source-delta-from-base.patch').write_bytes(subprocess.check_output(['git','diff','--binary','ddbfc855661fa9d29b8c836057b7f5b099bcad44','HEAD'],cwd=root))
files=[]
assert not (root/'dist').is_symlink()
for q in sorted((root/'dist').rglob('*')):
 assert not q.is_symlink()
 if q.is_file() and q.suffix in ['.js','.mjs','.cjs']:files.append({'path':str(q.relative_to(root)),'sha256':sha(q),'bytes':q.stat().st_size})
(out/'runtime-js-manifest.json').write_text(json.dumps({'head':a.head,'files':files,'completeEmittedJavaScriptFileSet':True,'symlinksFound':False},indent=2)+'\n')
inputs={'head':a.head,'sourceTree':git('rev-parse','HEAD^{tree}'),'tests':tests,'nativeBuiltAt':a.head,'runtimeJavaScriptFiles':len(files),'runtimeManifestSha256':sha(out/'runtime-js-manifest.json'),'nativeFingerprint':fp,'nativeArtifactsVerified':len(art['entries']),'xctestrunSha256':art['xctestrunDigest'],'wrapperSha256':sha(out/'executed-wrapper.py'),'archivedBeforeRun':True};(out/'execution-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
cmd=['xcodebuild','test-without-building','-xctestrun',str(xctestrun),'-destination','platform=iOS Simulator,id='+device,'-parallel-testing-enabled','NO','-test-timeouts-enabled','YES','-default-test-execution-time-allowance','60','-maximum-test-execution-time-allowance','60','-resultBundlePath',str(out/'selected.xcresult')]+['-only-testing:AgentDeviceRunnerUITests/RunnerTests/'+t for t in tests];(out/'private-command.json').write_text(json.dumps(cmd,indent=2)+'\n')
result={**inputs};rec=None
try:
 with (out/'private-recorder.log').open('w') as log:rec=subprocess.Popen(['xcrun','simctl','io',device,'recordVideo','--codec=h264',str(out/'video.mp4')],stdout=log,stderr=subprocess.STDOUT)
 time.sleep(.8);assert rec.poll() is None
 with (out/'private-xcodebuild.log').open('w') as log:
  result['exitCode']=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=600).returncode
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
 log=(out/'private-xcodebuild.log').read_text() if (out/'private-xcodebuild.log').exists() else ''
 outcomes=[{'method':m,'status':v} for m,v in re.findall(r"Test Case '-\[AgentDeviceRunnerUITests\.RunnerTests (test\w+)\]' (passed|failed|skipped)",log)]
 started=re.findall(r"Test Case '-\[AgentDeviceRunnerUITests\.RunnerTests (test\w+)\]' started\.",log)
 result['actualNativeTests']={'outcomes':outcomes,'passed':sum(x['status']=='passed' for x in outcomes),'failed':sum(x['status']=='failed' for x in outcomes),'skipped':sum(x['status']=='skipped' for x in outcomes),'allRequestedExactlyOncePassed':collections.Counter(started)==collections.Counter(tests) and collections.Counter(x['method'] for x in outcomes if x['status']=='passed')==collections.Counter(tests) and all(x['status']=='passed' for x in outcomes)}
 result['sourceUnchanged']=git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1')
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'phase':a.phase,'head':a.head,'testsRequested':len(tests),'exitCode':result.get('exitCode'),'recorderExitCode':result.get('recorderExitCode'),'sourceUnchanged':result['sourceUnchanged'],'harnessError':result.get('harnessError')}));sys.exit(0 if result.get('exitCode')==0 and result.get('sourceUnchanged') and result.get('recorderExitCode')==0 and not result.get('recorderEscalated') and result['actualNativeTests']['allRequestedExactlyOncePassed'] else 1)
