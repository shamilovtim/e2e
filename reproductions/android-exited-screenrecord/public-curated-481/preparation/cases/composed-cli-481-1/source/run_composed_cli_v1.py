import hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
config=json.loads(Path(sys.argv[1]).read_text());proof=Path(config['proofRoot']);output=Path(config['output']);output.mkdir()
owned=json.loads(Path(config['ownedDescriptor']).read_text());assert owned['createdByThisTask'] and owned['booted'];serial=owned['serial'];sdk=Path(owned['sdk']);adb=sdk/'platform-tools/adb';checkout=Path(config['checkout']);manifest=json.loads(Path(config['runtimeManifest']).read_text());remote=config['remoteRoot']
def real(*args,check=True,timeout=10):return subprocess.run([str(adb),'-s',serial,*args],capture_output=True,check=check,timeout=timeout)
assert real('emu','avd','name').stdout.decode().splitlines()[0]==owned['avdName']
def verify_runtime():
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip()==manifest['source']
 assert not subprocess.check_output(['git','status','--porcelain'],cwd=checkout,text=True)
 assert not any(x.is_symlink() for x in (checkout/'dist').rglob('*'))
 assert {x.relative_to(checkout).as_posix() for x in (checkout/'dist').rglob('*.js')}=={x['path'] for x in manifest['files']}
 for row in manifest['files']+manifest['packageAndBuildInputs']:
  b=(checkout/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
verify_runtime();source=output/'source';source.mkdir()
for n in ['run_composed_cli_v1.py','adb_owned_parent_proxy_v1.py','hold_recorder_parent_v3.c']:shutil.copyfile(proof/n,source/n)
shutil.copyfile(config['runtimeManifest'],output/'runtime-manifest.json')
shim=output/'shim';shim.mkdir();shutil.copyfile(proof/'adb_owned_parent_proxy_v1.py',shim/'adb');(shim/'adb').chmod(0o700)
fixture_config={'realAdb':str(adb),'serial':serial,'remoteRoot':remote,'identity':str(output/'fixture-identity.private.json'),'transcript':str(output/'adb-transcript.private.jsonl')}
(output/'fixture-config.private.json').write_text(json.dumps(fixture_config)+'\n')
assets=[]
for helper in ['snapshot','ime']:
 files=list((checkout/'android'/(helper+'-helper')/'dist').glob('*.apk'));assert len(files)==1 and not files[0].is_symlink();data=files[0].read_bytes();assets.append({'path':files[0].relative_to(checkout).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(output/'preflight.json').write_text(json.dumps({'source':manifest['source'],'archivedBeforeExecution':True,'completeRuntimeFileCount':len(manifest['files']),'sourceHashes':{x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in source.iterdir()},'fixtureBinarySha256':hashlib.sha256((proof/'hold_recorder_parent_v3').read_bytes()).hexdigest(),'nativeHelperAssets':assets,'device':{'model':real('shell','getprop','ro.product.model').stdout.decode().strip(),'api':real('shell','getprop','ro.build.version.sdk').stdout.decode().strip()}},indent=2)+'\n')
real('shell','mkdir',remote);real('push',str(proof/'hold_recorder_parent_v3'),remote+'/parent');real('shell','chmod','700',remote+'/parent')
env={**os.environ,'ANDROID_HOME':str(sdk),'ANDROID_SDK_ROOT':str(sdk),'PATH':str(shim)+os.pathsep+str(sdk/'platform-tools')+os.pathsep+os.environ['PATH'],'AGENT_DEVICE_STATE_DIR':str(output/'state'),'RECORDER_FIXTURE_CONFIG':str(output/'fixture-config.private.json')}
session='android-composed-proof';command=[config['node'],str(checkout/'bin/agent-device.mjs')];calls=[];started=False;identity=None;result={'source':manifest['source'],'success':False,'commands':calls,'boundary':'built public CLI/daemon with fixture-only native launcher; all non-launch ADB commands delegated unchanged'}
def cli(name,args,timeout=90,check=True):
 run=subprocess.run(command+args+['--json'],cwd=checkout,env=env,capture_output=True,text=True,timeout=timeout)
 (output/(name+'.stdout.private.json')).write_text(run.stdout);(output/(name+'.stderr.private.log')).write_text(run.stderr);calls.append({'command':name,'exitCode':run.returncode})
 if check:assert run.returncode==0,'Public CLI failed: '+name;return json.loads(run.stdout)
try:
 cli('open',['open','settings','--platform','android','--serial',serial,'--session',session]);cli('snapshot',['snapshot','-i','--session',session])
 (output/'before.png').write_bytes(real('exec-out','screencap','-p').stdout)
 cli('record-start',['record','start',str(output/'video.mp4'),'--session',session,'--scope','device','--hide-touches']);started=True
 identity=json.loads((output/'fixture-identity.private.json').read_text());child=identity['child']
 native=real('shell','cat','/sdcard/agent-device-recording-active.json').stdout;(output/'active-manifest.private.json').write_bytes(native);m=json.loads(native);assert m['chunks'][-1]['remotePid']==child and m['chunks'][-1]['remotePath']==identity['remotePath'];start=m['chunks'][-1]['remoteStartTime'];assert start.isdigit() and start==identity['returnedStartTime']
 before_stat=real('shell','cat',f'/proc/{child}/stat').stdout.decode();fields=before_stat[before_stat.rfind(')')+1:].split();assert fields[19]==start and fields[0]!='Z';result['nativeStartIdentityAttested']=True
 for key in [25,24,25,24,25,24,25,24,25,24,25,24]:
  real('shell','input','keyevent',str(key));time.sleep(.4)
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  raw=real('shell','cat',remote+'/ready.jsonl').stdout;(output/'ready.private.jsonl').write_bytes(raw)
  rows=[]
  for line in raw.splitlines():
   try:rows.append(json.loads(line))
   except ValueError:pass
  exited=next((x for x in rows if x.get('exited')),None)
  if exited:assert exited['code']==1 and exited['status']==0;break
  time.sleep(.2)
 else:raise RuntimeError('Recorder did not exit under owned parent')
 stat=real('shell','cat',f'/proc/{child}/stat').stdout;argv=real('shell','cat',f'/proc/{child}/cmdline').stdout;(output/'before-stop-stat.private.txt').write_bytes(stat);(output/'before-stop-cmdline.private.bin').write_bytes(argv);fields=stat.decode()[stat.decode().rfind(')')+1:].split();assert fields[0]=='Z' and fields[19]==start and argv==b''
 real('pull',identity['remotePath'],str(output/'original-native.mp4'));result['nativeBeforeStop']={'state':'Z','emptyCommandLine':True,'sameStartTime':True,'successfulExit':True}
 stopped=cli('record-stop',['record','stop','--session',session]);started=False;data=stopped['data'];assert data['recording']=='stopped' and data['recorder']=='confirmed' and data['nativePathDisposition']=='retired';result['typedStopOutcome']={k:data[k] for k in ['recording','recordingBackend','recorder','nativePathDisposition','durationMs','capturedDurationMs','showTouches']}
 assert (output/'video.mp4').stat().st_size>32;result['videoBytes']=(output/'video.mp4').stat().st_size;result['videoSha256']=hashlib.sha256((output/'video.mp4').read_bytes()).hexdigest()
 transcript=[json.loads(x) for x in (output/'adb-transcript.private.jsonl').read_text().splitlines()];assert sum(bool(x.get('fixtureLaunch')) for x in transcript)==1
 signals=[]
 # Check shell token streams rather than arbitrary substring matches.
 import shlex
 for x in transcript:
  if x.get('delegated') and 'shell' in x['args']:
   words=shlex.split(' '.join(x['args'][x['args'].index('shell')+1:]))
   if words and words[0]=='kill' and child in words:signals.append(words)
 assert not signals;result['signalsToRecorder']=0
 assert real('shell','test','-e',identity['remotePath'],check=False).returncode==1;assert real('shell','test','-e','/sdcard/agent-device-recording-active.json',check=False).returncode==1;result['nativeFilesRemoved']=True
 after=real('shell','cat',f'/proc/{child}/stat').stdout.decode();assert after[after.rfind(')')+1:].split()[0]=='Z';result['zombieRemainsUntilOwnedParentCleanup']=True
 (output/'after.png').write_bytes(real('exec-out','screencap','-p').stdout);result['stopSucceeded']=True
finally:
 if started:cli('record-stop-cleanup',['record','stop','--session',session],check=False)
 if identity is None and (output/'fixture-identity.private.json').exists():identity=json.loads((output/'fixture-identity.private.json').read_text())
 if identity:
  if real('shell','test','-e',identity['remotePath'],check=False).returncode==0:real('pull',identity['remotePath'],str(output/'failure-native.mp4'),check=False)
  parent=identity['parent'];cmd=real('shell','cat',f'/proc/{parent}/cmdline',check=False)
  if cmd.returncode==0 and cmd.stdout.split(b'\0')[0].decode()==remote+'/parent':
   real('shell','kill','-15',parent)
   for i in range(30):
    absent=real('shell','test','-d',f'/proc/{identity["child"]}',check=False)
    if absent.returncode==1 and not absent.stderr.strip():
     cleanup_raw=real('shell','cat',remote+'/ready.jsonl').stdout;(output/'ready-after-cleanup.private.jsonl').write_bytes(cleanup_raw)
     cleanups=[]
     for line in cleanup_raw.splitlines():
      try:value=json.loads(line)
      except ValueError:continue
      if value.get('cleanup'):cleanups.append(value)
     if len(cleanups)==1 and cleanups[0]['reaped']:
      result['nativeCleanup']='child-reaped';result['parentCleanupSignalsToRecorder']=cleanups[0]['signalsToChild']
     break
    time.sleep(.1)
 cli('close',['close','--session',session],check=False);cli('daemon-stop',['daemon','stop','--clean'],check=False);verify_runtime();result['success']=bool(result.get('stopSucceeded') and result.get('nativeCleanup')=='child-reaped' and result.get('parentCleanupSignalsToRecorder')==0 and all(x['exitCode']==0 for x in calls));(output/'result.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['success'] and result.get('nativeCleanup')=='child-reaped' and all(x['exitCode']==0 for x in calls)
