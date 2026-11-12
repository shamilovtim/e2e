from pathlib import Path
import json,base64,subprocess,sys,hashlib
p=Path(sys.argv[1]);out=Path(sys.argv[2]);decoder=Path(sys.argv[3]);b=p.read_bytes()
def boxes(start,end):
 while start+8<=end:
  size=int.from_bytes(b[start:start+4],'big');kind=b[start+4:start+8];header=8
  if size==1:size=int.from_bytes(b[start+8:start+16],'big');header=16
  if size==0:size=end-start
  assert size>=header and start+size<=end
  yield kind,start+header,start+size
  start+=size
 assert start==end
moov=next((s,e) for t,s,e in boxes(0,len(b)) if t==b'moov')
video=None
for t,s,e in boxes(*moov):
 if t!=b'trak':continue
 mdia=next((s,e) for t,s,e in boxes(s,e) if t==b'mdia');items=list(boxes(*mdia));h=next(s for t,s,e in items if t==b'hdlr')
 if b[h+8:h+12]!=b'vide':continue
 assert video is None
 m=next((s,e) for t,s,e in items if t==b'minf');st=next((s,e) for t,s,e in boxes(*m) if t==b'stbl');video={t:(s,e) for t,s,e in boxes(*st)}
assert video
s,e=video[b'stsz'];assert int.from_bytes(b[s+8:s+12],'big')==1;size=int.from_bytes(b[s+4:s+8],'big') or int.from_bytes(b[s+12:s+16],'big')
s,e=video[b'co64'];assert int.from_bytes(b[s+4:s+8],'big')==1;offset=int.from_bytes(b[s+8:s+16],'big')
s,e=video[b'stts'];assert b[s:e]==bytes.fromhex('00000000000000010000000100000000')
s,e=video[b'stsc'];assert [int.from_bytes(b[i:i+4],'big') for i in range(s,e,4)]==[0,1,1,1,1]
s,e=video[b'stsd'];assert int.from_bytes(b[s+4:s+8],'big')==1
entry=s+8;assert b[entry+4:entry+8]==b'avc1'
cfg=next(b[x:y] for t,x,y in boxes(entry+86,e) if t==b'avcC');assert cfg[0]==1
nallen=(cfg[4]&3)+1;count=cfg[5]&31;assert count==1;i=6;length=int.from_bytes(cfg[i:i+2],'big');i+=2;sps=cfg[i:i+length];i+=length;assert cfg[i]==1;i+=1;length=int.from_bytes(cfg[i:i+2],'big');i+=2;pps=cfg[i:i+length]
sample=b[offset:offset+size];assert len(sample)==size
payload={'sps':base64.b64encode(sps).decode(),'pps':base64.b64encode(pps).decode(),'sample':base64.b64encode(sample).decode(),'nalLengthBytes':nallen}
temp=out/'compressed-input.private.json';temp.write_text(json.dumps(payload))
r=subprocess.run([str(decoder),str(temp),str(out/'video.first.png')],capture_output=True,text=True,check=True);d=json.loads(r.stdout);temp.unlink();(out/'video.last.png').write_bytes((out/'video.first.png').read_bytes())
d.update({'containerVideoSampleCount':1,'sampleDurationTicks':0,'compressedSampleSha256':hashlib.sha256(sample).hexdigest(),'originalMp4Sha256':hashlib.sha256(b).hexdigest(),'originalMp4Unchanged':hashlib.sha256(p.read_bytes()).hexdigest()==hashlib.sha256(b).hexdigest(),'avAssetReader':'Completed with zero frames because timeline duration is zero; original failed audit retained separately.'});print(json.dumps(d,indent=2))
