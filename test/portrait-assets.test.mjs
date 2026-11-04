import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
test('demo PNGs contain complete decodable pixel data and a final IEND chunk',async()=>{
 for(const name of ['woman','man']){
  const bytes=await readFile(new URL('../public/assets/demo/'+name+'.png',import.meta.url));
  const chunks=[];let offset=8,ended=false;
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
  while(offset<bytes.length){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(offset+size+12<=bytes.length,`${name}: truncated ${type}`);if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+size));offset+=size+12;if(type==='IEND'){ended=true;break;}}
  assert.ok(ended,`${name}: missing IEND`);assert.equal(offset,bytes.length);
  assert.equal(inflateSync(Buffer.concat(chunks)).length,height*(1+width*4));
 }
});
