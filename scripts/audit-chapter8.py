"""Independent reference generation using complex impedances and NumPy FFT.
Run offline; NumPy is an audit dependency only, never a site dependency.
"""
from pathlib import Path
import json,math,cmath
import numpy as np
root=Path(__file__).resolve().parents[1]
refs={"rc":[],"loaded":[],"signals":[],"resistors":[],"spectrum":{}}
R=10000;C=.00001;tau=R*C;fc=1/(2*math.pi*tau)
for kind in ['lp','hp']:
 for ratio in [.1,1,10]:
  f=ratio*fc;zC=1/(1j*2*math.pi*f*C);H=zC/(R+zC) if kind=='lp' else R/(R+zC)
  refs['rc'].append(dict(kind=kind,f=f,R=R,C=C,mag=abs(H),phase=cmath.phase(H),db=20*math.log10(abs(H))))
for f in [0,.5,fc,10]:
 Rs=5000;RL=20000
 Z=RL if f==0 else 1/(1/RL+1j*2*math.pi*f*C)
 H=Z/(R+Rs+Z);refs['loaded'].append(dict(f=f,mag=abs(H),phase=cmath.phase(H)))
for t in [0,1,2,8,16,40]:refs['signals'].append([t,1+math.sin(.15*math.pi*t)+.5*math.sin(.25*math.pi*t),1+math.sin(.125*math.pi*t)+.5*math.sin(.25*math.pi*t)+.25*math.sin(.5*math.pi*t)+.125*math.sin(math.pi*t)])
for target,selected in [(50,330000),(100,160000)]:
 achieved=1/(2*math.pi*selected*1e-8);refs['resistors'].append(dict(target=target,ideal=1/(2*math.pi*target*1e-8),selected=selected,achieved=achieved,deviation=100*(achieved-target)/target))
n=100;fs=100;t=np.arange(n)/fs;x=2+np.sin(2*np.pi*10*t);w=np.hanning(n);fft=np.fft.rfft((x-np.mean(x))*w);amp=np.abs(fft)/sum(w);amp[1:-1]*=2
refs['spectrum']=dict(dc=float(np.mean(x)),resolution=1,peakAmplitude=float(amp[10]),nyquistAmplitude=float(amp[-1]),n=n)
(root/'tests/fixtures/chapter8-reference.json').write_text(json.dumps(refs,indent=2)+'\n')
print('Independent complex-impedance, source-signal, resistor and FFT references written.')
