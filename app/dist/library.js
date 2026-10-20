'use strict';
let libraryQuery='',libraryCategory='',libraryArtOnly=false,libraryPage=0;
const libraryPageSize=18;
function libraryHasArt(p){return Boolean(p.artwork.assetIndexes.length||CHARACTER_ASSETS.poses[p.id]?.styleReview==='accepted');}
function libraryView(){
 const catalog=YOGA_POSE_CATALOG,illustrated=catalog.entries.filter(libraryHasArt).length;
 return heading('ONE CHARACTER. A GROWING PRACTICE LIBRARY.','每一个动作，<em>都有自己的名字。</em>','按体式和变体管理，贴纸始终使用同一个原版小女孩。','原版人物 · 固定素材')+`<section class="panel library-intro"><div class="library-metrics"><div><b>${catalog.entries.length}</b><span>体式与常见变体</span></div><div><b>${catalog.categories.length}</b><span>动作类别</span></div><div><b>${illustrated}</b><span>同人物插画</span></div></div><p class="hint">${illustrated} / ${catalog.entries.length} 个体式已配同一人物插画。人物始终参照原版小女孩，体式细节尚待逐项核验。</p><div class="library-tools"><label>搜索体式<input id="library-search" type="search" placeholder="中文、英文或梵文，例如：下犬 / Warrior" value="${esc(libraryQuery)}"></label><label>动作类别<select id="library-category"><option value="">全部类别</option>${catalog.categories.map(c=>`<option value="${esc(c)}"${c===libraryCategory?' selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="library-check"><input type="checkbox" id="library-art-only"${libraryArtOnly?' checked':''}>只看已配图</label></div><p class="hint">体式名称与分类参考 <a href="https://www.yogajournal.com/pose-finder/pose-finder?scope=anon" target="_blank" rel="noopener noreferrer">Yoga Journal 体式目录</a>。下面的身体特征用于视频识别比对，不是练习教学口令。</p></section><div id="library-results">${libraryResults()}</div>`;
}
function libraryFiltered(){
 const query=libraryQuery.trim().toLocaleLowerCase();
 return YOGA_POSE_CATALOG.entries.filter(p=>(!libraryCategory||p.category===libraryCategory)&&(!libraryArtOnly||libraryHasArt(p))&&(!query||[p.name,p.english,p.sanskrit,...p.aliases].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)));
}
function libraryResults(){
 const entries=libraryFiltered(),pages=Math.max(1,Math.ceil(entries.length/libraryPageSize));libraryPage=Math.min(libraryPage,pages-1);
 return `<div class="library-results-head"><p role="status">找到 ${entries.length} 个动作 · 第 ${libraryPage+1} / ${pages} 页</p><button id="library-download" class="secondary">下载动作资料</button></div><div class="library-grid">${entries.slice(libraryPage*libraryPageSize,(libraryPage+1)*libraryPageSize).map(libraryCard).join('')||'<div class="panel empty">没有找到这个名称，可换一个常用别名或类别。</div>'}</div><div class="library-pagination"><button class="secondary" id="library-prev"${libraryPage===0?' disabled':''}>← 上一页</button><span>${libraryPage+1} / ${pages}</span><button class="secondary" id="library-next"${libraryPage===pages-1?' disabled':''}>下一页 →</button></div>`;
}
function libraryCard(p){
 const indexes=p.artwork.assetIndexes,newArt=characterFigure(p.id,p.name);
 return `<article class="panel library-card" data-pose-id="${esc(p.id)}"><div class="library-art">${newArt|| (indexes.length?figure(indexes[0]):'<div class="library-art-pending"><span>原版小女孩</span><b>该体式插画待补</b></div>')}</div><div class="library-card-heading"><span class="library-category">${esc(p.category)}</span><span class="library-art-status">${newArt?'同人物插画':indexes.length?'原版参考图':'待补插画'}</span></div><h2>${esc(p.name)}</h2><p class="library-english">${esc(p.english)}${p.sanskrit?'<br><i>'+esc(p.sanskrit)+'</i>':''}</p><p>${esc(p.description)}</p><details><summary>动作区别与变体</summary><p>${esc(p.distinction)}</p>${p.aliases.length?'<p>常用别名：'+esc(p.aliases.join('、'))+'</p>':''}<ul>${p.variants.map(v=>`<li><b>${esc(v.label)}</b>：${esc(v.notes)}</li>`).join('')}</ul><p class="hint">人物：原版小女孩<br>动作资料：已登记，待逐项审核<br>插画：${newArt?'同人物固定素材，体式细节待审核':indexes.length?'原版参考，体式细节待审核':'尚未制作对应原版人物素材'}</p><a href="${esc(p.sources[0].url)}" target="_blank" rel="noopener noreferrer">查看名称与分类参考 ↗</a></details></article>`;
}
function refreshLibraryResults(){const el=document.querySelector('#library-results');if(el){el.innerHTML=libraryResults();bindLibraryResults();}}
function bindLibrary(){
 const search=document.querySelector('#library-search');if(!search)return;
 search.oninput=()=>{libraryQuery=search.value;libraryPage=0;refreshLibraryResults();};
 document.querySelector('#library-category').onchange=event=>{libraryCategory=event.target.value;libraryPage=0;refreshLibraryResults();};
 document.querySelector('#library-art-only').onchange=event=>{libraryArtOnly=event.target.checked;libraryPage=0;refreshLibraryResults();};bindLibraryResults();
}
function bindLibraryResults(){
 const previous=document.querySelector('#library-prev'),next=document.querySelector('#library-next');
 if(previous)previous.onclick=()=>{libraryPage--;refreshLibraryResults();document.querySelector('#library-results').scrollIntoView({behavior:'smooth'});};
 if(next)next.onclick=()=>{libraryPage++;refreshLibraryResults();document.querySelector('#library-results').scrollIntoView({behavior:'smooth'});};
 const exportButton=document.querySelector('#library-download');if(exportButton)exportButton.onclick=()=>download(JSON.stringify(YOGA_POSE_CATALOG,null,2),'瑜序-常见体式动作库.json','application/json');
}
