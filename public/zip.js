// Portable ZIP writer using stored entries, UTF-8 filenames and verified CRC-32.
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
export function zipFiles(files){
 const parts=[],directory=[];let offset=0;
 for(const {path,content} of files){
  if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>!x||x==='..'||x==='.')||/[\x00-\x1f]/.test(path))throw Error('مسیر فایل ZIP معتبر نیست');
  const name=encoder.encode(path),data=typeof content==='string'?encoder.encode(content):content;
  if(!(data instanceof Uint8Array)||name.length>65535)throw Error('محتوای فایل ZIP معتبر نیست');
  const crc=crc32(data),local=header(30),central=header(46);let v=local.view;
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
  v=central.view;v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,0x21,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);
  parts.push(local.bytes,name,data);directory.push(central.bytes,name);offset+=30+name.length+data.length;
 }
 if(files.length>65535)throw Error('تعداد فایل‌ها بیش از حد است');
 const size=directory.reduce((n,b)=>n+b.length,0),end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,size,true);end.view.setUint32(16,offset,true);
 const result=new Uint8Array(offset+size+22);let pos=0;for(const b of [...parts,...directory,end.bytes]){result.set(b,pos);pos+=b.length;}return result;
}
