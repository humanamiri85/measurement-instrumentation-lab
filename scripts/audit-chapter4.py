"""Offline independent answer audit. Requires NumPy/SciPy, never used by the site."""
import json, math
from pathlib import Path
import numpy as np
from scipy import stats, optimize
root=Path(__file__).resolve().parents[1]
def desc(x):
 x=np.array(x); n=len(x); v=float(np.var(x,ddof=1)) if n>1 else None
 return dict(n=n,mean=float(np.mean(x)),median=float(np.median(x)),populationVariance=float(np.var(x)),sampleVariance=v,sd=math.sqrt(v) if v is not None else None,sem=math.sqrt(v/n) if v is not None else None,min=float(min(x)),max=float(max(x)),sorted=sorted(map(float,x)))
def interval(mean,sd,n,c,known=False):
 k=float(stats.norm.ppf((1+c)/2) if known else stats.t.ppf((1+c)/2,n-1));h=k*sd/math.sqrt(n)
 return dict(critical=k,half=h,lower=mean-h,upper=mean+h)
def single(a,mean,sd,n):
 c=a['level']; k=stats.t.ppf((1+c)/2,n-1)
 return dict(bias=mean-a['reference'],corrected=a['reading']-mean+a['reference'],singleHalf=float(stats.norm.ppf((1+c)/2)*sd),meanHalf=float(k*sd/math.sqrt(n)),predictionHalf=float(k*sd*math.sqrt(1+1/n)),textbookHeuristic=1.96*(sd+sd/math.sqrt(n)))
def hist(x,b,start=None,width=None):
 d=desc(x); start=d['min'] if start is None else start; width=((d['max']-d['min']) or 1)/b if width is None else width
 counts=np.histogram(x,np.linspace(start,start+b*width,b+1))[0].tolist()
 return dict(start=start,width=width,counts=counts,outside=len(x)-sum(counts),edges=[start+i*width for i in range(b+1)],sturges=math.ceil(1+math.log2(len(x))))
def gof(a):
 cuts=np.array(a['cuts']); counts=np.array(a.get('counts',np.histogram(a.get('data',[]),[-np.inf,*cuts,np.inf])[0]))
 n=int(sum(counts));original=len(counts)
 for _ in range(30):
  span=cuts[-1]-cuts[0] or 1; sd=span/3
  def probs(p):return np.diff(stats.norm.cdf(np.r_[-np.inf,cuts,np.inf],loc=p[0],scale=np.exp(p[1])))
  def obj(p):return -np.dot(counts,np.log(np.maximum(probs(p),1e-300)))
  fit=optimize.minimize(obj,[np.mean(cuts),np.log(sd)],method='Nelder-Mead',options={'maxiter':3000,'xatol':1e-9,'fatol':1e-10,'initial_simplex':[[np.mean(cuts),np.log(sd)],[np.mean(cuts)+.05*sd,np.log(sd)],[np.mean(cuts),np.log(sd)+.05]]})
  expected=n*probs(fit.x); bad=np.where(expected<5)[0]
  if not len(bad) or len(counts)<=2:break
  i=int(bad[0]);i=i-1 if i==len(counts)-1 else i;counts[i]+=counts[i+1];counts=np.delete(counts,i+1);cuts=np.delete(cuts,i)
 df=len(counts)-3;valid=df>0 and min(expected)>=5 and fit.success;stat=float(sum((counts-expected)**2/expected))
 return dict(counts=counts.tolist(),cuts=cuts.tolist(),expected=expected.tolist(),n=n,df=df,statistic=stat,p=float(stats.chi2.sf(stat,df)) if valid else None,valid=bool(valid),mu=float(fit.x[0]),sigma=float(np.exp(fit.x[1])),converged=bool(fit.success),merged=original-len(counts))
def prop(a):
 x=np.array(a['values']);u=np.array(a['errors']);m=a['model'];p,q=x[:2]
 if m=='sum':f=p+q;g=np.array([1,1])
 elif m=='difference':f=p-q;g=np.array([1,-1])
 elif m=='product':f=p*q;g=np.array([q,p])
 elif m=='quotient':f=p/q;g=np.array([1/q,-p/q**2])
 elif m=='density':f=x[0]/np.prod(x[1:]);g=np.r_[1/np.prod(x[1:]),-f/x[1:]]
 elif m=='tank':h1,h2,d,t=x;f=np.pi*d*d*(h2-h1)/(4*t);g=np.array([-np.pi*d*d/(4*t),np.pi*d*d/(4*t),np.pi*d*(h2-h1)/(2*t),-f/t])
 v=(g*u)**2;su=float(math.sqrt(sum(v)));return dict(value=float(f),gradient=g.tolist(),contributions=v.tolist(),covariance=0,u=su,worstLinear=float(sum(abs(g)*u)),relative=su/abs(f) if f else None,nearZero=bool(abs(f)<=3*su),denominatorUnsafe=bool(m=='quotient' and abs(q)<=3*u[1]),rectangularU=su/math.sqrt(3))
def solve(e):
 a=e['args'];t=e['type']
 if t=='stats':return desc(a['data'])
 if t=='multiStats':return list(map(desc,a['sets']))
 if t=='hist':x=a['data'];x=[v-np.mean(x) for v in x] if a.get('center') else x;return hist(x,a['bins'],a.get('start'),a.get('width'))
 if t=='histCompare':return [hist(a['data'],b) for b in a['bins']]
 if t=='normal':
  out=[]
  for lo,hi in a['ranges']:
   p=float(stats.norm.cdf(np.inf if hi is None else hi,a['mu'],a['sigma'])-stats.norm.cdf(-np.inf if lo is None else lo,a['mu'],a['sigma']));p=1-p if a.get('outside') else p;out.append(dict(probability=p,expectedCount=p*a['count'] if a.get('count') else None))
  return out
 if t=='normalQuantile':return dict(central=float(stats.norm.ppf((1+a['level'])/2)),oneSided=float(stats.norm.ppf(a['level'])))
 if t=='meanData':d=desc(a['data']);return dict(summary=d,intervals=[interval(d['mean'],d['sd'],d['n'],c) for c in a['levels']])
 if t=='mean':return [dict(**interval(a['mean'],a['sd'],a['n'],c),zComparison=interval(a['mean'],a['sd'],a['n'],c,True)) for c in a['levels']]
 if t=='singleSummary':return single(a,a['mean'],a['sd'],a['n'])
 if t=='singleData':d=desc(a['data']);return dict(summary=d,**single(a,d['mean'],d['sd'],d['n']))
 if t=='variance':
  out=[]
  for c in a['levels']:
   df=a['n']-1;lo=float(df*a['variance']/stats.chi2.ppf((1+c)/2,df));hi=float(df*a['variance']/stats.chi2.ppf((1-c)/2,df));out.append(dict(lower=lo,upper=hi,sdLower=math.sqrt(lo),sdUpper=math.sqrt(hi)))
  return out
 if t=='chiQuantile':return dict(leftCDFProbability=1-a['rightTail'],critical=float(stats.chi2.isf(a['rightTail'],a['df'])))
 if t=='tQuantile':return dict(oneSided=float(stats.t.ppf(a['level'],a['df'])),central=float(stats.t.ppf((1+a['level'])/2,a['df'])))
 if t=='gof':return gof(a)
 if t in ['flags','referenceFlags']:
  d=desc(a['referenceData']) if t=='referenceFlags' else dict(mean=a['mean'],sd=a['sd']);flags=[dict(index=i,value=v,flag=bool(abs(v-d['mean'])>3*d['sd'])) for i,v in enumerate(a['data'])];return dict(reference=d,flags=flags) if t=='referenceFlags' else flags
 if t=='outlierStudy':return dict(original=desc(a['data']),provisional=desc([v for i,v in enumerate(a['data']) if i!=a['index']]))
 if t=='prop':return prop(a)
 if t=='relativeProp':return dict(firstOrderBound=sum(a['errors']),conditionalU=math.hypot(*a['errors']),rectangularU=math.hypot(*a['errors'])/math.sqrt(3),exactUpper=float(np.prod(1+np.array(a['errors']))-1) if a['operation']=='product' else (1+a['errors'][0])/(1-a['errors'][1])-1 if a['operation']=='quotient' and len(a['errors'])==2 else None)
 if t=='modelCounts':
  d=desc(a['data']);return [dict(actual=sum((lo is None or v>=lo) and (hi is None or v<hi) for v in a['data']),expected=float(len(a['data'])*(stats.norm.cdf(hi if hi is not None else np.inf,a.get('mu',d['mean']),a.get('sigma',d['sd']))-stats.norm.cdf(lo if lo is not None else -np.inf,a.get('mu',d['mean']),a.get('sigma',d['sd']))))) for lo,hi in a['ranges']]
 if t=='tankRect':
  delta=a['h2']-a['h1'];g=np.array([-a['l']*a['w'],a['l']*a['w'],delta*a['w'],delta*a['l']]);u=np.array([a['h1'],a['h2'],a['l'],a['w']])*a['fractions'];return dict(value=delta*a['l']*a['w'],gradient=g.tolist(),worstLinear=float(sum(abs(g)*u)),conditionalU=float(np.linalg.norm(g*u)),rectangularU=float(np.linalg.norm(g*u)/math.sqrt(3)))
 if t=='heat':delta=a['inside']-a['outside'];x=[a['inside']*a['temperatureFractions'][0]/delta,a['outside']*a['temperatureFractions'][1]/delta,*a['dimensionFractions']];return dict(delta=delta,firstOrderRelativeBound=sum(map(abs,x)),conditionalRelativeU=math.hypot(*x),rectangularRelativeU=math.hypot(*x)/math.sqrt(3))
 if t=='concept':return None
 raise ValueError(t)
bank=json.loads((root/'assets/js/chapter4/bank.json').read_text());answers={e['id']:solve(e) for e in bank}
(root/'tests/fixtures/chapter4-bank.json').write_text(json.dumps(answers,indent=2,allow_nan=False)+'\n')
refs={'normal':[[x,float(stats.norm.cdf(x))] for x in [-5,-2,-.5,0,1,3]],'t':[[x,df,float(stats.t.cdf(x,df))] for df in [1,2,5,30] for x in [-3,.5,2]],'chi':[[x,df,float(stats.chi2.cdf(x,df))] for df in [1,2,9,20] for x in [.1,3,15]],'quantiles':[[df,p,float(stats.t.ppf(p,df)),float(stats.chi2.ppf(p,df))] for df in [1,5,20] for p in [.025,.5,.975]]}
(root/'tests/fixtures/chapter4-distributions.json').write_text(json.dumps(refs,indent=2)+'\n')
print('Independent SciPy audit generated for',len(answers),'records; conceptual record has no invented numeric answer.')
