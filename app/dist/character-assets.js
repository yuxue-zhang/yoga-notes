'use strict';
// Generated asset metadata is added only after visual identity review.
// Every pose reuses the same immutable image cell on every output.
const CHARACTER_ASSETS=typeof YOGA_CHARACTER_ASSETS==='undefined'?{atlases:{},poses:{}}:YOGA_CHARACTER_ASSETS;
function characterFigure(poseId,name){
 const asset=CHARACTER_ASSETS.poses[poseId];if(!asset||asset.styleReview!=='accepted')return null;
 const atlas=CHARACTER_ASSETS.atlases[asset.atlas];if(!atlas)return null;
 const w=atlas.width/atlas.columns,h=atlas.height/atlas.rows,x=(asset.cell%atlas.columns)*w,y=Math.floor(asset.cell/atlas.columns)*h,visibleHeight=h*(1-(asset.cropBottom||0));
 return `<svg width="150" height="140" viewBox="${x} ${y} ${w} ${visibleHeight}" overflow="hidden" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(name)}，原版小女孩体式插画" data-character="original-girl-v1"><title>${esc(name)} · 同人物插画，动作细节待核验</title><image href="${atlas.url}" width="${atlas.width}" height="${atlas.height}"/></svg>`;
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
