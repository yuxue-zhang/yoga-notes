'use strict';
let submitting = false;
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
function shareURL(raw){
 const text=String(raw).replace(/\\([:/?.=&])/g,'$1').replace(/&amp;/g,'&');
 const matches=[...new Set((text.match(/https?:\/\/[^\s<>"，]+/g)||[]).map(x=>x.replace(/[)）。，]+$/,'')))];
 if(matches.length!==1)throw Error(matches.length?'一次粘贴一节课程的分享链接即可。':'没有找到网址，请粘贴完整分享链接。');
 return matches[0];
}
function progress(message) {
  pending = message;
  let note = document.querySelector('#processing-status');
  if (!note) {note=document.createElement('p');note.id='processing-status';note.className='info';note.setAttribute('role','status');document.querySelector('.panel')?.append(note);}
  note.textContent=message;
}
function stageProgress(job){progress(job.message);let bar=document.querySelector('#generation-progress');if(!bar){bar=document.createElement('progress');bar.id='generation-progress';bar.max=100;bar.setAttribute('aria-label','生成进度');document.querySelector('#processing-status')?.before(bar);}bar.value=job.progress||0;}
function setBusy(value){document.querySelectorAll('#submit-source,#submit-file,#file,[data-mode],#demo,#original,#resume,nav button').forEach(el=>el.disabled=value);document.querySelector('#app')?.setAttribute('aria-busy',String(value));}
async function request(url, options) {
  let response;
  try {response=await fetch(url,options);} catch {throw Error('无法连接本地处理服务，请通过启动脚本打开应用。');}
  let data;
  try {data=await response.json();} catch {throw Error('处理服务不可用，请通过启动脚本打开应用。');}
  if(!response.ok) throw Error(data.error || '处理请求失败。');
  return data;
}
async function videoDuration(source) {
  const video=document.createElement('video');video.preload='metadata';
  try {return await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{video.src='';reject(Error('无法读取视频时长，请检查文件或直链。'));},15000);
    video.onloadedmetadata=()=>{clearTimeout(timeout);resolve(video.duration);};
    video.onerror=()=>{clearTimeout(timeout);reject(Error('浏览器无法读取这个视频，请选择 MP4 / WebM 文件或可访问的视频直链。'));};
    video.src=source;
  });} finally {video.removeAttribute('src');video.load();}
}
async function submitVideo(file, url) {
  if(submitting) return;
  submitting=true;
  setBusy(true);
  try {
    if(url) {url=shareURL(url);const parsed=new URL(url);const platform=['www.bilibili.com','m.bilibili.com','bilibili.com','www.xiaohongshu.com'].includes(parsed.hostname);if(parsed.protocol!=='https:' || (!platform&&!/\.(mp4|webm)$/i.test(parsed.pathname))) throw Error('支持小红书完整分享链接、B站公开BV链接，或 MP4 / WebM 视频直链。');}
    const config=await request('/api/config');
    if(!config.ready) throw Error('处理服务尚未完成模型配置及免费额度保护确认，视频未上传。');
    if(file && (file.size>config.maxBytes || !['video/mp4','video/webm'].includes(file.type))) throw Error('请选择 1 GB 以内的 MP4 / WebM 视频。');
    progress('正在检查视频…');
    // Duration is validated by FFmpeg on the server, never trusted from a browser header.
    progress(url?'正在检查课程页面并读取公开视频，请稍候…':'正在提交视频…');
    const job=await request('/api/jobs',{method:'POST',headers:{'Content-Type':file?file.type:'application/json','X-Source-Name':encodeURIComponent(file?file.name:'视频直链')},body:file || JSON.stringify({url})});
    localStorage.setItem('yoga-active-job',job.id);
    await followJob(job.id);
  } catch(e) {progress(e.message);notify(e.message);} finally {submitting=false;setBusy(false);}
}
async function followJob(id) {
  const deadline=Date.now()+6*3600000;
  while(Date.now()<deadline) {
    const job=await request('/api/jobs/'+encodeURIComponent(id));
    if(job.status==='failed'||job.status==='cached') {
      sessionStorage.removeItem('yoga-active-job');localStorage.removeItem('yoga-active-job');
      if(job.canResume||job.status==='cached'){localStorage.setItem('yoga-resumable-job',id);showRecovery(id);}else localStorage.removeItem('yoga-resumable-job');
      if(job.partialResult?.items?.length)showPartial(job.partialResult);
      throw Error(job.error||'课程已保留，可以继续处理。');
    }
    if(job.status==='completed') {
      state={...job.result,selected:0};save();sessionStorage.removeItem('yoga-active-job');localStorage.removeItem('yoga-active-job');localStorage.removeItem('yoga-resumable-job');localStorage.setItem('yoga-last-job',id);const cleanURL=new URL(location.href);cleanURL.searchParams.delete('task');history.replaceState(null,'',cleanURL);pending='';navigate('export');return;
    }
    stageProgress(job);await pause(2000);
  }
  throw Error('等待超时，可刷新页面恢复任务状态。');
}
function showRecovery(id){
 let button=document.querySelector('#continue-course');
 if(!button){button=document.createElement('button');button.id='continue-course';button.textContent='继续处理这节课';document.querySelector('.panel')?.append(button);}
 button.onclick=()=>continueJob(id);
}
async function continueJob(id){
 if(submitting)return;submitting=true;setBusy(true);
 try{await request('/api/jobs/'+encodeURIComponent(id)+'/resume',{method:'POST'});localStorage.setItem('yoga-active-job',id);localStorage.removeItem('yoga-resumable-job');await followJob(id);}catch(e){progress(e.message);}finally{submitting=false;setBusy(false);}
}
function showPartial(result){
 let button=document.querySelector('#preview-partial');
 if(!button){button=document.createElement('button');button.id='preview-partial';button.className='secondary wide';document.querySelector('.panel')?.append(button);}
 button.textContent=`查看已完成的前 ${Math.floor(result.processedDuration/60)} 分钟`;
 button.onclick=()=>{state={...result,selected:0};save();pending='';navigate('export');};
}
document.addEventListener('change',event=>{
  if(event.target.id!=='file')return;
  const file=event.target.files[0];if(file)progress('已选择：'+file.name+'。点击“生成练习贴纸”后才会提交。');
});
const taskParameter=new URL(location.href).searchParams.get('task');
const connectButton=document.createElement('button');connectButton.id='connect-free-model';connectButton.textContent='连接免费模型';connectButton.className='secondary';
const providerDialog=document.createElement('dialog');providerDialog.id='provider-settings';
providerDialog.innerHTML='<h2>连接智谱免费模型</h2><p>只需连接一次，之后直接粘贴视频网址就能使用。</p><p>① <a href="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys" target="_blank" rel="noopener noreferrer">打开智谱，登录并创建 API Key</a></p><p>② 复制 Key，粘贴到下面。无需充值。</p><form id="provider-form"><label for="provider-key">智谱 API Key</label><input id="provider-key" type="password" autocomplete="off" spellcheck="false" required placeholder="把复制的 Key 粘贴在这里"><p>固定使用免费型号 GLM-4.6V-Flash。Key 仅保存到这台电脑，不在页面中回显。</p><p id="provider-note" role="status"></p><button class="primary" type="submit">验证并保存连接</button><button id="cancel-provider" type="button">稍后再说</button></form>';
document.body.append(providerDialog);
connectButton.onclick=()=>providerDialog.showModal();
document.querySelector('#cancel-provider').onclick=()=>providerDialog.close();
providerDialog.addEventListener('close',()=>{document.querySelector('#provider-key').value='';});
document.querySelector('#provider-form').onsubmit=async event=>{
 event.preventDefault();const button=event.target.querySelector('[type="submit"]'),input=document.querySelector('#provider-key'),note=document.querySelector('#provider-note');button.disabled=true;note.textContent='正在验证免费模型连接…';
 try{
  const data=await request('/api/settings/zhipu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:input.value.trim()})});input.value='';providerDialog.close();connectButton.textContent='智谱免费模型 · 已验证';
  progress('连接已验证。当前仅配置模型，没有启动视频分析。');
 }catch(error){note.textContent=error.message;}finally{button.disabled=false;}
};
if(new URL(location.href).searchParams.get('setup')==='free')providerDialog.showModal();
const activeJob=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(taskParameter||'')?taskParameter:localStorage.getItem('yoga-active-job')||sessionStorage.getItem('yoga-active-job')||localStorage.getItem('yoga-resumable-job');
if(activeJob&&page!=='library'&&page!=='character') {localStorage.setItem('yoga-active-job',activeJob);submitting=true;setBusy(true);followJob(activeJob).catch(e=>progress(e.message)).finally(()=>{submitting=false;setBusy(false);});}

const nextConnect=document.createElement('button');nextConnect.id='connect-next';nextConnect.className='secondary';nextConnect.textContent='连接提供的额度';
const nextDialog=document.createElement('dialog');nextDialog.id='next-settings';
nextDialog.innerHTML='<h2>连接你的模型额度</h2><p>接口地址已填好：</p><p><code>https://api.openai-next.com/v1</code></p><p>这是你提供的第三方平台。填写该平台的 Key 后，仅向此地址验证模型列表；本次不生成图片或分析视频。</p><form id="next-form"><label for="next-key">该平台的 API Key</label><input id="next-key" type="password" autocomplete="off" spellcheck="false" required placeholder="粘贴该平台提供的完整 Key"><p class="hint">Key 仅保存到本机，不会回显。平台的余额和计费规则需以该平台为准。</p><p id="next-note" role="status"></p><button class="primary" type="submit">验证并保存连接</button><button type="button" id="next-close">关闭</button></form>';
document.body.append(nextDialog);nextConnect.onclick=()=>nextDialog.showModal();document.querySelector('#next-close').onclick=()=>nextDialog.close();nextDialog.addEventListener('close',()=>{document.querySelector('#next-key').value='';});
document.querySelector('#next-form').onsubmit=async event=>{event.preventDefault();const input=document.querySelector('#next-key'),button=event.target.querySelector('[type="submit"]'),note=document.querySelector('#next-note');button.disabled=true;note.textContent='正在检查 Key 和可用模型…';try{const result=await request('/api/settings/next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:input.value.trim()})});input.value='';note.textContent='连接成功，可访问 '+result.models.length+' 个模型。尚未启动生成或视频分析。';nextConnect.textContent='额度接口 · 已连接';}catch(error){note.textContent=error.message;}finally{button.disabled=false;}};
if(new URL(location.href).searchParams.get('setup')==='next')nextDialog.showModal();

personalRefresh().then(()=>{render();const p=personalProfile();if(p?.status==='generating')personalTask(()=>personalWait(p.id));}).catch(()=>{});

