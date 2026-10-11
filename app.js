(function(){
'use strict';
/* ---------- conexión ---------- */
// La clave pública (anon) está hecha para ir en el navegador: las reglas de la base de datos impiden leer datos ajenos.
const SB_URL='https://hkhweiduvkggbzfdpiyk.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraHdlaWR1dmtnZ2J6ZmRwaXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzcwNDAsImV4cCI6MjEwNzMxMzA0MH0.9lNNRFDZKHqYRK_dr6-QSnH5ukIj9AGjWIqZD6qfsnQ';
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'mi-esquina-sesion'}});

/* ---------- utilidades ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>dkey(new Date());
const addDays=(k,n)=>{const [y,m,d]=k.split('-').map(Number);const x=new Date(y,m-1,d+n);return dkey(x)};
const monthKey=k=>k.slice(0,7);
const CLPF=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
const clp=n=>{const v=Math.round(n||0);return (v<0?'−':'')+CLPF.format(Math.abs(v))};
const usd=n=>'US$'+(Math.round((n||0)*100)/100).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2});
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const dow=k=>{const [y,m,d]=k.split('-').map(Number);return (new Date(y,m-1,d).getDay()+6)%7};
const toast=t=>{const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1800)};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const isHM=s=>typeof s==='string'&&/^\d{2}:\d{2}$/.test(s);
const sid=v=>String(v??'').replace(/[^\w-]/g,'').slice(0,40)||uid();
const str=(v,n=200)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').slice(0,n);
const nn=v=>{const x=+v;return isFinite(x)?x:0};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const arr=v=>Array.isArray(v)?v:[];

const AREA_DEF={deporte:'Deporte',familia:'Familia',estudio:'Estudio',empresa:'Trabajo',contenido:'Creatividad',salud:'Descanso'};
const AREA_KEYS=Object.keys(AREA_DEF);
const AREAS={};
function syncAreas(){const names=obj(S.meta.areaNames);for(const k of AREA_KEYS)AREAS[k]={n:(names[k]||'').trim()||AREA_DEF[k],c:'var(--a-'+k+')'}}
const areaOpts=sel=>AREA_KEYS.map(k=>`<option value="${k}" ${k===sel?'selected':''}>${esc(AREAS[k].n)}</option>`).join('');
const CAT_G=['Comida','Casa y cuentas','Transporte','Familia e hijos','Entrenamiento','Estudios','Trabajo y negocio','Salud','Ocio','Otros'];
const CAT_I=['Sueldo','Clientes y ventas','Honorarios','Otros'];
const CAT_COL=['var(--blue)','var(--a-empresa)','var(--a-familia)','var(--a-contenido)','var(--water)','var(--a-salud)','#E85D9A','#7A8B2E'];
const CAT_OLD={'Bebé':'Familia e hijos','Universidad':'Estudios','Negocio e IA':'Trabajo y negocio','Clientes IA':'Clientes y ventas'};
const catFix=c=>{c=str(c,60);return CAT_OLD[c]||c||'Otros'};
const STATUS=[['idea','Idea','var(--muted)'],['curso','En curso','var(--blue)'],['pausa','Pausado','var(--warn)'],['listo','Entregado','var(--ok)'],['vendido','Cobrado','var(--red)']];
const stInfo=k=>STATUS.find(s=>s[0]===k)||STATUS[0];

/* Cinturones: el progreso es como en BJJ, grados dentro de cada cinturón */
const BELTS=[
  {n:'Blanco',xp:0,col:'#F4F4F2',tip:'#15171D'},
  {n:'Azul',xp:600,col:'#2155D6',tip:'#15171D'},
  {n:'Morado',xp:1800,col:'#6B2FB3',tip:'#15171D'},
  {n:'Marrón',xp:4000,col:'#7A4A22',tip:'#15171D'},
  {n:'Negro',xp:8000,col:'#15171D',tip:'#C1121F'}
];
function beltFor(xp){
  let i=0;for(let j=0;j<BELTS.length;j++)if(xp>=BELTS[j].xp)i=j;
  const b=BELTS[i],nx=BELTS[i+1];
  if(!nx)return {b,i,stripes:Math.min(4,Math.floor((xp-b.xp)/2000)),pct:1,next:null,left:0};
  const span=nx.xp-b.xp,into=xp-b.xp;
  return {b,i,stripes:Math.min(4,Math.floor(into/(span/5))),pct:into/span,next:nx,left:nx.xp-xp};
}

/* ---------- estado ---------- */
const DOCS=['habits','money','claude','week','meta'];
function defaults(){
  return {
    habits:{list:[
      {id:'h1',name:'Moverme 30 minutos',area:'deporte',pts:30},
      {id:'h2',name:'Estudiar o aprender 1 hora',area:'estudio',pts:25},
      {id:'h3',name:'Un bloque de trabajo sin distracciones',area:'empresa',pts:30},
      {id:'h4',name:'Crear algo (escribir, grabar, diseñar)',area:'contenido',pts:20},
      {id:'h5',name:'Tiempo de calidad con los míos',area:'familia',pts:25},
      {id:'h6',name:'Anotar los gastos del día',area:'empresa',pts:10},
      {id:'h7',name:'Dormir 7 horas o más',area:'salud',pts:15}
    ],log:{},water:{goal:2000,log:{}},wake:{}},
    money:{tx:[],budgets:{},merchants:{}},
    claude:{projects:[],subs:[],usage:[],rate:950},
    week:{blocks:[]},
    meta:{name:'',tab:'inicio',alarm:{time:'06:30',ex:'flexiones'},countdown:{label:'',date:''},areaNames:{},onboarded:false,mig2L:true}
  };
}
function sampleWeek(){
  const B=[];const add=(day,start,end,area,title,lock)=>B.push({id:uid(),day,start,end,area,title,lock:!!lock});
  for(let d=0;d<5;d++){
    add(d,'07:00','08:00','deporte','Entrenar',true);
    add(d,'09:00','13:00','empresa','Trabajo');
    add(d,'15:00','17:00','estudio','Estudio');
    add(d,'19:30','21:30','familia','Tiempo con los míos',true);
  }
  add(5,'10:00','12:00','deporte','Deporte',true);
  add(5,'16:00','20:00','familia','Familia y amigos',true);
  add(6,'11:00','13:00','salud','Descanso',true);
  add(6,'20:00','20:30','empresa','Planificar la semana');
  return B;
}
/* Limpia y valida lo que llega de la nube, del caché o de un archivo importado */
function clean(doc,v){
  const f=defaults()[doc];v=obj(v);
  if(doc==='habits'){
    const list=Array.isArray(v.list)?v.list.slice(0,60).map(h=>{h=obj(h);return {id:sid(h.id),name:str(h.name,120)||'Hábito',area:AREA_KEYS.includes(h.area)?h.area:'salud',pts:Math.max(1,Math.min(100,Math.round(nn(h.pts))||10))}}):f.list;
    const log={};for(const [k,d] of Object.entries(obj(v.log)))if(isDate(k)){const o={};for(const [id,p] of Object.entries(obj(d)))o[sid(id)]=Math.max(0,Math.min(100,nn(p)));if(Object.keys(o).length)log[k]=o}
    const w=obj(v.water),wl={};for(const [k,ml] of Object.entries(obj(w.log)))if(isDate(k)&&nn(ml)>0)wl[k]=Math.min(20000,nn(ml));
    const wake={};for(const [k,x0] of Object.entries(obj(v.wake)))if(isDate(k)){const x=obj(x0);wake[k]={at:isHM(x.at)?x.at:'00:00',secs:Math.max(0,nn(x.secs)),ex:x.ex==='sentadillas'?'sentadillas':'flexiones',reps:arr(x.reps).slice(0,20).map(nn),avg:nn(x.avg),cons:nn(x.cons),late:x.late==null?null:nn(x.late)}}
    return {list,log,water:{goal:Math.min(10000,Math.max(500,nn(w.goal)||2000)),log:wl},wake};
  }
  if(doc==='money'){
    const tx=arr(v.tx).slice(0,20000).filter(t=>t&&typeof t==='object'&&isDate(t.date)&&nn(t.amt)>0).map(t=>({id:sid(t.id),type:t.type==='ingreso'?'ingreso':'gasto',amt:nn(t.amt),cat:catFix(t.cat),date:t.date,note:str(t.note,120)}));
    const budgets={};for(const [c,a] of Object.entries(obj(v.budgets)))if(nn(a)>0)budgets[catFix(c)]=nn(a);
    const merchants={};for(const [m,c] of Object.entries(obj(v.merchants)).slice(0,2000))merchants[str(m,80)]=catFix(c);
    return {tx,budgets,merchants};
  }
  if(doc==='claude'){
    const projects=arr(v.projects).slice(0,300).map(p=>{p=obj(p);return {id:sid(p.id),name:str(p.name,120)||'Proyecto',status:STATUS.some(s=>s[0]===p.status)?p.status:'idea',client:str(p.client,80),value:Math.max(0,nn(p.value)),next:str(p.next,200),link:safeUrl(p.link)}});
    const subs=arr(v.subs).slice(0,100).map(s=>{s=obj(s);return {id:sid(s.id),name:str(s.name,80)||'Suscripción',amt:Math.max(0,nn(s.amt!=null?s.amt:s.usd)),cur:s.cur==='CLP'?'CLP':'USD'}});
    const usage=arr(v.usage).slice(0,5000).filter(u=>u&&typeof u==='object'&&isDate(u.date)).map(u=>({id:sid(u.id),date:u.date,usd:Math.max(0,nn(u.usd)),proj:str(u.proj,120)}));
    return {projects,subs,usage,rate:nn(v.rate)>0?nn(v.rate):950};
  }
  if(doc==='week'){
    const blocks=arr(v.blocks).slice(0,400).filter(b=>b&&typeof b==='object'&&isHM(b.start)&&isHM(b.end)).map(b=>({id:sid(b.id),day:Math.max(0,Math.min(6,Math.round(nn(b.day)))),start:b.start,end:b.end,area:AREA_KEYS.includes(b.area)?b.area:'salud',title:str(b.title,80)||'Bloque',lock:!!b.lock}));
    return {blocks};
  }
  if(doc==='meta'){
    const a=obj(v.alarm),cd=obj(v.countdown),an={};
    for(const k of AREA_KEYS){const n=str(obj(v.areaNames)[k],24).trim();if(n)an[k]=n}
    let countdown={label:str(cd.label,40),date:isDate(cd.date)?cd.date:''};
    if(!countdown.date&&isDate(v.baby))countdown={label:'Bebé',date:v.baby}; // datos traídos de la versión anterior
    return {name:str(v.name,40),tab:VIEWS[v.tab]?v.tab:'inicio',alarm:{time:isHM(a.time)?a.time:'06:30',ex:['flexiones','sentadillas','alternar'].includes(a.ex)?a.ex:'flexiones'},countdown,areaNames:an,onboarded:!!v.onboarded,mig2L:true};
  }
  return f;
}
let S=defaults();
let me=null,email='',booting=false;
const timers={},writing={},rev={},fails={};
const dirty=new Set();
const cacheKey=d=>'esquina:'+me+':'+d;
function cacheWrite(doc){if(!me)return;try{localStorage.setItem(cacheKey(doc),JSON.stringify({d:S[doc],dirty:dirty.has(doc)}))}catch(e){}}
function save(doc){
  if(!me)return;
  rev[doc]=(rev[doc]||0)+1;dirty.add(doc);cacheWrite(doc);setSync();
  clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),500);
}
async function flush(doc){
  if(!me||!dirty.has(doc))return;
  if(writing[doc]){clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),400);return}
  const r=rev[doc],who=me;writing[doc]=true;
  try{
    const {error}=await sb.from('user_docs').upsert({user_id:who,doc,data:JSON.parse(JSON.stringify(S[doc]))});
    if(error)throw error;
    fails[doc]=0;
    if(who===me&&rev[doc]===r){dirty.delete(doc);cacheWrite(doc)}
  }catch(e){
    if(who!==me)return;
    if(e&&e.code==='23514'){toast('Se llenó el espacio de esta sección. Borra registros antiguos.');dirty.delete(doc);cacheWrite(doc)}
    else{fails[doc]=(fails[doc]||0)+1;clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),Math.min(60000,2000*2**fails[doc]))}
  }finally{writing[doc]=false;setSync()}
}
async function flushAll(){for(const d of [...dirty]){clearTimeout(timers[d]);await flush(d)}}
function setSync(){
  const el=$('#sync');if(!el)return;
  const off=!navigator.onLine,pend=dirty.size>0;
  el.classList.toggle('on',!pend&&!off);el.classList.toggle('warn',off||(pend&&Object.values(fails).some(x=>x>0)));
  el.querySelector('span').textContent=off?(pend?'Sin conexión · se guarda al volver':'Sin conexión'):pend?'Guardando…':'Guardado en tu cuenta';
}
window.addEventListener('online',()=>{setSync();for(const d of dirty){fails[d]=0;flush(d)}});
window.addEventListener('offline',setSync);
window.addEventListener('pagehide',()=>{for(const d of dirty)cacheWrite(d)});

/* ---------- cálculos ---------- */
const H=()=>S.habits;
function doneOn(k){return H().log[k]||{}}
function W(){const h=H();if(!h.water)h.water={goal:2000,log:{}};if(!h.water.log)h.water.log={};return h.water}
const WATER_XP=15, WAKE_XP=20;
function WK(){const h=H();if(!h.wake)h.wake={};return h.wake}
function AL(){if(!S.meta.alarm)S.meta.alarm={time:'06:30',ex:'flexiones'};return S.meta.alarm}
function totalXP(){let t=0;for(const k in H().log)for(const id in H().log[k])t+=H().log[k][id];const w=W();for(const k in w.log)if(w.log[k]>=w.goal)t+=WATER_XP;t+=Object.keys(WK()).length*WAKE_XP;return t}
function habitStreak(id){
  let k=today();if(!doneOn(k)[id])k=addDays(k,-1);
  let n=0;while(doneOn(k)[id]){n++;k=addDays(k,-1)}return n;
}
function dayRatio(k){const n=H().list.length;if(!n)return 0;const d=doneOn(k);return H().list.filter(h=>d[h.id]).length/n}
function bigStreak(){
  let k=today();if(dayRatio(k)<.5)k=addDays(k,-1);
  let n=0;while(dayRatio(k)>=.5){n++;k=addDays(k,-1)}return n;
}
function monthTx(m){return S.money.tx.filter(t=>monthKey(t.date)===m)}
/* Herramientas del mes en pesos: suscripciones fijas + uso variable en dólares */
function toolsMonth(m){
  const C=S.claude;
  const subs=C.subs.reduce((a,s)=>a+(s.cur==='CLP'?s.amt:s.amt*C.rate),0);
  const apiUsd=C.usage.filter(u=>monthKey(u.date)===m).reduce((a,u)=>a+(+u.usd||0),0);
  return {subs,apiUsd,api:apiUsd*C.rate,total:subs+apiUsd*C.rate};
}
function daysTo(k){const [y,m,d]=k.split('-').map(Number);const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(y,m-1,d)-t)/864e5)}
const firstName=()=>(S.meta.name||'').trim().split(/\s+/)[0]||'';

/* ---------- UI ---------- */
const ICONS={
  inicio:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  habitos:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  dinero:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  claude:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  semana:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
const TABS=[['inicio','Inicio'],['habitos','Hábitos'],['dinero','Dinero'],['claude','Proyectos'],['semana','Semana']];
const TITLES={inicio:['Mi','Esquina'],habitos:['Tus','Hábitos'],dinero:['Tu','Plata'],claude:['Tus','Proyectos'],semana:['Tu','Semana']};
let tab='inicio', moneyMonth=monthKey(today()), txType='gasto';
function drawTabs(){
  $('#tabs').innerHTML=TABS.map(([k,n])=>`<button data-tab="${k}" class="${k===tab?'on':''}" aria-current="${k===tab?'page':'false'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>${n}</button>`).join('');
  $('#tab-ind').style.setProperty('--i',Math.max(0,TABS.findIndex(x=>x[0]===tab)));
}
let slideDir='';
function go(t){
  if(t===tab){window.scrollTo({top:0,behavior:RM?'auto':'smooth'});return}
  const a=TABS.findIndex(x=>x[0]===tab),b=TABS.findIndex(x=>x[0]===t);slideDir=b>a?'l':'r';
  entering=true;tab=t;drawTabs();render();window.scrollTo(0,0);try{localStorage.setItem('esquina.tab',t)}catch(e){}
}

const prevRing={};
function ring(p,size=104,stroke=11,key='day'){
  const r=(size-stroke)/2,c=2*Math.PI*r,to=c*(1-Math.min(1,p)),from=prevRing[key]??c;prevRing[key]=to;const g='rg-'+key;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--red2)"/><stop offset="1" style="stop-color:var(--red)"/></linearGradient></defs><circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#${g})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" class="rprog" data-to="${to}" style="stroke-dashoffset:${from}"/></svg>`;
}
function beltHTML(bi){
  const b=bi.b;
  return `<div class="belt" style="--belt:${b.col}"><div class="tip ${b.n==='Negro'?'red':''}">${[0,1,2,3].map(i=>`<i class="${i<bi.stripes?'on':''}"></i>`).join('')}</div></div><div class="bar xp" title="Avance al siguiente cinturón"><i style="--w:${Math.min(1,bi.pct).toFixed(3)}"></i></div>`;
}
function habitRow(h,k){
  const d=doneOn(k)[h.id];const st=habitStreak(h.id);
  const a=AREAS[h.area]||AREAS.salud;
  const wk=[...Array(7)].map((_,i)=>{const kk=addDays(k,i-6);return `<b class="${doneOn(kk)[h.id]?'y':''}"></b>`}).join('');
  return `<button class="habit ${d?'done':''}" data-hab="${esc(h.id)}" style="--c:${a.c}" aria-pressed="${!!d}">
    <span class="ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg></span>
    <span style="flex:1;min-width:0"><span class="hn">${esc(h.name)}</span><span class="week7">${wk}</span>
    <span class="note">${esc(a.n)}${st?` · racha ${st} ${st===1?'día':'días'}`:''}</span></span>
    <span class="pts">+${+h.pts}</span></button>`;
}
function countdownCard(){
  const cd=S.meta.countdown||{};
  if(!isDate(cd.date))return `<div class="card tint" style="--c:var(--a-contenido)"><h2>Tu fecha importante</h2><div class="big muted">—</div><div class="note">Una pelea, un examen, un viaje, un nacimiento.</div><button class="btn sm" type="button" data-settings="cd" style="margin-top:8px">Elegir fecha</button></div>`;
  const n=daysTo(cd.date);
  return `<div class="card tint" style="--c:var(--a-contenido)"><h2>${esc(cd.label||'Cuenta regresiva')}</h2><div class="big num" ${n>0?`data-count="${n}" data-ck="cd"`:''}>${n>0?n:n===0?'¡Hoy!':'Listo'}</div><div class="note">${n>0?(n===1?'día':'días')+' para el '+fmtDate(cd.date):n===0?'Es hoy':'Fue el '+fmtDate(cd.date)}</div></div>`;
}
function welcomeCard(){
  if(S.meta.onboarded)return '';
  return `<div class="card welcome" style="margin-bottom:12px"><h2 style="color:var(--fg)">Tu esquina está lista${firstName()?', '+esc(firstName()):''} <button class="x" type="button" data-onb aria-label="Cerrar bienvenida">×</button></h2>
  <ol><li>Marca un hábito de abajo apenas lo cumplas. Cada uno suma XP para subir de cinturón.</li><li>Anota tu primer gasto con el botón rojo <b>+ Gasto</b>.</li><li>Arma tu semana en <b>Semana</b>. Puedes partir con un ejemplo.</li><li>Instálala en tu celular desde <b>Ajustes</b> (el engranaje de arriba).</li></ol></div>`;
}

function vInicio(){
  const k=today(),m=monthKey(k);
  const xp=totalXP(),bi=beltFor(xp),r=dayRatio(k),st=bigStreak();
  const tx=monthTx(m),gas=tx.filter(t=>t.type==='gasto').reduce((a,t)=>a+t.amt,0),ing=tx.filter(t=>t.type==='ingreso').reduce((a,t)=>a+t.amt,0);
  const tm=toolsMonth(m);
  const active=S.claude.projects.filter(p=>p.status==='curso');
  const todayBlocks=S.week.blocks.filter(b=>b.day===dow(k)).sort((a,b)=>a.start.localeCompare(b.start));
  const nowHM=pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  const pending=H().list.filter(h=>!doneOn(k)[h.id]).slice(0,3);
  return `
  ${welcomeCard()}
  ${alarmCard()}
  <div class="grid g2 stack-sm" style="margin-top:12px">
    <div class="card hero" style="display:flex;gap:16px;align-items:center">
      <div class="ring">${ring(r)}<div class="c"><div><div class="big num" data-count="${Math.round(r*100)}" data-kind="pct" data-ck="pct">${Math.round(r*100)}%</div><div class="note">del día</div></div></div></div>
      <div style="min-width:0">
        <div class="eyebrow">Round de hoy</div>
        <div style="font-weight:700;font-size:17px;margin:2px 0 6px">${r>=1?'Round ganado. Día perfecto.':r>=.5?'Vas ganando el round.':'Sal de la esquina.'}</div>
        <div class="muted" style="font-size:14px">${pending.length?'Falta: '+pending.map(h=>esc(h.name.split(' (')[0])).join(', '):H().list.length?'Todo hecho hoy.':'Agrega hábitos en la pestaña Hábitos.'}</div>
      </div>
    </div>
    <div class="card">
      <h2>Cinturón <span class="chip num">${xp.toLocaleString('es-CL')} XP</span></h2>
      ${beltHTML(bi)}
      <div style="display:flex;justify-content:space-between;margin-top:10px;gap:8px;flex-wrap:wrap">
        <div><span class="disp" style="font-size:26px">${bi.b.n.toUpperCase()}</span> <span class="muted">· ${bi.stripes} ${bi.stripes===1?'grado':'grados'}</span></div>
        <div class="muted" style="font-size:13px;align-self:center">${bi.next?`${bi.left.toLocaleString('es-CL')} XP para ${bi.next.n.toLowerCase()}`:'Cinturón máximo'}</div>
      </div>
    </div>
  </div>
  <div style="margin-top:12px">${waterCard()}</div>
  <div class="grid g3" style="margin-top:12px">
    <div class="card tint" style="--c:var(--red)"><h2>Racha</h2><div class="flame num" data-count="${st}" data-ck="racha">${st}</div><div class="note">${st===1?'día con la mitad o más':'días seguidos con la mitad o más'}</div></div>
    ${countdownCard()}
    <div class="card tint" style="--c:${ing-gas>=0?'var(--ok)':'var(--red)'}"><h2>Saldo del mes</h2><div class="big num" data-count="${ing-gas}" data-kind="clp" data-ck="saldo">${clp(ing-gas)}</div><div class="note">${clp(ing)} entra · ${clp(gas)} sale</div></div>
    <div class="card tint" style="--c:var(--blue)"><h2>Herramientas del mes</h2><div class="big num" data-count="${Math.round(tm.total)}" data-kind="clp" data-ck="tools">${clp(tm.total)}</div><div class="note">${S.claude.subs.length?S.claude.subs.length+(S.claude.subs.length===1?' suscripción':' suscripciones')+(tm.apiUsd?' · uso '+usd(tm.apiUsd):''):'Anota tus suscripciones en Proyectos'}</div></div>
    <div class="card tint" style="--c:var(--a-empresa)"><h2>Proyectos activos</h2><div class="big num" data-count="${active.length}" data-ck="proj">${active.length}</div><div class="note">${active.length?esc(active.slice(0,2).map(p=>p.name).join(', ')):'Ninguno en curso'}</div></div>
    <div class="card tint" style="--c:var(--a-familia)"><h2>Gasto más grande</h2>${topCat(tx)}</div>
  </div>
  ${weekGlance(k)}
  <div class="sec">
    <div class="sec-h"><h3>Hoy, ${DIAS[dow(k)].toLowerCase()}</h3><button class="btn sm" data-go="semana">Ver semana</button></div>
    <div class="card"><div class="list">${todayBlocks.length?todayBlocks.map(b=>{const a=AREAS[b.area]||AREAS.salud;const now=b.start<=nowHM&&nowHM<b.end;return `<div class="li"><span class="dot" style="background:${a.c}"></span><div class="grow"><div class="t">${esc(b.title)} ${now?'<span class="chip" style="color:var(--red)">Ahora</span>':''}</div><div class="s num">${b.start}–${b.end} · ${esc(a.n)}${b.lock?' · protegido':''}</div></div></div>`}).join(''):'<div class="empty">Nada agendado hoy.</div>'}</div></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Marca tus hábitos</h3><button class="btn sm" data-go="habitos">Todos</button></div>
    <div class="grid">${H().list.map(h=>habitRow(h,k)).join('')||'<div class="empty">Agrega tu primer hábito en la pestaña Hábitos.</div>'}</div>
  </div>`;
}
function weekGlance(k){
  const mon=addDays(k,-dow(k));
  const days=[...Array(7)].map((_,i)=>{const kk=addDays(mon,i);return {kk,i,r:kk<=k?dayRatio(kk):null}});
  const past=days.filter(d=>d.r!==null);const avg=past.reduce((a,d)=>a+d.r,0)/(past.length||1);
  const wk=S.money.tx.filter(t=>t.type==='gasto'&&t.date>=mon&&t.date<=addDays(mon,6)).reduce((a,t)=>a+t.amt,0);
  const train=S.week.blocks.filter(b=>b.area==='deporte').length;
  const next=S.claude.projects.filter(p=>p.status==='curso'&&p.next).slice(0,3);
  return `<div class="sec"><div class="sec-h"><h3>Esta semana</h3><span class="muted num">${Math.round(avg*100)}% de hábitos cumplidos</span></div>
  <div class="card"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:92px">${days.map(d=>`<div style="display:grid;gap:4px;justify-items:center;align-self:stretch;align-content:end"><div class="wb" style="--d:${d.i};width:100%;max-width:34px;height:${d.r===null?4:Math.max(4,d.r*64)}px;border-radius:8px;background:${d.r===null?'var(--sunk)':d.r>=1?'var(--red)':d.r>=.5?'color-mix(in srgb,var(--red) 60%,var(--sunk))':'color-mix(in srgb,var(--red) 25%,var(--sunk))'}"></div><span class="note" style="${d.kk===k?'color:var(--red);font-weight:700':''}">${DIAS[d.i]}</span></div>`).join('')}</div>
  <div class="grid g3" style="margin-top:12px;gap:8px"><div><div class="eyebrow">Gastado</div><b class="num">${clp(wk)}</b></div><div><div class="eyebrow">${esc(AREAS.deporte.n)}</div><b class="num">${train} ${train===1?'bloque':'bloques'}</b></div><div><div class="eyebrow">XP semana</div><b class="num">${days.filter(d=>d.r!==null).reduce((a,d)=>a+Object.values(doneOn(d.kk)).reduce((x,y)=>x+y,0),0)}</b></div></div>
  ${next.length?`<div class="list" style="margin-top:10px">${next.map(p=>`<div class="li"><span class="dot" style="background:var(--blue)"></span><div class="grow"><div class="t">${esc(p.next)}</div><div class="s">${esc(p.name)}</div></div></div>`).join('')}</div>`:''}
  </div></div>`;
}
function topCat(tx){
  const by={};tx.filter(t=>t.type==='gasto').forEach(t=>by[t.cat]=(by[t.cat]||0)+t.amt);
  const e=Object.entries(by).sort((a,b)=>b[1]-a[1])[0];
  return e?`<div class="big num" data-count="${Math.round(e[1])}" data-kind="clp" data-ck="top">${clp(e[1])}</div><div class="note">${esc(e[0])}</div>`:`<div class="big muted">—</div><div class="note">Sin gastos este mes</div>`;
}
function fmtDate(k){const [y,m,d]=k.split('-').map(Number);return d+' de '+MESES[m-1]}

function vHabitos(){
  const k=today();const xp=totalXP(),bi=beltFor(xp);
  const start=addDays(k,-(7*12-1)-dow(addDays(k,-(7*12-1))));
  let cells='';for(let i=0;i<7*13;i++){const kk=addDays(start,i);if(kk>k)break;const r=dayRatio(kk);cells+=`<i title="${kk}: ${Math.round(r*100)}%" style="--n:${i};border-radius:4px;background:${r?`color-mix(in srgb,var(--red) ${20+r*80}%,var(--sunk))`:'var(--sunk)'}"></i>`}
  return `
  <div class="card">
    <h2>Tu cinturón <span class="chip num">${xp.toLocaleString('es-CL')} XP</span></h2>
    ${beltHTML(bi)}
    <div class="note" style="margin-top:8px">Cada hábito suma XP. Cinco grados por cinturón: blanco, azul, morado, marrón y negro. ${bi.next?`Te faltan <b class="num">${bi.left.toLocaleString('es-CL')} XP</b> para ${bi.next.n.toLowerCase()}.`:''}</div>
  </div>
  <div class="sec">
    ${waterCard()}
    ${wakeHistory()}
    <div class="sec-h"><h3>Hoy</h3><span class="muted num">${H().list.filter(h=>doneOn(k)[h.id]).length}/${H().list.length} hechos</span></div>
    <div class="grid">${H().list.map(h=>habitRow(h,k)).join('')||'<div class="empty">Sin hábitos. Agrega uno abajo.</div>'}</div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Últimas 13 semanas</h3><span class="note">Más rojo, más completo el día</span></div>
    <div class="card scroll-x"><div class="hm" style="display:grid;grid-template-rows:repeat(7,14px);grid-auto-flow:column;grid-auto-columns:14px;gap:3px">${cells}</div></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Tus hábitos</h3></div>
    <div class="card"><div class="list">${H().list.map(h=>{const a=AREAS[h.area]||AREAS.salud;return `<div class="li"><span class="dot" style="background:${a.c}"></span><div class="grow"><div class="t">${esc(h.name)}</div><div class="s">${esc(a.n)} · ${+h.pts} XP · racha ${habitStreak(h.id)}</div></div><button class="x" data-delhab="${esc(h.id)}" aria-label="Borrar ${esc(h.name)}">×</button></div>`}).join('')}</div>
    <form class="row" id="f-alarm" style="margin-top:12px"><label>Hora de despertar<input id="al-time" type="time" value="${esc(AL().time)}" required></label><label>Reto<select id="al-ex">${[['flexiones','10 flexiones'],['sentadillas','10 sentadillas'],['alternar','Alternar cada día']].map(([v,n])=>`<option value="${v}" ${AL().ex===v?'selected':''}>${n}</option>`).join('')}</select></label><button class="btn" type="submit">Guardar despertador</button></form>
    <form class="row" id="f-water" style="margin-top:12px"><label>Meta de agua diaria (litros)<input id="w-goal" inputmode="decimal" value="${(W().goal/1000).toLocaleString('es-CL')}"></label><button class="btn" type="submit">Guardar meta</button></form>
    <form class="row" id="f-hab" style="margin-top:12px">
      <label style="grid-column:1/-1">Nuevo hábito<input id="hab-name" required maxlength="120" placeholder="Ej: 20 minutos de lectura"></label>
      <label>Área<select id="hab-area">${areaOpts('deporte')}</select></label>
      <label>XP<select id="hab-pts"><option value="10">10 · fácil</option><option value="20" selected>20 · medio</option><option value="30">30 · difícil</option></select></label>
      <button class="btn pri" type="submit">Agregar</button>
    </form></div>
  </div>`;
}

function vDinero(){
  const tx=monthTx(moneyMonth).sort((a,b)=>b.date.localeCompare(a.date));
  const gas=tx.filter(t=>t.type==='gasto'),ing=tx.filter(t=>t.type==='ingreso');
  const G=gas.reduce((a,t)=>a+t.amt,0),I=ing.reduce((a,t)=>a+t.amt,0);
  const by={};gas.forEach(t=>by[t.cat]=(by[t.cat]||0)+t.amt);
  const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  const max=cats.length?cats[0][1]:1;
  const [y,mm]=moneyMonth.split('-').map(Number);
  const tm=toolsMonth(moneyMonth);
  const scUrl=location.origin+location.pathname+'#g-';
  return `
  <div class="sec-h" style="margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:6px"><button class="btn sm" data-mon="-1" aria-label="Mes anterior">‹</button><h3 class="disp" style="font-size:26px;text-transform:uppercase">${MESES[mm-1]} ${y}</h3><button class="btn sm" data-mon="1" aria-label="Mes siguiente">›</button></div>
  </div>
  <div class="grid g3">
    <div class="card tint" style="--c:var(--ok)"><h2>Entró</h2><div class="big num" data-count="${Math.round(I)}" data-kind="clp" data-ck="in">${clp(I)}</div></div>
    <div class="card tint" style="--c:var(--red)"><h2>Salió</h2><div class="big num" data-count="${Math.round(G)}" data-kind="clp" data-ck="out">${clp(G)}</div></div>
    <div class="card tint wide" style="--c:${I-G<0?'var(--red)':'var(--blue)'}"><h2>Quedó</h2><div class="big num" data-count="${Math.round(I-G)}" data-kind="clp" data-ck="left">${clp(I-G)}</div><div class="note">${I?Math.round((I-G)/I*100)+'% ahorrado':'Registra tus ingresos'}</div></div>
  </div>
  <div class="card" style="margin-top:12px">
    <h2>Anotar movimiento <span class="seg"><button type="button" data-type="gasto" class="${txType==='gasto'?'on':''}">Gasto</button><button type="button" data-type="ingreso" class="${txType==='ingreso'?'on':''}">Ingreso</button></span></h2>
    <form class="row" id="f-tx">
      <label>Monto (CLP)<input id="tx-amt" inputmode="numeric" required placeholder="12.500"></label>
      <label>Categoría<select id="tx-cat">${(txType==='gasto'?CAT_G:CAT_I).map(c=>`<option>${c}</option>`).join('')}</select></label>
      <label>Fecha<input id="tx-date" type="date" value="${today()}" required></label>
      <label>Nota<input id="tx-note" maxlength="120" placeholder="Opcional"></label>
      <button class="btn ${txType==='gasto'?'red':'pri'}" type="submit">Guardar ${txType}</button>
    </form>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>A dónde va tu plata</h3></div>
    <div class="card">${cats.length?cats.map(([c,v],ci)=>{const bud=S.money.budgets[c];const over=bud&&v>bud;const col=over?'var(--red)':CAT_COL[ci%CAT_COL.length];return `<div style="display:grid;gap:6px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${col}"></span>${esc(c)}</b><span class="num ${over?'':'muted'}" style="${over?'color:var(--red);font-weight:700':''}">${clp(v)}${bud?' / '+clp(bud):''} · ${Math.round(v/G*100)}%</span></div><div class="bar"><i style="width:${bud?Math.min(100,v/bud*100):v/max*100}%;background:${col}"></i></div></div>`}).join(''):'<div class="empty">Aún no hay gastos este mes. Anota el primero arriba y aquí verás en qué se va tu plata.</div>'}
    ${tm.total?`<div class="note">Además, tus herramientas este mes: ${clp(tm.total)}. Si las pagas tú, anótalas como gasto en "Trabajo y negocio".</div>`:''}
    </div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Movimientos</h3><span class="muted num">${tx.length}</span></div>
    <div class="card"><div class="list">${tx.length?tx.map(t=>`<div class="li"><span class="dot" style="background:${t.type==='gasto'?'var(--red)':'var(--ok)'}"></span><div class="grow"><div class="t">${esc(t.cat)}${t.note?' · <span class="muted" style="font-weight:500">'+esc(t.note)+'</span>':''}</div><div class="s num">${fmtDate(t.date)}</div></div><b class="num" style="color:${t.type==='gasto'?'var(--fg)':'var(--ok)'}">${t.type==='gasto'?'−':'+'}${clp(t.amt)}</b><button class="x" data-deltx="${esc(t.id)}" aria-label="Borrar movimiento">×</button></div>`).join(''):'<div class="empty">Sin movimientos en este mes.</div>'}</div></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Al pagar con el celular</h3><span class="note">iPhone con Apple Pay</span></div>
    <div class="card">
      <p style="margin:0 0 10px">Cada vez que pagas con el iPhone se abre Mi Esquina con el monto y el comercio ya puestos, y la categoría adivinada. Tú solo tocas <b>Confirmar gasto</b>. La app aprende: si cambias la categoría de un comercio, la próxima vez la elige sola.</p>
      <ol style="margin:0;padding-left:20px;display:grid;gap:6px">
        <li>Abre <b>Atajos</b>, pestaña <b>Automatización</b>, toca <b>+</b> y elige <b>Transacción</b>. Marca tus tarjetas, deja todas las categorías y elige <b>Ejecutar inmediatamente</b>.</li>
        <li>Agrega <b>Reemplazar texto</b>: en el texto pon la variable <b>Importe</b>, activa <b>Expresión regular</b>, busca <code>[^0-9]</code> y reemplaza con nada.</li>
        <li>Agrega otro <b>Reemplazar texto</b>: en el texto pon <b>Comercio</b>, activa <b>Expresión regular</b>, busca <code>[^A-Za-z0-9]</code> y reemplaza con <code>_</code></li>
        <li>Agrega <b>Abrir URL</b> y escribe el enlace de abajo. Después de <code>#g-</code> pon el primer texto reemplazado, un guion, y el segundo.</li>
      </ol>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
        <code id="sc-url" style="background:var(--sunk);border-radius:8px;padding:8px 10px;font-size:13px;overflow-wrap:anywhere;flex:1;min-width:0;user-select:all">${esc(scUrl)}</code>
        <button class="btn sm" type="button" data-copy="sc-url">Copiar enlace</button>
      </div>
      <div class="note" style="margin-top:8px">Queda así: <code>…#g-</code><b>Texto reemplazado</b><code>-</code><b>Texto reemplazado</b>. Ejemplo: una compra de $12.500 en LIDER EXPRESS abre <code>…#g-12500-LIDER_EXPRESS</code>. En Android, usa el botón <b>+ Gasto</b> y pega el aviso del banco.</div>
      <button class="btn sm" type="button" data-trysc style="margin-top:10px">Ver cómo se ve</button>
    </div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Presupuesto mensual</h3><span class="note">Opcional. Te avisa en rojo si te pasas.</span></div>
    <div class="card"><form class="row" id="f-bud"><label>Categoría<select id="bud-cat">${CAT_G.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Tope (CLP)<input id="bud-amt" inputmode="numeric" placeholder="150.000"></label><button class="btn" type="submit">Fijar tope</button></form>
    ${Object.keys(S.money.budgets).length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${Object.entries(S.money.budgets).map(([c,v])=>`<span class="chip">${esc(c)}: ${clp(v)} <button class="x" style="font-size:14px;padding:0 2px" data-delbud="${esc(c)}" aria-label="Quitar tope">×</button></span>`).join('')}</div>`:''}</div>
  </div>`;
}

function vProyectos(){
  const m=monthKey(today());const tm=toolsMonth(m);const C=S.claude;
  const perProj={};C.usage.filter(u=>monthKey(u.date)===m).forEach(u=>perProj[u.proj||'Sin proyecto']=(perProj[u.proj||'Sin proyecto']||0)+(+u.usd||0));
  const order={curso:0,idea:1,pausa:2,listo:3,vendido:4};
  const P=[...C.projects].sort((a,b)=>(order[a.status]??9)-(order[b.status]??9));
  const pipeline=C.projects.filter(p=>p.status!=='vendido').reduce((a,p)=>a+(+p.value||0),0);
  const cobrado=C.projects.filter(p=>p.status==='vendido').reduce((a,p)=>a+(+p.value||0),0);
  const usage=[...C.usage].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  return `
  <div class="grid g3">
    <div class="card tint" style="--c:var(--blue)"><h2>Herramientas · ${MESES[+m.slice(5)-1]}</h2><div class="big num" data-count="${Math.round(tm.total)}" data-kind="clp" data-ck="tools">${clp(tm.total)}</div><div class="note">${clp(tm.subs)} fijo${tm.apiUsd?' · '+usd(tm.apiUsd)+' variable':''}</div></div>
    <div class="card tint" style="--c:var(--warn)"><h2>Por cobrar</h2><div class="big num" data-count="${Math.round(pipeline)}" data-kind="clp" data-ck="pipe">${clp(pipeline)}</div><div class="note">en proyectos abiertos</div></div>
    <div class="card tint wide" style="--c:var(--ok)"><h2>Cobrado</h2><div class="big num" data-count="${Math.round(cobrado)}" data-kind="clp" data-ck="paid">${clp(cobrado)}</div><div class="note">${tm.total?'Retorno vs herramientas: '+(cobrado?Math.round(cobrado/tm.total)+'x':'aún 0'):'—'}</div></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Proyectos</h3><span class="muted">${C.projects.filter(p=>p.status==='curso').length} en curso</span></div>
    <div class="card"><div class="list">${P.map(p=>{const s=stInfo(p.status);return `<div class="li" style="align-items:flex-start"><span class="dot" style="background:${s[2]};margin-top:7px"></span><div class="grow"><div class="t">${safeUrl(p.link)?`<a href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer" style="color:inherit">${esc(p.name)}</a>`:esc(p.name)}</div><div class="s">${esc(p.client||'Sin cliente')}${+p.value?' · '+clp(p.value):''}${perProj[p.name]?' · uso '+usd(perProj[p.name]):''}</div>${p.next?`<div class="s">Siguiente paso: ${esc(p.next)}</div>`:''}</div><select data-pst="${esc(p.id)}" aria-label="Estado de ${esc(p.name)}" style="width:auto;min-height:38px;padding:6px 8px">${STATUS.map(x=>`<option value="${x[0]}" ${x[0]===p.status?'selected':''}>${x[1]}</option>`).join('')}</select><button class="x" data-delp="${esc(p.id)}" aria-label="Borrar proyecto">×</button></div>`}).join('')||'<div class="empty">Sin proyectos todavía. Anota lo que estás construyendo, para quién y cuál es el siguiente paso.</div>'}</div>
    <form class="row" id="f-p" style="margin-top:12px">
      <label style="grid-column:1/-1">Nuevo proyecto<input id="p-name" required maxlength="120" placeholder="Ej: Página web para una pyme"></label>
      <label>Cliente<input id="p-client" maxlength="80" placeholder="Opcional"></label>
      <label>Valor (CLP)<input id="p-value" inputmode="numeric" placeholder="0"></label>
      <label>Estado<select id="p-status">${STATUS.map(x=>`<option value="${x[0]}" ${x[0]==='curso'?'selected':''}>${x[1]}</option>`).join('')}</select></label>
      <label style="grid-column:1/-1">Siguiente paso<input id="p-next" maxlength="200" placeholder="Ej: enviar propuesta el viernes"></label>
      <label style="grid-column:1/-1">Enlace<input id="p-link" type="url" maxlength="500" placeholder="https://… (documento, carpeta o sitio)"></label>
      <button class="btn pri" type="submit">Agregar proyecto</button>
    </form></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Suscripciones</h3><span class="note">Lo que pagas cada mes por tus herramientas</span></div>
    <div class="card"><div class="list">${C.subs.map(s=>`<div class="li"><div class="grow"><div class="t">${esc(s.name)}</div><div class="s num">${s.cur==='USD'?'≈ '+clp(s.amt*C.rate)+' al mes':'al mes'}</div></div><b class="num">${s.cur==='USD'?usd(s.amt):clp(s.amt)}</b><button class="x" data-dels="${esc(s.id)}" aria-label="Quitar suscripción">×</button></div>`).join('')||'<div class="empty">Sin suscripciones. Ej: Canva, ChatGPT, Claude, Adobe, Spotify de trabajo.</div>'}</div>
    <form class="row" id="f-s" style="margin-top:12px"><label>Nombre<input id="s-name" required maxlength="80" placeholder="Canva Pro"></label><label>Monto al mes<input id="s-amt" inputmode="decimal" required placeholder="12,99"></label><label>Moneda<select id="s-cur"><option value="USD">Dólares</option><option value="CLP">Pesos</option></select></label><button class="btn" type="submit">Agregar</button></form></div>
  </div>
  <div class="sec">
    <div class="sec-h"><h3>Gasto variable</h3><span class="note">Uso de API, anuncios u otros cobros por consumo, en dólares</span></div>
    <div class="card">
      <form class="row" id="f-u"><label>Fecha<input id="u-date" type="date" value="${today()}" required></label><label>US$<input id="u-usd" inputmode="decimal" required placeholder="3,40"></label><label>Proyecto<select id="u-proj"><option value="">Sin proyecto</option>${C.projects.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select></label><button class="btn pri" type="submit">Anotar</button></form>
      <div class="list" style="margin-top:10px">${usage.length?usage.map(u=>`<div class="li"><div class="grow"><div class="t">${esc(u.proj||'Sin proyecto')}</div><div class="s num">${fmtDate(u.date)}</div></div><b class="num">${usd(u.usd)}</b><button class="x" data-delu="${esc(u.id)}" aria-label="Borrar registro">×</button></div>`).join(''):'<div class="empty">Copia aquí lo que te cobra cada plataforma, por día o por semana.</div>'}</div>
      <form class="row" id="f-rate" style="margin-top:14px"><label>Dólar en pesos<input id="rate" inputmode="numeric" value="${+C.rate}"></label><button class="btn sm" type="submit">Actualizar dólar</button></form>
    </div>
  </div>`;
}

function vSemana(){
  const k=today(),td=dow(k);
  const hrs={};S.week.blocks.forEach(b=>{const [h1,m1]=b.start.split(':').map(Number),[h2,m2]=b.end.split(':').map(Number);hrs[b.area]=(hrs[b.area]||0)+Math.max(0,(h2*60+m2-h1*60-m1)/60)});
  const total=Object.values(hrs).reduce((a,b)=>a+b,0)||1;
  const empty=!S.week.blocks.length;
  return `
  <div class="card">
    <h2>Horas por semana <span class="note" style="text-transform:none;letter-spacing:0">${empty?0:Math.round(total)} h agendadas</span></h2>
    <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;background:var(--sunk)">${AREA_KEYS.filter(a=>hrs[a]).map(a=>`<i style="width:${hrs[a]/total*100}%;background:${AREAS[a].c}"></i>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px">${AREA_KEYS.map(a=>`<span class="chip" style="background:none;padding:0"><span class="dot" style="background:${AREAS[a].c}"></span>${esc(AREAS[a].n)} <span class="muted num">${(Math.round((hrs[a]||0)*10)/10).toLocaleString('es-CL')} h</span></span>`).join('')}</div>
  </div>
  ${empty?`<div class="card" style="margin-top:12px"><h2>Tu semana está vacía</h2><p style="margin:0 0 10px">Agrega bloques abajo, o parte con una semana de ejemplo y ajústala a tu vida.</p><button class="btn pri" type="button" data-samplewk>Cargar semana de ejemplo</button></div>`:''}
  <div class="sec">
    <div class="sec-h"><h3>Tu semana</h3><span class="note">Los bloques protegidos no se negocian</span></div>
    <div class="days">${DIAS.map((d,i)=>`<div class="day ${i===td?'today':''}"><div class="dh">${d}${i===td?' · hoy':''}</div>${S.week.blocks.filter(b=>b.day===i).sort((a,b)=>a.start.localeCompare(b.start)).map(b=>{const a=AREAS[b.area]||AREAS.salud;return `<div class="blk" style="--c:${a.c}">${b.lock?'<span class="lock">Protegido</span>':''}<b>${esc(b.title)}</b><span class="num muted">${b.start}–${b.end}</span><button class="x" data-delb="${esc(b.id)}" aria-label="Borrar bloque">×</button></div>`}).join('')}</div>`).join('')}</div>
  </div>
  <div class="sec">
    <div class="card"><h2>Agregar bloque</h2>
    <form class="row" id="f-b">
      <label style="grid-column:1/-1">Qué<input id="b-title" required maxlength="80" placeholder="Ej: Clase de inglés"></label>
      <label>Día<select id="b-day">${DIAS.map((d,i)=>`<option value="${i}" ${i===td?'selected':''}>${d}</option>`).join('')}<option value="lv">Lun a Vie</option><option value="all">Todos los días</option></select></label>
      <label>Desde<input id="b-start" type="time" value="08:00" required></label>
      <label>Hasta<input id="b-end" type="time" value="09:00" required></label>
      <label>Área<select id="b-area">${areaOpts('familia')}</select></label>
      <label style="display:flex;gap:8px;align-items:center;color:var(--fg)"><input id="b-lock" type="checkbox" style="width:auto"> Protegido</label>
      <button class="btn pri" type="submit">Agregar</button>
    </form></div>
  </div>`;
}

/* ---------- agua ---------- */
let lastWaterPct=null;
function waterCard(){
  const k=today(),w=W(),ml=w.log[k]||0,pct=Math.min(1,ml/w.goal);
  const from=lastWaterPct===null?0:lastWaterPct;
  const y=v=>(118-v*104).toFixed(1); // 118 = fondo del vaso, 14 = borde
  const glasses=Math.floor(ml/250);
  let streak=0,kk=k;if(!(ml>=w.goal))kk=addDays(k,-1);while((w.log[kk]||0)>=w.goal){streak++;kk=addDays(kk,-1)}
  const wave=(cls)=>`<path class="wave ${cls}" d="M0 6 Q10 0 20 6 T40 6 T60 6 T80 6 T100 6 T120 6 T140 6 T160 6 T180 6 V140 H0Z" fill="url(#wg)"/>`;
  return `<div class="card tint" style="--c:var(--water)"><h2>Agua de hoy <span class="chip num" style="color:var(--water)">${ml>=w.goal?'Meta lista · +'+WATER_XP+' XP':Math.round(pct*100)+'%'}</span></h2>
  <div class="water">
    <div class="glass" id="glass"><svg viewBox="0 0 92 132" role="img" aria-label="Vaso con ${ml} ml de ${w.goal} ml">
      <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#6FD3FF"/><stop offset=".55" style="stop-color:var(--water)"/></linearGradient><clipPath id="vaso"><path d="M10 12 H82 L74 120 Q73 126 66 126 H26 Q19 126 18 120 Z"/></clipPath></defs>
      <path d="M10 12 H82 L74 120 Q73 126 66 126 H26 Q19 126 18 120 Z" fill="var(--sunk)"/>
      <g clip-path="url(#vaso)"><g class="wlevel" id="wlevel" data-to="${y(pct)}" style="transform:translateY(${y(from)}px)">${wave('b')}${wave('')}
        ${pct>0?`<circle class="bub" cx="32" cy="100" r="2.2" fill="#fff"/><circle class="bub" cx="55" cy="108" r="1.6" fill="#fff" style="animation-delay:1s"/><circle class="bub" cx="44" cy="112" r="2" fill="#fff" style="animation-delay:1.9s"/>`:''}
      </g></g>
      <path d="M10 12 H82 L74 120 Q73 126 66 126 H26 Q19 126 18 120 Z" fill="none" stroke="var(--fg)" stroke-opacity=".35" stroke-width="2.5"/>
      ${[.25,.5,.75].map(f=>`<line x1="70" x2="78" y1="${y(f)}" y2="${y(f)}" stroke="var(--fg)" stroke-opacity=".25" stroke-width="1.5"/>`).join('')}
    </svg></div>
    <div style="min-width:0">
      <div class="big num" style="color:var(--water)" data-count="${ml}" data-kind="lt" data-ck="water">${(ml/1000).toLocaleString('es-CL',{maximumFractionDigits:2})} L</div>
      <div class="note num">de ${(w.goal/1000).toLocaleString('es-CL',{maximumFractionDigits:2})} L · ${glasses} ${glasses===1?'vaso':'vasos'}${streak?` · racha ${streak} ${streak===1?'día':'días'}`:''}</div>
    </div>
  </div>
  <div class="wbtns"><button class="btn water" data-water="250">+ Vaso</button><button class="btn water" data-water="500">+ Botella</button><button class="btn" data-water="-250" aria-label="Quitar un vaso">−</button></div></div>`;
}
function animateWater(){
  const el=document.getElementById('wlevel');if(!el)return;
  const to=el.dataset.to;requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.transform=`translateY(${to}px)`}));
  lastWaterPct=Math.min(1,(W().log[today()]||0)/W().goal);
}

const VIEWS={inicio:vInicio,habitos:vHabitos,dinero:vDinero,claude:vProyectos,semana:vSemana};
let loadingView=false,revealIO=null;const prevCount={};
function renderHead(){
  const d=new Date();
  const fecha=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()]+' '+d.getDate()+' de '+MESES[d.getMonth()];
  const hr=d.getHours();
  $('#today-label').innerHTML='<b>'+esc((hr<12?'Buenos días':hr<20?'Buenas tardes':'Buenas noches')+(firstName()?', '+firstName():''))+'</b><span>'+esc(fecha)+'</span>';
  const tl=$('#title'),T=TITLES[tab]||TITLES.inicio,th=esc(T[0])+' <span>'+esc(T[1])+'</span>';
  if(tl.dataset.t!==tab){tl.dataset.t=tab;tl.innerHTML=th;$('#mini-t').innerHTML=th;tl.classList.remove('swap');void tl.offsetWidth;tl.classList.add('swap')}
}
function render(){
  if(!me)return;
  syncAreas();renderHead();
  const v=$('#view');
  if(revealIO){revealIO.disconnect();revealIO=null}
  if(loadingView){v.innerHTML='<div class="skel" aria-label="Cargando tus datos"><i></i><i></i><i></i></div>';return}
  v.innerHTML=VIEWS[tab]();animateWater();
  requestAnimationFrame(()=>requestAnimationFrame(()=>v.querySelectorAll('.rprog').forEach(c=>c.style.strokeDashoffset=c.dataset.to)));
  const counts=[...v.querySelectorAll('[data-count]')],ck=(el,i)=>tab+':'+(el.dataset.ck||i);
  if(entering){entering=false;
    if(slideDir&&!RM){v.classList.remove('slide-l','slide-r');void v.offsetWidth;v.classList.add('slide-'+slideDir)}slideDir='';
    counts.forEach((el,i)=>{prevCount[ck(el,i)]=+el.dataset.count});
    reveal(v);
  }else counts.forEach((el,i)=>{const k=ck(el,i),to=+el.dataset.count,from=prevCount[k];prevCount[k]=to;
    if(from!==undefined&&from!==to&&!RM){countUp(el,from,to);el.classList.add('bump')}});
  if(celebrate){const c=celebrate;celebrate=null;requestAnimationFrame(()=>c())}
}
/* Cada tarjeta entra cuando aparece en pantalla; sus números cuentan desde cero en ese momento */
function reveal(v){
  if(!('IntersectionObserver' in window))return;
  const els=[...v.querySelectorAll('.card,.habit,.sec-h,.blk')].filter(el=>!el.parentElement.closest('.card,.habit'));
  els.forEach(el=>el.classList.add('rv'));
  let n=0,last=0;
  revealIO=new IntersectionObserver((ents,obs)=>{
    const now=performance.now();if(now-last>160)n=0;last=now;
    for(const en of ents){if(!en.isIntersecting)continue;const el=en.target;obs.unobserve(el);
      el.style.setProperty('--rd',Math.min(n++,9)*60+'ms');el.classList.add('in','seen');
      el.querySelectorAll('[data-count]').forEach(c=>countUp(c,0,+c.dataset.count));
      el.addEventListener('animationend',function done(ev){if(ev.target!==el)return;el.classList.remove('rv','in');el.style.removeProperty('--rd');el.removeEventListener('animationend',done)});
    }
  },{rootMargin:'0px 0px -3% 0px',threshold:0.01});
  els.forEach(el=>revealIO.observe(el));
}
let entering=true,celebrate=null;
const RM=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}})();
function countUp(el,from,to){
  if(RM||!isFinite(to)||!isFinite(from)||from===to)return;const k=el.dataset.kind||'int';
  const f=v=>k==='pct'?Math.round(v)+'%':k==='clp'?clp(v):k==='usd'?usd(v):k==='lt'?(v/1000).toLocaleString('es-CL',{maximumFractionDigits:2})+' L':String(Math.round(v));
  const t0=performance.now(),dur=Math.min(1100,600+Math.abs(to-from)*2),tok=el._cu=(el._cu||0)+1;
  (function step(t){if(el._cu!==tok)return;const q=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-q,3);el.textContent=f(from+(to-from)*e);if(q<1)requestAnimationFrame(step);else el.textContent=f(to)})(t0);
}
/* Texto que sale volando desde un elemento: +20 XP, +250 ml */
function flyAt(sel,text,color){
  if(RM)return;const el=document.querySelector(sel);if(!el)return;const r=el.getBoundingClientRect();
  const s=document.createElement('div');s.className='xpfly';s.textContent=text;s.style.left=(r.left+r.width/2)+'px';s.style.top=(r.top+r.height/2)+'px';
  s.style.setProperty('--c',color||getComputedStyle(el).getPropertyValue('--c').trim()||'var(--red)');
  document.body.appendChild(s);s.addEventListener('animationend',()=>s.remove());setTimeout(()=>s.remove(),1600);
}
/* confeti y chispas */
const FX=(()=>{let cv,cx,parts=[],raf=0;
  function size(){const d=window.devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0)}
  function ensure(){if(cv)return;cv=document.createElement('canvas');cv.className='fx';document.body.appendChild(cv);cx=cv.getContext('2d');size();addEventListener('resize',size)}
  function loop(){cx.clearRect(0,0,innerWidth,innerHeight);parts=parts.filter(p=>p.life>0);
    for(const p of parts){p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.rot+=p.vr;p.life--;cx.save();cx.globalAlpha=Math.min(1,p.life/30);cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.c;
      if(p.circle){cx.beginPath();cx.arc(0,0,p.s/2,0,7);cx.fill()}else cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore()}
    raf=parts.length?requestAnimationFrame(loop):0}
  const run=()=>{if(!raf)raf=requestAnimationFrame(loop)};
  return{
    burst(x,y,c,n=18){if(RM)return;ensure();for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*4.5;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.5,g:.2,s:4+Math.random()*5,c,rot:0,vr:(Math.random()-.5)*.4,life:40+Math.random()*25,circle:Math.random()<.5})}run()},
    rain(){if(RM)return;ensure();const cols=['#D3263A','#2155D6','#15897A','#C77A00','#8A3FD1','#1E90D6','#F4F4F2'];
      for(let i=0;i<150;i++)parts.push({x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.6,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,g:.05,s:6+Math.random()*7,c:cols[i%cols.length],rot:Math.random()*6,vr:(Math.random()-.5)*.3,life:170+Math.random()*90});run()}
  }})();
function burstAt(sel){const el=document.querySelector(sel);if(!el)return;const r=el.getBoundingClientRect();FX.burst(r.left+r.width/2,r.top+r.height/2,getComputedStyle(el).borderTopColor||'#D3263A')}
function safeUrl(u){return /^https?:\/\//i.test(String(u||'').trim())?String(u).trim().slice(0,500):''}
const num=v=>{const s=String(v||'').replace(/\s|\$/g,'');if(/,\d{1,2}$/.test(s))return parseFloat(s.replace(/\./g,'').replace(',','.'));return parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))||0};

/* ---------- eventos de la app ---------- */
/* Onda bajo el dedo y un pulso corto de vibración (en Android) en cada botón */
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.btn,.habit,nav.tabs button,.cats button,.picks button,.seg button,.gear,.fab');if(!b||b.disabled||b.closest('#alarm'))return;
  if(!RM){const r=b.getBoundingClientRect(),z=Math.max(r.width,r.height)*2.2,sp=document.createElement('span');sp.className='rip';
    sp.style.cssText=`width:${z}px;height:${z}px;left:${e.clientX-r.left-z/2}px;top:${e.clientY-r.top-z/2}px`;b.appendChild(sp);setTimeout(()=>sp.remove(),600)}
  try{navigator.vibrate&&navigator.vibrate(8)}catch(err){}
},{passive:true});
/* Al bajar aparece la barra compacta y el botón de gasto se achica; al subir vuelve */
{let lastY=0,raf=0;addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const y=window.scrollY,b=document.body;
  b.classList.toggle('scrolled',y>120);if(Math.abs(y-lastY)>8){b.classList.toggle('down',y>lastY&&y>180);lastY=y}})},{passive:true})}
document.addEventListener('click',e=>{
  if(!me)return;
  const t=e.target.closest('button,[data-go]');if(!t||t.closest('#auth'))return;
  const ds=t.dataset;
  if(ds.tab)return go(ds.tab);
  if(ds.go)return go(ds.go);
  if(ds.settings!==undefined){openSettings(ds.settings);return}
  if(ds.onb!==undefined){S.meta.onboarded=true;save('meta');render();return}
  if(ds.samplewk!==undefined){S.week.blocks=sampleWeek();save('week');toast('Semana de ejemplo cargada. Bórrale y agrégale lo que quieras.');render();return}
  if(ds.hab){
    const k=today(),log=H().log;log[k]=log[k]||{};
    const h=H().list.find(x=>x.id===ds.hab);if(!h)return;
    if(log[k][ds.hab]){delete log[k][ds.hab];if(!Object.keys(log[k]).length)delete log[k];const id=ds.hab;celebrate=()=>{const b=document.querySelector(`[data-hab="${CSS.escape(id)}"]`);if(b)b.classList.add('unpop')}}
    else{const before=beltFor(totalXP());log[k][ds.hab]=h.pts;const after=beltFor(totalXP());
      const big=after.i>before.i||after.stripes>before.stripes||dayRatio(k)>=1;
      toast(after.i>before.i?'¡Nuevo cinturón: '+after.b.n+'!':after.stripes>before.stripes?'¡Nuevo grado!':dayRatio(k)>=1?'Round perfecto 🥊':'+'+h.pts+' XP');
      const id=ds.hab,pts=h.pts;celebrate=()=>{const sel=`[data-hab="${CSS.escape(id)}"]`,b=document.querySelector(sel);if(b)b.classList.add('pop');burstAt(sel+' .ck');flyAt(sel+' .pts','+'+pts+' XP');if(big)FX.rain()}}
    save('habits');render();return;
  }
  if(ds.water){const k=today(),w=W(),before=w.log[k]||0;const nv=Math.max(0,before+(+ds.water));if(nv)w.log[k]=nv;else delete w.log[k];
    if(before<w.goal&&nv>=w.goal){toast('¡Meta de agua cumplida! +'+WATER_XP+' XP');celebrate=()=>FX.rain()}else if(+ds.water>0){toast('+'+ds.water+' ml');const ml=ds.water;celebrate=()=>{burstAt('#glass svg path');flyAt('#glass','+'+ml+' ml','var(--water)')}}
    save('habits');render();const g=document.getElementById('glass');if(g){g.classList.add('splash')}return}
  if(ds.copy){const el=document.getElementById(ds.copy),txt=el?el.textContent:'';
    const ok=()=>toast('Enlace copiado');const fb=()=>{try{const r=document.createRange();r.selectNodeContents(el);const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}catch(e){}toast('Mantén presionado para copiar')};
    try{navigator.clipboard.writeText(txt).then(ok,fb)}catch(e){fb()}return}
  if(ds.trysc!==undefined){openQuick({amt:12500,where:'LIDER EXPRESS'});return}
  if(ds.arm!==undefined){armNight();return}
  if(ds.testalarm!==undefined){startChallenge('test');return}
  if(ds.delhab){H().list=H().list.filter(h=>h.id!==ds.delhab);save('habits');render();return}
  if(ds.type){txType=ds.type;render();return}
  if(ds.mon){const [y,m]=moneyMonth.split('-').map(Number);const d=new Date(y,m-1+(+ds.mon),1);moneyMonth=d.getFullYear()+'-'+pad(d.getMonth()+1);render();return}
  if(ds.deltx){S.money.tx=S.money.tx.filter(x=>x.id!==ds.deltx);save('money');render();return}
  if(ds.delbud){delete S.money.budgets[ds.delbud];save('money');render();return}
  if(ds.delp){S.claude.projects=S.claude.projects.filter(x=>x.id!==ds.delp);save('claude');render();return}
  if(ds.dels){S.claude.subs=S.claude.subs.filter(x=>x.id!==ds.dels);save('claude');render();return}
  if(ds.delu){S.claude.usage=S.claude.usage.filter(x=>x.id!==ds.delu);save('claude');render();return}
  if(ds.delb){S.week.blocks=S.week.blocks.filter(x=>x.id!==ds.delb);save('week');render();return}
});
document.addEventListener('change',e=>{
  if(!me)return;
  const p=e.target.dataset&&e.target.dataset.pst;
  if(p){const x=S.claude.projects.find(q=>q.id===p);if(x){x.status=e.target.value;save('claude');render()}}
});
document.addEventListener('submit',e=>{
  const id=e.target.id;
  if(e.target.closest('#auth')||e.target.closest('#settings'))return; // los manejan sus propias funciones
  e.preventDefault();if(!me)return;const v=s=>($('#'+s)||{}).value||'';
  if(id==='f-quick'){const amt=num(v('q-amt'));if(!(amt>0))return toast('Escribe el monto');const note=v('q-note').trim().slice(0,120);S.money.tx.push({id:uid(),type:'gasto',amt,cat:qCat,date:today(),note});if(note){S.money.merchants=S.money.merchants||{};S.money.merchants[mKey(note)]=qCat}save('money');closeQuick();toast('Gasto anotado: '+clp(amt));render();return}
  if(id==='f-alarm'){AL().time=isHM(v('al-time'))?v('al-time'):'06:30';AL().ex=v('al-ex');save('meta');toast('Despertador a las '+AL().time)}
  if(id==='f-water'){const g=num(v('w-goal'));if(g>=.5&&g<=10){W().goal=Math.round(g*1000);save('habits');toast('Meta guardada')}else return toast('Escribe una meta entre 0,5 y 10 litros')}
  if(id==='f-hab'){const n=v('hab-name').trim();if(!n)return toast('Escribe el hábito');H().list.push({id:uid(),name:n.slice(0,120),area:v('hab-area'),pts:+v('hab-pts')||20});save('habits');toast('Hábito agregado')}
  if(id==='f-tx'){const amt=num(v('tx-amt'));if(!(amt>0))return toast('Escribe un monto');if(!isDate(v('tx-date')))return toast('Elige la fecha');S.money.tx.push({id:uid(),type:txType,amt,cat:v('tx-cat'),date:v('tx-date'),note:v('tx-note').trim().slice(0,120)});moneyMonth=monthKey(v('tx-date'));save('money');toast(txType==='gasto'?'Gasto anotado':'Ingreso anotado')}
  if(id==='f-bud'){const a=num(v('bud-amt'));if(a>0)S.money.budgets[v('bud-cat')]=a;else delete S.money.budgets[v('bud-cat')];save('money')}
  if(id==='f-p'){const n=v('p-name').trim();if(!n)return toast('Escribe el nombre del proyecto');S.claude.projects.push({id:uid(),name:n.slice(0,120),client:v('p-client').trim().slice(0,80),value:Math.max(0,num(v('p-value'))),status:v('p-status'),next:v('p-next').trim().slice(0,200),link:safeUrl(v('p-link'))});save('claude');toast('Proyecto agregado')}
  if(id==='f-s'){const n=v('s-name').trim(),a=num(v('s-amt'));if(!n||!(a>0))return toast('Escribe nombre y monto');S.claude.subs.push({id:uid(),name:n.slice(0,80),amt:a,cur:v('s-cur')==='CLP'?'CLP':'USD'});save('claude')}
  if(id==='f-u'){const u=num(v('u-usd'));if(!(u>0))return toast('Escribe el monto en dólares');if(!isDate(v('u-date')))return toast('Elige la fecha');S.claude.usage.push({id:uid(),date:v('u-date'),usd:u,proj:v('u-proj')});save('claude');toast('Gasto anotado')}
  if(id==='f-rate'){const r=num(v('rate'));if(r>0)S.claude.rate=r;save('claude');toast('Dólar actualizado')}
  if(id==='f-b'){const d=v('b-day');const days=d==='lv'?[0,1,2,3,4]:d==='all'?[0,1,2,3,4,5,6]:[+d];const ti=v('b-title').trim();if(!ti)return toast('Escribe qué vas a hacer');if(!isHM(v('b-start'))||!isHM(v('b-end')))return toast('Revisa las horas');if(v('b-end')<=v('b-start'))return toast('La hora final debe ser después de la inicial');days.forEach(dd=>S.week.blocks.push({id:uid(),day:dd,start:v('b-start'),end:v('b-end'),area:v('b-area'),title:ti.slice(0,80),lock:$('#b-lock').checked}));save('week');toast('Bloque agregado')}
  render();
});

/* ---------- ventana rápida de gasto ---------- */
let qCat='Comida';
/* Categoría según el comercio: primero lo que ya elegiste antes para ese comercio, después palabras conocidas */
const CAT_HINTS=[
  ['Comida',/LIDER|JUMBO|UNIMARC|TOTTUS|SANTA.?ISABEL|ACUENTA|OK.?MARKET|OXXO|PRONTO|PEDIDOS.?YA|RAPPI|UBER.?EATS|MCDONALD|BURGER|KFC|STARBUCKS|JUAN.?MAESTRO|DOGGIS|PANADER|SUSHI|PIZZA|RESTAUR|CAFE|EMPANAD/],
  ['Transporte',/COPEC|SHELL|PETROBRAS|ARAMCO|ENEX|UBER|DIDI|CABIFY|METRO|BIP|TRANSANTIAGO|RED.?MOVILIDAD|AUTOPISTA|ESTACIONAM|TURBUS|PULLMAN|LATAM|SKY.?AIR|JETSMART/],
  ['Salud',/FARMACIA|CRUZ.?VERDE|SALCOBRAND|AHUMADA|DR.?SIMI|CLINICA|ISAPRE|FONASA|DENTAL|LABORATORIO/],
  ['Entrenamiento',/SMART.?FIT|ENERGY|SPORTLIFE|PACIFIC|GYM|MMA|JIU.?JITSU|DECATHLON|SUPLEMENT|PROTEIN/],
  ['Trabajo y negocio',/ANTHROPIC|CLAUDE|OPENAI|GOOGLE.?(CLOUD|WORKSPACE)|SUPABASE|VERCEL|NETLIFY|CLOUDFLARE|GITHUB|CANVA|SHOPIFY|META.?ADS|FACEBK|NOTION/],
  ['Casa y cuentas',/ENTEL|MOVISTAR|WOM|CLARO|VTR|ENEL|CGE|AGUAS|METROGAS|ABASTIBLE|LIPIGAS|GASCO|SODIMAC|EASY|HOMECENTER|ARRIENDO/],
  ['Familia e hijos',/BEBE|BABY|PANAL|INFANT|PREMAMA|CHICCO|BABYTUTTO|JUGUET/],
  ['Estudios',/UNIVERSIDAD|UNIV|DUOC|INACAP|LIBRERIA|BUSCALIBRE|APUNTES|MATRICULA|ARANCEL|COLEGIO/],
  ['Ocio',/NETFLIX|SPOTIFY|DISNEY|HBO|PRIME.?VIDEO|YOUTUBE|STEAM|PLAYSTATION|XBOX|CINE|CINEMARK|HOYTS|PUNTO.?TICKET|TICKETMASTER/]
];
const mKey=w=>String(w||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim().slice(0,80);
function guessCat(where){const k=mKey(where);if(!k)return null;const mem=(S.money.merchants||{})[k];if(mem&&CAT_G.includes(mem))return mem;for(const [c,re] of CAT_HINTS)if(re.test(k))return c;return null}
function openQuick(pre){
  pre=pre&&pre.amt?pre:null;
  if(pre){const g=guessCat(pre.where);qCat=g||'Otros'}
  $('#q-cats').innerHTML=CAT_G.map(c=>`<button type="button" data-qcat="${c}" class="${c===qCat?'on':''}">${c}</button>`).join('');
  $('#q-amt').value=pre?pre.amt.toLocaleString('es-CL'):'';$('#q-note').value=pre?pre.where:'';$('#q-paste').value='';
  $('#q-title').textContent=pre?'Pagaste con el celular':'Nuevo cobro';
  $('#q-save').textContent=pre?'Confirmar gasto':'Guardar gasto';
  showSheet($('#sheet'));
  if(pre){setTimeout(()=>$('#q-save').focus(),50);const g=guessCat(pre.where);if(!g)toast('Elige la categoría y confirma')}
  else setTimeout(()=>$('#q-amt').focus(),50);
}
/* Enlace del atajo: #g-12500-LIDER_EXPRESS */
function hashGasto(h){
  h=h??(location.hash||'');try{h=decodeURIComponent(h)}catch(e){}
  if(h==='#gasto')return {};
  const m=h.match(/^#g(?:asto)?-(\d{1,9})(?:-([A-Za-z0-9._~-]{0,80}))?$/);
  if(!m)return null;
  return {amt:+m[1],where:(m[2]||'').replace(/[_~.]+/g,' ').replace(/-+$/,'').trim()};
}
function clearHash(){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
function closeQuick(){hideSheet($('#sheet'));if(hashGasto())clearHash()}
function showSheet(el){clearTimeout(el._t);el.classList.remove('closing');const sh=el.querySelector('.sheet');if(sh){sh.style.transform='';sh.style.transition=''}el.hidden=false}
function hideSheet(el,cb){
  clearTimeout(el._t);
  if(el.hidden||RM){el.hidden=true;el.classList.remove('closing');if(cb)cb();return}
  el.classList.add('closing');el._t=setTimeout(()=>{el.hidden=true;el.classList.remove('closing');if(cb)cb()},230);
}
function dragToClose(bg,close){
  const sh=bg.querySelector('.sheet');let y0=null,dy=0;
  sh.addEventListener('touchstart',e=>{const t=e.target;y0=(sh.scrollTop<=0&&!t.closest('input,textarea,select,button,.cats'))?e.touches[0].clientY:null;dy=0},{passive:true});
  sh.addEventListener('touchmove',e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>0){sh.style.transition='none';sh.style.transform=`translateY(${dy}px)`}},{passive:true});
  sh.addEventListener('touchend',()=>{if(y0===null)return;y0=null;if(dy>90){close()}else{sh.style.transition='transform .35s cubic-bezier(.3,1.4,.5,1)';sh.style.transform=''}dy=0});
}
function parseAviso(t){
  const m=String(t).match(/\$\s?([\d.]+(?:,\d{1,2})?)/)||String(t).match(/(?:monto|compra|cargo|pago)[^\d]{0,20}([\d.]+(?:,\d{1,2})?)/i);
  const w=String(t).match(/\ben\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .&*'-]{2,30}?)(?:\s+(?:con|el|por|a las|tarjeta)\b|[.,]|$)/i);
  return {amt:m?num(m[1]):0,where:w?w[1].trim():''};
}
$('#fab').addEventListener('click',()=>openQuick());
$('#q-close').addEventListener('click',closeQuick);
dragToClose($('#sheet'),closeQuick);
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeQuick();const b=e.target.closest('[data-qcat]');if(b){qCat=b.dataset.qcat;[...document.querySelectorAll('[data-qcat]')].forEach(x=>x.classList.toggle('on',x===b))}});
$('#q-paste').addEventListener('input',e=>{const r=parseAviso(e.target.value);if(r.amt)$('#q-amt').value=r.amt.toLocaleString('es-CL');if(r.where)$('#q-note').value=r.where});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('#sheet').hidden)closeQuick();else if(!$('#settings').hidden)closeSettings()});
window.addEventListener('hashchange',()=>{if(!me){const h=location.hash||'';if(hashGasto(h)||h==='#despertar'){pendingHash=h;authMsg('Entra para anotar tu gasto.')}return}const g=hashGasto();if(g)openQuick(g);else if(location.hash==='#despertar'&&!ch)startChallenge('link')});

/* ---------- despertador ---------- */
const MIN_GAP=800; // ms mínimos entre repeticiones: más rápido no cuenta
let actx=null,beepT=null,armed=false,nightT=null,wakeLock=null,firedOn=null,ch=null;
function exFor(k){const a=AL();if(a.ex!=='alternar')return a.ex;const [y,m,d]=k.split('-').map(Number);return Math.floor(new Date(y,m-1,d)/864e5)%2?'sentadillas':'flexiones'}
function exHow(ex){return ex==='flexiones'
  ?'Deja el teléfono en el suelo, bajo tu cara. Toca la pantalla con la nariz o el mentón cada vez que bajes.'
  :'Deja el teléfono en una silla a tu lado. Toca la pantalla con la mano cada vez que llegues abajo.'}
function audio(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}return actx}
function beepOnce(vol){const a=actx;if(!a||a.state!=='running')return;const t=a.currentTime;
  [0,.18].forEach(dt=>{const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=dt?1175:880;g.gain.setValueAtTime(0,t+dt);g.gain.linearRampToValueAtTime(vol,t+dt+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dt+.15);o.connect(g).connect(a.destination);o.start(t+dt);o.stop(t+dt+.16)})}
function startRing(){stopRing();const tick=()=>{const done=ch?(ch.count||0):0;beepOnce(.22*(1-done/10*.75));try{navigator.vibrate&&navigator.vibrate(300)}catch(e){}};tick();beepT=setInterval(tick,1000)}
function stopRing(){clearInterval(beepT);beepT=null}
function alarmCard(){
  const a=AL(),k=today(),w=WK()[k],ex=exFor(k);
  return `<div class="card alarm-card">
    <div style="flex:1;min-width:150px"><div class="eyebrow">Despertador</div><div class="clock num">${esc(a.time)}</div>
    <div class="note">${w?`Hoy despertaste a las ${esc(w.at)} · ${w.secs}s para ${w.reps.length+1} ${esc(w.ex)} · +${WAKE_XP} XP`:`No se apaga hasta hacer 10 ${ex}`}</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri" type="button" data-arm>Armar esta noche</button><button class="btn" type="button" data-testalarm>Probar reto</button></div>
  </div>`;
}
function wakeHistory(){
  const log=WK(),days=Object.keys(log).sort().reverse().slice(0,7);
  if(!days.length)return `<div class="card"><h2>Despertares</h2><div class="empty">Aún no hay despertares. Arma el despertador en Inicio o prueba el reto para ver tu primer análisis.</div></div>`;
  const avg=days.reduce((a,d)=>a+log[d].secs,0)/days.length;
  return `<div class="card"><h2>Despertares <span class="chip num">promedio ${Math.round(avg)} s</span></h2><div class="list">${days.map(d=>{const x=log[d];return `<div class="li"><span class="dot" style="background:var(--red)"></span><div class="grow"><div class="t num">${fmtDate(d)} · ${esc(x.at)}</div><div class="s num">${x.reps.length+1} ${esc(x.ex)} en ${x.secs} s · ritmo ${(x.avg/1000).toLocaleString('es-CL',{maximumFractionDigits:1})} s por rep · constancia ${x.cons}%${x.late!=null?` · ${x.late<=0?'al toque':x.late+' min después de sonar'}`:''}</div></div></div>`}).join('')}</div></div>`;
}
async function armNight(){
  audio(); // el toque desbloquea el sonido
  try{if(navigator.wakeLock)wakeLock=await navigator.wakeLock.request('screen')}catch(e){wakeLock=null}
  armed=true;$('#night').hidden=false;tickNight();clearInterval(nightT);nightT=setInterval(tickNight,1000);
}
function disarm(){armed=false;clearInterval(nightT);$('#night').hidden=true;try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}
function tickNight(){
  const d=new Date(),hm=pad(d.getHours())+':'+pad(d.getMinutes()),k=today();
  $('#n-clock').textContent=hm;$('#n-info').textContent='Suena a las '+AL().time+' · 10 '+exFor(addDays(k,hm>=AL().time?1:0));
  if(armed&&hm===AL().time&&firedOn!==k&&!WK()[k]){firedOn=k;disarm();startChallenge('alarm')}
}
document.addEventListener('visibilitychange',async()=>{if(armed&&document.visibilityState==='visible'&&navigator.wakeLock){try{wakeLock=await navigator.wakeLock.request('screen')}catch(e){}}});
function startChallenge(src){
  const k=today();ch={src,ex:exFor(k),reps:[],t0:Date.now(),last:0};
  audio();drawChallenge();$('#alarm').hidden=false;startRing();
}
function drawChallenge(){
  const el=$('#alarm'),n=ch.count||0;el.className='overlay ringing';
  el.innerHTML=`<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:800">${ch.src==='test'?'Prueba del reto':'¡Arriba'+(firstName()?', '+esc(firstName()):'')+'!'}</div>
    <div class="count num" id="a-count">${n}</div>
    <div style="font-family:var(--display);font-size:28px;text-transform:uppercase">de 10 ${ch.ex}</div>
    <div class="dots">${[...Array(10)].map((_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>
    <div class="how">${exHow(ch.ex)}</div>
    <div id="a-msg" style="min-height:22px;font-weight:800"></div>
    ${actx&&actx.state==='running'?'':'<div style="font-size:13px;opacity:.85">Toca una vez para activar el sonido.</div>'}
    ${ch.src==='test'?'<button class="btn" type="button" id="a-skip" style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent;margin-top:8px">Salir de la prueba</button>':''}`;
}
function rep(e){
  if(!ch||ch.finished)return;if(e.target.closest('#a-skip')){stopRing();ch=null;$('#alarm').hidden=true;return}
  e.preventDefault();audio();
  const now=Date.now(),c=$('#a-count'),msg=$('#a-msg');
  if(ch.last&&now-ch.last<MIN_GAP){c.classList.remove('miss');void c.offsetWidth;c.classList.add('miss');msg.textContent='Muy rápido, esa no cuenta';return}
  if(ch.last)ch.reps.push(now-ch.last);ch.last=now;ch.count=(ch.count||0)+1;
  const n=ch.count;c.textContent=n;c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit');
  document.querySelectorAll('#alarm .dots i').forEach((d,i)=>d.classList.toggle('on',i<n));msg.textContent=n<10?['¡Vamos!','Eso','Sigue','Bien ahí','Respira'][n%5]:'';
  try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
  if(n>=10)finishChallenge();
}
function stats(reps){const avg=reps.reduce((a,b)=>a+b,0)/reps.length,sd=Math.sqrt(reps.reduce((a,b)=>a+(b-avg)**2,0)/reps.length);
  return {avg,min:Math.min(...reps),max:Math.max(...reps),cons:Math.max(0,Math.round(100-sd/avg*100))}}
function finishChallenge(){
  stopRing();ch.finished=true;const k=today(),d=new Date(),secs=Math.round((Date.now()-ch.t0)/1000),st=stats(ch.reps);
  const [ah,am]=AL().time.split(':').map(Number),late=ch.src==='alarm'?0:(ch.src==='link'?Math.max(0,Math.round((d.getHours()*60+d.getMinutes())-(ah*60+am))):null);
  const rec={at:pad(d.getHours())+':'+pad(d.getMinutes()),secs,ex:ch.ex,reps:ch.reps,avg:Math.round(st.avg),cons:st.cons,late};
  const prev=Object.entries(WK()).filter(([kk])=>kk!==k).map(([,x])=>x.secs);const prevAvg=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:null;
  let xpMsg='Prueba: no suma XP';
  if(ch.src!=='test'){const isNew=!WK()[k];WK()[k]=rec;save('habits');xpMsg=isNew?'+'+WAKE_XP+' XP para tu cinturón':'Despertar de hoy actualizado'}
  const el=$('#alarm');el.className='overlay done';const mx=Math.max(...ch.reps);
  el.innerHTML=`<div class="result">
    <div class="eyebrow">${ch.src==='test'?'Prueba lista':'Despertar ganado'}</div>
    <div class="disp" style="font-size:48px">${secs} segundos</div>
    <div class="muted" style="font-weight:700">10 ${rec.ex} · ${xpMsg}</div>
    <div class="grid" style="gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="card" style="padding:12px"><div class="eyebrow" style="color:var(--muted)">Ritmo</div><b class="num">${(st.avg/1000).toLocaleString('es-CL',{maximumFractionDigits:1})} s/rep</b></div>
      <div class="card" style="padding:12px"><div class="eyebrow" style="color:var(--muted)">Constancia</div><b class="num">${st.cons}%</b></div>
      <div class="card" style="padding:12px"><div class="eyebrow" style="color:var(--muted)">Más lenta</div><b class="num">${(st.max/1000).toLocaleString('es-CL',{maximumFractionDigits:1})} s</b></div>
    </div>
    <div class="card" style="padding:14px"><div class="eyebrow" style="color:var(--muted);margin-bottom:8px">Tiempo entre cada repetición</div>
      <div class="tempo">${ch.reps.map((r,i)=>`<b style="height:${Math.max(6,r/mx*100)}%;animation-delay:${i*50}ms;opacity:${.55+.45*r/mx}" title="Rep ${i+2}: ${(r/1000).toFixed(1)} s"></b>`).join('')}</div>
      <div class="note" style="display:flex;justify-content:space-between;margin-top:4px"><span>Rep 2</span><span>Rep 10</span></div></div>
    <div class="card" style="padding:14px"><div class="eyebrow" style="color:var(--muted);margin-bottom:6px">Análisis</div><div>${analysis(rec,prevAvg)}</div></div>
    <button class="btn red" type="button" id="a-close" style="padding:14px">Empezar el día</button>
  </div>`;
  FX.rain();
  $('#a-close').onclick=()=>{$('#alarm').hidden=true;ch=null;render()};
}
function analysis(r,prevAvg){
  const t=[];const sp=r.avg/1000;
  t.push(sp<1.6?'Ritmo explosivo: bajaste y subiste rápido.':sp<2.6?'Buen ritmo, controlado.':'Ritmo lento: está bien para despertar, pero puedes apretar un poco más.');
  t.push(r.cons>=80?'Muy parejo de principio a fin.':r.cons>=60?'Bastante parejo, con alguna pausa.':'Hubo pausas largas: probablemente te costó arrancar.');
  if(prevAvg)t.push(r.secs<prevAvg?`Fuiste ${Math.round(prevAvg-r.secs)} s más rápido que tu promedio.`:`Te tomó ${Math.round(r.secs-prevAvg)} s más que tu promedio.`);
  if(r.late)t.push(`Empezaste ${r.late} min después de la hora de la alarma.`);
  return esc(t.join(' '));
}
$('#alarm').addEventListener('pointerdown',rep);
$('#n-off').addEventListener('click',disarm);

/* ---------- ajustes ---------- */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function openSettings(focus){
  const cd=S.meta.countdown||{};
  $('#set-body').innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center"><b class="disp" style="font-size:28px;text-transform:uppercase">Ajustes</b><button type="button" class="x" data-close-set aria-label="Cerrar">×</button></div>
  <div class="set-sec"><h4>Tu perfil</h4>
    <form class="row" id="st-name"><label>Nombre<input id="st-n" maxlength="40" value="${esc(S.meta.name)}" required></label><button class="btn" type="submit">Guardar</button></form>
    <div class="note">Entras con ${esc(email)}</div></div>
  <div class="set-sec" id="set-cd"><h4>Tu fecha importante</h4>
    <form class="row" id="st-cd"><label>Qué es<input id="st-cdl" maxlength="40" value="${esc(cd.label)}" placeholder="Ej: Mi pelea, examen de grado"></label><label>Fecha<input id="st-cdd" type="date" value="${esc(cd.date)}"></label><button class="btn" type="submit">Guardar</button></form>
    ${cd.date?'<button class="btn sm" type="button" data-cd-clear style="justify-self:start">Quitar fecha</button>':''}</div>
  <div class="set-sec"><h4>Nombres de tus áreas</h4><div class="note">Ponle a cada color el nombre que tiene en tu vida.</div>
    <form class="row" id="st-areas">${AREA_KEYS.map(k=>`<label><span style="display:flex;align-items:center;gap:6px"><span class="dot" style="background:var(--a-${k})"></span>${esc(AREA_DEF[k])}</span><input data-area="${k}" maxlength="24" value="${esc(obj(S.meta.areaNames)[k]||'')}" placeholder="${esc(AREA_DEF[k])}"></label>`).join('')}<button class="btn" type="submit">Guardar nombres</button></form></div>
  <div class="set-sec"><h4>Instalar en tu celular</h4>
    ${standalone()?'<div class="note">Ya la estás usando como app. 👊</div>':installEvt?'<button class="btn pri" type="button" data-install style="justify-self:start">Instalar Mi Esquina</button>':isIOS?'<div>En Safari, toca <b>Compartir</b> (el cuadrado con la flecha) y elige <b>Agregar a pantalla de inicio</b>.</div>':'<div>En Chrome, abre el menú de los tres puntos y elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>. En iPhone, usa Safari: <b>Compartir</b> y <b>Agregar a pantalla de inicio</b>.</div>'}</div>
  <div class="set-sec"><h4>Tus datos</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-export>Descargar mis datos</button></div>
    <form id="st-import" style="display:grid;gap:8px"><label class="note" for="st-imp">Importar: pega aquí los datos copiados desde otra versión de Mi Esquina, o elige el archivo descargado.</label>
      <textarea id="st-imp" placeholder='{"app":"mi-esquina", ...}'></textarea>
      <input type="file" id="st-file" accept="application/json,.json">
      <button class="btn" type="submit" style="justify-self:start">Importar y reemplazar</button></form></div>
  <div class="set-sec"><h4>Escríbenos</h4>
    <form id="st-help" style="display:grid;gap:8px"><textarea id="st-msg" maxlength="2000" placeholder="Una idea, un problema, lo que quieras contarnos"></textarea><button class="btn" type="submit" style="justify-self:start">Enviar</button></form></div>
  <div class="set-sec"><h4>Cuenta</h4>
    <form class="row" id="st-pw"><label>Contraseña nueva<input id="st-p" type="password" autocomplete="new-password" minlength="8" maxlength="72"></label><button class="btn" type="submit">Cambiar contraseña</button></form>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-logout>Cerrar sesión</button><a class="btn" href="privacidad.html" target="_blank" rel="noopener">Privacidad y términos</a></div>
    <form class="row" id="st-del" style="margin-top:6px"><label>Para borrar tu cuenta y todos tus datos, escribe BORRAR<input id="st-d" autocomplete="off" maxlength="10"></label><button class="btn red" type="submit">Borrar mi cuenta</button></form></div>`;
  showSheet($('#settings'));
  if(focus==='cd')setTimeout(()=>{const el=$('#set-cd');el.scrollIntoView({block:'center'});$('#st-cdl').focus()},60);
}
function closeSettings(){const el=$('#settings');hideSheet(el,()=>{if(el.hidden)$('#set-body').innerHTML=''})}
$('#gear').addEventListener('click',()=>openSettings());
dragToClose($('#settings'),closeSettings);
function exportJSON(){return {app:'mi-esquina',v:1,exported:new Date().toISOString(),data:JSON.parse(JSON.stringify(S))}}
function importData(raw){
  let j;try{j=JSON.parse(raw)}catch(e){return toast('Eso no parece un respaldo de Mi Esquina')}
  const data=obj(j&&j.data?j.data:j);const found=DOCS.filter(d=>data[d]&&typeof data[d]==='object');
  if(!found.length)return toast('Eso no parece un respaldo de Mi Esquina');
  if(!confirm('Esto reemplaza tus datos actuales de '+found.length+' secciones por los del respaldo. ¿Seguir?'))return;
  const keepName=S.meta.name;
  for(const d of found){S[d]=clean(d,data[d]);save(d)}
  if(!S.meta.name)S.meta.name=keepName;
  S.meta.onboarded=true;save('meta');
  tab='inicio';closeSettings();drawTabs();entering=true;render();toast('Datos importados');
}
$('#settings').addEventListener('click',async e=>{
  if(e.target.id==='settings')return closeSettings();
  const b=e.target.closest('button');if(!b)return;const ds=b.dataset;
  if(ds.closeSet!==undefined)return closeSettings();
  if(ds.cdClear!==undefined){S.meta.countdown={label:'',date:''};save('meta');render();openSettings();toast('Fecha quitada');return}
  if(ds.install!==undefined&&installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(err){}installEvt=null;openSettings();return}
  if(ds.export!==undefined){const blob=new Blob([JSON.stringify(exportJSON(),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mi-esquina-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);return}
  if(ds.logout!==undefined){await logout();return}
});
$('#settings').addEventListener('submit',async e=>{
  e.preventDefault();const id=e.target.id;
  if(id==='st-name'){const n=$('#st-n').value.trim().slice(0,40);if(!n)return toast('Escribe tu nombre');S.meta.name=n;save('meta');render();toast('Nombre guardado');
    sb.from('perfiles').update({nombre:n}).eq('user_id',me).then(()=>{},()=>{});sb.auth.updateUser({data:{nombre:n}}).then(()=>{},()=>{});return}
  if(id==='st-cd'){const l=$('#st-cdl').value.trim().slice(0,40),d=$('#st-cdd').value;if(!isDate(d))return toast('Elige la fecha');S.meta.countdown={label:l,date:d};save('meta');render();closeSettings();toast('Fecha guardada');return}
  if(id==='st-areas'){const an={};document.querySelectorAll('#st-areas [data-area]').forEach(i=>{const v=i.value.trim().slice(0,24);if(v)an[i.dataset.area]=v});S.meta.areaNames=an;save('meta');render();toast('Nombres guardados');return}
  if(id==='st-import'){const f=$('#st-file').files&&$('#st-file').files[0];if(f){if(f.size>3e6)return toast('El archivo es demasiado grande');importData(await f.text());return}const t=$('#st-imp').value.trim();if(!t)return toast('Pega tus datos o elige un archivo');importData(t);return}
  if(id==='st-help'){const m=$('#st-msg').value.trim();if(!m)return toast('Escribe tu mensaje');const btn=e.target.querySelector('button');btn.disabled=true;
    const {error}=await sb.from('soporte').insert({email:email.slice(0,200)||'sin-email',mensaje:m.slice(0,2000),user_id:me});btn.disabled=false;
    if(error)return toast('No se pudo enviar. Revisa tu conexión.');$('#st-msg').value='';toast('Mensaje enviado. ¡Gracias!');return}
  if(id==='st-pw'){const p=$('#st-p').value;if(p.length<8)return toast('Mínimo 8 caracteres');const {error}=await sb.auth.updateUser({password:p});if(error)return toast(/same|different/i.test(error.message)?'Esa ya es tu contraseña':'No se pudo cambiar. Inténtalo otra vez.');$('#st-p').value='';toast('Contraseña cambiada');return}
  if(id==='st-del'){if($('#st-d').value.trim().toUpperCase()!=='BORRAR')return toast('Escribe BORRAR para confirmar');await deleteAccount(e.target.querySelector('button'));return}
});
async function deleteAccount(btn){
  btn.disabled=true;btn.textContent='Borrando…';
  try{
    const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('sin sesión');
    const r=await fetch(SB_URL+'/functions/v1/borrar-cuenta',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify({confirmar:'BORRAR'})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'error');
    const id=me;manualOut=true;teardown();clearCache(id);
    await sb.auth.signOut({scope:'local'}).catch(()=>{});
    showAuth('entrar','Tu cuenta y todos tus datos fueron borrados.','ok');
  }catch(err){btn.disabled=false;btn.textContent='Borrar mi cuenta';toast(String(err.message||'No se pudo borrar').slice(0,90))}
}
function clearCache(id){try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('esquina:'+id+':'))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k))}catch(e){}}
async function logout(){
  if(dirty.size){await flushAll()}
  if(dirty.size&&!confirm('Hay cambios que todavía no llegan a la nube (estás sin conexión). Si sales ahora, se pierden. ¿Salir igual?'))return;
  const id=me;manualOut=true;teardown();clearCache(id);
  await sb.auth.signOut({scope:'local'}).catch(()=>{});
  showAuth('entrar','Cerraste sesión.','ok');
}

/* ---------- ingreso ---------- */
const picks={dolor:null,pagaria:null};
let recovering=false,manualOut=false;
function showAuth(view,msg,kind){
  $('#boot').hidden=true;$('#app').hidden=true;$('#nav').hidden=true;$('#fab').hidden=true;$('#auth').hidden=false;
  authView(view||'entrar');authMsg(msg||'',kind);
}
function authView(v){
  $('#f-login').hidden=v!=='entrar';$('#f-signup').hidden=v!=='crear';$('#f-forgot').hidden=v!=='olvido';$('#f-newpw').hidden=v!=='nueva';
  $('#auth-tabs').hidden=v==='olvido'||v==='nueva';
  document.querySelectorAll('#auth-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.auth===v));$('#auth-tabs').dataset.on=v==='crear'?'1':'0';
  authMsg('');
  const first={entrar:'#l-email',crear:'#s-nombre',olvido:'#r-email',nueva:'#n-pw'}[v];
  if(first&&matchMedia('(min-width:700px)').matches)setTimeout(()=>{const el=$(first);if(el)el.focus()},30);
}
function authMsg(t,kind){const el=$('#a-msg');el.textContent=t;el.className='amsg'+(kind?' '+kind:'')}
function busy(form,on,label){const b=form.querySelector('button[type=submit]');if(!b)return;if(on){b.dataset.label=b.textContent;b.textContent=label||'Un momento…';b.disabled=true}else{b.textContent=b.dataset.label||b.textContent;b.disabled=false}}
const okEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)&&e.length<=200;
$('#auth').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.auth){authView(b.dataset.auth);if(b.dataset.auth==='olvido')$('#r-email').value=$('#l-email').value;return}
  const p=b.closest('[data-pick]');if(p&&b.dataset.v){const k=p.dataset.pick;picks[k]=picks[k]===b.dataset.v?null:b.dataset.v;p.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.v===picks[k]))}
});
$('#f-login').addEventListener('submit',async e=>{
  e.preventDefault();const em=$('#l-email').value.trim().toLowerCase(),pw=$('#l-pw').value;
  if(!okEmail(em))return authMsg('Revisa tu email.','err');if(!pw)return authMsg('Escribe tu contraseña.','err');
  busy(e.target,true,'Entrando…');authMsg('');manualOut=false;
  const {error}=await sb.auth.signInWithPassword({email:em,password:pw});
  busy(e.target,false);
  if(error)authMsg(/invalid|credentials/i.test(error.message)?'Email o contraseña incorrectos.':/fetch|network/i.test(error.message)?'Sin conexión. Inténtalo de nuevo.':'No se pudo entrar. Inténtalo otra vez.','err');
});
$('#f-signup').addEventListener('submit',async e=>{
  e.preventDefault();
  const nombre=$('#s-nombre').value.trim(),em=$('#s-email').value.trim().toLowerCase(),pw=$('#s-pw').value;
  if(!nombre)return authMsg('Escribe tu nombre.','err');
  if(!okEmail(em))return authMsg('Revisa tu email: no parece válido.','err');
  if(pw.length<8)return authMsg('La contraseña debe tener al menos 8 caracteres.','err');
  if(!$('#s-ok').checked)return authMsg('Para crear tu cuenta, acepta la política de privacidad.','err');
  busy(e.target,true,'Creando tu cuenta…');authMsg('');
  let origen='';try{const q=new URLSearchParams(location.search);origen=(q.get('ref')||q.get('utm_source')||sessionStorage.getItem('esquina.ref')||'').replace(/[^\w.-]/g,'').slice(0,40)}catch(err){}
  try{
    const r=await fetch(SB_URL+'/functions/v1/crear-cuenta',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({nombre,email:em,password:pw,dolor:picks.dolor,pagaria:picks.pagaria,origen,acepto:true,website:$('#s-web').value})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){busy(e.target,false);if(r.status===409){authView('entrar');$('#l-email').value=em;return authMsg(j.error||'Ese email ya tiene cuenta. Inicia sesión.','err')}return authMsg(j.error||'No se pudo crear la cuenta. Inténtalo otra vez.','err')}
    manualOut=false;
    const {error}=await sb.auth.signInWithPassword({email:em,password:pw});
    busy(e.target,false);
    if(error){authView('entrar');$('#l-email').value=em;authMsg('Tu cuenta está lista. Entra con tu email y contraseña.','ok')}
  }catch(err){busy(e.target,false);authMsg('Sin conexión. Revisa tu internet e inténtalo de nuevo.','err')}
});
$('#f-forgot').addEventListener('submit',async e=>{
  e.preventDefault();const em=$('#r-email').value.trim().toLowerCase();if(!okEmail(em))return authMsg('Revisa tu email.','err');
  busy(e.target,true,'Enviando…');
  const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  busy(e.target,false);
  if(error){$('#r-help').hidden=false;authMsg('')}
  else authMsg('Si ese email tiene cuenta, te llegará un enlace en unos minutos. Revisa también spam.','ok');
});
$('#r-send').addEventListener('click',async()=>{
  const em=$('#r-email').value.trim().toLowerCase(),m=$('#r-msg').value.trim();
  if(!okEmail(em))return authMsg('Escribe tu email para poder responderte.','err');if(!m)return authMsg('Escribe tu mensaje.','err');
  $('#r-send').disabled=true;
  const {error}=await sb.from('soporte').insert({email:em,mensaje:m.slice(0,2000)});
  $('#r-send').disabled=false;
  if(error)return authMsg('No se pudo enviar. Revisa tu conexión.','err');
  $('#r-help').hidden=true;authMsg('Recibimos tu mensaje. Te escribiremos a '+em+'.','ok');
});
$('#f-newpw').addEventListener('submit',async e=>{
  e.preventDefault();const p=$('#n-pw').value;if(p.length<8)return authMsg('Mínimo 8 caracteres.','err');
  busy(e.target,true,'Guardando…');const {data,error}=await sb.auth.updateUser({password:p});busy(e.target,false);
  if(error)return authMsg('No se pudo guardar. Pide un enlace nuevo.','err');
  recovering=false;clearHash();const {data:{session}}=await sb.auth.getSession();if(session)boot(session);
});

/* ---------- arranque ---------- */
let pendingHash='';
{const h=location.hash||'';if(hashGasto(h)||h==='#despertar')pendingHash=h;
 try{const r=new URLSearchParams(location.search).get('ref');if(r)sessionStorage.setItem('esquina.ref',r.slice(0,40))}catch(e){}}
function teardown(){
  loadingView=false;
  me=null;email='';S=defaults();dirty.clear();for(const k in timers)clearTimeout(timers[k]);
  disarm();stopRing();ch=null;$('#alarm').hidden=true;$('#sheet').hidden=true;closeSettings();$('#view').innerHTML='';
}
async function boot(session){
  if(booting||(me&&me===session.user.id))return;booting=true;
  try{
    teardown();me=session.user.id;email=session.user.email||'';
    const metaName=str(obj(session.user.user_metadata).nombre,40);
    // 1) lo que hay en este dispositivo, para mostrar algo al instante
    let had=false;
    for(const d of DOCS){try{const c=JSON.parse(localStorage.getItem(cacheKey(d))||'null');if(c){had=true;S[d]=clean(d,c.d);if(c.dirty){dirty.add(d);rev[d]=(rev[d]||0)+1}}}catch(e){}}
    if(!S.meta.name)S.meta.name=metaName;
    tab='inicio';try{const t=localStorage.getItem('esquina.tab');if(VIEWS[t])tab=t}catch(e){}
    if(/^#(crear|entrar)$/.test(location.hash))clearHash();
    $('#boot').hidden=true;$('#auth').hidden=true;$('#app').hidden=false;$('#nav').hidden=false;$('#fab').hidden=false;
    loadingView=!had;entering=true;drawTabs();render();setSync();
    // 2) lo que hay en la nube
    const {data,error}=await sb.from('user_docs').select('doc,data');
    if(me!==session.user.id)return;
    if(error){if(loadingView){loadingView=false;entering=true;render()}setSync();toast('Sin conexión: usando lo guardado en este dispositivo');}
    else{
      const before=JSON.stringify(S);
      const got={};(data||[]).forEach(r=>got[r.doc]=r.data);
      for(const d of DOCS){
        if(dirty.has(d)){flush(d);continue}
        if(got[d])S[d]=clean(d,got[d]);
        else{if(d==='meta'&&!S.meta.name)S.meta.name=metaName;save(d)} // primera vez: guarda los valores iniciales
        cacheWrite(d);
      }
      if(!S.meta.name){S.meta.name=metaName;save('meta')}
      lastPull=Date.now();
      if(loadingView){loadingView=false;entering=true;drawTabs();render()}else if(JSON.stringify(S)!==before){drawTabs();render()}
      setSync();
    }
    if(pendingHash){const h=pendingHash;pendingHash='';clearHash();const g=hashGasto(h);if(g)openQuick(g);else if(h==='#despertar')startChallenge('link')}
  }finally{booting=false}
}
/* Al volver a la app, trae cambios hechos en otro dispositivo */
let lastPull=0;
async function pull(){
  if(!me||dirty.size||Date.now()-lastPull<15000)return;
  const who=me;lastPull=Date.now();
  const {data,error}=await sb.from('user_docs').select('doc,data');
  if(error||who!==me||dirty.size)return;
  let changed=false;
  for(const r of data||[]){if(!DOCS.includes(r.doc))continue;const c=clean(r.doc,r.data);if(JSON.stringify(c)!==JSON.stringify(S[r.doc])){S[r.doc]=c;cacheWrite(r.doc);changed=true}}
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#view form');
  if(changed&&!typing&&$('#sheet').hidden&&$('#settings').hidden&&$('#alarm').hidden)render();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull();else for(const d of [...dirty])flush(d)});

sb.auth.onAuthStateChange((ev,session)=>{
  // Se difiere para no llamar a la base de datos dentro del aviso de sesión
  setTimeout(()=>{
    if(ev==='PASSWORD_RECOVERY'){recovering=true;teardown();showAuth('nueva','Escribe tu contraseña nueva.');return}
    if(ev==='SIGNED_OUT'){if(me){teardown();showAuth('entrar')}return}
    if(session&&!recovering&&(ev==='INITIAL_SESSION'||ev==='SIGNED_IN')){
      // Tras cerrar sesión, ignora avisos atrasados con la sesión anterior
      if(manualOut){sb.auth.signOut({scope:'local'}).catch(()=>{});return}
      sb.auth.getSession().then(({data})=>{const cur=data&&data.session;if(cur&&cur.user.id===session.user.id&&!manualOut)boot(cur)});
    }
    else if(ev==='INITIAL_SESSION'&&!session)showAuth(location.hash==='#crear'?'crear':'entrar',pendingHash?'Entra para anotar tu gasto.':'');
  },0);
});
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
})();
