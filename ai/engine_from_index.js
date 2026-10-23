// ================= SIMULATION ENGINE =================
const DEFAULTS = {homes:200, roof:100, tank:2000, other:150, cRoof:0.9, cOther:0.6, depth:50, duration:120, peakPos:0.35, cap:350, reserve:20, keep:50, usage:100, valve:0.5, basicStart:0.5, k:0.4, baseFlow:5};
const DT_MIN=5, DT=300, T_START=-180, T_END=300, NZ=4, MY_ZONE=1;

function zoneHomes(p){const b=Math.floor(p.homes/NZ);const a=Array(NZ).fill(b);for(let i=0;i<p.homes-b*NZ;i++)a[i]++;return a;}
function hyetograph(p){const n=Math.max(1,Math.round(p.duration/DT_MIN));const w=[];for(let i=0;i<n;i++){const x=(i+.5)/n;w.push(x<p.peakPos?x/p.peakPos:(1-x)/(1-p.peakPos));}const s=w.reduce((a,b)=>a+b,0);return w.map(v=>v/s*p.depth);}
function waterFill(r,F){const tot=r.reduce((a,b)=>a+b,0);if(F<=0)return r.map(()=>0);if(tot<=F)return r.slice();let lo=0,hi=Math.max(...r);for(let i=0;i<60;i++){const h=(lo+hi)/2;const s=r.reduce((a,v)=>a+Math.max(0,v-h),0);if(s>F)lo=h;else hi=h;}return r.map(v=>Math.max(0,v-hi));}
function simulate(p,mode){
  const steps=(T_END-T_START)/DT_MIN+1, zh=zoneHomes(p), rain=hyetograph(p), nS=rain.length, tankL=p.tank;
  const resL=p.reserve/100, keepL=Math.max(p.keep/100,resL);
  const roof=rain.map(mm=>mm*p.roof*p.cRoof);
  const plan=waterFill(roof,tankL*(1-resL));
  const preRel=(1-resL)*tankL/(-T_START/DT_MIN);
  let lvl=Array(NZ).fill(mode==='basic'?p.basicStart:1), Q=p.baseFlow;
  const o={t:[],rain:[],flow:[],levels:[],phase:[],held:[],releasing:[],zh,plan,roof};
  for(let s=0;s<steps;s++){
    const tm=T_START+s*DT_MIN, si=(tm>=0&&tm<nS*DT_MIN)?tm/DT_MIN:-1, mm=si>=0?rain[si]:0;
    let vol=mm*p.other*p.cOther*p.homes, held=0, relz=-1, ph;
    if(tm<0){ph='prepare';
      if(mode==='smart')for(let z=0;z<NZ;z++){const d=Math.min(preRel,Math.max(0,(lvl[z]-resL)*tankL));lvl[z]-=d/tankL;vol+=d*zh[z];}
    }else if(si>=0){ph='storm';const r=roof[si];
      for(let z=0;z<NZ;z++){const room=Math.max(0,(1-lvl[z])*tankL);const c=mode==='none'?0:mode==='smart'?Math.min(plan[si],room):Math.min(r,room);lvl[z]+=c/tankL;vol+=(r-c)*zh[z];held+=c*zh[z];}
    }else{ph='after';
      if(mode==='smart'){let allowed=Math.max(0,.5*p.cap-Q)*DT;
        for(let z=NZ-1;z>=0;z--){const ex=(lvl[z]-keepL)*tankL*zh[z];if(ex<=1e-6)continue;const d=Math.min(ex,p.valve*zh[z]*DT,allowed);if(d>0){lvl[z]-=d/(tankL*zh[z]);vol+=d;relz=z;}break;}}
    }
    const I=vol/DT+p.baseFlow; Q=Q+p.k*(I-Q);
    o.t.push(tm);o.rain.push(mm);o.flow.push(Q);o.levels.push(lvl.slice());o.phase.push(ph);o.held.push(held);o.releasing.push(relz);
  }
  o.peak=Math.max(...o.flow);o.overflow=0;o.minsOver=0;
  o.flow.forEach(q=>{if(q>p.cap){o.overflow+=(q-p.cap)*DT/1000;o.minsOver+=DT_MIN;}});
  o.heldTotal=o.held.reduce((a,b)=>a+b,0);
  o.stored=o.levels[o.levels.length-1].reduce((a,l,z)=>a+l*tankL*zh[z],0);
  return o;
}


module.exports={DEFAULTS,simulate};