import Foundation
import AVFoundation
import AppKit

var results: [[String: Any]] = []
for name in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: name)
    do {
        let asset = AVURLAsset(url: url)
        guard let track = try await asset.loadTracks(withMediaType: .video).first else { throw NSError(domain: "video", code: 1) }
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: nil)
        reader.add(output)
        guard reader.startReading() else { throw reader.error ?? NSError(domain: "video", code: 2) }
        var first: CMTime?
        var last: CMTime?
        var count = 0
        while let sample = output.copyNextSampleBuffer() {
            let time = CMSampleBufferGetPresentationTimeStamp(sample)
            if first == nil { first = time }
            last = time
            count += 1
        }
        guard reader.status == .completed, let first, let last else { throw reader.error ?? NSError(domain: "video", code: 3) }
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        var frames: [[String: Any]] = []
        for (label, time) in [("first", first), ("last", last)] {
            let generated = try await generator.image(at: time)
            let bitmap = NSBitmapImageRep(cgImage: generated.image)
            guard let data = bitmap.representation(using: .png, properties: [:]) else { throw NSError(domain: "video", code: 4) }
            let frameURL = url.deletingPathExtension().appendingPathExtension(label + ".png")
            try data.write(to: frameURL)
            frames.append(["frame": label, "requestedSeconds": CMTimeGetSeconds(time), "actualSeconds": CMTimeGetSeconds(generated.actualTime), "width": generated.image.width, "height": generated.image.height])
        }
        results.append(["video": name, "sampleCount": count, "decoded": true, "frames": frames])
    } catch { results.append(["video": name, "decoded": false, "error": String(describing: error)]) }
}
let data = try JSONSerialization.data(withJSONObject: ["decoder": "Apple AVFoundation, exact first/final sample timestamps, zero requested tolerance", "videos": results], options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
