import Foundation
import AVFoundation
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let track = asset.tracks(withMediaType: .video)[0]
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(output)
let started = reader.startReading()
var count = 0
while let sample = output.copyNextSampleBuffer() { if CMSampleBufferGetImageBuffer(sample) != nil { count += 1 } }
let object: [String: Any] = ["started": started, "status": reader.status.rawValue, "completed": reader.status == .completed, "count": count, "error": reader.error?.localizedDescription ?? "none", "durationSeconds": CMTimeGetSeconds(asset.duration), "audioTracks": asset.tracks(withMediaType: .audio).count]
print(String(data: try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]), encoding: .utf8)!)
