from pathlib import Path
import subprocess, os, zipfile, hashlib
build=Path(__file__).resolve().parent
sdk=Path(os.environ.get("ANDROID_SDK_ROOT",str(Path.home()/"Library/Android/sdk")))
java=Path(os.environ["JAVA_HOME"])
bt=sdk/"build-tools/37.0.0"
jar=sdk/"platforms/android-37.0/android.jar"
classes=build/"classes"; dex=build/"dex"
classes.mkdir(exist_ok=True); dex.mkdir(exist_ok=True)
def run(args):
    subprocess.run([str(x) for x in args],check=True)
run([java/"bin/javac","--release","8","-classpath",jar,"-d",classes,build/"ScrollFixture.java"])
run([bt/"d8","--lib",jar,"--min-api","30","--output",dex,*sorted(classes.rglob("*.class"))])
base=build/"base.apk"
run([bt/"aapt2","link","-I",jar,"--manifest",build/"AndroidManifest.xml","--min-sdk-version","30","--target-sdk-version","37","-o",base])
with zipfile.ZipFile(base,"a",zipfile.ZIP_DEFLATED) as z:
    for p in dex.glob("*.dex"): z.write(p,p.name)
aligned=build/"aligned.apk"; run([bt/"zipalign","-f","4",base,aligned])
key=build/"fixture.keystore"
if not key.exists():
    run([java/"bin/keytool","-genkeypair","-keystore",key,"-alias","fixture","-storepass","android","-keypass","android","-dname","CN=Native Fixture,O=TesterArmy,C=US","-validity","3650","-keyalg","RSA","-keysize","2048","-noprompt"])
apk=build/"ScrollFixture.apk"
run([bt/"apksigner","sign","--ks",key,"--ks-key-alias","fixture","--ks-pass","pass:android","--key-pass","pass:android","--out",apk,aligned])
run([bt/"apksigner","verify",apk])
print(str(apk)); print(hashlib.sha256(apk.read_bytes()).hexdigest())
