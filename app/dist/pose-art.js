'use strict';
// Code-drawn pose diagrams. They show the recorded geometry, not verified anatomy.
// Unknown details are dashed; an unknown body base is never replaced by a pose.
const YogaPoseArt=(()=>{
 const bases=['seated','standing','kneeling','hands_knees','hands_feet','prone','supine'];
 const valid={arms:['relaxed','both_up','one_up','support_straight','support_bent','palms_together'],legs:['together','wide','crossed','lunge_knee_down','lunge_knee_up','both_knees_down','one_extended'],spine:['neutral','fold','sidebend','twist','backbend','rounded','inverted_v']};
 const C={ink:'#51433f',skin:'#f3cfb7',top:'#dc9e9b',pants:'#a4b7a4',hair:'#52423e'};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const point=p=>p.join(',');
 function info(item){
  const p=item.posture||{};if(!bases.includes(p.base))return {drawable:false,uncertain:['身体支撑方式'],label:'姿态待确认'};
  const uncertain=Object.entries(valid).filter(([k,a])=>!a.includes(p[k])).map(([k])=>({arms:'手臂',legs:'腿部',spine:'躯干'})[k]);
  return {drawable:true,uncertain,label:uncertain.length?'局部待确认':'人物姿态示意'};
 }
 function geometry(p){
  let neck=[85,56],hip=[85,103],head=[85,40],legs=[[[84,105],[70,125],[69,147]],[[87,105],[102,125],[102,147]]],arms;
  if(p.base==='seated'){
   neck=[85,66];hip=[85,112];head=[85,50];
   legs=p.legs==='one_extended'?[[[85,112],[109,135],[151,137]],[[85,112],[55,134],[95,140]]]:p.legs==='wide'?[[[85,112],[48,129],[15,142]],[[85,112],[119,130],[153,142]]]:p.legs==='together'?[[[81,112],[112,136],[151,137]],[[89,112],[118,143],[153,144]]]:[[[85,112],[49,137],[103,142]],[[85,112],[121,137],[66,144]]];
  }
  if(p.base==='kneeling'){
   neck=[86,60];hip=[86,105];head=[86,44];
   legs=[[[82,106],[72,139],[111,145]],[[91,106],[96,137],[129,143]]];
   if(p.legs==='lunge_knee_down'||p.legs==='lunge_knee_up')legs=[[[86,104],[51,111],[45,145]],[[86,104],[118,139],[151,145]]];
   if(p.legs==='one_extended'||p.legs==='wide')legs=[[[85,106],[73,140],[100,145]],[[86,106],[120,130],[153,144]]];
  }
  if(p.base==='standing'&&(p.legs==='lunge_knee_up'||p.legs==='lunge_knee_down'))legs=[[[85,104],[49,109],[42,146]],[[85,104],[119,124],[144,146]]];
  else if(p.base==='standing'&&p.legs==='wide')legs=[[[82,103],[59,126],[38,147]],[[88,103],[110,126],[131,147]]];
  else if(p.base==='standing'&&p.legs==='together')legs=[[[82,104],[80,125],[77,147]],[[90,104],[93,125],[95,147]]];
  if(['standing','seated','kneeling'].includes(p.base)){
   if(p.spine==='sidebend'){neck=[hip[0]-23,hip[1]-39];head=[neck[0]-7,neck[1]-14];}
   if(p.spine==='backbend'){neck=[hip[0]+17,hip[1]-38];head=[neck[0]+8,neck[1]-13];}
   if(p.spine==='fold'){neck=[hip[0]-35,hip[1]+10];head=[neck[0]-12,neck[1]+9];}
  }
  if(p.base==='hands_knees'){
   hip=[111,91];neck=[55,p.spine==='rounded'?88:81];head=[39,p.spine==='rounded'?97:72];
   legs=[[[111,94],[113,139],[148,144]],[[108,96],[99,134],[132,140]]];
   arms=[[[56,88],[53,116],[49,141]],[[62,89],[64,117],[64,141]]];
   if(p.legs==='one_extended')legs[1]=[[109,93],[136,89],[158,84]];
   if(p.arms==='one_up')arms[1]=[[57,86],[34,68],[12,58]];
  }
  if(p.base==='hands_feet'){
   const dog=p.spine==='inverted_v';hip=dog?[103,67]:[105,107];neck=dog?[66,111]:[53,91];head=dog?[52,120]:[37,87];
   legs=dog?[[[104,69],[124,105],[143,142]],[[110,71],[133,107],[152,142]]]:[[[105,107],[128,125],[151,142]],[[105,112],[125,130],[143,144]]];
   arms=dog?[[[65,111],[44,130],[24,142]],[[70,113],[52,133],[37,145]]]:[[[55,96],[49,119],[46,143]],[[61,98],[63,122],[63,144]]];
   if(p.arms==='support_bent')arms=[[[55,96],[76,124],[42,137]],[[61,99],[83,130],[56,141]]];
  }
  if(p.base==='prone'){
   const up=p.spine==='backbend';hip=[103,134];neck=up?[66,91]:[53,129];head=up?[57,75]:[35,128];
   legs=[[[103,134],[128,137],[153,140]],[[104,138],[126,144],[151,147]]];
   arms=up?[[[65,97],[65,121],[54,142]],[[71,100],[78,125],[73,143]]]:[[[57,130],[41,139],[20,141]],[[61,134],[46,148],[23,149]]];
  }
  if(p.base==='supine'){
   hip=[94,134];neck=[54,135];head=[35,131];
   legs=[[[93,134],[122,137],[154,140]],[[94,139],[123,144],[153,146]]];
   arms=[[[58,131],[76,125],[98,120]],[[56,139],[74,147],[99,149]]];
   if(p.legs==='both_knees_down'||p.legs==='crossed')legs=[[[95,135],[119,109],[132,143]],[[92,136],[108,115],[117,146]]];
   if(p.legs==='one_extended')legs[0]=[[94,134],[111,104],[104,82]];
   if(p.spine==='inverted_v')legs=[[[94,133],[105,104],[107,75]],[[100,134],[116,106],[119,78]]];
   if(p.spine==='backbend'){hip=[96,110];legs=[[[96,111],[120,111],[132,145]],[[99,116],[113,117],[120,147]]];}
  }
  if(!arms){
   const s=[neck[0],neck[1]+8];
   arms=[[[s[0]-6,s[1]],[s[0]-17,s[1]+23],[s[0]-24,s[1]+42]],[[s[0]+6,s[1]],[s[0]+17,s[1]+23],[s[0]+24,s[1]+42]]];
   if(p.arms==='both_up')arms=[[[s[0]-6,s[1]],[s[0]-16,s[1]-22],[s[0]-14,s[1]-45]],[[s[0]+6,s[1]],[s[0]+16,s[1]-22],[s[0]+14,s[1]-45]]];
   if(p.arms==='one_up')arms[1]=[[s[0]+6,s[1]],[s[0]+22,s[1]-20],[s[0]+20,s[1]-44]];
   if(p.arms==='palms_together')arms=[[[s[0]-6,s[1]],[s[0]-19,s[1]+17],[s[0],s[1]+13]],[[s[0]+6,s[1]],[s[0]+19,s[1]+17],[s[0],s[1]+13]]];
   if(p.arms==='support_straight'||p.arms==='support_bent')arms=[[[s[0]-6,s[1]],[s[0]-20,121],[s[0]-25,143]],[[s[0]+6,s[1]],[s[0]+25,121],[s[0]+30,143]]];
  }
  // Seated folding hands reach along the mat rather than through the legs.
  if(p.base==='seated'&&p.spine==='fold')arms=[[[neck[0],neck[1]+5],[83,133],[121,139]],[[neck[0]+5,neck[1]+9],[89,140],[130,145]]];
  return {neck,hip,head,legs,arms};
 }
 function limb(points,color,width,uncertain){
  const d='M'+point(points[0])+' Q'+point(points[1])+' '+point(points[2]);
  return `<g${uncertain?' opacity=".42" stroke-dasharray="3 4"':''}><path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${width+2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/></g>`;
 }
 function render(item){
  const status=info(item);if(!status.drawable)return null;
  const p=item.posture,g=geometry(p),{neck:n,hip:h,head:head}=g;
  const dx=h[0]-n[0],dy=h[1]-n[1],len=Math.hypot(dx,dy),vx=dy/len*9,vy=-dx/len*9;
  const torso=`M${n[0]-vx},${n[1]-vy+6} Q${n[0]+dx*.45-vx*1.15},${n[1]+dy*.45-vy} ${h[0]-vx*.85},${h[1]-vy*.85} Q${h[0]},${h[1]+6} ${h[0]+vx*.85},${h[1]+vy*.85} Q${n[0]+dx*.45+vx*1.15},${n[1]+dy*.45+vy} ${n[0]+vx},${n[1]+vy+6} Z`;
  const legsUnknown=!valid.legs.includes(p.legs),armsUnknown=!valid.arms.includes(p.arms),spineUnknown=!valid.spine.includes(p.spine);
  const feet=g.legs.map(l=>`<path d="M${point(l[2])} l8,0" stroke="${C.skin}" stroke-width="5" stroke-linecap="round"${legsUnknown?' opacity=".3"':''}/>`).join('');
  const angle=Math.atan2(n[0]-head[0],n[1]-head[1])*180/Math.PI;
  return `<svg width="150" height="140" viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(item.name||'动作')}，${status.label}" data-illustration="pose-diagram"><title>${esc(item.name||'动作')} · 人物示意，未经体式核验</title><ellipse cx="86" cy="151" rx="70" ry="5" fill="#e9e5da"/><path d="M12 147 Q85 141 159 147 L151 153 L18 153 Z" fill="#dbe3d6"/>${limb(g.arms[1],C.skin,6,armsUnknown)}${limb(g.legs[1],C.pants,11,legsUnknown)}${limb(g.legs[0],C.pants,12,legsUnknown)}${feet}<path d="${torso}" fill="${C.top}" stroke="${C.ink}" stroke-width="1.7"${spineUnknown?' opacity=".4" stroke-dasharray="3 3"':''}/>${p.spine==='twist'?`<path d="M${n[0]-5},${n[1]+18} Q${h[0]+13},${h[1]-13} ${h[0]-3},${h[1]}" fill="none" stroke="#b97e7e" stroke-width="2"/>`:''}${limb(g.arms[0],C.skin,6,armsUnknown)}<g transform="translate(${point(head)}) rotate(${-angle})"><circle cx="6" cy="-10" r="7" fill="${C.hair}"/><ellipse cy="1" rx="13" ry="15" fill="${C.skin}" stroke="${C.ink}" stroke-width="1.5"/><path d="M-13,1 Q-17,-19 0,-16 Q15,-16 13,1 Q7,-3 4,-10 Q-2,-4 -13,1Z" fill="${C.hair}"/><path d="M-6,4 l2,0 M5,4 l2,0" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round"/><path d="M-2,9 q3,2 5,-1" stroke="#b57d74" stroke-width="1" fill="none"/><ellipse cx="-8" cy="7" rx="2.5" ry="1.4" fill="#e9a6a0"/><ellipse cx="9" cy="7" rx="2.5" ry="1.4" fill="#e9a6a0"/></g>${status.uncertain.length?`<text x="85" y="165" text-anchor="middle" fill="#8a7569" font-size="6">虚线：${esc(status.uncertain.join('、'))}待确认</text>`:''}</svg>`;
 }
 return {render,info};
})();
