import {mobile} from '@e2e-dev/mobile';
export default {
 projectId:'dev.e2e.overlay1563',tests:'*.e2e.ts',workers:1,retries:0,timeout:60000,actionTimeout:5000,cleanupTimeout:180000,
 targets:[{name:'ios-fixture',engine:mobile({platform:'ios',session:'fixture-readiness',transition:1000,videoTouches:false,
  device:{name:'owned-fixture-device',async acquire(){return{id:'owned-fixture-device',deviceId:process.env.OVERLAY_DEVICE,
   client:{stateDir:process.env.AGENT_DEVICE_STATE_DIR,iosXctestrunFile:process.env.NATIVE_XCTESTRUN,iosXctestDerivedDataPath:process.env.NATIVE_DERIVED}};},async release(){}}
 }),app:{bundleId:'dev.e2e.overlay1563'}}]
};
