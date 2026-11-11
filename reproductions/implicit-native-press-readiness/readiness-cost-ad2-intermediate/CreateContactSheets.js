ObjC.import('AppKit');
ObjC.import('Foundation');
function run(argv) {
 const root=argv[0], fm=$.NSFileManager.defaultManager;
 const names=ObjC.deepUnwrap(fm.contentsOfDirectoryAtPathError(root+'/cases',Ref())).sort();
 const output=root+'/contact-sheets';fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(output,true,$({}),Ref());
 for(let page=0;page<Math.ceil(names.length/5);page++) {
  const group=names.slice(page*5,page*5+5), width=1100, height=group.length*350;
  const bitmap=$.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null,width,height,8,4,true,false,$.NSDeviceRGBColorSpace,0,0);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(bitmap));
  $.NSColor.whiteColor.setFill;$.NSRectFill($.NSMakeRect(0,0,width,height));
  for(let row=0;row<group.length;row++) {
   const name=group[row], y=height-row*350-350;
   $(name+'    first / last').drawAtPointWithAttributes($.NSMakePoint(20,y+325),$({NSFont:$.NSFont.userFixedPitchFontOfSize(15),NSColor:$.NSColor.blackColor}));
   ['video.first.png','video.last.png'].forEach((file,col)=>{
    const img=$.NSImage.alloc.initWithContentsOfFile(root+'/cases/'+name+'/'+file), size=img.size;
    const scale=Math.min(500/size.width,305/size.height),w=size.width*scale,h=size.height*scale;
    img.drawInRectFromRectOperationFraction($.NSMakeRect(col*550+(550-w)/2,y+10,w,h),$.NSZeroRect,2,1.0);
   });
  }
  $.NSGraphicsContext.restoreGraphicsState;
  bitmap.representationUsingTypeProperties(4,$({})).writeToFileAtomically(output+'/page-'+(page+1)+'.png',true);
 }
 return JSON.stringify({cases:names.length,contactSheets:Math.ceil(names.length/5)});
}
