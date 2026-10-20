import {createApp} from './automation-server.mjs';
const server=await createApp();
server.listen(8787,'127.0.0.1',()=>console.log('瑜序已启动：http://127.0.0.1:8787'));
