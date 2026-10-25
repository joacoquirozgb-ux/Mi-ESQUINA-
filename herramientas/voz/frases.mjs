// Arma la lista de audios que hay que grabar a partir de VB y VB_NOM en app.js.
// Uso: node herramientas/voz/frases.mjs > trabajos.json
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
function literal(name,open='{',close='}'){
  const i=src.indexOf('const '+name+'=');if(i<0)throw new Error('no encuentro '+name);
  let j=src.indexOf(open,i),d=0,k=j;
  for(;k<src.length;k++){if(src[k]===open)d++;else if(src[k]===close&&!--d)break}
  return Function('return '+src.slice(j,k+1))();
}
const VB=literal('VB'),MIN=literal('VB_MIN','[',']');
const nomSrc=src.slice(src.indexOf('const VB_NOM='));
const nombres=Function('return '+nomSrc.slice(nomSrc.indexOf('((')+1,nomSrc.indexOf(').split'))+')')().split(' ');
const slug=x=>x.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');

// Cómo se pronuncian en Chile algunos nombres y palabras que el modelo leería mal
const DICE={Ximena:'Jimena',Jacqueline:'Yaquelín',Jessica:'Yésica',Katherine:'Káterin',Nicole:'Nicól',Denisse:'Denís',Ivonne:'Ivón',Elizabeth:'Elisabet',Abigail:'Abigaíl',Karen:'Káren',Erika:'Érika',Maite:'Máite'};
const DICE_FRASE=[[/\bround\b/g,'raund']];
const VOCES={h:'em_alex',m:'ef_dora'};
const RITMO={suave:.95,firme:1,sargento:1.08};

const out=[];
const limpia=t=>t.replace(/\s+/g,' ').replace(/\s+([.!?,])/g,'$1').trim();
const dice=t=>DICE_FRASE.reduce((a,[r,x])=>a.replace(r,x),t);
for(const g of ['h','m']){
  const ins=g==='m'?'instructora':'instructor';
  for(const [tono,banco] of Object.entries(VB))for(const [clave,lista] of Object.entries(banco))lista.forEach((tpl,i)=>{
    for(const m of tpl.includes('{m}')?MIN:[null]){
      const t=tpl.replaceAll('{i}',ins).replaceAll('{m}',m==null?'':String(m)),id=`${tono}.${clave}.${i}`+(m==null?'':'-'+m);
      const job=(sid,texto)=>out.push({g,voz:VOCES[g],id:sid,texto:limpia(texto),dice:dice(limpia(texto)),ritmo:RITMO[tono]});
      job(id,t.replace('{n}',''));
      const p=t.indexOf('{n}');
      if(p>0){const antes=t.slice(0,p),despues=t.slice(p+3);
        if(despues.replace(/[.!?\s]/g,'')){ // el nombre va al medio: se graba en dos partes
          const signo=/^[.!?]/.test(despues)?despues[0]:'.';
          job(id+'.a',antes+signo);job(id+'.b',despues.replace(/^[.!?,]\s*/,''));
        }
      }
    }
  });
  for(const n of nombres){const s=slug(n),d=DICE[n]||n;
    out.push({g,voz:VOCES[g],id:'n/'+s,texto:n+'.',dice:d+'.',ritmo:1});
    out.push({g,voz:VOCES[g],id:'nx/'+s,texto:'¡'+n+'!',dice:'¡'+d+'!',ritmo:1.05});
  }
}
console.log(JSON.stringify(out));
