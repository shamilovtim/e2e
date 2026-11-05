from pathlib import Path
import subprocess
import plistlib

root = Path(__file__).resolve().parent
app = root / "ScrollFixture.app"
app.mkdir(exist_ok=True)
info = {
    "CFBundleIdentifier": "dev.testerarmy.rootscroll",
    "CFBundleName": "ScrollFixture",
    "CFBundleExecutable": "ScrollFixture",
    "CFBundlePackageType": "APPL",
    "CFBundleVersion": "1",
    "CFBundleShortVersionString": "1.0",
    "MinimumOSVersion": "15.0",
    "LSRequiresIPhoneOS": True,
    "UIApplicationSceneManifest": {
        "UIApplicationSupportsMultipleScenes": False,
        "UISceneConfigurations": {"UIWindowSceneSessionRoleApplication": [{
            "UISceneConfigurationName": "Default",
            "UISceneDelegateClassName": "ScrollFixture.SceneDelegate",
        }]},
    },
    "UILaunchScreen": {},
}
with (app / "Info.plist").open("wb") as output:
    plistlib.dump(info, output)
sdk = subprocess.check_output(["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], text=True).strip()
subprocess.run([
    "xcrun", "swiftc", "-sdk", sdk, "-target", "arm64-apple-ios15.0-simulator",
    "-module-name", "ScrollFixture", "-parse-as-library", "-framework", "UIKit",
    str(root / "ScrollFixture.swift"), "-o", str(app / "ScrollFixture"),
], check=True)
subprocess.run(["codesign", "--force", "--sign", "-", str(app)], check=True)
print(app)
