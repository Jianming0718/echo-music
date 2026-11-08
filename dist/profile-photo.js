'use strict';
globalThis.EchoProfilePhoto=Object.freeze({async prepare(file){
 if(!file||!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)||file.size>10485760)throw Error('请选择 10 MB 以内的照片。');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('无法读取这张照片，请使用 JPEG、PNG 或 WebP。'));image.src=url});
  const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height||width*height>80000000)throw Error('照片尺寸过大。');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d');if(!context)throw Error('此浏览器暂时无法处理照片。');
  context.fillStyle='#1c2517';context.fillRect(0,0,512,512);const size=Math.min(width,height);context.drawImage(image,(width-size)/2,(height-size)/2,size,size,0,0,512,512);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(!blob||blob.size>1048576)throw Error('照片处理失败，请换一张照片。');return blob;
 }finally{URL.revokeObjectURL(url)}
}});
