from pathlib import Path
import struct,json
r=Path(__file__).resolve().parent/'root-reviewed-media';rows=[]
def boxes(b,start,end):
 while start<end:
  assert start+8<=end
  size,kind=struct.unpack('>I4s',b[start:start+8]);header=8
  if size==1:size=struct.unpack('>Q',b[start+8:start+16])[0];header=16
  if size==0:size=end-start
  assert size>=header and start+size<=end
  yield kind.decode('ascii'),start+header,start+size
  start+=size
for case in json.loads((r/'media-review.json').read_text()):
 b=(r/case['case']/'video.mp4').read_bytes();top=list(boxes(b,0,len(b)));movie=next((s,e) for t,s,e in top if t=='moov');children=list(boxes(b,*movie));assert not any(t in ['udta','meta'] for t,s,e in children);tracks=[];metadata=[]
 for t,s,e in children:
  if t!='trak':continue
  tr=list(boxes(b,s,e));assert not any(k=='meta' for k,a,z in tr)
  for k,a,z in tr:
   if k=='udta':assert b[a:z]==b'\x00\x00\x00*tagccom.apple.policy.screenrecording.1';metadata.append({'kind':'track udta/tagc','value':'com.apple.policy.screenrecording.1','bytes':42})
  media=next((a,z) for k,a,z in tr if k=='mdia');handler=next((a,z) for k,a,z in boxes(b,*media) if k=='hdlr');tracks.append(b[handler[0]+8:handler[0]+12].decode('ascii'))
 assert tracks==['vide'] and len(metadata)==1
 rows.append({'case':case['case'],'topLevelBoxes':[x[0] for x in top],'movieBoxes':[x[0] for x in children],'trackHandlers':tracks,'rawMetadata':metadata})
(r/'mp4-container-audit.json').write_text(json.dumps(rows,indent=2)+'\n');print('All23 original MP4s video-only/standardpolicytag; no other movie/trackmetadata')
