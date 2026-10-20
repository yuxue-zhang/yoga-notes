'use strict';
// Generated asset metadata is added only after visual identity review.
// Every pose reuses the same immutable image cell on every output.
const CHARACTER_ASSETS=typeof YOGA_CHARACTER_ASSETS==='undefined'?{atlases:{},poses:{}}:YOGA_CHARACTER_ASSETS;
function characterFigure(poseId,name){
 const asset=CHARACTER_ASSETS.poses[poseId];if(!asset||asset.styleReview!=='accepted')return null;
 const atlas=CHARACTER_ASSETS.atlases[asset.atlas];if(!atlas)return null;
 const cellWidth=atlas.width/atlas.columns,cellHeight=atlas.height/atlas.rows;
 const [x,y,w,visibleHeight]=asset.bounds||[(asset.cell%atlas.columns)*cellWidth,Math.floor(asset.cell/atlas.columns)*cellHeight,cellWidth,cellHeight*(1-(asset.cropBottom||0))];
 const clipId='character-crop-'+asset.id;
 return `<svg width="150" height="140" viewBox="${x} ${y} ${w} ${visibleHeight}" overflow="hidden" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(name)}，原版小女孩体式插画" data-character="original-girl-v1"><title>${esc(name)} · 同人物插画，动作细节待核验</title><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${visibleHeight}"/></clipPath></defs><g clip-path="url(#${clipId})"><image href="${atlas.url}" width="${atlas.width}" height="${atlas.height}"/></g></svg>`;
}
async function embedCharacterAtlases(svg){
 const used=Object.entries(CHARACTER_ASSETS.atlases).filter(([,a])=>svg.includes('href="'+a.url+'"'));
 const defs=[];
 for(const [key,atlas]of used){
  const response=await fetch(atlas.url);if(!response.ok)throw Error('人物素材读取失败');const blob=await response.blob();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  const id='character-atlas-'+key;
  defs.push(`<image id="${id}" href="${data}" width="${atlas.width}" height="${atlas.height}"/>`);
  svg=svg.split(`<image href="${atlas.url}" width="${atlas.width}" height="${atlas.height}"/>`).join(`<use href="#${id}"/>`);
 }
 const at=svg.indexOf('>')+1;return svg.slice(0,at)+'<defs>'+defs.join('')+'</defs>'+svg.slice(at);
}


