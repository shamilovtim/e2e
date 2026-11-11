import { mobile } from '@e2e-dev/mobile';
export default { projectId:'dev.e2e.overlay1563', tests:'tests/*.e2e.ts', workers:1, retries:0, timeout:60000, actionTimeout:5000, cleanupTimeout:180000,
 targets:[{name:'ios-cancel-review',engine:mobile({platform:'ios',session:'codex-cancel-review-e2e',transition:1000,videoTouches:false,device:{name:'owned-local-native',async acquire(){
 if(!process.env.ACCEPTANCE_DEVICE)throw new Error('ACCEPTANCE_DEVICE must name the owned simulator');
 return{id:'owned-local-native',deviceId:process.env.ACCEPTANCE_DEVICE,client:{stateDir:process.env.ACCEPTANCE_STATE,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED}};},async release(){}}}),app:{bundleId:'dev.e2e.overlay1563'}}] };
