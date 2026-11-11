import {test} from '@e2e-dev/mobile';
import {expect} from 'e2e';
test('a pending native press reaches its deadline',async({device,screen})=>{
 await device.openApp('dev.e2e.overlay1563',{relaunch:true});
 await screen.getByRole('button','Open slow fade overlay').tap();
 await screen.getByRole('button','Close overlay').tap();
 let failed=false;
 try{await screen.getByRole('button','Underlying action').tap({timeout:500});}
 catch(error){if((error as {code?:unknown}).code!=='ACTION_FAILED')throw error;failed=true;}
 if(!failed)throw new Error('Blocked press must reach its input deadline');
});
test('the immediately following attempt receives only its own input',async({device,screen})=>{
 await device.openApp('dev.e2e.overlay1563',{relaunch:true});
 await screen.getByRole('button','Underlying action').tap();
 await expect(screen.getByTestId('results')).toHaveText('Underlying taps: 1\nOverlay touches: 0');
});
