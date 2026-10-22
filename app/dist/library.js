'use strict';
let libraryQuery='',libraryCategory='',libraryPage=0;
const libraryPageSize=18;
function libraryName(p){const index=p.artwork.assetIndexes[0];return Number.isInteger(index)&&poses[index]?poses[index]:p.name;}
function libraryHasArt(p){return Boolean(p.artwork.assetIndexes.length||CHARACTER_ASSETS.poses[p.id]?.styleReview==='accepted');}
function libraryView(){
 const catalog=YOGA_POSE_CATALOG;
 return `<div class="intro"><div><div class="eyebrow">ONE CHARACTER. A GROWING PRACTICE LIBRARY.</div><h1>自由组合动作，<em>编排你的专属瑜伽练习</em></h1></div></div><section class="panel library-intro"><div class="library-metrics"><div><b>${catalog.entries.length}</b><span>体式与常见变体</span></div><div><b>${catalog.categories.length}</b><span>动作类别</span></div></div><div class="library-tools"><label>搜索体式<input id="library-search" type="search" placeholder="中文或英文，例如：下犬 / Warrior" value="${esc(libraryQuery)}"></label><label>动作类别<select id="library-category"><option value="">全部类别</option>${catalog.categories.map(c=>`<option value="${esc(c)}"${c===libraryCategory?' selected':''}>${esc(c)}</option>`).join('')}</select></label></div></section><div id="library-results">${libraryResults()}</div>`;
}
function libraryFiltered(){
 const query=libraryQuery.trim().toLocaleLowerCase();
 return YOGA_POSE_CATALOG.entries.filter(p=>(!libraryCategory||p.category===libraryCategory)&&(!query||[libraryName(p),p.name,p.english,...p.aliases].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)));
}
function libraryResults(){
 const entries=libraryFiltered(),pages=Math.max(1,Math.ceil(entries.length/libraryPageSize));libraryPage=Math.min(libraryPage,pages-1);
 return `<div class="library-results-head"><p role="status">找到 ${entries.length} 个动作 · 第 ${libraryPage+1} / ${pages} 页</p><button id="library-download" class="secondary">下载动作资料</button></div><div class="library-grid">${entries.slice(libraryPage*libraryPageSize,(libraryPage+1)*libraryPageSize).map(libraryCard).join('')||'<div class="panel empty">没有找到这个名称，可换一个常用别名或类别。</div>'}</div><div class="library-pagination"><button class="secondary" id="library-prev"${libraryPage===0?' disabled':''}>← 上一页</button><span>${libraryPage+1} / ${pages}</span><button class="secondary" id="library-next"${libraryPage===pages-1?' disabled':''}>下一页 →</button></div>`;
}
function libraryCard(p){
 const indexes=p.artwork.assetIndexes,name=libraryName(p),newArt=characterFigure(p.id,name);
 return `<article class="panel library-card" data-pose-id="${esc(p.id)}"><div class="library-art">${newArt|| (indexes.length?figure(indexes[0]):'<div class="library-art-pending"><span>原版小女孩</span><b>该体式插画待补</b></div>')}</div><div class="library-card-heading"><span class="library-category">${esc(p.category)}</span></div><h2>${esc(name)}</h2><p class="library-english">${esc(p.english)}</p><p>${esc(p.description)}</p></article>`;
}
function refreshLibraryResults(){const el=document.querySelector('#library-results');if(el){el.innerHTML=libraryResults();bindLibraryResults();}}
function bindLibrary(){
 const search=document.querySelector('#library-search');if(!search)return;
 search.oninput=()=>{libraryQuery=search.value;libraryPage=0;refreshLibraryResults();};
 document.querySelector('#library-category').onchange=event=>{libraryCategory=event.target.value;libraryPage=0;refreshLibraryResults();};
 bindLibraryResults();
}
function bindLibraryResults(){
 const previous=document.querySelector('#library-prev'),next=document.querySelector('#library-next');
 if(previous)previous.onclick=()=>{libraryPage--;refreshLibraryResults();document.querySelector('#library-results').scrollIntoView({behavior:'smooth'});};
 if(next)next.onclick=()=>{libraryPage++;refreshLibraryResults();document.querySelector('#library-results').scrollIntoView({behavior:'smooth'});};
 const exportButton=document.querySelector('#library-download');if(exportButton)exportButton.onclick=()=>download(JSON.stringify(YOGA_POSE_CATALOG,null,2),'瑜伽随记-常见体式动作库.json','application/json');
}


