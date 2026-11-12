import Foundation
import AppKit
let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let names = ["native-zombie-pair-3", "healthy-cli-2", "composed-cli-481-1", "composed-cli-481-2", "composed-cli-481-3", "composed-cli-base-2"]
let canvas = NSImage(size: NSSize(width: 1280, height: 2280))
canvas.lockFocus()
NSColor.white.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1280, height: 2280)).fill()
for (i, name) in names.enumerated() {
 for (j, endpoint) in ["first", "last"].enumerated() {
  let index = i * 2 + j, x = CGFloat(index % 4) * 320, y = CGFloat(2 - index / 4) * 760
  let url = root.appendingPathComponent("cases/\(name)/video.\(endpoint).png")
  guard let image = NSImage(contentsOf: url) else { fatalError("Missing endpoint") }
  image.draw(in: NSRect(x: x + 2, y: y + 42, width: 315, height: 700))
  let caption = NSAttributedString(string: name + " / " + endpoint, attributes: [.font: NSFont.monospacedSystemFont(ofSize: 10, weight: .regular), .foregroundColor: NSColor.black])
  caption.draw(in: NSRect(x: x + 5, y: y + 5, width: 310, height: 32))
 }
}
canvas.unlockFocus()
guard let tiff = canvas.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot export") }
try png.write(to: root.appendingPathComponent("contact-sheet.png"))
