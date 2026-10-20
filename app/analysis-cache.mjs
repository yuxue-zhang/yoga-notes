import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseSegment,mergeSegments} from './sequence.mjs';
export async function partialFromCache(directory,source){
 const segments=[],nonPracticeSegments=[],usage={prompt_tokens:0,completion_tokens:0,total_tokens:0};let processedDuration=0;
 for(let i=0;i<90;i++){
  let record,parsed;
  try{
   record=JSON.parse(await readFile(join(directory,`analysis-${i}.json`),'utf8'));
   if(record.version!==1||record.offset!==i*60||!Number.isFinite(record.length)||record.length<=0||record.length>60||!record.attempts?.length)break;
   const answer=record.attempts.at(-1);
   parsed=parseSegment(answer.parsed,{offset:record.offset,duration:record.length});
   if(!parsed.length)nonPracticeSegments.push({time:record.offset,endTime:record.offset+record.length,reason:answer.parsed.reason.slice(0,160)});
  }catch{break;}
  segments.push(parsed);processedDuration=record.offset+record.length;
  for(const attempt of record.attempts)for(const key of Object.keys(usage))usage[key]+=Number(attempt.usage?.[key])||0;
 }
 const items=mergeSegments(segments);if(!items.length)return null;
 return {title:source||'我的瑜伽练习',source,artworkVersion:2,demo:false,reference:false,draft:true,partial:true,processedDuration,completedSegments:segments.length,items,usage,nonPracticeSegments,
  missingArtwork:items.filter(p=>p.kind===null).length,uncertainItems:items.filter(p=>p.warnings.length).length,
  note:`仅包含视频前 ${Math.floor(processedDuration/60)} 分 ${Math.round(processedDuration%60)} 秒的已完成内容，剩余课程尚未处理。自动记录可能有识别错误，插画为图库参考，缺图与未确认侧别已标明。`};
}
