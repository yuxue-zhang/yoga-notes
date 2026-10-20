from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'dist/app.js'
s=p.read_text(encoding='utf-8-sig')
marker='function itemMarkup(p,i)'
start=s.index(marker);end=s.index('\nfunction strip',start)
s=s[:start]+'''function itemFigure(p){
  const kinds=Array.isArray(p.kinds)&&p.kinds.length?p.kinds:[p.kind];
  if(kinds.length===1)return figure(kinds[0]);
  const scale=1/kinds.length;
  return `<svg width="150" height="140" viewBox="0 0 150 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.name)}动作衔接">${kinds.map((kind,i)=>`<g transform="translate(${i*150*scale} ${70-70*scale}) scale(${scale})">${figure(kind)}</g>`).join('')}</svg>`;
}
function timeLabel(p){if(p.timeLabel)return '约 '+p.timeLabel;if(Number.isFinite(p.time))return String(Math.floor(p.time/60)).padStart(2,'0')+':'+String(Math.floor(p.time%60)).padStart(2,'0');return '';}
function provenance(){return state.reference?'原版视觉样稿 · 左右尚未核实':state.demo?'界面示例 · 非真实课程':'视频识别草稿 · 尚未核验';}
function itemMarkup(p,i){return `<div class="pose-card"><span class="num">${String(i+1).padStart(2,'0')}</span>${itemFigure(p)}<b>${esc(p.name)}</b><small>${esc(p.side||'未确认')} · ${esc(p.cue||'按熟悉的节奏')}</small><small class="pose-time">${esc(timeLabel(p))}</small></div>`;}
''' + s[end:]
s=s.replace("${esc(state.demo?'晨间舒展 · 示例':state.title)}", "${esc(state.title)}")
s=s.replace("${state.demo?'界面示例 · 非真实课程':'已有练习 · 体式插画示意'}", "${esc(provenance())}")
s=s.replace('粘贴 B 站或其他平台的课程链接','粘贴课程链接或视频直链')
s=s.replace('选择文件后开始处理。仅支持 MP4 / WebM；请使用你有权用于测试的视频。','先选择视频，再点击生成。仅支持 MP4 / WebM；请使用你有权处理的视频。')
s=s.replace('<div class="info">选择文件后开始处理。', '<div class="info">选择文件后开始处理。')
s=s.replace('请使用你有权处理的视频。</div>`}', '请使用你有权处理的视频。</div><button class="primary wide" id="submit-file">生成练习贴纸 ↗</button>`}')
s=s.replace('<div class="or">先感受一下成品</div>', '<div class="or">看看原版成品</div><button class="demo-btn" id="original"><span class="thumb">${figure(0)}</span><span><strong>打开第一版完整样稿</strong><small>30 个动作提示 · 原版女孩 · 预览与打印</small></span><span class="arr">↗</span></button><p class="hint">原版样稿不对应新导入的视频，左右与部分插画仍待核实。</p><div class="or">快速体验</div>')
s=s.replace("state.demo?'示例内容 · 仅供体验':'已有练习预览'", "provenance()")
s=s.replace("${state.demo?'当前展示的是示例内容，不对应你导入的视频；插画沿用原版素材，仍有待精修的体式。':'来自视频画面识别，尚未结合语音口令或完成逐项质量核验；缺图体式保留占位。'}", "${esc(state.reference?ORIGINAL_SEQUENCE.note:state.demo?'当前是6动作界面示例，不对应导入的视频。':'视频识别草稿尚未完成质量核验；缺图体式保留占位。')}")
s=s.replace('<label>版式</label>', '<p class="hint">时间仅用于定位原视频，不是动作停留时长。</p>${state.reference?\'<a class="secondary wide" href="/original.pdf" download="瑜序-第一版原始样稿.pdf">下载第一版原始 PDF</a>\':\'\'}<label>版式</label>')
s=s.replace('on(\'demo\',()=>', "on('original',()=>{state=structuredClone(ORIGINAL_SEQUENCE);save();navigate('export');});on('demo',()=>")
start=s.index("on('submit-source',()=>")
end=s.index("on('print',printSheet)",start)
s=s[:start]+'''on('submit-source',()=>{const source=$('#url').value.trim();if(safeURL(source)==='#'){notify('请输入有效视频链接。');return;}submitVideo(null,source);});
on('submit-file',()=>{const file=$('#file').files[0];if(!file){notify('请先选择一个视频文件。');return;}submitVideo(file,null);});
''' + s[end:]
s=s.replace('${figure(p.kind)}</g><text', '${itemFigure(p)}</g><text')
s=s.replace('${esc(p.cue)}</text></g>', '${esc(p.cue)} · ${esc(timeLabel(p))}</text></g>')
p.write_text(s,encoding='utf-8')
p=root/'dist/index.html';s=p.read_text(encoding='utf-8-sig');s=s.replace('<script src="app.js">','<script src="original.js"></script><script src="app.js">');p.write_text(s,encoding='utf-8')
