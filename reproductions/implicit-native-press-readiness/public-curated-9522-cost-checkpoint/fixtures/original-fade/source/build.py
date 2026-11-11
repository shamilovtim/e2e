from pathlib import Path
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
app = root / "build" / "OverlayFixture.app"
app.mkdir(parents=True, exist_ok=True)
sdk = subprocess.check_output(["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], text=True).strip()
subprocess.run(["xcrun", "swiftc", str(root / "source" / "OverlayFixture.swift"), "-sdk", sdk,
                "-target", "arm64-apple-ios17.0-simulator", "-o", str(app / "OverlayFixture")], check=True)
shutil.copy2(root / "source" / "Info.plist", app / "Info.plist")
subprocess.run(["codesign", "--force", "--sign", "-", str(app)], check=True)
print(app)
