from pathlib import Path
import sys,subprocess
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root/'.tools'))
import imageio_ffmpeg
from PIL import Image,ImageDraw
ff=imageio_ffmpeg.get_ffmpeg_exe()
media=root/'test-media'
def run(args): subprocess.run([ff,'-y',*args],check=True,capture_output=True)
run(['-ss','21','-i',str(media/'yoga-series-original.webm'),'-t','9','-an','-c:v','libvpx-vp9','-crf','30','-b:v','0',str(media/'yoga-series-hd.webm')])
run(['-i',str(media/'yoga-series-hd.webm'),'-vf','scale=-2:240','-an','-c:v','libvpx-vp9','-crf','30','-b:v','0',str(media/'yoga-series-low.webm')])
frames=media/'comparison-frames';frames.mkdir(exist_ok=True)
run(['-i',str(media/'yoga-series-hd.webm'),'-vf','fps=2,scale=640:-1',str(frames/'frame-%02d.png')])
files=sorted(frames.glob('*.png'));sheet=Image.new('RGB',(640*3,390*((len(files)+2)//3)),'white');draw=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
 x,y=i%3*640,i//3*390;sheet.paste(Image.open(f).convert('RGB'),(x,y+30));draw.text((x+10,y+6),f'clip ~{i*.5+.25:.2f}s / source ~{21+i*.5+.25:.2f}s',fill='black')
sheet.save(media/'comparison-contact.jpg')
print({f.name:f.stat().st_size for f in [media/'yoga-series-hd.webm',media/'yoga-series-low.webm']})
