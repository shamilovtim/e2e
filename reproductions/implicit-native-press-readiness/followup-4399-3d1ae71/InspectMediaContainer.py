from pathlib import Path
import json,struct,sys
root=Path(sys.argv[1])
def boxes(data,start=0,end=None):
 end=len(data) if end is None else end;offset=start
 while offset<end:
  if end-offset<8:raise ValueError('Incomplete MP4 atom header')
  size,kind=struct.unpack_from('>I4s',data,offset);header=8
  if size==1:
   if end-offset<16:raise ValueError('Incomplete extended MP4 atom')
   size=struct.unpack_from('>Q',data,offset+8)[0];header=16
  elif size==0:size=end-offset
  if size<header or offset+size>end:raise ValueError('Invalid MP4 atom size')
  yield {'type':kind,'start':offset,'payload':offset+header,'end':offset+size,'size':size}
  offset+=size
 if offset!=end:raise ValueError('MP4 container boundary mismatch')
def children(data,box):return list(boxes(data,box['payload'],box['end']))
def first(items,kind):return next((b for b in items if b['type']==kind),None)
def duration(data,box):
 if box is None:return None
 start=box['payload'];version=data[start]
 if version==0:scale,value=struct.unpack_from('>II',data,start+12)
 elif version==1:scale=struct.unpack_from('>I',data,start+20)[0];value=struct.unpack_from('>Q',data,start+24)[0]
 else:raise ValueError('Unsupported MP4 duration version')
 return value/scale if scale else None
rows=[]
for folder in sorted((root/'cases').iterdir()):
 data=(folder/'video.mp4').read_bytes();top=list(boxes(data));moov=first(top,b'moov');assert moov is not None
 movie=children(data,moov);tracks=[];metadata=[]
 def inspect(items,path=''):
  for box in items:
   name=box['type'].decode('latin-1');current=path+'/'+name
   if box['type'] in [b'meta',b'udta',b'uuid',b'ilst',b'keys'] or box['type'].startswith(b'\xa9'):metadata.append(current)
   if box['type'] in [b'moov',b'trak',b'mdia',b'minf',b'stbl',b'udta']:inspect(children(data,box),current)
   elif box['type']==b'meta':inspect(list(boxes(data,box['payload']+4,box['end'])),current)
 inspect(top)
 for track in [b for b in movie if b['type']==b'trak']:
  mdia=first(children(data,track),b'mdia');assert mdia is not None
  mdia_children=children(data,mdia);hdlr=first(mdia_children,b'hdlr');assert hdlr is not None
  handler=data[hdlr['payload']+8:hdlr['payload']+12].decode('ascii')
  tracks.append({'handler':handler,'mediaDurationSeconds':duration(data,first(mdia_children,b'mdhd'))})
 rows.append({'case':folder.name,'method':'ISO BMFF atom inventory using Python standard library; no media transformation','movieDurationSeconds':duration(data,first(movie,b'mvhd')),'videoTracks':sum(t['handler']=='vide' for t in tracks),'audioTracks':sum(t['handler']=='soun' for t in tracks),'tracks':tracks,'metadataContainerCount':len(metadata),'metadataContainers':metadata})
print(json.dumps(rows,indent=2))
