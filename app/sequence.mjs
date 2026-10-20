import {MAX_ITEMS} from './limits.mjs';
import {identifyPose} from './pose-catalog.mjs';
const values = {
 base:['seated','standing','kneeling','hands_knees','hands_feet','prone','supine','unknown'],
 arms:['relaxed','both_up','one_up','support_straight','support_bent','palms_together','other','unknown'],
 legs:['together','wide','crossed','lunge_knee_down','lunge_knee_up','both_knees_down','one_extended','other','unknown'],
 spine:['neutral','fold','sidebend','twist','backbend','rounded','inverted_v','unknown'],
 side:['left','right','symmetric','unknown']
};
export function matchArtwork(p){
 const {base:b,arms:a,legs:l,spine:s}=p;
 // Rules inspect the observed shape; names never choose an illustration.
 if(b==='hands_feet'&&a==='support_straight'&&s==='inverted_v'&&l==='together')return 12;
 if(b==='hands_feet'&&a==='support_straight'&&s==='neutral'&&l==='together')return 10;
 if(b==='hands_knees'&&a==='support_straight'&&l==='both_knees_down'&&s==='rounded')return 9;
 if(b==='hands_knees'&&a==='support_straight'&&l==='both_knees_down'&&s==='backbend')return 8;
 if(b==='seated'&&l==='crossed'&&s==='neutral'&&a==='relaxed')return 0;
 if(b==='seated'&&l==='crossed'&&s==='neutral'&&a==='both_up'&&p.handsClasped===true)return 2;
 if(b==='seated'&&l==='crossed'&&s==='sidebend')return 3;
 if(b==='seated'&&l==='crossed'&&s==='twist')return 4;
 if(b==='seated'&&l==='one_extended'&&s==='fold')return 6;
 if(b==='standing'&&l==='lunge_knee_up'&&a==='palms_together'&&s==='neutral')return 15;
 if(b==='kneeling'&&l==='lunge_knee_down'&&a==='one_up'&&s==='neutral')return 14;
 if(b==='kneeling'&&l==='lunge_knee_down'&&a==='support_straight'&&s==='neutral')return 13;
 if(b==='kneeling'&&l==='both_knees_down'&&a==='relaxed'&&s==='neutral')return 21;
 if(b==='kneeling'&&l==='both_knees_down'&&a==='both_up'&&s==='neutral')return 22;
 if(b==='kneeling'&&l==='both_knees_down'&&a==='palms_together'&&s==='neutral')return 23;
 // Ambiguous backbends, knee/foot relationships and missing variants stay missing.
 return null;
}
export function parseSegment(data,{offset,duration}){
 if(data?.complete===true&&Array.isArray(data.items)&&data.items.length===0&&data.noExercise===true&&typeof data.reason==='string'&&data.reason.trim())return [];
 if(!data||!Array.isArray(data.items)||!data.items.length||data.items.length>80||data.complete!==true)throw Error('这段视频没有得到完整动作记录，请换更清晰的视频。');
 let last=-1;
 return data.items.map(p=>{
   if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||typeof p.evidence!=='string'||!p.evidence.trim()||typeof p.cue!=='string'||p.cue.length>80)throw Error('动作记录缺少依据或格式不完整。');
   if(hasCompoundActions({items:[p]}))throw Error('多个体式被合并为一项，未生成遗漏动作的结果。');
   if(!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end<p.start||p.start<last||p.end>duration+.5)throw Error('动作时间记录不正确，未输出错误顺序。');
   const shapeWarnings=[];const normalized={...p};
   for(const [key,allowed]of Object.entries(values))if(!allowed.includes(normalized[key])){normalized[key]='unknown';shapeWarnings.push(({base:'支撑方式',arms:'手臂姿态',legs:'腿部姿态',spine:'躯干方向',side:'侧别'})[key]+'未确认');}
   p=normalized;
   last=p.start;
   let side=p.side;
   const warnings=[...shapeWarnings,...(Array.isArray(p.uncertainties)?p.uncertainties.filter(x=>typeof x==='string').map(x=>x.slice(0,160)):[])];
   if((side==='left'||side==='right')&&(typeof p.sideEvidence!=='string'||!p.sideEvidence.trim())){side='unknown';warnings.push('左右缺少画面依据');}
   if(side==='symmetric'&&(/lunge/.test(p.legs)||/[左右](腿|手|脚|臂|膝)/.test(p.cue))){side='unknown';warnings.push('左右描述不一致');}
   // Even evidence is model-generated. Keep the exact description for internal audit.
   const posture={...p,side};
   const kind=matchArtwork(posture);
   if(side==='unknown')warnings.push('侧别未确认');
   if(kind===null)warnings.push('暂无匹配的原版插画');
   const name=side==='unknown'?p.name.trim().replace(/[左右](侧|腿|臂|手|脚|膝)/g,'$1'):p.name.trim();
   const cue=side==='unknown'&&/[左右](侧|腿|臂|手|脚|膝)/.test(p.cue)?'按原视频熟悉的动作练习':p.cue;
   return {id:crypto.randomUUID(),poseId:identifyPose(p.name,posture),name,time:offset+p.start,endTime:offset+Math.min(p.end,duration),
    side:({left:'左侧',right:'右侧',symmetric:'双侧',unknown:'侧别未确认'})[side],cue,kind,evidence:p.evidence,
    posture:{base:p.base,arms:p.arms,legs:p.legs,spine:p.spine,side,handsClasped:p.handsClasped===true},warnings};
 });
}
export function hasCompoundActions(data){return Array.isArray(data?.items)&&data.items.some(p=>typeof p.name==='string'&&/过渡到|再回|再到|转到|串联|→|转.*式|式.*再.*式/.test(p.name));}
export function mergeSegments(segments){
 const result=[];
 for(const segment of segments){
   for(let i=0;i<segment.length;i++){
     const item=segment[i],previous=result.at(-1);
     // Merge only a continuous pose across segment boundaries, never repetitions inside a segment.
     if(i===0&&previous&&Math.abs(item.time-previous.endTime)<1&&previous.name===item.name&&JSON.stringify(previous.posture)===JSON.stringify(item.posture)){
       previous.endTime=item.endTime;previous.warnings=[...new Set([...previous.warnings,...item.warnings])];
     }else result.push({...item});
   }
 }
 if(result.length>MAX_ITEMS)throw Error('动作记录超过排版容量，请分段处理这节课程。');
 return result;
}
