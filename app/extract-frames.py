from pathlib import Path
import sys, subprocess
root = Path(__file__).resolve().parent
sys.path.insert(0, str(root / '.tools'))
import imageio_ffmpeg
from PIL import Image, ImageDraw
folder = root / 'test-media' / 'frames'
input_name = sys.argv[1] if len(sys.argv)>1 else 'surya-namaskar.webm'
prefix = Path(input_name).stem
folder = root / 'test-media' / (prefix+'-frames')
folder.mkdir(exist_ok=True)
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-i', str(root/'test-media'/input_name), '-vf', 'fps=1/3,scale=480:-1', str(folder/'frame-%02d.png')], check=True, capture_output=True)
files = sorted(folder.glob('frame-*.png'))
sheet = Image.new('RGB',(384*4,318*((len(files)+3)//4)),'white')
draw = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    x,y=(i%4)*384,(i//4)*318
    im=Image.open(f).convert('RGB'); im.thumbnail((384,288)); sheet.paste(im,(x,y+28))
    draw.text((x+8,y+6),f'frame {i+1} (~{i*3+1.5:.1f}s)',fill='black')
sheet.save(root/('test-media/'+prefix+'-contact-sheet.jpg'))
print(f'Extracted {len(files)} frames')
