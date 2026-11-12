import Foundation
import AVFoundation
import AppKit
import CoreImage

let input = CommandLine.arguments[1]
let out = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let asset = AVURLAsset(url: URL(fileURLWithPath: input))
guard let track = asset.tracks(withMediaType: .video).first else { fatalError("No video track") }
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)
guard reader.startReading() else { throw reader.error! }
var count = 0
var first: CVPixelBuffer?
var last: CVPixelBuffer?
var firstSeconds = 0.0
var lastSeconds = 0.0
while let sample = output.copyNextSampleBuffer() {
    guard let pixels = CMSampleBufferGetImageBuffer(sample) else { fatalError("Undecoded video sample") }
    let seconds = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
    if first == nil { first = pixels; firstSeconds = seconds }
    last = pixels
    lastSeconds = seconds
    count += 1
}
guard reader.status == .completed, count > 0, let first = first, let last = last else {
    throw reader.error ?? NSError(domain: "DecodeVideo", code: 1)
}
let context = CIContext()
func save(_ pixels: CVPixelBuffer, _ name: String) throws -> [Int] {
    let image = CIImage(cvPixelBuffer: pixels).transformed(by: track.preferredTransform)
    guard let cg = context.createCGImage(image, from: image.extent),
          let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else {
        fatalError("Frame conversion failed")
    }
    try data.write(to: out.appendingPathComponent(name))
    return [cg.width, cg.height]
}
let firstSize = try save(first, "video.first.png")
let lastSize = try save(last, "video.last.png")
let result: [String: Any] = ["decoder": "Apple AVFoundation AVAssetReader BGRA output", "fullStreamDecoded": true,
    "decodedVideoSamples": count, "firstSampleSeconds": firstSeconds, "lastSampleSeconds": lastSeconds,
    "firstFrame": firstSize, "lastFrame": lastSize, "decodeErrors": 0]
print(String(data: try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]), encoding: .utf8)!)
