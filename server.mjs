import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createPortfolioServer} from './portfolio-server.mjs';

const env=process.env;
const portArg=process.argv.indexOf('--port');
const port=Number(env.PORT||(portArg>=0?process.argv[portArg+1]:3000));
const origin=env.APP_ORIGIN||`http://localhost:${port}`;
export const server=createPortfolioServer({
 env, origin,
 loadAsset: file => readFile(new URL('./public/'+file, import.meta.url))
});
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 server.listen(port,()=>console.log(`Portfolio Builder listening on ${origin}`));
}
