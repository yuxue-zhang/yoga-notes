import {writeFile,readFile} from 'node:fs/promises';
const source='https://www.yogajournal.com/pose-finder/pose-finder?scope=anon';
// Descriptions are original, concise visual identification notes, not teaching instructions.
// Chinese aliases vary between schools. Blank Sanskrit is intentional for descriptive variants.
const rows=`
mountain|山式|Mountain Pose|Tadasana|站姿|standing|relaxed|together|neutral|双脚站立，躯干直立，双臂自然垂落|区别于双臂上举的展臂式
upward-salute|展臂式|Upward Salute|Urdhva Hastasana|站姿|standing|both_up|together|neutral|站立，双臂伸向头顶上方|双手是否合十或交扣需单独确认
standing-sidebend|站姿侧伸展|Standing Side Bend||站姿|standing|one_up|together|sidebend|双脚站立，躯干向一侧延展|不得与站姿扭转混为一项
standing-fold|站立前屈|Standing Forward Bend|Uttanasana|站姿|standing|other|together|fold|站立髋部折叠，躯干靠近腿部|屈膝与伸膝、手掌落点分别记录
half-standing-fold|站立半前屈|Standing Half Forward Bend|Ardha Uttanasana|站姿|standing|other|together|fold|髋部折叠，躯干伸展至近水平位置|区别于躯干贴腿的深前屈
wide-standing-fold|双角式|Wide-Legged Forward Bend|Prasarita Padottanasana|站姿|standing|other|wide|fold|双脚宽分，躯干向前下方折叠|手撑地、抱踝、手背后交扣为不同变体
pyramid|加强侧伸展式|Pyramid Pose|Parsvottanasana|站姿|standing|other|other|fold|双腿前后分开，躯干向前腿折叠|区别于前膝明显弯曲的弓步
chair|幻椅式|Chair Pose|Utkatasana|站姿|standing|both_up|together|neutral|双膝弯曲，髋部向后，躯干上提|双臂举起与胸前合十分别记录
revolved-chair|扭转幻椅式|Revolved Chair||站姿|standing|palms_together|together|twist|屈膝的幻椅姿态中躯干扭转|不可仅凭名称指定肘部与膝部接触
high-lunge|高弓步|High Lunge||站姿|standing|other|lunge_knee_up|neutral|前膝弯曲，后膝离地，双脚前后分开|后脚跟抬起，区别于战士一式常见后脚落地形态
crescent-lunge|高弓步双臂上举|Crescent Lunge||站姿|standing|both_up|lunge_knee_up|neutral|高弓步，双臂向头顶上方伸展|不能替用后膝落地的低弓步插画
high-lunge-prayer|高弓步胸前合十|High Lunge with Prayer Hands||站姿|standing|palms_together|lunge_knee_up|neutral|高弓步保持，双掌在胸前合拢|区别于双臂举过头顶
revolved-high-lunge|扭转高弓步|Revolved High Lunge||站姿|standing|other|lunge_knee_up|twist|后膝离地的弓步中躯干扭转|落膝扭转另建变体
warrior-1|战士一式|Warrior I|Virabhadrasana I|站姿|standing|both_up|lunge_knee_up|neutral|前膝弯曲，后腿伸展，双臂上举|与高弓步的后脚位置及骨盆朝向不同
warrior-2|战士二式|Warrior II|Virabhadrasana II|站姿|standing|other|lunge_knee_up|neutral|前膝弯曲，双臂向身体两侧平展|区别于躯干朝前腿的战士一式
reverse-warrior|反战士式|Reverse Warrior||站姿|standing|one_up|lunge_knee_up|sidebend|战士二式腿部基础，前侧手臂上伸并侧展|前膝仍弯曲，勿替用三角式
triangle|三角伸展式|Extended Triangle|Utthita Trikonasana|站姿|standing|one_up|wide|sidebend|双腿分开伸展，躯干侧展，一臂上伸|区别于前膝弯曲的侧角伸展
revolved-triangle|扭转三角式|Revolved Triangle|Parivrtta Trikonasana|站姿|standing|one_up|wide|twist|双腿伸展的前后开立姿态中躯干扭转|不能仅靠屏幕左右判断扭转方向
side-angle|侧角伸展式|Extended Side Angle|Utthita Parsvakonasana|站姿|standing|one_up|lunge_knee_up|sidebend|前膝弯曲，躯干向前腿一侧延展|前臂放大腿与手撑地为不同变体
revolved-side-angle|扭转侧角式|Revolved Side Angle|Parivrtta Parsvakonasana|站姿|standing|other|lunge_knee_up|twist|弓步基础中躯干向前腿方向扭转|掌合十与单臂上伸分别记录
goddess|女神式|Goddess Pose||站姿|standing|other|wide|neutral|双脚宽分，双膝弯曲，躯干直立|手臂仙人掌形、上举、合十分别记录
garland|花环式|Garland Pose|Malasana|站姿|standing|palms_together|wide|neutral|双脚分开深蹲，骨盆接近地面|支撑物与脚跟是否落地不可猜测
tree|树式|Tree Pose|Vrksasana|站立平衡|standing|other|other|neutral|单脚站立，另一腿屈膝向外打开|足底位置与双手姿态需单独确认
eagle|鹰式|Eagle Pose|Garudasana|站立平衡|standing|other|crossed|neutral|单腿承重，双腿交绕，常见双臂交绕|腿未完全缠绕也是变体，不能强配
warrior-3|战士三式|Warrior III|Virabhadrasana III|站立平衡|standing|other|one_extended|neutral|单脚支撑，上身前倾，另一腿向后延展|手臂向前、向后或合十分开记录
half-moon|半月式|Half Moon|Ardha Chandrasana|站立平衡|standing|one_up|one_extended|neutral|单脚及一手支撑，躯干打开，另一腿抬起|手是否使用砖块需从画面确认
revolved-half-moon|扭转半月式|Revolved Half Moon|Parivrtta Ardha Chandrasana|站立平衡|standing|one_up|one_extended|twist|单腿支撑并抬起另一腿，躯干扭转|与半月式的骨盆和胸廓朝向不同
dancer|舞王式|Lord of the Dance|Natarajasana|站立平衡|standing|other|other|backbend|单脚站立，一腿向后屈起并由手抓持|双手与单手抓脚不是同一变体
hand-big-toe|手抓大脚趾伸展式|Extended Hand-to-Big-Toe|Utthita Hasta Padangusthasana|站立平衡|standing|other|one_extended|neutral|单脚站立，另一腿向前或向侧伸展并被手抓持|向前与向侧为不同变体
standing-split|站立劈叉|Standing Split|Urdhva Prasarita Eka Padasana|站立平衡|standing|support_straight|one_extended|fold|躯干向支撑腿前屈，另一腿向上抬起|区别于躯干近水平的战士三式
easy|简易坐|Easy Pose|Sukhasana|坐姿|seated|relaxed|crossed|neutral|双腿舒适交叉，坐骨着地，躯干直立|不把普通交叉腿误判为莲花坐
staff|手杖式|Staff Pose|Dandasana|坐姿|seated|relaxed|together|neutral|坐骨着地，双腿向前伸展，躯干直立|与坐姿前屈分开
lotus|莲花坐|Lotus Pose|Padmasana|坐姿|seated|relaxed|crossed|neutral|双腿交盘，双足分别置于对侧大腿上|脚部遮挡时不能仅凭盘腿判断莲花
half-lotus|半莲花坐|Half Lotus|Ardha Padmasana|坐姿|seated|relaxed|crossed|neutral|仅一只脚放在对侧大腿上的交盘坐姿|区别于双脚均在小腿下的简易坐
seated-arms-up|简易坐双臂上举|Easy Seat with Raised Arms||坐姿|seated|both_up|crossed|neutral|交叉腿坐姿，双臂上举|十指交扣需另有手部证据
seated-clasp-up|简易坐十指交扣上伸|Easy Seat with Clasped Hands||坐姿|seated|both_up|crossed|neutral|交叉腿坐姿，十指交扣后向上伸展|只在手部可见交扣时匹配原版图
seated-sidebend|坐姿侧伸展|Seated Side Bend||坐姿|seated|one_up|crossed|sidebend|坐姿基础中躯干向一侧延展|左右及支撑手单独记录
seated-twist|简易坐扭转|Easy Seated Twist||坐姿|seated|other|crossed|twist|交叉腿坐姿中胸廓转向一侧|不能与侧屈混淆
seated-fold|坐姿前屈|Seated Forward Bend|Paschimottanasana|坐姿|seated|other|together|fold|双腿向前伸展，上身从髋部向前折叠|是否屈膝、抓脚都属于变体
head-knee|单腿背部伸展式|Head-to-Knee Pose|Janu Sirsasana|坐姿|seated|other|one_extended|fold|一腿伸直，另一腿向内弯曲，上身前屈|又称头碰膝式；头未接触膝也可属于该体式形态
revolved-head-knee|扭转头碰膝式|Revolved Head-to-Knee|Parivrtta Janu Sirsasana|坐姿|seated|one_up|one_extended|sidebend|一腿伸展，另一腿弯曲，躯干向伸展腿侧展|区别于朝伸直腿正向折叠
wide-seated-fold|坐角式|Wide-Angle Seated Forward Bend|Upavistha Konasana|坐姿|seated|other|wide|fold|坐姿双腿向两侧分开，上身向前折叠|不与站姿分腿前屈混用
bound-angle|束角式|Bound Angle|Baddha Konasana|坐姿|seated|other|other|neutral|坐姿屈膝外展，双脚脚底相对|直立与前屈为不同变体
bound-angle-fold|束角前屈|Bound Angle Forward Fold||坐姿|seated|other|other|fold|脚底相对，双膝向外，上身向前折叠|区别于简易盘腿前屈
cow-face|牛面式|Cow Face|Gomukhasana|坐姿|seated|other|other|neutral|双膝交叠的坐姿，常见双臂在背后抓持|牛面腿与牛面手可分别出现
fire-log|方块式|Fire Log|Agnistambhasana|坐姿|seated|other|other|neutral|两侧小腿前后平行叠放的坐姿|又称双鸽式；不是普通交叉腿
half-spinal-twist|半鱼王式|Half Lord of the Fishes|Ardha Matsyendrasana|坐姿|seated|other|other|twist|坐姿一脚跨过另一腿，躯干扭转|与双腿交叉的简易坐扭转分开
bharadvaja|巴拉瓦伽扭转式|Bharadvaja's Twist|Bharadvajasana I|坐姿|seated|other|other|twist|双腿折向身体一侧，躯干扭转|双腿位置是区别于其他坐姿扭转的关键
marichi-1|圣哲玛里琪一式|Marichi I|Marichyasana I|坐姿|seated|other|one_extended|fold|一腿伸展，一膝屈起，上身前屈并可绕臂|绕臂动作需画面证据
marichi-3|圣哲玛里琪三式|Marichi III|Marichyasana III|坐姿|seated|other|one_extended|twist|一腿伸展，一膝屈起，躯干扭转|区别于玛里琪一式的前屈
heron|苍鹭式|Heron|Krounchasana|坐姿|seated|other|one_extended|neutral|坐姿一腿折回，另一腿向上伸展并由手抓持|不能将普通抱腿误配为伸膝苍鹭
boat|船式|Boat Pose|Paripurna Navasana|核心与支撑|seated|other|other|neutral|坐骨附近承重，上身与抬起双腿形成V形|屈膝、直腿分别记录
half-boat|半船式|Half Boat|Ardha Navasana|核心与支撑|supine|other|together|rounded|上背与双腿离地，躯干较低接近垫面|区别于坐骨承重的高船式
thunderbolt|金刚坐|Thunderbolt|Vajrasana|跪姿|kneeling|relaxed|both_knees_down|neutral|双膝着地，臀部坐向脚跟|脚在臀下，区别于双脚分开臀坐地面的英雄式
hero|英雄坐|Hero Pose|Virasana|跪姿|kneeling|relaxed|both_knees_down|neutral|双膝着地，小腿分在髋部两旁，骨盆在两脚之间|与金刚坐不可仅按跪坐名称互换
kneeling-arms-up|跪坐双臂上举|Kneeling Seat with Raised Arms||跪姿|kneeling|both_up|both_knees_down|neutral|跪坐姿态中双臂伸向头顶|脚部、手部细节分别确认
kneeling-prayer|跪坐合十|Kneeling Prayer||跪姿|kneeling|palms_together|both_knees_down|neutral|跪坐，双手在胸前合十|不推断吸气或呼气
gate|门闩式|Gate Pose|Parighasana|跪姿|kneeling|one_up|one_extended|sidebend|一膝着地，另一腿向侧面伸展，上身侧屈|不能将双膝跪地侧屈匹配到门闩式
kneeling-sidebend|双膝跪姿侧屈|Kneeling Side Bend||跪姿|kneeling|one_up|both_knees_down|sidebend|双膝跪地，躯干侧展，一臂向上延伸|区别于单腿向侧伸直的门闩式
tabletop|四点支撑|Tabletop||跪姿|hands_knees|support_straight|both_knees_down|neutral|双手双膝着地，背部近中立位|不是膝盖悬空的熊式支撑
cat|猫式|Cat Pose|Marjaryasana|跪姿|hands_knees|support_straight|both_knees_down|rounded|四点支撑中背部向上拱起|与背部下沉的牛式分开记录
cow|牛式|Cow Pose|Bitilasana|跪姿|hands_knees|support_straight|both_knees_down|backbend|四点支撑中胸廓向前展开、背部下沉|猫牛属于两个不同体式形态
bird-dog|四点支撑对侧伸展|Bird Dog||跪姿|hands_knees|one_up|one_extended|neutral|手膝支撑中一臂与对侧腿离地伸展|同侧伸展与对侧伸展不能混用
tiger|虎式|Tiger Pose||跪姿|hands_knees|support_straight|one_extended|backbend|手膝支撑中单腿向后上方抬起|屈膝抬腿、伸膝抬腿、手抓脚为不同变体
child|婴儿式|Child's Pose|Balasana|跪姿|kneeling|other|both_knees_down|fold|跪姿臀部靠近脚跟，躯干向前下方休息|手臂前伸与置于体侧分开记录
wide-child|宽膝婴儿式|Wide-Knee Child's Pose||跪姿|kneeling|other|wide|fold|双膝分开，臀部向脚跟，躯干向下折叠|宽膝与并膝不能只用同一张腿部图
puppy|融心式|Extended Puppy|Uttana Shishosana|跪姿|hands_knees|support_straight|both_knees_down|fold|双膝着地且髋部保持抬高，胸部向垫面延展|与臀部后坐的婴儿式不同
thread-needle|穿针引线式|Thread the Needle||跪姿|hands_knees|other|both_knees_down|twist|跪姿支撑中一臂穿向另一臂下方，肩部靠近垫面|手掌、肩部、头部支撑需可见证据
low-lunge-ground|低弓步双手撑地|Low Lunge, Hands Down||跪姿|kneeling|support_straight|lunge_knee_down|neutral|前脚着地，后膝落地，双手撑地|不能替用后膝悬空的高弓步
low-lunge|低弓步|Low Lunge|Anjaneyasana|跪姿|kneeling|both_up|lunge_knee_down|neutral|前膝弯曲、后膝着地，躯干向上延展|常见上举手臂，单臂变体单独记录
low-lunge-one-arm|低弓步单臂上举|Low Lunge, One Arm Up||跪姿|kneeling|one_up|lunge_knee_down|neutral|后膝着地的弓步中仅一臂上举|另一只手的位置仍需确认
revolved-low-lunge|扭转低弓步|Revolved Low Lunge||跪姿|kneeling|other|lunge_knee_down|twist|后膝着地的低弓步中胸廓扭转|与后膝悬空的扭转高弓步分开
half-split|半神猴式|Half Split|Ardha Hanumanasana|跪姿|kneeling|support_straight|one_extended|fold|一膝着地，另一腿向前伸展，髋部后移|与前膝弯曲的低弓步不同
camel|骆驼式|Camel|Ustrasana|后弯与俯卧|kneeling|other|both_knees_down|backbend|高跪姿胸廓后展，常见双手向后抓脚跟|手扶骨盆与抓脚跟为不同变体
sphinx|狮身人面式|Sphinx||后弯与俯卧|prone|support_bent|together|backbend|俯卧，双前臂着地支撑上身|又称人面狮身式；不能用直臂眼镜蛇插画代替
cobra|眼镜蛇式|Cobra|Bhujangasana|后弯与俯卧|prone|other|together|backbend|俯卧，双手撑地，胸部抬起，骨盆与腿接近地面|小眼镜蛇、伸臂眼镜蛇与上犬分开
upward-dog|上犬式|Upward-Facing Dog|Urdhva Mukha Svanasana|后弯与俯卧|hands_feet|support_straight|together|backbend|双手与脚背支撑，胸廓上提，大腿离地|大腿离地是与常见眼镜蛇形态的关键区别
locust|蝗虫式|Locust|Salabhasana|后弯与俯卧|prone|other|together|backbend|腹部附近承重，胸部或双腿抬离垫面|双臂后伸、侧展、前伸分别记录
bow|弓式|Bow|Dhanurasana|后弯与俯卧|prone|other|other|backbend|俯卧屈膝，双手抓脚踝，胸腿向上抬起|不能把未抓脚的蝗虫屈膝变体误配
half-frog|半蛙式|Half Frog|Ardha Bhekasana|后弯与俯卧|prone|other|other|backbend|俯卧，一侧膝弯曲，同侧手抓持脚部|与宽膝趴姿青蛙拉伸不是同一动作
crocodile|鳄鱼休息式|Crocodile Rest|Makarasana|后弯与俯卧|prone|relaxed|wide|neutral|俯卧放松，前臂或双手可承托额头|手部、额头落点及双腿宽度需区分
corpse|挺尸式|Corpse|Savasana|仰卧与放松|supine|relaxed|wide|neutral|仰卧，双臂双腿自然展开，身体贴近垫面|区别于膝盖屈起的仰卧休息
constructive-rest|仰卧屈膝休息|Constructive Rest||仰卧与放松|supine|relaxed|other|neutral|仰卧双膝弯曲，双脚踩地|不是桥式，骨盆没有明确抬起
knees-chest|仰卧双膝抱胸|Knees to Chest|Apanasana|仰卧与放松|supine|other|other|rounded|仰卧，双膝收向胸部，双手抱腿|双腿与单腿抱膝分别记录
single-knee-chest|仰卧单膝抱胸|Single Knee to Chest||仰卧与放松|supine|other|one_extended|neutral|仰卧，一膝抱向胸部，另一腿伸展|伸展腿也可能屈膝，需按画面分变体
happy-baby|快乐婴儿式|Happy Baby|Ananda Balasana|仰卧与放松|supine|other|wide|neutral|仰卧，双膝向身体两侧弯曲，双手抓持脚部|抓大腿或绑带辅助不冒认为抓脚
reclined-bound-angle|仰卧束角式|Reclining Bound Angle|Supta Baddha Konasana|仰卧与放松|supine|relaxed|other|neutral|仰卧，双膝外展，脚底相对|与双脚踩地的仰卧屈膝不同
reclined-figure-four|仰卧四字伸展|Reclined Figure Four||仰卧与放松|supine|other|crossed|neutral|仰卧，一脚踝搭在对侧大腿，腿部形成四字形|与仰卧束角的双脚相对不同
reclined-twist|仰卧扭转|Reclined Spinal Twist||仰卧与放松|supine|other|other|twist|肩背仰卧，双腿或屈膝转向一侧|单腿、双腿以及手臂开合分别记录
reclined-big-toe|仰卧手抓大脚趾式|Reclining Hand-to-Big-Toe|Supta Padangusthasana|仰卧与放松|supine|other|one_extended|neutral|仰卧，一腿上抬伸展，由手或带子抓持|手抓脚与绑带辅助不能合为一图
bridge|桥式|Bridge|Setu Bandha Sarvangasana|仰卧与放松|supine|other|other|backbend|仰卧屈膝双脚踩地，骨盆抬起，肩背承重|双手交扣、体侧、扶腰分别记录
supported-bridge|支撑桥式|Supported Bridge||仰卧与放松|supine|relaxed|other|backbend|桥式形态中骶骨附近由道具承托|没有看见道具时不能推断支撑桥式
fish|鱼式|Fish|Matsyasana|仰卧与放松|supine|support_bent|together|backbend|仰卧基础中胸廓上提，背部后展|头颈位置与腿部变体需单独确认
reclined-hero|仰卧英雄式|Reclining Hero|Supta Virasana|仰卧与放松|supine|other|both_knees_down|backbend|英雄坐腿部形态中上身向后仰卧|与双膝抱胸、金刚坐后仰分开
legs-wall|靠墙倒箭式|Legs Up the Wall|Viparita Karani|仰卧与放松|supine|relaxed|together|neutral|仰卧，双腿向上靠墙，骨盆靠近墙面|须看见墙或支撑，不凭抬腿推断
supine-legs-up|仰卧双腿上举|Supine Raised Legs||仰卧与放松|supine|relaxed|together|neutral|仰卧，双腿向上伸展，无明确靠墙证据|与靠墙倒箭式、肩倒立分开
plank|平板支撑|Plank||核心与支撑|hands_feet|support_straight|together|neutral|双手与前脚掌支撑，双膝离地，躯干近直线|前臂支撑与直臂支撑分开
forearm-plank|前臂平板支撑|Forearm Plank||核心与支撑|hands_feet|support_bent|together|neutral|双前臂与前脚掌支撑，躯干近直线|不能替用直臂平板图片
four-limbed-staff|四柱支撑|Four-Limbed Staff|Chaturanga Dandasana|核心与支撑|hands_feet|support_bent|together|neutral|双手撑地、肘部弯曲，躯干低位悬空|手掌着地，与前臂平板不同
side-plank|侧板式|Side Plank|Vasisthasana|核心与支撑|hands_feet|one_up|together|neutral|单手与脚侧缘支撑，身体侧向展开|抬腿、落膝、前臂变体分别记录
kneeling-side-plank|落膝侧板式|Knee-Down Side Plank||核心与支撑|hands_knees|one_up|one_extended|neutral|单手与同侧膝盖落地，另一腿伸展|不能使用双脚堆叠的全侧板图
downward-dog|下犬式|Downward-Facing Dog|Adho Mukha Svanasana|核心与支撑|hands_feet|support_straight|together|inverted_v|双手双脚支撑，骨盆抬高，身体形成倒V形|直臂与前臂海豚式分开
three-legged-dog|单腿下犬式|Three-Legged Dog||核心与支撑|hands_feet|support_straight|one_extended|inverted_v|下犬基础中一腿抬离垫面|开髋与骨盆保持朝下不是同一变体
dolphin|海豚式|Dolphin||核心与支撑|hands_feet|support_bent|together|inverted_v|双前臂与双脚支撑，骨盆抬高|前臂而非手掌承重
reverse-plank|反板式|Upward Plank|Purvottanasana|核心与支撑|hands_feet|support_straight|together|neutral|胸部朝上，双手在身后撑地，双腿伸展，骨盆抬起|与屈膝的反桌面式不同
reverse-tabletop|反桌面式|Reverse Tabletop||核心与支撑|hands_feet|support_straight|other|neutral|胸部朝上，双手双脚撑地，双膝弯曲，骨盆抬起|不能用直腿反板式替代
wild-thing|狂野式|Wild Thing|Camatkarasana|核心与支撑|hands_feet|one_up|other|backbend|单手与双脚支撑，胸廓向上打开，一臂展开|与侧板式、轮式的支撑方式不同
pigeon-prep|睡鸽准备式|Pigeon Preparation||髋部伸展|kneeling|support_straight|other|neutral|一腿在身体前方屈折，另一腿向后伸展，躯干抬起|不是深后弯的鸽王式或Kapotasana
sleeping-pigeon|睡鸽式|Sleeping Pigeon||髋部伸展|prone|other|other|fold|鸽式准备腿部形态，上身向前下方延展|前侧小腿位置和手臂姿态分别确认
lizard|蜥蜴式|Lizard||髋部伸展|kneeling|other|lunge_knee_down|fold|前脚置于双手外侧的低弓步，躯干向下延展|直臂、前臂、后膝离地为不同变体
frog-stretch|青蛙趴式|Frog Stretch||髋部伸展|kneeling|support_bent|wide|neutral|双膝向两侧宽分，小腿折向外，躯干较低|区别于俯卧抓单脚的半蛙式
splits|神猴式|Monkey Pose|Hanumanasana|髋部伸展|seated|other|wide|neutral|一腿向前一腿向后伸展，骨盆接近垫面|与单膝着地的半神猴式不同
king-pigeon|单腿鸽王式|One-Legged King Pigeon|Eka Pada Rajakapotasana|髋部伸展|kneeling|other|other|backbend|前腿屈折，后膝弯曲抬脚，胸廓后展并抓持脚部|不把普通睡鸽式标记为鸽王式
headstand|头倒立|Supported Headstand|Salamba Sirsasana|倒立与手臂平衡|unknown|other|together|unknown|头部与前臂构成支撑，双腿向上伸展|不同手臂支撑方式需单独登记
shoulderstand|肩倒立|Supported Shoulderstand|Salamba Sarvangasana|倒立与手臂平衡|supine|other|together|unknown|肩背承重，骨盆及双腿向上，双手常扶背|与双腿上举但骨盆落地的姿态不同
plow|犁式|Plow|Halasana|倒立与手臂平衡|supine|other|together|fold|肩背承重，双腿从头上方越过，脚靠近头后地面|脚悬空与脚触地分别记录
handstand|手倒立|Handstand|Adho Mukha Vrksasana|倒立与手臂平衡|unknown|support_straight|together|unknown|双手承重，身体倒置，双腿向上|靠墙和自由平衡分别登记
forearm-stand|前臂倒立|Feathered Peacock|Pincha Mayurasana|倒立与手臂平衡|unknown|support_bent|together|unknown|双前臂承重，身体倒置，双腿向上|与头部着地的头倒立不同
wheel|轮式|Upward Bow|Urdhva Dhanurasana|倒立与手臂平衡|hands_feet|support_straight|other|backbend|双手双脚撑地，胸腹朝上，躯干呈明显后弯弧形|与肩背落地的桥式不同
crow|乌鸦式|Crow|Bakasana|倒立与手臂平衡|unknown|other|other|rounded|双手支撑，双膝靠近上臂，双脚离地|乌鸦与鹤式的肘部伸屈需区分
side-crow|侧乌鸦式|Side Crow|Parsva Bakasana|倒立与手臂平衡|unknown|support_bent|other|twist|双手支撑，躯干扭转，屈膝双腿置于身体一侧离地|不使用正面乌鸦式插画替代
eight-angle|八曲式|Eight-Angle|Astavakrasana|倒立与手臂平衡|unknown|support_bent|crossed|twist|双手支撑，双腿向身体一侧伸展并交绕|腿部交绕与躯干扭转均需可见
peacock|孔雀式|Peacock|Mayurasana|倒立与手臂平衡|unknown|support_bent|together|neutral|双手支撑、肘部承托躯干，双腿向后离地|区别于双脚仍着地的四柱
scale|天平式|Scale|Tolasana|倒立与手臂平衡|unknown|support_straight|crossed|neutral|盘腿坐姿由双手撑起，骨盆与双脚离地|不能把盘腿坐在垫上误判为悬空
firefly|萤火虫式|Firefly|Tittibhasana|倒立与手臂平衡|unknown|support_straight|wide|fold|双手撑地，双腿向前外侧伸展并离地|与屈膝乌鸦式不同
neck-side-stretch|坐姿颈部侧伸展|Seated Neck Side Stretch||坐姿|seated|relaxed|crossed|neutral|交叉腿坐姿中仅颈部向一侧延展|不把颈部侧伸当成整个躯干侧屈
kneeling-side-support|跪姿支撑侧伸|Kneeling Supported Side Stretch||跪姿|kneeling|other|other|sidebend|跪姿中一手支撑并侧向伸展的描述性动作|原版参考动作，手脚支撑细节需要与具体视频逐项比对
crane|鹤式直臂平衡|Crane|Bakasana|倒立与手臂平衡|unknown|support_straight|other|rounded|双手支撑，屈膝双腿离地，双臂较伸直|与肘部弯曲的乌鸦变体区分，流派命名可能不同
`;
const entries=rows.trim().split('\n').map(line=>{
 const [id,name,english,sanskrit,category,base,arms,legs,spine,description,distinction]=line.split('|');
 return {id,name,english,sanskrit:sanskrit||null,category,aliases:[],posture:{base,arms,legs,spine},description,distinction,variants:[],sources:[{url:source,scope:sanskrit||['plank','sphinx','high-lunge','dolphin','forearm-plank'].includes(id)?'名称与类别目录':'相关基础体式与课程常见变体'}],reviewStatus:'reference-draft',artwork:{characterId:'original-girl-v1',assetIndexes:[],status:'pending'}};
});
const aliases={mountain:['山式站立'],chair:['椅子式'],triangle:['三角式'],garland:['瑜伽蹲'],easy:['简易盘坐','盘腿坐'],staff:['坐姿手杖式'],lotus:['全莲花坐'],thunderbolt:['钻石坐','跪坐'],child:['儿童式','婴孩式'],puppy:['小狗伸展式'],sphinx:['人面狮身式'],corpse:['摊尸式','大休息'],bridge:['半桥式'],boat:['全船式'],crow:['鹤式'],gate:['门栓式'], 'seated-fold':['双腿背部伸展式'],'wide-standing-fold':['站姿分腿前屈'],'head-knee':['头碰膝式','单腿前屈'],'legs-wall':['倒箭式'],'reclined-figure-four':['仰卧鸽式'],'downward-dog':['下犬'],'upward-dog':['上犬']};
const originalLinks={easy:[0],'seated-clasp-up':[2],'seated-sidebend':[3],'seated-twist':[4],'bound-angle-fold':[5],'head-knee':[6],cow:[8],cat:[9],plank:[10],cobra:[11],'downward-dog':[12],'low-lunge-ground':[13],'low-lunge-one-arm':[14],'high-lunge-prayer':[15],'revolved-high-lunge':[16],'wide-standing-fold':[17],child:[18],'kneeling-sidebend':[19],'thread-needle':[20],thunderbolt:[21],'kneeling-arms-up':[22],'kneeling-prayer':[23]};
const asymmetric=new Set('standing-sidebend pyramid revolved-chair high-lunge crescent-lunge high-lunge-prayer revolved-high-lunge warrior-1 warrior-2 reverse-warrior triangle revolved-triangle side-angle revolved-side-angle tree eagle warrior-3 half-moon revolved-half-moon dancer hand-big-toe standing-split half-lotus seated-sidebend seated-twist head-knee revolved-head-knee cow-face half-spinal-twist bharadvaja marichi-1 marichi-3 heron gate kneeling-sidebend bird-dog tiger thread-needle low-lunge-ground low-lunge low-lunge-one-arm revolved-low-lunge half-split half-frog single-knee-chest reclined-figure-four reclined-twist reclined-big-toe side-plank kneeling-side-plank three-legged-dog wild-thing pigeon-prep sleeping-pigeon lizard splits king-pigeon side-crow eight-angle neck-side-stretch kneeling-side-support'.split(' '));
originalLinks['neck-side-stretch']=[1];originalLinks['kneeling-side-support']=[7];delete aliases.crow;
for(const p of entries){
 p.aliases=aliases[p.id]||[];
 if(originalLinks[p.id])p.artwork={characterId:'original-girl-v1',assetIndexes:originalLinks[p.id],status:'original-reference',note:'原版人物参考图；体式细节与变体尚待核验，不直接扩大自动匹配规则。'};
 p.variants=[{id:p.id+'-standard',label:'基础形态',notes:p.distinction},...(asymmetric.has(p.id)?[{id:p.id+'-left',label:'左侧',notes:'解剖左右须以视频画面证据为准，不能直接水平镜像代替核验。'},{id:p.id+'-right',label:'右侧',notes:'左右与手脚落点分别确认。'}]:[])];
}
let generated={poses:{}};try{generated=JSON.parse(await readFile(new URL('./character-assets.json',import.meta.url),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
for(const p of entries){const asset=generated.poses[p.id];if(asset?.styleReview==='accepted')p.artwork={characterId:'original-girl-v1',assetIndexes:[],assetId:asset.id,atlas:asset.atlas,cell:asset.cell,status:'same-character-reference',styleReview:asset.styleReview,anatomyStatus:'pending-review'};}
const catalog={version:1,updatedAt:'2026-10-19',characterId:'original-girl-v1',scope:'常见垫上瑜伽体式、课程常见变体与部分进阶体式；不宣称覆盖所有流派和所有变体。',notice:'人物素材固定使用原版小女孩及以其为参考制作的同人物插画。动作资料与插画分开管理，体式细节尚未逐条完成专业动作审核。',categories:[...new Set(entries.map(p=>p.category))],entries};
await writeFile(new URL('./pose-catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
await writeFile(new URL('./dist/pose-catalog.js',import.meta.url),'const YOGA_POSE_CATALOG='+JSON.stringify(catalog)+';\n');
console.log(JSON.stringify({poses:entries.length,categories:catalog.categories.length,originalArt:entries.filter(x=>x.artwork.assetIndexes.length).length,variants:entries.reduce((n,p)=>n+p.variants.length,0)}));
