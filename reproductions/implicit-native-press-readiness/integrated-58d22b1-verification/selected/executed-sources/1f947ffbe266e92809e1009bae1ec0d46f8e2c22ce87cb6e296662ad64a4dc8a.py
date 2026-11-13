from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, sys
p=argparse.ArgumentParser();p.add_argument('variant',choices=['production','unit']);p.add_argument('--head',required=True);a=p.parse_args()
qa=Path(__file__).resolve().parent;root=Path('/path/to/sdk-baseline');out=qa/('warm-base-eec-'+a.variant+'-build');out.mkdir(parents=True,exist_ok=False);derived=root/'.tmp'/('warm-eec-arm64-'+a.variant+'-derived')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();git=lambda *v:subprocess.check_output(['git',*v],cwd=root,text=True).strip()
assert git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1') and not derived.exists()
owned=json.loads(Path('/path/to/prior-proof/owned-device-state-private.json').read_text());phone=next(x for x in owned if x['role']=='phone');assert phone['createdByThisTask'] and phone['bootedByThisTask']
env=os.environ.copy();selected={'AGENT_DEVICE_XCUITEST_DESTINATION':'platform=iOS Simulator,id='+phone['udid'],'AGENT_DEVICE_XCUITEST_ARCHS':'arm64','AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH':str(derived),'AGENT_DEVICE_XCUITEST_INCLUDE_UNIT_TESTS':'1' if a.variant=='unit' else '0'}
selected.update(AGENT_DEVICE_IOS_RUNNER_APP_BUNDLE_ID='dev.e2e.semanticfixture' if a.variant=='unit' else 'com.callstack.agentdevice.runner',AGENT_DEVICE_IOS_RUNNER_TEST_BUNDLE_ID='dev.e2e.semanticfixture.uitests' if a.variant=='unit' else 'com.callstack.agentdevice.runner.uitests')
env.update(selected)
cmd=['pnpm','build:xcuitest:ios'];(out/'executed-wrapper.py').write_bytes(Path(__file__).read_bytes());(out/'private-command.json').write_text(json.dumps({'command':cmd,'selectedEnvironment':selected},indent=2)+'\n');(out/'source-tree-manifest.txt').write_text(subprocess.check_output(['git','ls-tree','-r','HEAD'],cwd=root,text=True))
with (out/'private-prospective-build-settings.txt').open('w') as log:subprocess.run(['node','--experimental-strip-types','scripts/xcuitest-build-settings.ts','ios',selected['AGENT_DEVICE_XCUITEST_DESTINATION']],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
inputs={'head':a.head,'sourceTree':git('rev-parse','HEAD^{tree}'),'variant':a.variant,'wrapperSha256':sha(out/'executed-wrapper.py'),'buildScriptSha256':sha(root/'scripts/build-xcuitest-apple.sh'),'archivedBeforeRun':True};(out/'execution-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n');result={**inputs}
try:
 with (out/'private-build.log').open('w') as log:result['exitCode']=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=900).returncode
 if result['exitCode']==0:
  manifest_path=derived/'.agent-device-runner-cache.json';manifest=json.loads(manifest_path.read_text());shutil.copyfile(manifest_path,out/'private-native-manifest.json')
  for e in manifest['artifacts']['entries']:
   q=derived/e['path'];assert q.is_file() and not q.is_symlink() and sha(q)==e['digest']
  x=Path(manifest['artifacts']['xctestrunPath']);assert not x.is_symlink() and sha(x)==manifest['artifacts']['xctestrunDigest'];shutil.copyfile(x,out/'executed-native.xctestrun')
  arch=subprocess.check_output(['lipo','-archs',str(next(derived/e['path'] for e in manifest['artifacts']['entries'] if e['path'].endswith('xctest/AgentDeviceRunnerUITests')))],text=True).strip();assert arch=='arm64';result['verifiedBinaryArchitecture']=arch
  result.update(nativeFingerprint=manifest['runnerSourceFingerprint'],nativeArtifactsVerified=len(manifest['artifacts']['entries']),xctestrunSha256=sha(x),nativeBinarySha256=next(e['digest'] for e in manifest['artifacts']['entries'] if e['path'].endswith('xctest/AgentDeviceRunnerUITests')))
except Exception as e:result['harnessError']={'name':type(e).__name__,'message':str(e)}
finally:
 result['sourceUnchanged']=git('rev-parse','HEAD')==a.head and not git('status','--porcelain=v1');(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));sys.exit(0 if result.get('exitCode')==0 and result.get('sourceUnchanged') and not result.get('harnessError') else 1)
