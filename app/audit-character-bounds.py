import json
from pathlib import Path
from PIL import Image
from collections import deque
root=Path(__file__).resolve().parent
r=json.loads((root/'character-assets.json').read_text(encoding='utf-8'))
for key,a in r['atlases'].items():
 im=Image.open(root/('dist'+a['url'])).convert('RGB'); w,h=im.size
 mask=bytearray(w*h)
 for n,(red,g,b) in enumerate(im.getdata()):
  if min(red,g,b)<205 and (max(red,g,b)-min(red,g,b)>15 or max(red,g,b)<160):mask[n]=1
 components=[]
 for start in range(w*h):
  if not mask[start]:continue
  mask[start]=0;q=deque([start]);count=0;left=w;right=0;top=h;bottom=0;sx=sy=0
  while q:
   p=q.popleft();y,x=divmod(p,w);count+=1;sx+=x;sy+=y;left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
   for n in (p-1 if x else -1,p+1 if x<w-1 else -1,p-w if y else -1,p+w if y<h-1 else -1):
    if n>=0 and mask[n]:mask[n]=0;q.append(n)
  if count>1000:components.append((count,[max(0,left-3),max(0,top-3),min(w,right+4),min(h,bottom+4)],sx/count,sy/count))
 cells={}
 for count,box,cx,cy in components:
  cell=min(a['rows']-1,int(cy/(h/a['rows'])))*a['columns']+min(a['columns']-1,int(cx/(w/a['columns'])))
  if cell in cells:raise Exception(('duplicate',key,cell))
  cells[cell]=box
 print(key,len(cells),cells)
 for p in r['poses'].values():
  if p['atlas']==key:
   l,t,rr,bb=cells[p['cell']];p['bounds']=[l,t,rr-l,bb-t];p.pop('cropBottom',None)
(root/'character-assets.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'dist/character-atlases.js').write_text('const YOGA_CHARACTER_ASSETS='+json.dumps(r,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')


