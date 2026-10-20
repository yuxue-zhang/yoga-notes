import {embeddedJSON} from './bilibili.mjs';
const response=await fetch('https://www.bilibili.com/video/BV1Kq4y1H76Y/',{redirect:'error',signal:AbortSignal.timeout(20000)});
const html=await response.text();const parsed={};for(const name of ['__playinfo__','__INITIAL_STATE__']){try{parsed[name]=Object.keys(embeddedJSON(html,name));}catch(e){parsed[name]=e.message;}}
console.log(JSON.stringify({status:response.status,contentType:response.headers.get('content-type'),length:html.length,hasPlayback:html.includes('__playinfo__'),hasMetadata:html.includes('__INITIAL_STATE__'),playbackSyntax:html.slice(Math.max(0,html.indexOf('__playinfo__')-30),html.indexOf('__playinfo__')+160),title:html.match(/<title>(.*?)<\/title>/s)?.[1],parsed}));
