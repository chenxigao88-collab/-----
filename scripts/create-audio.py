"""Original score and layered sound design; no downloaded samples/compositions."""
from pathlib import Path
import json, wave
import numpy as np
SR=22050; TAU=2*np.pi; rng=np.random.default_rng(12026)
OUT=Path(__file__).resolve().parents[1]/'public'/'audio'; OUT.mkdir(parents=True,exist_ok=True)
def envelope(t,a=.01,r=.15): return np.minimum(1,t/a)*np.minimum(1,np.maximum(0,t[-1]-t)/r)
def noise(t,s=1):
    n=rng.normal(0,.5,len(t)); return np.convolve(n,np.ones(s)/s,'same') if s>1 else n
def note(m,d,kind):
    t=np.arange(max(2,int(d*SR)))/SR; f=440*2**((m-69)/12)
    if kind=='pad': return (sum(np.sin(TAU*f*h*t+.1*np.sin(TAU*.3*t))/h**1.8 for h in [1,2,3,4])+.25*np.sin(TAU*f*1.003*t))*envelope(t,.25,.5)*.18
    if kind=='bell': return np.sin(TAU*f*t+1.5*np.sin(TAU*f*2.003*t)*np.exp(-t*4))*np.exp(-t*2.6)*envelope(t,.003,.12)*.3
    if kind=='string': return sum(np.sin(TAU*f*h*t+.08*np.sin(TAU*5.1*t))/h**1.3 for h in range(1,7))*envelope(t,.06,.12)*.15
    if kind=='bass': return (np.sin(TAU*f*t)+.25*np.sin(TAU*f*2*t))*envelope(t,.007,.06)*.3
    return np.sin(TAU*f*t+.7*np.sin(TAU*f*2*t)*np.exp(-t*6))*np.exp(-t*3)*envelope(t,.004,.09)*.22
def drum(kind):
    t=np.arange(int({'kick':.38,'snare':.2,'hat':.09,'tom':.42}[kind]*SR))/SR
    if kind=='kick': return np.sin(TAU*(45*t+65*(1-np.exp(-t*30))/30))*np.exp(-t*13)*.55+noise(t)*np.exp(-t*180)*.12
    if kind=='snare': return (noise(t)-noise(t,9))*np.exp(-t*24)*.35+np.sin(TAU*170*t)*np.exp(-t*35)*.12
    if kind=='hat': return (noise(t)-noise(t,12))*np.exp(-t*55)*.08
    return np.sin(TAU*(62*t+55*(1-np.exp(-t*9))/9))*np.exp(-t*8)*.4
def write(name,data):
    if data.ndim==1: data=np.column_stack((data,data))
    data-=data.mean(axis=0); data=np.tanh(data*1.1); peak=np.max(np.abs(data))
    if peak>.89: data*=.89/peak
    with wave.open(str(OUT/f'{name}.wav'),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((data*32767).astype('<i2').tobytes())
    return {'file':f'{name}.wav','duration':round(len(data)/SR,3),'peak':round(float(np.max(np.abs(data))),4)}
chords=[[47,54,59,62],[43,50,55,59],[50,57,62,66],[45,52,57,61]]
melodies=[[71,74,78,76,74,71,69,66],[67,71,74,71,69,67,66,64],[74,78,81,78,76,74,71,69],[73,76,81,76,74,73,69,66]]
tracks={}
for scene,bpm in [('camp',76),('explore',86),('battle',112),('boss',132)]:
    beat=60/bpm; size=round(beat*32*SR);mix=np.zeros((size,2))
    def add(y,when,pan=0,gain=1):
        y=y*envelope(np.arange(len(y))/SR,.002,.003)
        ix=(np.arange(len(y))+round(when*SR))%size
        np.add.at(mix[:,0],ix,y*gain*np.sqrt((1-pan)/2));np.add.at(mix[:,1],ix,y*gain*np.sqrt((1+pan)/2))
    for bar in range(8):
        c=chords[bar%4];m=melodies[bar%4];start=bar*4*beat
        for j,n in enumerate(c): add(note(n+12,beat*4.5,'pad'),start,(j-1.5)*.3,.7 if scene=='boss' else 1)
        for b in range(8):
            add(note(c[b%4]+24,beat*.9,'bell' if scene in ('camp','explore') else 'pluck'),start+b*beat/2,np.sin(b*1.3)*.45,.55 if scene=='camp' else .7)
            if scene!='camp' or b%2==0: add(note(m[b],beat*1.3,'bell' if scene=='camp' else 'string'),start+b*beat/2,.15,.75 if bar>=4 else .5)
        for b in range(4): add(note(c[0]-12,beat*.9,'bass'),start+b*beat,-.05,.6 if scene=='camp' else 1)
        if scene in ('battle','boss'):
            for b in [0,1.5,2,3.5]: add(drum('kick'),start+b*beat)
            for b in [1,3]: add(drum('snare'),start+b*beat,.12)
            for b in np.arange(0,4,.5): add(drum('hat'),start+b*beat,(-1 if b%1==0 else 1)*.4)
            if scene=='boss':
                for b in [0,2.5,3.25,3.75]: add(drum('tom'),start+b*beat,-.3)
                for b in range(8): add(note(c[b%4]+12,beat*.42,'string'),start+b*beat/2,-.35,.9)
        elif scene=='explore': add(drum('tom'),start,-.25,.35);add(drum('hat'),start+2*beat,.4,.5)
    dry=mix.copy()
    for seconds,level in [(.19,.12),(.37,.09),(.71,.06)]: mix+=np.roll(dry[:,::-1],round(seconds*SR),axis=0)*level
    bridge=round(.008*SR);mix[-bridge:]+=(mix[0]-mix[-1])*(.5-.5*np.cos(np.linspace(0,np.pi,bridge)))[:,None]
    tracks[scene]={**write(f'music-{scene}',mix),'bpm':bpm,'bars':8}
sounds={}
durations={'shot':.22,'shotgun':.4,'slash':.38,'ice':.6,'fire':.55,'electric':.32,'wind':.45,'bolt':.55,'ring':.75,'hit':.22,'heavy':.42,'explosion':1.05,'hurt':.42,'dodge':.55,'swap':.25,'victory':2.8,'moonRise':1.9,'moonSlash':.7,'moonSheath':.65,'moonBreak':2.,'enemyShot':.18,'death':.48,'loot':.8,'reaction':.85}
for name,d in durations.items():
    t=np.arange(int(d*SR))/SR;n=noise(t);low=noise(t,25)
    if name in ('shot','shotgun','bolt','enemyShot'):
        weight={'shot':1,'shotgun':1.5,'bolt':1.8,'enemyShot':.65}[name]
        y=n*np.exp(-t*35)*.65+low*np.exp(-t*8)*weight+np.sin(TAU*(65*t+100*(1-np.exp(-t*50))/50))*np.exp(-t*22)*.45+np.sin(TAU*1800*t)*np.exp(-t*110)*.14
    elif name in ('slash','wind','moonSlash','dodge'):
        y=(n-noise(t,12))*np.sin(t/d*np.pi)**1.6*.55+np.sin(TAU*(620*t-220*t*t))*np.exp(-t*9)*.13
        if name=='moonSlash': y+=low*np.exp(-t*6)*1.4+np.sin(TAU*82*t)*np.exp(-t*8)*.4
        if name=='dodge': y+=np.sin(TAU*(500*t+600*t*t))*envelope(t,.02,.2)*.12
    elif name in ('hit','heavy','hurt','death'):
        y=n*np.exp(-t*40)*.45+np.sin(TAU*(90*t+50*(1-np.exp(-t*20))/20))*np.exp(-t*18)*.55+low*np.exp(-t*11)
        if name=='hurt': y+=np.sin(TAU*140*t)*np.exp(-t*8)*.2
        if name=='heavy': y+=np.sin(TAU*55*t)*np.exp(-t*8)*.6
    elif name in ('explosion','fire','moonBreak'):
        y=low*np.exp(-t*3.7)*2.4+n*np.exp(-t*20)*.6+np.sin(TAU*(32*t+80*(1-np.exp(-t*18))/18))*np.exp(-t*5)*.7+n*(np.sin(TAU*37*t)>.94)*np.exp(-t*5)*.2
        if name=='moonBreak':
            for start,f in [(.12,340),(.27,790),(.43,1230)]:
                q=np.maximum(0,t-start);y+=(t>=start)*np.sin(TAU*f*q)*np.exp(-q*8)*.12
    elif name=='electric': y=(np.sin(TAU*900*t+.9*np.sin(TAU*53*t))+n*.6)*np.exp(-t*17)*.25
    elif name in ('ice','ring','moonSheath','swap'):
        f={'ice':1700,'ring':820,'moonSheath':2100,'swap':1200}[name]
        y=sum(np.sin(TAU*f*h*t)*np.exp(-t*(6+j*5))*.2/(j+1) for j,h in enumerate([1,1.47,2.09,2.83]))+n*np.exp(-t*80)*.12
    elif name=='moonRise':
        y=(sum(np.sin(TAU*(440*2**((p-69)/12))*t)*.1 for p in [47,59,62,66])+noise(t,10)*.5)*np.sin(t/d*np.pi)**.8+np.sin(TAU*(350*t+260*t*t))*envelope(t,.3,.3)*.08
    else:
        y=np.zeros(len(t))
        for j,p in enumerate([71,74,78,83] if name=='victory' else [71,78,83]):
            v=note(p,d-j*.09,'bell');offset=round(j*.09*SR);y[offset:offset+len(v)]+=v[:len(y)-offset]*.65
        if name=='reaction': y+=low*np.exp(-t*7)*.8+n*np.exp(-t*24)*.25
    y*=envelope(t,.002,.04);stereo=np.column_stack([y.copy(),y.copy()])
    for delay,level in [(.037,.14),(.071,.09),(.113,.05)]:
        shift=round(delay*SR)
        if shift<len(y): stereo[shift:,1]+=y[:-shift]*level;stereo[shift:,0]+=y[:-shift]*level*.65
    sounds[name]=write(f'sfx-{name}',stereo)
(OUT/'manifest.json').write_text(json.dumps({'sampleRate':SR,'channels':2,'encoding':'PCM16','copyright':'Original Ash Corridor compositions and synthesis; no third-party recordings.','music':tracks,'sounds':sounds},indent=2)+'\n',encoding='utf8')
print(f'Rendered {len(tracks)} original looping scores and {len(sounds)} layered sounds.')
