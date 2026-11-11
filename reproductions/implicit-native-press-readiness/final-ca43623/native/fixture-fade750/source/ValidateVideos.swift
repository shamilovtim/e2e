import AVFoundation
import AppKit

var results: [[String: Any]] = []
for path in CommandLine.arguments.dropFirst() {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    let seconds = CMTimeGetSeconds(asset.duration)
    let tracks = asset.tracks(withMediaType: .video)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    let first = try generator.copyCGImage(at: .zero, actualTime: nil)
    let last = try generator.copyCGImage(at: CMTime(seconds: max(0, seconds - 0.1), preferredTimescale: 600), actualTime: nil)
    let framePath = URL(fileURLWithPath: path).deletingLastPathComponent().appendingPathComponent("validated-last-frame.png")
    try NSBitmapImageRep(cgImage: last).representation(using: .png, properties: [:])!.write(to: framePath)
    results.append(["path": path, "durationSeconds": seconds, "videoTracks": tracks.count,
                    "firstFrame": [first.width, first.height], "lastFrame": [last.width, last.height]])
}
let data = try JSONSerialization.data(withJSONObject: results, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
