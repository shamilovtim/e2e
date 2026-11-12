import Foundation
import AVFoundation
import AppKit
let root=URL(fileURLWithPath:CommandLine.arguments[1])
let cases=try JSONSerialization.jsonObject(with:Data(contentsOf:root.appendingPathComponent("media-review.json"))) as! [[String:Any]]
var inventory=[[String:Any]]()
for item in cases {
 let name=item["case"] as! String
 let a=AVURLAsset(url:root.appendingPathComponent(name+"/video.mp4"))
 var md=[[String:Any]]()
 for format in a.availableMetadataFormats {for v in a.metadata(forFormat:format) {md.append(["format":format.rawValue,"identifier":v.identifier?.rawValue ?? "", "key":String(describing:v.key),"value":v.stringValue ?? String(describing:v.value)])}}
 inventory.append(["case":name,"durationSeconds":CMTimeGetSeconds(a.duration),"tracks":a.tracks.map{["type":$0.mediaType.rawValue,"samplesPerSecond":$0.nominalFrameRate,"width":$0.naturalSize.width,"height":$0.naturalSize.height]},"audioTracks":a.tracks(withMediaType:.audio).count,"metadata":md])
}
try JSONSerialization.data(withJSONObject:inventory,options:[.prettyPrinted,.sortedKeys]).write(to:root.appendingPathComponent("media-containers.json"))
for offset in stride(from:0,to:cases.count,by:5) {
 let subset=Array(cases[offset..<min(offset+5,cases.count)]),w=1200,h=650
 let color=CGColorSpaceCreateDeviceRGB();let ctx=CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:0,space:color,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 ctx.setFillColor(NSColor.white.cgColor);ctx.fill(CGRect(x:0,y:0,width:w,height:h))
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:false)
 for (i,item) in subset.enumerated(){let name=item["case"] as! String
  let text=String(name.dropFirst(name.hasPrefix("admission6b7-") ? 13:14))
  (text as NSString).draw(at:NSPoint(x:i*240+4,y:620),withAttributes:[.font:NSFont.systemFont(ofSize:12),.foregroundColor:NSColor.black])
  for (j,f) in ["video.first.png","video.last.png"].enumerated(){let url=root.appendingPathComponent(name+"/"+f);let img=NSImage(contentsOf:url)!;var rect=NSRect(origin:.zero,size:img.size);let cg=img.cgImage(forProposedRect:&rect,context:nil,hints:nil)!;let scale=min(232/CGFloat(cg.width),290/CGFloat(cg.height));let ww=CGFloat(cg.width)*scale,hh=CGFloat(cg.height)*scale
   ctx.draw(cg,in:CGRect(x:CGFloat(i*240)+4+(232-ww)/2,y:CGFloat(j*305)+8,width:ww,height:hh))
  }
 }
 NSGraphicsContext.restoreGraphicsState()
 let rep=NSBitmapImageRep(cgImage:ctx.makeImage()!);try rep.representation(using:.png,properties:[:])!.write(to:root.appendingPathComponent("contact-\(offset/5+1).png"))
}
print("Inventoried \(inventory.count) original containers; wrote4 contact sheets")
