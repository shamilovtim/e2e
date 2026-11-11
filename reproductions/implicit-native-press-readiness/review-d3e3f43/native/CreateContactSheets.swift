import AppKit
import Foundation
let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let casesRoot = root.appendingPathComponent("cases")
let cases = FileManager.default.fileExists(atPath: casesRoot.path) ? try FileManager.default.contentsOfDirectory(at: casesRoot, includingPropertiesForKeys: nil).sorted { $0.lastPathComponent < $1.lastPathComponent } : [root]
let output = root.appendingPathComponent("contact-sheets", isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for page in 0..<((cases.count + 4) / 5) {
    let group = Array(cases.dropFirst(page * 5).prefix(5))
    let width = 1100, height = group.count * 350
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor.white.setFill(); NSRect(x: 0, y: 0, width: width, height: height).fill()
    for (row, folder) in group.enumerated() {
        let y = CGFloat(height - row * 350 - 350)
        let label = folder.lastPathComponent + "    first / last"
        (label as NSString).draw(at: NSPoint(x: 20, y: y + 325), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 15, weight: .medium), .foregroundColor: NSColor.black])
        for (column, name) in ["video.first.png", "video.last.png"].enumerated() {
            let image = NSImage(contentsOf: folder.appendingPathComponent(name))!
            let scale = min(500 / image.size.width, 305 / image.size.height)
            let size = NSSize(width: image.size.width * scale, height: image.size.height * scale)
            let x = CGFloat(column * 550) + (550 - size.width) / 2
            image.draw(in: NSRect(x: x, y: y + 10, width: size.width, height: size.height))
        }
    }
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("page-\(page + 1).png"))
}
