import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
const root=process.argv[2], output=process.argv[3];
if(!root||!output)throw Error('Explicit root and output required');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git('status','--porcelain=v1'))throw Error('Clean exact source required');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const head=git('rev-parse','HEAD'), old='6b7c8eab65ee8fce80ef001313031cacf97175c2';
const files=[],links=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name),rel=path.relative(root,p);if(e.isSymbolicLink())links.push(rel);else if(e.isDirectory())walk(p);else if(/\.(?:js|mjs|cjs)$/.test(e.name))files.push({path:rel,sha256:hash(p),size:fs.statSync(p).size});}}
walk(path.join(root,'dist'));if(links.length)throw Error('Unexpected dist symlink');files.sort((a,b)=>a.path.localeCompare(b.path));
const manifest={head,sourceTree:git('rev-parse','HEAD^{tree}'),scope:'Complete recursively enumerated emitted JavaScript file set, including generated entrypoints. All js/mjs/cjs extensions included; no symlinks under dist. Does not enumerate external dependencies/system runtime.',completeEmittedJavaScriptFileSet:true,symlinksFound:false,files};
fs.writeFileSync(path.join(output,'runtime-e66-full.json'),JSON.stringify(manifest,null,2)+'\n');
const prior=JSON.parse(fs.readFileSync(path.join(output,'runtime-6b7-full.json'),'utf8')),priorMap=new Map(prior.files.map(x=>[x.path,x.sha256])),currentMap=new Map(files.map(x=>[x.path,x.sha256]));
const changed=files.filter(x=>priorMap.has(x.path)&&priorMap.get(x.path)!==x.sha256).map(x=>({path:x.path,before:priorMap.get(x.path),after:x.sha256}));
const {computeRunnerSourceFingerprint}=await import(pathToFileURL(path.join(root,'packages/apple-runner/src/runner-source.ts')));
const fingerprint=computeRunnerSourceFingerprint(root),builds={};
for(const [kind,derivedName] of [['production','combined-d9-native-derived'],['unit','combined-d9-native-unit-derived']]){
 const derived=path.join(root,'.tmp',derivedName),metadataFile=path.join(derived,'.agent-device-runner-cache.json'),metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));
 if(metadata.runnerSourceFingerprint!==fingerprint)throw Error('Native source fingerprint mismatch');
 const a=metadata.artifacts;
 for(const e of a.entries){const p=path.join(derived,e.path);if(fs.lstatSync(p).isSymbolicLink()||hash(p)!==e.digest||fs.statSync(p).size!==e.size)throw Error('Native artifact mismatch');}
 if(hash(a.xctestrunPath)!==a.xctestrunDigest)throw Error('Native xctestrun mismatch');
 builds[kind]={builtAt:'d9f43ffe4658f0f25649714b9a82bb7c9128a47a',sourceFingerprint:metadata.runnerSourceFingerprint,officialManifestSha256:hash(metadataFile),xctestrunSha256:a.xctestrunDigest,artifactsVerified:a.entries.length,files:a.entries};
}
const nativeSourceChanges=git('diff','--name-only',old,head,'--','apple','packages/apple-runner','scripts/build-xcuitest-apple.sh','scripts/package-apple-runner-source.mjs');if(nativeSourceChanges)throw Error('Native build inputs changed');
const record={head,sourceTree:manifest.sourceTree,priorSource:old,completeJavaScriptFiles:files.length,addedJavaScriptFiles:files.filter(x=>!priorMap.has(x.path)).map(x=>x.path),removedJavaScriptFiles:prior.files.filter(x=>!currentMap.has(x.path)).map(x=>x.path),changedJavaScriptFiles:changed,nativeSourceFingerprint:fingerprint,nativeBuildInputChanges:[],builds,scriptSha256:hash(fileURLToPath(import.meta.url)),qualification:'Actual native products/unit7 execution retain d9 attribution; no new native compile/test or device operation performed by this manifest check.'};
fs.writeFileSync(path.join(output,'nits-artifact-provenance.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({head,JavaScriptFiles:files.length,changed:changed.map(x=>x.path),nativeSourceFingerprint:fingerprint,nativeArtifactsVerified:Object.values(builds).reduce((n,b)=>n+b.artifactsVerified,0)}));
