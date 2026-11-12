#!/usr/bin/env python3
"""Launch fixture only; every other ADB call delegates unchanged to real ADB."""
import json,os,re,shlex,subprocess,sys,time
from pathlib import Path
c=json.loads(Path(os.environ['RECORDER_FIXTURE_CONFIG']).read_text());args=sys.argv[1:]
def log(value):
 with Path(c['transcript']).open('a') as f:f.write(json.dumps(value)+'\n')
launch=None
if len(args)>=4 and args[0:2]==['-s',c['serial']] and args[2]=='shell':
 command=' '.join(args[3:])
 launch=re.fullmatch(r"screenrecord --bit-rate (8000000|20000000) ('/sdcard/agent-device-recording-[0-9]+\.mp4') >/dev/null 2>&1 & echo \$!",command)
if launch:
 remote=shlex.split(launch.group(2))[0];ready=c['remoteRoot']+'/ready.jsonl';fixture=c['remoteRoot']+'/parent'
 actual=f'{shlex.quote(fixture)} {shlex.quote(remote)} {launch.group(1)} >{shlex.quote(ready)} 2>&1 & echo $!'
 run=subprocess.run([c['realAdb'],'-s',c['serial'],'shell',actual],capture_output=True,timeout=5);run.check_returncode();parent=run.stdout.decode().strip();assert parent.isdigit()
 for attempt in range(50):
  r=subprocess.run([c['realAdb'],'-s',c['serial'],'shell','cat',ready],capture_output=True,timeout=3)
  for line in r.stdout.decode(errors='replace').splitlines():
   try:v=json.loads(line)
   except ValueError:continue
   if 'child' in v:
    assert str(v['parent'])==parent
    child=str(v['child']);assert child.isdigit()
    cmdline=subprocess.check_output([c['realAdb'],'-s',c['serial'],'shell','cat',f'/proc/{child}/cmdline'],timeout=3)
    stat=subprocess.check_output([c['realAdb'],'-s',c['serial'],'shell','cat',f'/proc/{child}/stat'],timeout=3).decode()
    fields=stat[stat.rfind(')')+1:].split();assert fields[0]!='Z' and fields[19].isdigit()
    words=cmdline.split(b'\0');assert words[0] in [b'screenrecord',b'/system/bin/screenrecord'] and remote.encode() in words
    Path(c['identity']).write_text(json.dumps({'parent':parent,'child':str(v['child']),'remotePath':remote,'returnedStartTime':fields[19],'bitRate':launch.group(1)})+'\n')
    log({'fixtureLaunch':True,'originalArgs':args,'actualArgs':['shell',actual],'actualChild':str(v['child'])});print(v['child']);sys.exit(0)
  time.sleep(.02)
 raise RuntimeError('Native fixture did not expose child')
log({'delegated':True,'args':args})
os.execv(c['realAdb'],[c['realAdb'],*args])
