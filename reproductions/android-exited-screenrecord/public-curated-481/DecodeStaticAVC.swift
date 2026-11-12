import Foundation
import VideoToolbox
import CoreImage
import AppKit
let object = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [String: Any]
let sps = [UInt8](Data(base64Encoded: object["sps"] as! String)!)
let pps = [UInt8](Data(base64Encoded: object["pps"] as! String)!)
let sample = Data(base64Encoded: object["sample"] as! String)!
var format: CMVideoFormatDescription?
let formatStatus = sps.withUnsafeBufferPointer { s in pps.withUnsafeBufferPointer { p in
    var pointers = [s.baseAddress!, p.baseAddress!]
    var sizes = [s.count, p.count]
    return CMVideoFormatDescriptionCreateFromH264ParameterSets(allocator: kCFAllocatorDefault, parameterSetCount: 2, parameterSetPointers: &pointers, parameterSetSizes: &sizes, nalUnitHeaderLength: Int32(object["nalLengthBytes"] as! Int), formatDescriptionOut: &format)
}}
guard formatStatus == noErr, let format else { fatalError("Invalid H264 parameter sets: \(formatStatus)") }
var decoded: CVPixelBuffer?
var outputStatus: OSStatus = -1
var callback = VTDecompressionOutputCallbackRecord(decompressionOutputCallback: { _, _, status, _, image, _, _ in
    outputStatus = status
    decoded = image
}, decompressionOutputRefCon: nil)
var session: VTDecompressionSession?
let createStatus = VTDecompressionSessionCreate(allocator: kCFAllocatorDefault, formatDescription: format, decoderSpecification: nil, imageBufferAttributes: [kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA] as CFDictionary, outputCallback: &callback, decompressionSessionOut: &session)
guard createStatus == noErr, let session else { fatalError("Cannot create decoder: \(createStatus)") }
var block: CMBlockBuffer?
guard CMBlockBufferCreateWithMemoryBlock(allocator: kCFAllocatorDefault, memoryBlock: nil, blockLength: sample.count, blockAllocator: kCFAllocatorDefault, customBlockSource: nil, offsetToData: 0, dataLength: sample.count, flags: 0, blockBufferOut: &block) == noErr, let block else { fatalError("Cannot allocate block") }
let copyStatus = sample.withUnsafeBytes { CMBlockBufferReplaceDataBytes(with: $0.baseAddress!, blockBuffer: block, offsetIntoDestination: 0, dataLength: sample.count) }
guard copyStatus == noErr else { fatalError("Cannot copy sample") }
var timing = CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: .zero, decodeTimeStamp: .invalid)
var size = sample.count
var buffer: CMSampleBuffer?
guard CMSampleBufferCreateReady(allocator: kCFAllocatorDefault, dataBuffer: block, formatDescription: format, sampleCount: 1, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleSizeEntryCount: 1, sampleSizeArray: &size, sampleBufferOut: &buffer) == noErr, let buffer else { fatalError("Cannot make compressed sample") }
let decodeStatus = VTDecompressionSessionDecodeFrame(session, sampleBuffer: buffer, flags: [], frameRefcon: nil, infoFlagsOut: nil)
VTDecompressionSessionFinishDelayedFrames(session)
VTDecompressionSessionWaitForAsynchronousFrames(session)
guard decodeStatus == noErr, outputStatus == noErr, let decoded else { fatalError("H264 sample decode failed: \(decodeStatus), \(outputStatus)") }
let context = CIContext()
let image = CIImage(cvPixelBuffer: decoded)
guard let cg = context.createCGImage(image, from: image.extent), let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else { fatalError("Cannot make PNG") }
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
VTDecompressionSessionInvalidate(session)
let result: [String: Any] = ["decoder": "VideoToolbox direct compressed H264 sample decode", "decodedVideoSamples": 1, "decodeErrors": 0, "frame": [cg.width, cg.height], "timelinePlayback": false, "qualification": "Original MP4 has one sample with zero duration. This decodes that original compressed sample without editing or re-encoding the MP4; it does not establish playable temporal footage."]
print(String(data: try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]), encoding: .utf8)!)
