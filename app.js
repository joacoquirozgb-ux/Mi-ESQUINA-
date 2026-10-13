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
const toast=t=>{if(Date.now()-(toast.mute||0)<500)return;const el=$('#toast');toast.at=Date.now();el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1800)};
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
const TONES={suave:'Suave',firme:'Firme',sargento:'Sargento'};
const WATER_EVERY=[30,45,60,90,120];
const coachDef=()=>({on:true,voice:true,tone:'firme',water:{every:60,from:'08:00',to:'22:00'},habitsAt:'21:00',push:false,intro:false,since:0});
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
    week:{blocks:[],done:{}},
    meta:{name:'',tab:'inicio',alarm:{time:'06:30',ex:'flexiones'},countdown:{label:'',date:''},areaNames:{},onboarded:false,mig2L:true,coach:coachDef()}
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
    // Lo que cumpliste de cada bloque planificado: 1 sí, 0 no. Se guardan los últimos 120 días.
    const done={},lim=addDays(today(),-120);
    for(const [k,d] of Object.entries(obj(v.done)))if(isDate(k)&&k>=lim){const o={};for(const [id,x] of Object.entries(obj(d)).slice(0,80))o[sid(id)]=x?1:0;if(Object.keys(o).length)done[k]=o}
    return {blocks,done};
  }
  if(doc==='meta'){
    const a=obj(v.alarm),cd=obj(v.countdown),an={};
    for(const k of AREA_KEYS){const n=str(obj(v.areaNames)[k],24).trim();if(n)an[k]=n}
    let countdown={label:str(cd.label,40),date:isDate(cd.date)?cd.date:''};
    if(!countdown.date&&isDate(v.baby))countdown={label:'Bebé',date:v.baby}; // datos traídos de la versión anterior
    const co=obj(v.coach),cw=obj(co.water),wf=isHM(cw.from)?cw.from:'08:00';
    const coach={on:co.on!==false,voice:co.voice!==false,tone:TONES[co.tone]?co.tone:'firme',
      water:{every:WATER_EVERY.includes(+cw.every)?+cw.every:60,from:wf,to:isHM(cw.to)&&cw.to>wf?cw.to:'22:00'},
      habitsAt:isHM(co.habitsAt)?co.habitsAt:'21:00',push:!!co.push,intro:!!co.intro,since:Math.max(0,nn(co.since))};
    return {name:str(v.name,40),tab:VIEWS[v.tab]?v.tab:'inicio',alarm:{time:isHM(a.time)?a.time:'06:30',ex:['flexiones','sentadillas','alternar'].includes(a.ex)?a.ex:'flexiones'},countdown,areaNames:an,onboarded:!!v.onboarded,mig2L:true,coach};
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
  if(!me||(doc==='claude'&&!projOk))return;
  if(locked()){toast.mute=Date.now();if(Date.now()-(toast.at||0)<400)$('#toast').classList.remove('show');blockedSave(doc);return}
  rev[doc]=(rev[doc]||0)+1;dirty.add(doc);cacheWrite(doc);setSync();
  clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),500);
  if(doc==='week'||doc==='habits'||doc==='meta')syncAvisosSoon();
}
async function flush(doc){
  if(!me||!dirty.has(doc)||locked()||(doc==='claude'&&!projOk))return;
  if(writing[doc]){clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),400);return}
  const r=rev[doc],who=me;writing[doc]=true;
  try{
    const data=JSON.parse(JSON.stringify(S[doc]));
    const {error}=await sb.from('user_docs').upsert({user_id:who,doc,data});
    if(error)throw error;
    fails[doc]=0;if(who===me)base[doc]=JSON.stringify(data);
    if(who===me&&rev[doc]===r){dirty.delete(doc);cacheWrite(doc)}
  }catch(e){
    if(who!==me)return;
    if(e&&e.code==='23514'){toast('Se llenó el espacio de esta sección. Borra registros antiguos.');dirty.delete(doc);cacheWrite(doc)}
    else{if(e&&e.code==='42501')planLoad(); // sin plan vigente: la base no deja guardar
      fails[doc]=(fails[doc]||0)+1;clearTimeout(timers[doc]);timers[doc]=setTimeout(()=>flush(doc),Math.min(60000,2000*2**fails[doc]))}
  }finally{writing[doc]=false;setSync()}
}
async function flushAll(){for(const d of [...dirty]){clearTimeout(timers[d]);await flush(d)}}
function setSync(){
  const el=$('#sync');if(!el)return;
  const off=!navigator.onLine,pend=dirty.size>0;
  if(locked()){el.classList.remove('on');el.classList.add('warn');el.querySelector('span').textContent='Solo lectura · elige un plan';return}
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
const WATER_XP=15, WAKE_XP=20, PLAN_XP=10;
function WD(){if(!S.week.done)S.week.done={};return S.week.done}
function WK(){const h=H();if(!h.wake)h.wake={};return h.wake}
function AL(){if(!S.meta.alarm)S.meta.alarm={time:'06:30',ex:'flexiones'};return S.meta.alarm}
function totalXP(){let t=0;for(const k in H().log)for(const id in H().log[k])t+=H().log[k][id];const w=W();for(const k in w.log)if(w.log[k]>=w.goal)t+=WATER_XP;t+=Object.keys(WK()).length*WAKE_XP;const D=WD();for(const k in D)for(const id in D[k])if(D[k][id]===1)t+=PLAN_XP;return t}
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
  semana:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  'd-resumen':'<path d="M3 20h18"/><path d="M6.5 16v-4M11 16V7M15.5 16v-6M20 16V4"/>',
  'd-usuarios':'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  'd-mensajes':'<path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-5A8.5 8.5 0 1 1 21 12z"/>',
  'd-cobros':'<circle cx="12" cy="12" r="9"/><path d="M14.8 9.3c-.5-.9-1.6-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2.1 0 2.9 5.6 1.5 5.6 4.3 0 1.3-1.2 2.2-2.9 2.2-1.3 0-2.5-.6-3-1.6M12 6.2v1.6M12 16.5v1.4"/>',
  'd-herr':'<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  'd-salir':'<path d="M10 18l-6-6 6-6M4 12h16"/>'
};
const USER_TABS=[['inicio','Inicio'],['habitos','Hábitos'],['dinero','Dinero'],['claude','Proyectos'],['semana','Semana']];
const OWNER_TABS=[['d-resumen','Resumen'],['d-usuarios','Usuarios'],['d-mensajes','Mensajes'],['d-cobros','Cobros'],['d-herr','Enlaces'],['d-salir','Mi app']];
/* Proyectos es solo del dueño: a las demás cuentas no se les muestra y el servidor no les deja guardarlo.
   projOk recuerda en este equipo que la cuenta es del dueño, para no esconderle la pestaña mientras se confirma. */
let projOk=false;
const userTabs=()=>projOk?USER_TABS:USER_TABS.filter(t=>t[0]!=='claude');
let TABS=userTabs();
const TITLES={inicio:['Mi','Esquina'],habitos:['Tus','Hábitos'],dinero:['Tu','Plata'],claude:['Tus','Proyectos'],semana:['Tu','Semana'],
  'd-resumen':['Panel del','Dueño'],'d-usuarios':['Tu','Gente'],'d-mensajes':['Tus','Mensajes'],'d-cobros':['Tus','Cobros'],'d-herr':['Tus','Herramientas']};
let tab='inicio', moneyMonth=monthKey(today()), txType='gasto';
function drawTabs(){
  const pend=owner&&OD.resumen?OD.resumen.mensajes.pendientes:0;
  $('#tabs').innerHTML=TABS.map(([k,n])=>`<button data-tab="${k}" class="${k===tab?'on':''}" aria-current="${k===tab?'page':'false'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>${n}${k==='d-mensajes'&&pend?`<span class="badge num" aria-label="${pend} por responder">${pend}</span>`:''}</button>`).join('');
  $('#tab-ind').style.setProperty('--i',Math.max(0,TABS.findIndex(x=>x[0]===tab)));$('#nav').style.setProperty('--n',TABS.length);
}
let slideDir='';
function go(t){
  if(t==='d-salir')return ownerMode&&leaveOwner();
  if(t==='claude'&&!projOk&&!ownerMode)return;
  if(t===tab){window.scrollTo({top:0,behavior:RM?'auto':'smooth'});if(ownerMode)odRefresh();return}
  const a=TABS.findIndex(x=>x[0]===tab),b=TABS.findIndex(x=>x[0]===t);slideDir=b>a?'l':'r';
  entering=true;tab=t;drawTabs();render();window.scrollTo(0,0);
  if(ownerMode){if(Date.now()-(odAt[OD_NEED[t]]||0)>60000)odLoad(OD_NEED[t],true)}else try{localStorage.setItem('esquina.tab',t)}catch(e){}
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
function projCards(tm,active){return `
    <div class="card tint" style="--c:var(--blue)"><h2>Herramientas del mes</h2><div class="big num" data-count="${Math.round(tm.total)}" data-kind="clp" data-ck="tools">${clp(tm.total)}</div><div class="note">${S.claude.subs.length?S.claude.subs.length+(S.claude.subs.length===1?' suscripción':' suscripciones')+(tm.apiUsd?' · uso '+usd(tm.apiUsd):''):'Anota tus suscripciones en Proyectos'}</div></div>
    <div class="card tint" style="--c:var(--a-empresa)"><h2>Proyectos activos</h2><div class="big num" data-count="${active.length}" data-ck="proj">${active.length}</div><div class="note">${active.length?esc(active.slice(0,2).map(p=>p.name).join(', ')):'Ninguno en curso'}</div></div>`}
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
  ${planCard()}
  ${welcomeCard()}
  ${coachCard()}
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
  <div class="grid g3${projOk?'':' n4'}" style="margin-top:12px">
    <div class="card tint" style="--c:var(--red)"><h2>Racha</h2><div class="flame num" data-count="${st}" data-ck="racha">${st}</div><div class="note">${st===1?'día con la mitad o más':'días seguidos con la mitad o más'}</div></div>
    ${countdownCard()}
    <div class="card tint" style="--c:${ing-gas>=0?'var(--ok)':'var(--red)'}"><h2>Saldo del mes</h2><div class="big num" data-count="${ing-gas}" data-kind="clp" data-ck="saldo">${clp(ing-gas)}</div><div class="note">${clp(ing)} entra · ${clp(gas)} sale</div></div>
    ${projOk?projCards(tm,active):''}
    <div class="card tint" style="--c:var(--a-familia)"><h2>Gasto más grande</h2>${topCat(tx)}</div>
  </div>
  ${weekGlance(k)}
  <div class="sec">
    <div class="sec-h"><h3>Hoy, ${DIAS[dow(k)].toLowerCase()}</h3><button class="btn sm" data-go="semana">Ver semana</button></div>
    <div class="card"><div class="list">${todayBlocks.length?todayBlocks.map(b=>{const a=AREAS[b.area]||AREAS.salud;const now=b.start<=nowHM&&nowHM<b.end,v=planDone(k,b.id);return `<div class="li"><span class="dot" style="background:${a.c}"></span><div class="grow"><div class="t">${esc(b.title)} ${now?'<span class="chip" style="color:var(--red)">Ahora</span>':''}</div><div class="s num">${b.start}–${b.end} · ${esc(a.n)}${b.lock?' · protegido':''}${v===1?' · cumplido':v===0?' · no cumplido':''}</div></div>${b.start<=nowHM?planBtns(b,v):''}</div>`}).join(''):'<div class="empty">Nada agendado hoy.</div>'}</div></div>
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

/* Lo que pasa hoy en Mi Esquina, con los mismos números del panel del dueño */
function esquinaLive(){
  if(!owner)return '';const r=OD.resumen;
  if(!r){if(!odErr.resumen)odLoad('resumen');return ''}
  const v=r.ventas||{},n=x=>+x||0,on=!!(r.cobro&&r.cobro.desde),u=n(r.usuarios&&r.usuarios.total);
  return `<div class="card pl-card" style="margin-bottom:12px"><div class="pl-row"><div style="min-width:0"><div class="eyebrow">Mi Esquina en vivo</div><div class="pl-ct num">${clp(n(v.mrr))} al mes</div><div class="note">${n(v.activas)} ${n(v.activas)===1?'persona pagando':'personas pagando'} · ${u} ${u===1?'cuenta':'cuentas'}${on?'':' · cobro apagado'}</div></div><button class="btn sm" type="button" data-cobros>Ver cobros</button></div></div>`;
}
function vProyectos(){
  const m=monthKey(today());const tm=toolsMonth(m);const C=S.claude;
  const perProj={};C.usage.filter(u=>monthKey(u.date)===m).forEach(u=>perProj[u.proj||'Sin proyecto']=(perProj[u.proj||'Sin proyecto']||0)+(+u.usd||0));
  const order={curso:0,idea:1,pausa:2,listo:3,vendido:4};
  const P=[...C.projects].sort((a,b)=>(order[a.status]??9)-(order[b.status]??9));
  const pipeline=C.projects.filter(p=>p.status!=='vendido').reduce((a,p)=>a+(+p.value||0),0);
  const cobrado=C.projects.filter(p=>p.status==='vendido').reduce((a,p)=>a+(+p.value||0),0);
  const usage=[...C.usage].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  return `${esquinaLive()}
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
  if(!ownerMode&&tab==='claude'&&!projOk){tab='inicio';drawTabs()}
  const V=ownerMode?OVIEWS:VIEWS;v.innerHTML=(V[tab]||Object.values(V)[0])();animateWater();
  requestAnimationFrame(()=>requestAnimationFrame(()=>v.querySelectorAll('.rprog').forEach(c=>c.style.strokeDashoffset=c.dataset.to)));
  const counts=[...v.querySelectorAll('[data-count]')],ck=(el,i)=>tab+':'+(el.dataset.ck||i);
  if(entering){entering=false;
    if(slideDir&&!RM){v.classList.remove('slide-l','slide-r');void v.offsetWidth;v.classList.add('slide-'+slideDir)}slideDir='';
    counts.forEach((el,i)=>{prevCount[ck(el,i)]=+el.dataset.count});
    reveal(v);
  }else counts.forEach((el,i)=>{const k=ck(el,i),to=+el.dataset.count,from=prevCount[k];prevCount[k]=to;
    if(from!==undefined&&from!==to&&!RM){countUp(el,from,to);el.classList.add('bump')}});
  if(celebrate){const c=celebrate;celebrate=null;if(Date.now()-(toast.mute||0)>500)requestAnimationFrame(()=>c())}
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
  // Mide la pantalla completa aunque la página esté acercada con los dedos; si no, el confeti dejaba rayas
  const vw=()=>document.documentElement.clientWidth||innerWidth,vh=()=>document.documentElement.clientHeight||innerHeight;
  function size(){const d=window.devicePixelRatio||1;cv.width=vw()*d;cv.height=vh()*d;cx.setTransform(d,0,0,d,0,0)}
  function ensure(){if(cv)return;cv=document.createElement('canvas');cv.className='fx';document.body.appendChild(cv);cx=cv.getContext('2d');size();addEventListener('resize',size)}
  function loop(){cx.save();cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.restore();parts=parts.filter(p=>p.life>0);
    for(const p of parts){p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.rot+=p.vr;p.life--;cx.save();cx.globalAlpha=Math.min(1,p.life/30);cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.c;
      if(p.circle){cx.beginPath();cx.arc(0,0,p.s/2,0,7);cx.fill()}else cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore()}
    raf=parts.length?requestAnimationFrame(loop):0}
  const run=()=>{if(!raf)raf=requestAnimationFrame(loop)};
  return{
    burst(x,y,c,n=18){if(RM)return;ensure();for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*4.5;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.5,g:.2,s:4+Math.random()*5,c,rot:0,vr:(Math.random()-.5)*.4,life:40+Math.random()*25,circle:Math.random()<.5})}run()},
    rain(){if(RM)return;ensure();const cols=['#D3263A','#2155D6','#15897A','#C77A00','#8A3FD1','#1E90D6','#F4F4F2'];
      for(let i=0;i<150;i++)parts.push({x:Math.random()*vw(),y:-20-Math.random()*vh()*.6,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,g:.05,s:6+Math.random()*7,c:cols[i%cols.length],rot:Math.random()*6,vr:(Math.random()-.5)*.3,life:170+Math.random()*90});run()}
  }})();
function burstAt(sel){const el=document.querySelector(sel);if(!el)return;const r=el.getBoundingClientRect();FX.burst(r.left+r.width/2,r.top+r.height/2,getComputedStyle(el).borderTopColor||'#D3263A')}
function safeUrl(u){return /^https?:\/\//i.test(String(u||'').trim())?String(u).trim().slice(0,500):''}
const num=v=>{const s=String(v||'').replace(/\s|\$/g,'');if(/,\d{1,2}$/.test(s))return parseFloat(s.replace(/\./g,'').replace(',','.'));return parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))||0};

/* ---------- panel del dueño ----------
   Solo para cuentas marcadas como dueño en la base de datos (dueno_privado.duenos).
   La seguridad está en Supabase: estas funciones responden "no autorizado" a cualquier otra cuenta.
   Muestra números generales y datos de la cuenta, nunca lo que cada persona anota (así lo dice la política de privacidad). */
const ICON_CROWN='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4.5 4.2L12 5l4.5 7.2L21 8l-1.8 10.5H4.8z"/><path d="M5 21.5h14"/></svg>';
const OD_NEED={'d-resumen':'resumen','d-usuarios':'usuarios','d-mensajes':'mensajes','d-cobros':'cobros','d-herr':'estado'};
let owner=false,ownerMode=false,odQ='',odFil='pend',odUser=null;
const OD={},odBusy={},odErr={},odAt={};
const LINKS=[
  ['Tu app',[
    ['Página de inicio','La que ve la gente nueva','https://joacoquirozgb-ux.github.io/Mi-ESQUINA-/','var(--red)','<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ['La app','Lo que usa tu gente','https://joacoquirozgb-ux.github.io/Mi-ESQUINA-/app.html','var(--a-empresa)','<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>'],
    ['Privacidad y términos','Lo que prometes','https://joacoquirozgb-ux.github.io/Mi-ESQUINA-/privacidad.html','var(--muted)','<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>']]],
  ['Base de datos y cuentas · Supabase',[
    ['Panel del proyecto','Todo Mi Esquina','https://supabase.com/dashboard/project/hkhweiduvkggbzfdpiyk','var(--ok)','<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'],
    ['Cuentas','Quién se registró','https://supabase.com/dashboard/project/hkhweiduvkggbzfdpiyk/auth/users','var(--blue)','<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
    ['Tablas','Los datos guardados','https://supabase.com/dashboard/project/hkhweiduvkggbzfdpiyk/editor','var(--a-contenido)','<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'],
    ['Funciones','Crear y borrar cuentas, pagos','https://supabase.com/dashboard/project/hkhweiduvkggbzfdpiyk/functions','var(--warn)','<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'],
    ['Registros','Errores y accesos','https://supabase.com/dashboard/project/hkhweiduvkggbzfdpiyk/logs/explorer','var(--a-salud)','<path d="M4 6h16M4 12h10M4 18h13"/>']]],
  ['Código y publicación · GitHub',[
    ['Repositorio','El código de la página','https://github.com/joacoquirozgb-ux/Mi-ESQUINA-','var(--fg)','<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>'],
    ['Publicaciones','Si la última versión salió bien','https://github.com/joacoquirozgb-ux/Mi-ESQUINA-/actions','var(--ok)','<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>']]],
  ['Tus páginas en Claude',[
    ['Mi Esquina personal','Tu versión con despertador y atajos','https://claude.ai/artifact/SkNxNw3QM77sptahaM4RGT','var(--red)','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['Página de venta','Lista de espera de Mi Esquina','https://claude.ai/artifact/TnK4exCQ9tmprrRhyb4kH7','var(--a-familia)','<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 14h6"/>'],
    ['Cotiza al Toque','Preventa del cotizador','https://claude.ai/artifact/8KAs71QugjFvW38rmN2ooJ','var(--blue)','<path d="M6 2.5h9l4 4V21.5H6z"/><path d="M14.5 2.5V7H19M9 12h7M9 16h5"/>']]]
];
const DOLOR={habitos:'Sus hábitos',plata:'Su plata',tiempo:'Su tiempo',todo:'Todo junto',sin:'Sin responder'};
const PAGA={si:'Sí',quizas:'Quizás',no:'No',sin:'Sin responder'};
const AV_COL=['#E0283E','#2B5CE6','#0F9D7A','#D98A00','#8A3FD1','#1E90D6','#E85D9A'];
const avCol=id=>{let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return AV_COL[h%AV_COL.length]};
const initial=u=>esc(((u.nombre||u.email||'?').trim()[0]||'?').toUpperCase());
const mailto=(to,subject,body)=>'mailto:'+encodeURIComponent(to||'').replace(/%40/g,'@')+'?subject='+encodeURIComponent(subject)+(body?'&body='+encodeURIComponent(body):'');
function rel(iso){
  if(!iso)return '';const d=new Date(iso),t=new Date();if(isNaN(d))return '';
  const day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate());const n=Math.round((day(t)-day(d))/864e5);
  const hm=pad(d.getHours())+':'+pad(d.getMinutes());
  if(n<=0)return 'hoy a las '+hm;if(n===1)return 'ayer a las '+hm;if(n<7)return 'hace '+n+' días';if(n<14)return 'hace 1 semana';if(n<31)return 'hace '+Math.floor(n/7)+' semanas';
  return d.getDate()+' de '+MESES[d.getMonth()]+(d.getFullYear()!==t.getFullYear()?' de '+d.getFullYear():'');
}
const fullDate=iso=>{if(!iso)return 'Nunca';const d=new Date(iso);return isNaN(d)?'—':d.getDate()+' de '+MESES[d.getMonth()]+' de '+d.getFullYear()+', '+pad(d.getHours())+':'+pad(d.getMinutes())};
async function callOwnerFn(body){
  const {data:{session}}=await sb.auth.getSession();if(!session)return {error:'Tu sesión venció. Vuelve a entrar.'};
  try{const r=await fetch(SB_URL+'/functions/v1/dueno-cuentas',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));return r.ok?{data:j}:{error:j.error||'No se pudo hacer. Inténtalo otra vez.'}}
  catch(e){return {error:'Sin conexión. Inténtalo otra vez.'}}
}
async function odLoad(k,force){
  if(!owner||!k||odBusy[k]||(OD[k]&&!force))return;
  odBusy[k]=true;odErr[k]=false;const who=me,first=!OD[k];
  const res=k==='estado'?await callOwnerFn({accion:'estado'}):k==='cobros'?await odCobros():await sb.rpc('dueno_'+k);
  odBusy[k]=false;if(who!==me||!owner)return;
  if(res.error){odErr[k]=true}else{OD[k]=res.data;odAt[k]=Date.now()}
  if(k==='resumen')ownerBadges();
  if(!ownerMode&&tab==='claude'&&k==='resumen')render();
  if(ownerMode&&(OD_NEED[tab]===k||tab==='d-herr'||(tab==='d-cobros'&&k==='resumen'))){if(first&&OD_NEED[tab]===k)entering=true;render()}
}
function odRefresh(){if(!ownerMode)return;odLoad('resumen',true);const k=OD_NEED[tab];if(k&&k!=='resumen')odLoad(k,true)}
function ownerBadges(){
  const n=OD.resumen?OD.resumen.mensajes.pendientes:0;
  document.querySelectorAll('[data-owner]').forEach(b=>{b.querySelector('.badge')?.remove();if(n&&!ownerMode)b.insertAdjacentHTML('beforeend',`<span class="badge num">${n}</span>`)});
  if(ownerMode)drawTabs();
}
const projKey=()=>'esquina.proy.'+me;
function projHint(){try{projOk=localStorage.getItem(projKey())==='1'}catch(e){projOk=false}TABS=userTabs()}
async function checkOwner(){
  const who=me;const {data,error}=await sb.rpc('es_dueno');if(who!==me)return;
  owner=!error&&data===true;document.body.classList.toggle('is-owner',owner);
  if(!error){
    if(projOk!==owner){projOk=owner;try{owner?localStorage.setItem(projKey(),'1'):localStorage.removeItem(projKey())}catch(e){}
      if(!ownerMode){TABS=userTabs();drawTabs();render()}}
    if(dirty.has('claude')){if(owner)flush('claude');else{dirty.delete('claude');cacheWrite('claude');setSync()}}
  }
  if(!owner)return;
  odLoad('resumen');
  let back=false;try{back=sessionStorage.getItem('esquina.dueno')==='1'}catch(e){}
  if(back)enterOwner(true);
}
function enterOwner(quiet){
  if(!owner||ownerMode)return;
  ownerMode=true;TABS=OWNER_TABS;tab='d-resumen';slideDir='l';entering=true;
  document.body.classList.add('owner');try{sessionStorage.setItem('esquina.dueno','1')}catch(e){}
  drawTabs();render();window.scrollTo(0,0);ownerBadges();odRefresh();if(!quiet)toast('Panel del dueño');
}
function leaveOwner(){
  ownerMode=false;TABS=userTabs();tab='inicio';slideDir='r';entering=true;
  document.body.classList.remove('owner');try{sessionStorage.removeItem('esquina.dueno')}catch(e){}
  try{const t=localStorage.getItem('esquina.tab');if(VIEWS[t])tab=t}catch(e){}
  drawTabs();render();window.scrollTo(0,0);ownerBadges();
}
function ownerReset(){
  owner=false;ownerMode=false;projOk=false;TABS=userTabs();odUser=null;odQ='';odFil='pend';
  for(const o of [OD,odBusy,odErr,odAt])for(const k in o)delete o[k];
  document.body.classList.remove('owner','is-owner');
  const s=$('#od-sheet');if(s){s.hidden=true;$('#od-body').innerHTML=''}
}
/* Mientras carga muestra tarjetas grises; si falla, un botón para reintentar */
function odWait(k){
  if(!odErr[k])odLoad(k); // si falló, espera a que toque Reintentar en vez de reintentar sin parar
  if(odErr[k]&&!odBusy[k])return `<div class="card"><div class="empty">No se pudo cargar. Revisa tu conexión.<br><button class="btn sm" type="button" data-od="retry" data-k="${k}" style="margin-top:10px">Reintentar</button></div></div>`;
  return '<div class="skel" aria-label="Cargando"><i></i><i></i><i></i></div>';
}
function odBars(map,labels,cols,total){
  return Object.keys(labels).filter(k=>k!=='sin'||map.sin).map((k,i)=>{const n=+map[k]||0,p=total?Math.round(n/total*100):0;
    return `<div class="od-bar"><div class="od-bl"><b><span class="dot" style="background:${cols[i]}"></span>${labels[k]}</b><span class="num muted">${n} · ${p}%</span></div><div class="bar"><i style="width:${p}%;background:${cols[i]}"></i></div></div>`}).join('');
}
function vOResumen(){
  const r=OD.resumen;if(!r)return odWait('resumen');
  const u=r.usuarios,N=+u.total||0,alt=r.altas||[],mx=Math.max(1,...alt.map(a=>+a.n||0));
  const P=+r.perfiles||0,uso=r.uso||{},cot=r.cotizador||{},pend=+r.mensajes.pendientes||0;
  const at=odAt.resumen?new Date(odAt.resumen):new Date();
  return `
  <div class="card hero od-hero">
    <div class="eyebrow">Personas en Mi Esquina</div>
    <div class="od-big num" data-count="${N}" data-ck="tot">${N}</div>
    <div class="note"><b class="num">+${u.hoy}</b> hoy · <b class="num">+${u.semana}</b> esta semana · <b class="num">+${u.mes}</b> en 30 días</div>
    <div class="od-spark" aria-label="Cuentas nuevas por día, últimos 30 días">${alt.map((a,i)=>`<i class="wb${a.n?' on':''}" style="--d:${(i/3).toFixed(1)};height:${a.n?Math.max(14,a.n/mx*100):5}%"></i>`).join('')}</div>
    <div class="od-axis"><span>Hace 30 días</span><span>Hoy</span></div>
  </div>
  <div class="grid g3" style="margin-top:12px">
    <div class="card tint" style="--c:var(--ok)"><h2>Activas esta semana</h2><div class="big num" data-count="${+r.activos7||0}" data-ck="act">${+r.activos7||0}</div><div class="note">de ${N} ${N===1?'persona':'personas'} usaron la app</div></div>
    <button class="card tint od-tap" type="button" data-tab="d-mensajes" style="--c:${pend?'var(--red)':'var(--blue)'}"><h2>Por responder</h2><div class="big num" data-count="${pend}" data-ck="pend">${pend}</div><div class="note">${pend?'Toca para leerlos':'Todo al día'} ›</div></button>
    <div class="card tint wide" style="--c:var(--a-contenido)"><h2>Activas este mes</h2><div class="big num" data-count="${+r.activos30||0}" data-ck="act30">${+r.activos30||0}</div><div class="note">${u.suspendidas?u.suspendidas+(u.suspendidas===1?' cuenta suspendida':' cuentas suspendidas'):'Ninguna cuenta suspendida'}</div></div>
  </div>
  <div class="sec"><div class="sec-h"><h3>¿Pagarían $2.990?</h3><span class="muted num">${P} ${P===1?'respuesta':'respuestas'}</span></div>
    <div class="card">${P?odBars(r.pagaria||{},PAGA,['var(--ok)','var(--warn)','var(--red)','var(--muted)'],P):'<div class="empty">Aún nadie responde la encuesta del registro.</div>'}</div></div>
  <div class="sec"><div class="sec-h"><h3>Lo que más les cuesta</h3></div>
    <div class="card">${P?odBars(r.dolor||{},DOLOR,['var(--a-deporte)','var(--a-empresa)','var(--blue)','var(--a-contenido)','var(--muted)'],P):'<div class="empty">Sin respuestas todavía.</div>'}</div></div>
  <div class="sec"><div class="sec-h"><h3>Qué usan</h3><span class="note">Personas que ya anotaron algo</span></div>
    <div class="card">${[['habitos','Hábitos','var(--red)'],['agua','Agua','var(--water)'],['despertar','Despertador','var(--a-contenido)'],['dinero','Dinero','var(--ok)'],['semana','Semana','var(--blue)']].map(([k,n,c])=>{const v=+uso[k]||0,p=N?Math.round(v/N*100):0;
      return `<div class="od-bar"><div class="od-bl"><b><span class="dot" style="background:${c}"></span>${n}</b><span class="num muted">${v} de ${N}</span></div><div class="bar"><i style="width:${p}%;background:${c}"></i></div></div>`}).join('')}
      <div class="note">Solo cuentas personas. Lo que cada una anota es privado y no se muestra.</div></div></div>
  <div class="sec"><div class="sec-h"><h3>Cotiza al Toque</h3><span class="note">Mismo servidor, otra app</span></div>
    <div class="card"><div class="grid g3 od-mini">
      <div><div class="eyebrow">Negocios</div><b class="num" data-count="${+cot.negocios||0}" data-ck="cn">${+cot.negocios||0}</b></div>
      <div><div class="eyebrow">Cotizaciones</div><b class="num" data-count="${+cot.cotizaciones||0}" data-ck="cc">${+cot.cotizaciones||0}</b></div>
      <div class="wide"><div class="eyebrow">Pagando</div><b class="num" data-count="${+cot.activas||0}" data-ck="ca">${+cot.activas||0}</b></div></div></div></div>
  <div class="od-foot"><span class="note">Actualizado a las ${pad(at.getHours())}:${pad(at.getMinutes())}</span><button class="btn sm" type="button" data-od="refresh">Actualizar</button></div>`;
}
function odFiltered(){
  const q=odQ.trim().toLowerCase(),L=OD.usuarios||[];
  return q?L.filter(u=>(u.nombre||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)):L;
}
function odUserRows(){
  const L=odFiltered();
  if(!L.length)return `<div class="empty">${odQ?'Nadie coincide con esa búsqueda.':'Todavía no hay cuentas.'}</div>`;
  return L.map(u=>`<button class="li od-user" type="button" data-od="user" data-id="${esc(u.id)}"><span class="av" style="--c:${avCol(u.id)}">${initial(u)}</span><div class="grow"><div class="t">${esc(u.nombre||'Sin nombre')}${u.dueno?' <span class="chip">Tú</span>':''}${u.suspendida?' <span class="chip" style="color:var(--red)">Suspendida</span>':''}${u.plan&&new Date(u.vence)>new Date()?` <span class="chip" style="color:var(--ok)">${u.plan==='anual'?'Anual':'Mensual'}${u.fundador?' · fundador':''}</span>`:''}</div><div class="s od-mail">${esc(u.email)}</div><div class="s">Se unió ${rel(u.creado)}${u.actividad?' · activa '+rel(u.actividad):' · aún sin usarla'}</div></div><span class="chev" aria-hidden="true">›</span></button>`).join('');
}
const odCount=()=>{const n=odFiltered().length;return n+(n===1?' cuenta':' cuentas')};
function vOUsuarios(){
  if(!OD.usuarios)return odWait('usuarios');
  return `
  <div class="card od-searchcard"><input id="od-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Buscar por nombre o email" value="${esc(odQ)}" aria-label="Buscar cuentas">
    <div class="od-foot" style="margin:0"><span class="muted num" id="od-count">${odCount()}</span><button class="btn sm" type="button" data-od="csv">Descargar lista</button></div></div>
  <div class="card" style="margin-top:12px"><div class="list" id="od-list">${odUserRows()}</div></div>
  <div class="note" style="margin-top:10px;text-align:center">Ves los datos de cada cuenta y lo que respondió al registrarse. Lo que anota en la app es solo suyo.</div>`;
}
function vOMensajes(){
  if(!OD.mensajes)return odWait('mensajes');
  const L=OD.mensajes,pend=L.filter(m=>!m.atendido).length;
  const show=L.filter(m=>odFil==='all'||(odFil==='pend'?!m.atendido:m.atendido));
  return `
  <div class="seg od-seg" role="tablist"><button type="button" data-od="fil" data-v="pend" class="${odFil==='pend'?'on':''}">Pendientes${pend?` <span class="cnt num">${pend}</span>`:''}</button><button type="button" data-od="fil" data-v="done" class="${odFil==='done'?'on':''}">Atendidos</button><button type="button" data-od="fil" data-v="all" class="${odFil==='all'?'on':''}">Todos</button></div>
  <div class="grid" style="margin-top:12px">${show.length?show.map(m=>{const who=m.nombre||m.email;const pw=/contraseñ/i.test(m.mensaje);return `
    <div class="card od-msg${m.atendido?' done':''}">
      <div class="od-mh"><span class="av" style="--c:${avCol(m.email)}">${initial(m)}</span><div class="grow"><b class="od-mail" style="display:block">${esc(who)}</b>${m.nombre?`<div class="s muted od-mail">${esc(m.email)}</div>`:''}<div class="s muted">${rel(m.creado)}${m.cuenta?'':' · escribió sin entrar'}</div></div>${m.atendido?'<span class="chip" style="color:var(--ok)">Atendido</span>':'<span class="chip od-new">Nuevo</span>'}</div>
      <p class="od-mt">${esc(m.mensaje)}</p>
      <div class="od-ma"><a class="btn sm pri" href="${esc(mailto(m.email,pw?'Tu cuenta en Mi Esquina':'Re: tu mensaje a Mi Esquina','Hola'+(m.nombre?' '+m.nombre.split(' ')[0]:'')+',\n\n'))}">Responder por correo</a><button class="btn sm" type="button" data-od="done" data-id="${+m.id}" data-v="${m.atendido?'0':'1'}">${m.atendido?'Volver a pendiente':'Marcar atendido'}</button></div>
    </div>`}).join(''):`<div class="empty">${odFil==='pend'?'No hay mensajes por responder. 👊':'No hay mensajes aquí.'}</div>`}</div>`;
}
function vOHerr(){
  const est=OD.estado;if(!odErr.estado)odLoad('estado');if(!odErr.resumen)odLoad('resumen');if(!odErr.cobros)odLoad('cobros');
  const pend=OD.resumen?+OD.resumen.mensajes.pendientes||0:null;
  const st=(ok,yes,no)=>`<span class="chip" style="color:${ok?'var(--ok)':'var(--warn)'}"><span class="dot" style="background:currentColor"></span>${ok?yes:no}</span>`;
  return `
  <div class="card"><h2>Estado</h2><div class="list">
    <div class="li"><div class="grow"><div class="t">Mensajes</div><div class="s">Ayuda y "olvidé mi contraseña"</div></div>${pend===null?'<span class="chip">…</span>':st(!pend,'Al día',pend+' por responder')}</div>
    <button class="li od-user" type="button" data-tab="d-cobros"><div class="grow"><div class="t">Cobro de Mi Esquina</div><div class="s">Planes, Mercado Pago y ventas</div></div>${!OD.cobros?(odErr.cobros?'<span class="chip">Sin datos</span>':'<span class="chip">…</span>'):st(!!OD.cobros.cobro_desde,'Encendido','Apagado')}</button>
    <div class="li"><div class="grow"><div class="t">Pagos con Mercado Pago</div><div class="s">Para cobrar el cotizador</div></div>${!est?(odErr.estado?'<span class="chip">Sin datos</span>':'<span class="chip">…</span>'):st(est.pagos,'Listos','Falta conectar')}</div>
  </div></div>
  ${LINKS.map(([g,items])=>`<div class="sec"><div class="sec-h"><h3>${esc(g)}</h3></div><div class="od-tools">${items.map(([t,d,url,c,ic])=>`<a class="od-tool card" href="${esc(url)}" target="_blank" rel="noopener"><span class="od-ic" style="--c:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></span><b>${esc(t)}</b><span class="s">${esc(d)}</span><span class="od-go" aria-hidden="true">↗</span></a>`).join('')}</div></div>`).join('')}`;
}
/* Cobros: conectar Mercado Pago, encender el cobro y ver las ventas. Las claves van directo al servidor y nunca vuelven. */
async function odCobros(){
  const [a,b]=await Promise.all([callPagoFn({accion:'config'}),sb.rpc('precios_publicos')]);
  return a.error?a:{data:{...a.data,precios:b.data||null}};
}
function odPlanTxt(u){
  if(!u.plan)return 'Sin plan';
  const vig=new Date(u.vence)>new Date();
  if(!vig)return 'Venció el '+dayFmt(u.vence);
  if(u.plan==='anual')return 'Anual hasta el '+dayFmt(u.vence);
  return 'Mensual'+(u.fundador?' fundador':'')+(u.estado==='activa'?' · se renueva solo':' · cancelado, hasta el '+dayFmt(u.vence));
}
function vOCobros(){
  const cf=OD.cobros;if(!odErr.resumen)odLoad('resumen');
  if(!cf)return odWait('cobros');
  const r=OD.resumen||{},v=r.ventas||{},cb=r.cobro||{},on=!!cf.cobro_desde,modo=cf.modo||'prueba',pr=cf.precios||{},n=x=>+x||0,dias=n(cf.prueba_dias)||14;
  const st=(ok,yes,no)=>`<span class="chip" style="color:${ok?'var(--ok)':'var(--warn)'}"><span class="dot" style="background:currentColor"></span>${ok?yes:no}</span>`;
  const listo=cf.token_ok&&cf.secreto;
  return `
  <div class="card hero od-hero">
    <div class="eyebrow">${on?'Cobrando desde el '+esc(dayFmt(cf.cobro_desde)):'Cobro apagado · todos usan la app gratis'}</div>
    <div class="od-big num" data-count="${n(v.mrr)}" data-kind="clp" data-ck="mrr">${clp(n(v.mrr))}</div>
    <div class="note">Ingreso mensual estimado · <b class="num">${n(v.activas)}</b> ${n(v.activas)===1?'persona pagando':'personas pagando'}</div>
  </div>
  <div class="grid g3" style="margin-top:12px">
    <div class="card tint" style="--c:var(--ok)"><h2>Pagando ahora</h2><div class="big num" data-count="${n(v.activas)}" data-ck="pag">${n(v.activas)}</div><div class="note">${n(v.anual)} anual · ${n(v.mensual)} mensual${n(v.fundadores)?' · '+n(v.fundadores)+(n(v.fundadores)===1?' fundador':' fundadores'):''}</div></div>
    <div class="card tint" style="--c:var(--blue)"><h2>Cobrado en 30 días</h2><div class="big num" data-count="${n(r.ingresos30)}" data-kind="clp" data-ck="ing30">${clp(n(r.ingresos30))}</div><div class="note">${clp(n(r.ingresos))} desde el inicio</div></div>
    <div class="card tint wide" style="--c:var(--a-contenido)"><h2>En prueba gratis</h2><div class="big num" data-count="${n(cb.en_prueba)}" data-ck="prue">${n(cb.en_prueba)}</div><div class="note">${on?n(cb.sin_plan)+(n(cb.sin_plan)===1?' terminó la prueba sin pagar':' terminaron la prueba sin pagar'):'Empieza cuando enciendas el cobro'}</div></div>
  </div>
  <div class="sec"><div class="sec-h"><h3>Conecta Mercado Pago</h3>${st(listo,'Listo','Falta')}</div>
   <div class="card cb-steps">
    <div class="cb-step"><span class="cb-n${cf.token_ok?' ok':''}">${cf.token_ok?ICON_CHECK:'1'}</span><div class="cb-b">
      <b>Tu Access Token</b>
      <div class="note">${cf.token_ok?`Conectado a la cuenta <b>${esc((cf.cuenta||{}).nombre||'de Mercado Pago')}</b>.${(cf.cuenta||{}).prueba?' <span style="color:var(--warn)">Son credenciales de prueba: los pagos no son reales.</span>':''}`:cf.token?'El token guardado ya no funciona. Pega uno nuevo.':'En Mercado Pago Developers crea una aplicación para Mi Esquina (pagos online). En <b>Credenciales de producción</b> copia el <b>Access Token</b>, que empieza con APP_USR-, y pégalo aquí.'}</div>
      <div><a class="btn sm" href="https://www.mercadopago.cl/developers/panel/app" target="_blank" rel="noopener">Abrir Mercado Pago Developers ↗</a></div>
      <form class="row cb-form" id="f-cb-token"><label>Access Token<input id="cb-token" type="password" autocomplete="off" spellcheck="false" placeholder="APP_USR-…" maxlength="260"></label><button class="btn" type="submit">${cf.token?'Cambiar':'Guardar'}</button></form></div></div>
    <div class="cb-step"><span class="cb-n${cf.secreto?' ok':''}">${cf.secreto?ICON_CHECK:'2'}</span><div class="cb-b">
      <b>Avisos de pago</b>
      <div class="note">En tu aplicación entra a <b>Webhooks</b> (modo productivo). Pega esta dirección, marca <b>Pagos</b> y <b>Planes y suscripciones</b>, guarda y copia aquí la <b>clave secreta</b> que te muestra.</div>
      <div class="cb-url"><code id="cb-url">${esc(cf.webhook||'')}</code><button class="btn sm" type="button" data-copy="cb-url">Copiar</button></div>
      <form class="row cb-form" id="f-cb-sec"><label>Clave secreta${cf.secreto?' (ya está guardada)':''}<input id="cb-sec" type="password" autocomplete="off" spellcheck="false" maxlength="200"></label><button class="btn" type="submit">${cf.secreto?'Cambiar':'Guardar'}</button></form></div></div>
    <div class="cb-step"><span class="cb-n${on?' ok':''}">${on?ICON_CHECK:'3'}</span><div class="cb-b">
      <b>${on?'Cobro encendido':'Enciende el cobro'}</b>
      <div class="note">${on?'Cada persona tiene '+dias+' días gratis desde que se registra (o desde que encendiste el cobro). Si lo apagas, todos vuelven a usarla gratis y quienes pagaron mantienen su plan.':'Al encenderlo, cada persona tiene '+dias+' días gratis desde ese momento y después elige un plan. Antes puedes probar tú: abre la pantalla de planes y paga con tu cuenta (es un pago real, que después puedes devolver desde Mercado Pago).'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${on?'<button class="btn" type="button" data-od="cb-off">Apagar cobro</button>':`<button class="btn red" type="button" data-od="cb-on"${cf.token_ok?'':' disabled'}>Encender cobro</button>`}<button class="btn" type="button" data-od="cb-plans">Ver la pantalla de planes</button></div></div></div>
   </div></div>
  <div class="sec"><div class="sec-h"><h3>Cuando termina la prueba</h3></div>
    <div class="card"><div class="seg od-seg" role="tablist"><button type="button" data-od="cb-modo" data-v="prueba" class="${modo==='prueba'?'on':''}">Pagar para seguir</button><button type="button" data-od="cb-modo" data-v="basico" class="${modo==='basico'?'on':''}">Básico gratis</button></div>
    <div class="note" style="margin-top:10px">${modo==='prueba'?'Puede ver y descargar sus datos, pero no anotar nada nuevo hasta que pague.':'Hábitos, plata y semana siguen gratis para siempre; el instructor con voz y sus avisos quedan para quienes pagan.'} La regla la aplica el servidor, así que no se la pueden saltar desde la página.</div></div></div>
  <div class="sec"><div class="sec-h"><h3>Precios</h3><span class="note">Con IVA incluido</span></div>
    <div class="card"><div class="list od-kv">
      <div class="li"><span class="s">Anual (un pago)</span><b class="num">${clp(n(pr.anual)||29990)}</b></div>
      <div class="li"><span class="s">Mensual fundador</span><b class="num">${clp(n(pr.mensual)||2990)}</b></div>
      <div class="li"><span class="s">Mensual desde la cuenta 101</span><b class="num">${clp(n(pr.normal)||4990)}</b></div>
      <div class="li"><span class="s">Cupos de fundador libres</span><b class="num">${n(pr.cupos)} de 100</b></div>
    </div><div class="note" style="margin-top:8px">Las primeras 100 cuentas pagan el precio fundador mientras sigan suscritas, como dice tu página de inicio.</div></div></div>
  <div class="od-foot"><span class="note">Mercado Pago descuenta su comisión de cada pago.</span><button class="btn sm" type="button" data-od="refresh">Actualizar</button></div>`;
}
const OVIEWS={'d-resumen':vOResumen,'d-usuarios':vOUsuarios,'d-mensajes':vOMensajes,'d-cobros':vOCobros,'d-herr':vOHerr};
function odSheetHTML(u){
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
    <div style="display:flex;gap:14px;align-items:center;min-width:0"><span class="av lg" style="--c:${avCol(u.id)}">${initial(u)}</span><div style="min-width:0"><b class="disp" style="font-size:26px;text-transform:uppercase;display:block;line-height:1.05;overflow-wrap:anywhere">${esc(u.nombre||'Sin nombre')}</b><div class="muted od-mail" style="font-size:14px">${esc(u.email)}</div></div></div>
    <button type="button" class="x" data-od="close" aria-label="Cerrar">×</button></div>
  ${u.suspendida?'<div class="od-warn">Cuenta suspendida: no puede entrar hasta que la reactives. Sus datos siguen guardados.</div>':''}
  <div class="list od-kv">
    <div class="li"><span class="s">Se unió</span><b>${fullDate(u.creado)}</b></div>
    <div class="li"><span class="s">Último ingreso</span><b>${fullDate(u.ingreso)}</b></div>
    <div class="li"><span class="s">Usó la app</span><b>${u.actividad?rel(u.actividad):'Todavía no'}</b></div>
    <div class="li"><span class="s">Le cuesta más</span><b>${u.dolor?DOLOR[u.dolor]||'—':'No respondió'}</b></div>
    <div class="li"><span class="s">¿Pagaría $2.990?</span><b>${u.pagaria?PAGA[u.pagaria]||'—':'No respondió'}</b></div>
    <div class="li"><span class="s">Llegó desde</span><b>${esc(u.origen||'Directo')}</b></div>
    <div class="li"><span class="s">Plan</span><b>${esc(odPlanTxt(u))}</b></div>
  </div>
  <a class="btn pri" href="${esc(mailto(u.email,'Mi Esquina','Hola'+(u.nombre?' '+u.nombre.split(' ')[0]:'')+',\n\n'))}">Escribirle un correo</a>
  ${u.dueno?'<div class="note" style="text-align:center">Esta es tu cuenta de dueño. Para cambiarla usa Ajustes.</div>':`
  <button class="btn" type="button" data-od="act" data-act="${u.suspendida?'reactivar':'suspender'}">${u.suspendida?'Reactivar cuenta':'Suspender cuenta'}</button>
  <div class="note">${u.suspendida?'Podrá volver a entrar con su misma contraseña.':'No podrá entrar hasta que la reactives. No se borra nada.'}</div>
  <form class="row" id="od-del" style="margin-top:6px"><label>Para borrar esta cuenta y todo lo que anotó, escribe BORRAR<input id="od-d" autocomplete="off" maxlength="10"></label><button class="btn red" type="submit">Borrar cuenta</button></form>`}`;
}
function openOdSheet(id){
  const u=(OD.usuarios||[]).find(x=>x.id===id);if(!u)return;odUser=id;
  $('#od-body').innerHTML=odSheetHTML(u);showSheet($('#od-sheet'));
}
function closeOdSheet(){const el=$('#od-sheet');odUser=null;hideSheet(el,()=>{if(el.hidden)$('#od-body').innerHTML=''})}
function odRedraw(){if(!ownerMode)return;if(tab==='d-usuarios'){const l=$('#od-list');if(l){l.innerHTML=odUserRows();$('#od-count').textContent=odCount();return}}render()}
function odCSV(){
  const cell=v=>{let x=String(v??'');if(/^[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"'};
  const rows=[['Nombre','Email','Se unió','Último ingreso','Última vez que usó la app','Le cuesta más','Pagaría $2.990','Llegó desde','Suspendida','Plan']].concat(odFiltered().map(u=>[u.nombre,u.email,fullDate(u.creado),fullDate(u.ingreso),u.actividad?fullDate(u.actividad):'',u.dolor?DOLOR[u.dolor]:'',u.pagaria?PAGA[u.pagaria]:'',u.origen||'',u.suspendida?'Sí':'No',odPlanTxt(u)]));
  const blob=new Blob(['﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mi-esquina-cuentas-'+today()+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
document.addEventListener('click',async e=>{
  if(!me)return;
  if(e.target.closest('[data-owner]')){ownerMode?leaveOwner():enterOwner();return}
  if(!owner)return;
  const t=e.target.closest('[data-od]');if(!t)return;
  const a=t.dataset.od;
  if(a==='retry'){odLoad(t.dataset.k,true);render();return}
  if(a==='refresh'){odRefresh();toast('Actualizando…');return}
  if(a==='user'){openOdSheet(t.dataset.id);return}
  if(a==='close'){closeOdSheet();return}
  if(a==='csv'){odCSV();return}
  if(a==='fil'){odFil=t.dataset.v;render();return}
  if(a==='cb-plans'){openPlans();return}
  if(a==='cb-on'||a==='cb-off'||a==='cb-modo'){
    const body=a==='cb-modo'?{accion:'cobro',modo:t.dataset.v}:{accion:'cobro',on:a==='cb-on'};
    if(a==='cb-modo'&&OD.cobros&&OD.cobros.modo===t.dataset.v)return;
    if(a==='cb-on'&&!confirm('¿Encender el cobro? Cada persona tendrá '+((OD.cobros&&OD.cobros.prueba_dias)||14)+' días gratis desde hoy y después tendrá que elegir un plan para seguir.'))return;
    if(a==='cb-off'&&!confirm('¿Apagar el cobro? Todos vuelven a usar la app gratis. Quienes ya pagaron mantienen su plan.'))return;
    t.disabled=true;const res=await callPagoFn(body);t.disabled=false;
    if(res.error)return toast(res.error);
    toast(a==='cb-on'?'Cobro encendido':a==='cb-off'?'Cobro apagado':'Listo');
    await Promise.all([odLoad('cobros',true),odLoad('resumen',true),planLoad()]);return;
  }
  if(a==='done'){
    const id=+t.dataset.id,v=t.dataset.v==='1',m=(OD.mensajes||[]).find(x=>+x.id===id);if(!m)return;
    m.atendido=v;if(OD.resumen)OD.resumen.mensajes.pendientes=Math.max(0,OD.resumen.mensajes.pendientes+(v?-1:1));ownerBadges();render();toast(v?'Marcado como atendido':'Vuelve a pendientes');
    const {error}=await sb.rpc('dueno_marcar_mensaje',{p_id:id,p_atendido:v});
    if(error){m.atendido=!v;odLoad('resumen',true);render();toast('No se pudo guardar. Inténtalo otra vez.')}
    return;
  }
  if(a==='act'){
    const id=odUser,u=(OD.usuarios||[]).find(x=>x.id===id);if(!u||t.disabled)return;const act=t.dataset.act;
    t.disabled=true;t.textContent='Un momento…';
    const res=await callOwnerFn({accion:act,user_id:id});
    if(res.error){toast(res.error);if(odUser===id)openOdSheet(id);return}
    u.suspendida=act==='suspender';toast(u.suspendida?'Cuenta suspendida':'Cuenta reactivada');odLoad('resumen',true);
    if(odUser===id){$('#od-body').innerHTML=odSheetHTML(u)}odRedraw();return;
  }
});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='od-del')return;e.preventDefault();
  const id=odUser,u=(OD.usuarios||[]).find(x=>x.id===id);if(!u)return;
  if(($('#od-d').value||'').trim().toUpperCase()!=='BORRAR')return toast('Escribe BORRAR para confirmar');
  const b=e.target.querySelector('button');b.disabled=true;b.textContent='Borrando…';
  const res=await callOwnerFn({accion:'borrar',user_id:id,confirmar:'BORRAR'});
  if(res.error){b.disabled=false;b.textContent='Borrar cuenta';return toast(res.error)}
  OD.usuarios=OD.usuarios.filter(x=>x.id!==id);closeOdSheet();toast('Cuenta borrada');odLoad('resumen',true);odRedraw();
});
document.addEventListener('submit',async e=>{
  const id=e.target.id;if(id!=='f-cb-token'&&id!=='f-cb-sec')return;e.preventDefault();if(!owner)return;
  const inp=e.target.querySelector('input'),val=inp.value.trim(),b=e.target.querySelector('button'),lbl=b.textContent;
  if(!val)return toast('Pega la clave primero');
  b.disabled=true;b.textContent='Revisando…';
  const res=await callPagoFn(id==='f-cb-token'?{accion:'claves',token:val}:{accion:'claves',secreto:val});
  b.disabled=false;b.textContent=lbl;
  if(res.error)return toast(res.error);
  inp.value='';toast(id==='f-cb-token'?'Conectado a '+(((res.data||{}).cuenta||{}).nombre||'Mercado Pago'):'Clave secreta guardada');
  odLoad('cobros',true);
});
document.addEventListener('input',e=>{if(e.target.id!=='od-q')return;odQ=e.target.value.slice(0,80);const l=$('#od-list');if(l){l.innerHTML=odUserRows();$('#od-count').textContent=odCount()}});
$('#od-sheet').addEventListener('click',e=>{if(e.target.id==='od-sheet')closeOdSheet()});
dragToClose($('#od-sheet'),closeOdSheet);

/* ---------- eventos de la app ---------- */
/* Onda bajo el dedo y un pulso corto de vibración (en Android) en cada botón */
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.btn,.habit,nav.tabs button,.cats button,.picks button,.seg button,.gear,.fab');if(!b||b.disabled||b.closest('#alarm'))return;
  if(!RM){const r=b.getBoundingClientRect(),z=Math.max(r.width,r.height)*2.2,sp=document.createElement('span');sp.className='rip';
    sp.style.cssText=`width:${z}px;height:${z}px;left:${e.clientX-r.left-z/2}px;top:${e.clientY-r.top-z/2}px`;b.appendChild(sp);setTimeout(()=>sp.remove(),600)}
  try{navigator.vibrate&&navigator.vibrate(8)}catch(err){}
},{passive:true});
/* Al bajar aparece la barra compacta y el botón de gasto se achica; al subir vuelve */
{let lastY=0,raf=0;addEventListener('scroll',()=>{if(raf||document.body.dataset.lock!==undefined)return;raf=requestAnimationFrame(()=>{raf=0;const y=window.scrollY,b=document.body;
  b.classList.toggle('scrolled',y>120);if(Math.abs(y-lastY)>8){b.classList.toggle('down',y>lastY&&y>180);lastY=y}})},{passive:true})}
document.addEventListener('click',e=>{
  if(!me)return;
  const t=e.target.closest('button,[data-go]');if(!t||t.closest('#auth'))return;
  const ds=t.dataset;
  if(ds.tab)return go(ds.tab);
  if(ds.go)return go(ds.go);
  if(ds.settings!==undefined){openSettings(ds.settings);return}
  if(ds.cobros!==undefined){if(owner){enterOwner(true);go('d-cobros')}return}
  if(ds.planes!==undefined){if(!$('#settings').hidden)closeSettings();openPlans();return}
  if(ds.payCheck!==undefined){t.disabled=true;payCheck(true).finally(()=>{t.disabled=false});return}
  if(ds.onb!==undefined){S.meta.onboarded=true;save('meta');render();return}
  if(ds.plan){const k=today(),v=+ds.v,cur=planDone(k,ds.plan),b=S.week.blocks.find(x=>x.id===ds.plan);if(!b)return;
    setPlan(k,ds.plan,cur===v?null:v);
    if(cur!==v){const m=fr(v?'yes':'no');toast(v?'+'+PLAN_XP+' XP · '+b.title:'Anotado: no cumpliste '+b.title);say(m);
      if(v){const id=ds.plan;celebrate=()=>burstAt(`[data-plan="${CSS.escape(id)}"][data-v="1"]`)}}
    render();return}
  if(ds.coSay!==undefined){say(coachLine());return}
  if(ds.coPush!==undefined){t.disabled=true;pushEnable().then(()=>render());return}
  if(ds.coOn!==undefined){CO().on=true;save('meta');render();setTimeout(coachTick,600);return}
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
  if(ds.water){const k=today(),w=W(),before=w.log[k]||0;if(+ds.water>0)coachDrank();const nv=Math.max(0,before+(+ds.water));if(nv)w.log[k]=nv;else delete w.log[k];
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
  if(e.target.closest('#auth')||e.target.closest('#settings')||e.target.closest('#od-sheet'))return; // los manejan sus propias funciones
  e.preventDefault();if(!me)return;const v=s=>($('#'+s)||{}).value||'';
  if(id.startsWith('f-cb'))return; // formularios de Cobros del panel del dueño
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
/* Con una hoja abierta la página de atrás queda quieta: en iPhone el dedo movía el fondo en vez de la hoja */
function lockScroll(on){const b=document.body;
  if(on){if(b.dataset.lock!==undefined)return;const y=window.scrollY;b.dataset.lock=y;Object.assign(b.style,{position:'fixed',top:-y+'px',left:'0',right:'0'})}
  else{if(b.dataset.lock===undefined||[...document.querySelectorAll('.sheet-bg')].some(x=>!x.hidden))return;const y=+b.dataset.lock;delete b.dataset.lock;Object.assign(b.style,{position:'',top:'',left:'',right:''});window.scrollTo(0,y)}}
function showSheet(el){clearTimeout(el._t);el.classList.remove('closing');const sh=el.querySelector('.sheet');if(sh){sh.style.transform='';sh.style.transition='';sh.scrollTop=0}el.hidden=false;lockScroll(true)}
function hideSheet(el,cb){
  clearTimeout(el._t);
  if(el.hidden||RM){el.hidden=true;el.classList.remove('closing');lockScroll(false);if(cb)cb();return}
  el.classList.add('closing');el._t=setTimeout(()=>{el.hidden=true;el.classList.remove('closing');lockScroll(false);if(cb)cb()},230);
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
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('#plans').hidden)closePlans();else if(!$('#od-sheet').hidden)closeOdSheet();else if(!$('#sheet').hidden)closeQuick();else if(!$('#settings').hidden)closeSettings()});
window.addEventListener('hashchange',()=>{if(!me){const h=location.hash||'';if(hashGasto(h)||h==='#despertar'){pendingHash=h;authMsg('Entra para anotar tu gasto.')}else if(h==='#coach')pendingHash=h;return}const g=hashGasto();if(g)openQuick(g);else if(location.hash==='#despertar'&&!ch)startChallenge('link');else if(location.hash==='#coach'){clearHash();setTimeout(coachTick,300)}});

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

/* ---------- instructor ----------
   Te recuerda lo que planificaste, te pide cuentas cuando termina cada bloque, te obliga a tomar agua y a cerrar tus hábitos.
   Con la app abierta habla y su pantalla no se cierra hasta que respondes. Con la app cerrada manda avisos desde el servidor
   (tabla avisos + función instructor-avisos, que el reloj de la base de datos llama cada minuto). */
const CO=()=>{if(!S.meta.coach)S.meta.coach=coachDef();return S.meta.coach};
const ICON_WHISTLE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 14.5a6 6 0 1 0 11.6-2.2L21.5 10V6H10A6 6 0 0 0 2.5 14.5z"/><circle cx="8.5" cy="14.5" r="1.8"/><path d="M15.5 6V3"/></svg>';
const ICON_SPEAK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="w1" d="M15.5 9a4 4 0 0 1 0 6"/><path class="w2" d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICON_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_NO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/* Frases por tono. {n} nombre, {t} bloque, {h} hora, {w} vasos tomados, {W} vasos de la meta, {e} vasos que deberías llevar,
   {G} meta en litros, {c} cantidad, {y} cumplidos, {m} minutos, {b} resumen del día */
const FR={
  suave:{
    intro:['Hola, {n}. Soy tu instructor. Te voy a recordar lo que planificas, te voy a pedir cuentas y te voy a cuidar con el agua.'],
    start:['{n}, ya es hora de {t}. Tú puedes.','Llegó el momento de {t}. Partamos con calma, pero partamos.'],
    late:['{n}, tu bloque de {t} empezó a las {h}. Todavía estás a tiempo.'],
    go:['Muy bien. Disfrútalo.','Así me gusta. Vamos.'],
    check:['¿Cómo te fue con {t}? Sé honesto contigo.','Terminó el bloque de {t}. ¿Lo hiciste?'],
    checks:['Tienes {c} bloques sin contarme cómo te fue. Vamos uno por uno.'],
    yes:['¡Bien hecho, {n}! Cumpliste tu palabra.','Lo lograste. Así se construye una vida ordenada.'],
    no:['Está bien, mañana lo intentamos de nuevo. Pero que no pase dos veces seguidas.','No pasa nada si es una vez. Mañana lo recuperas.'],
    mixed:['Cumpliste {y} de {c}. Vas bien, mañana por todos.'],
    water:['{n}, toma un vaso de agua. Llevas {w} de {W}.','Hora de hidratarte. Un vaso y sigues.'],
    waterok:['Muy bien. Tu cuerpo te lo agradece.','Eso. Te recuerdo el próximo en {m} minutos.'],
    waterdone:['¡Meta de agua cumplida, {n}! Qué bien te cuidaste hoy.'],
    habits:['Te faltan {c} hábitos de hoy. Todavía hay tiempo.','{n}, revisemos tus hábitos antes de que termine el día.'],
    habitsok:['Todos tus hábitos listos. Día cumplido, {n}.'],
    habitsno:['Está bien. Mañana empezamos de nuevo, con todo.'],
    snooze:['Te vuelvo a avisar en {m} minutos.'],
    nosnooze:['Ya lo dejaste para después. Ahora sí, hazlo.'],
    skipq:['¿Seguro? Lo planificaste tú. Toca otra vez si de verdad no lo vas a hacer.'],
    brief:['Buenos días, {n}. Hoy tienes {b}. Vamos paso a paso.']
  },
  firme:{
    intro:['{n}, desde hoy soy tu instructor. Te voy a recordar lo que planificas, te voy a pedir cuentas y te voy a obligar a tomar agua. Si no cumples, te reto.'],
    start:['{n}, son las {h}. Toca {t}. Deja lo que estás haciendo y anda.','Lo planificaste tú: {t}, ahora. Sin excusas.','Hora de {t}, {n}. La disciplina se nota cuando no tienes ganas.'],
    late:['{n}, tu bloque de {t} empezó a las {h}. Vas tarde. Muévete.','Ya deberías estar en {t}. ¿Qué haces mirando el celular?'],
    go:['Eso. A las {e} me rindes cuentas.','Bien. Te pregunto cómo te fue cuando termine.'],
    check:['{n}, rinde cuentas: ¿cumpliste {t}?','Se terminó el bloque de {t}. ¿Lo hiciste o no? Sin mentiras.'],
    checks:['{n}, tienes {c} bloques sin rendir cuentas. Uno por uno.'],
    yes:['Eso, {n}. Cumpliste lo que dijiste.','Bien ahí. Así se gana el round.','Palabra cumplida. Así me gusta.'],
    no:['Mal, {n}. Lo planificaste y no lo hiciste. Mañana no quiero excusas.','No cumpliste. Mañana lo haces sí o sí.','Te fallaste a ti mismo, {n}. Mañana lo cumples.'],
    mixed:['Cumpliste {y} de {c}. No está mal, pero tampoco está bien. Mañana todos.'],
    water:['{n}, para todo y toma agua. Llevas {w} vasos de {W}.','Agua, {n}. Ahora. No es opcional.','Llevas {w} vasos y a esta hora deberías ir en {e}. Un vaso, ya.'],
    waterok:['Eso. El próximo te lo pido en {m} minutos.','Bien. No me hagas recordártelo de nuevo.'],
    waterdone:['Meta de agua cumplida, {n}. Así se hace.'],
    habits:['Son las {h} y te faltan {c} hábitos. El día no ha terminado.','{n}, todavía no cumples con todo. Márcalos o anda a hacerlos.'],
    habitsok:['Todos los hábitos listos. Día ganado, {n}.'],
    habitsno:['Hoy no cumpliste todo, {n}. Mañana no te lo voy a perdonar.'],
    snooze:['Te doy {m} minutos. Ni uno más.'],
    nosnooze:['Ya lo postergaste. Se acabaron las excusas.'],
    skipq:['¿En serio? Lo planificaste tú. Toca otra vez si de verdad no lo vas a hacer.'],
    brief:['Buenos días, {n}. Hoy tienes {b}. Tu meta de agua es {G}. A trabajar.']
  },
  sargento:{
    intro:['¡{n}! ¡Desde hoy mando yo! ¡Vas a cumplir lo que planifiques, vas a tomar agua y vas a cerrar tus hábitos! ¿Entendido?'],
    start:['¡{n}! ¡Son las {h}! ¡{t}, ahora! ¡Muévete!','¡Arriba, {n}! ¡Lo planificaste tú! ¡{t}, ya!','¡Se acabó el descanso! ¡A {t}, soldado!'],
    late:['¡{n}! ¡Tu bloque de {t} empezó a las {h}! ¿Qué haces mirando el celular?'],
    go:['¡Eso! ¡A las {e} me rindes cuentas!'],
    check:['¡{n}! ¡Rinde cuentas! ¿Cumpliste {t}, sí o no?'],
    checks:['¡{n}! ¡Tienes {c} bloques sin rendir cuentas! ¡Uno por uno, ahora!'],
    yes:['¡Eso, {n}! ¡Así se hace!','¡Cumpliste! ¡Eso es tener palabra, soldado!'],
    no:['¿Cómo que no? ¡Lo planificaste tú, {n}! ¡Mañana lo haces el doble de bien!','¡Inaceptable! ¡Los campeones no se saltan lo que planifican!'],
    mixed:['¡{y} de {c}! ¡Eso no alcanza! ¡Mañana los quiero todos!'],
    water:['¡{n}! ¡Agua! ¡Ahora mismo! ¡Llevas {w} vasos, eso no es nada!','¡Deja todo y toma agua, soldado! ¡Ya!'],
    waterok:['¡Eso! ¡En {m} minutos te quiero ver con otro!'],
    waterdone:['¡Meta de agua cumplida! ¡Así me gusta, {n}!'],
    habits:['¡{n}! ¡Te faltan {c} hábitos! ¡El día no termina hasta que cumplas!'],
    habitsok:['¡Todos listos! ¡Así se cierra un día, soldado!'],
    habitsno:['¡Día perdido, {n}! ¡Mañana no hay perdón!'],
    snooze:['¡{m} minutos! ¡Ni uno más!'],
    nosnooze:['¡Se acabaron las excusas! ¡Hazlo ya!'],
    skipq:['¿Me estás diciendo que no? ¡Toca otra vez si te atreves!'],
    brief:['¡Buenos días, {n}! ¡Hoy tienes {b}! ¡Meta de agua: {G}! ¡A darle!']
  }
};
/* Títulos cortos para los avisos con la app cerrada */
const PT={
  suave:{water:'Un vaso de agua',wbody:'Un vaso ahora y sigues. Tu meta de hoy: {G}.',check:'¿Cómo te fue con {t}?',again:'Todavía no me cuentas de {t}',habits:'Revisa tus hábitos',last:'Último aviso de hábitos',brief:'Buenos días'},
  firme:{water:'Agua. Ahora.',wbody:'Para todo y toma un vaso. Tu meta de hoy: {G}.',check:'¿Cumpliste {t}?',again:'Me debes una respuesta: {t}',habits:'Te faltan hábitos',last:'Último aviso: tus hábitos',brief:'Tu día'},
  sargento:{water:'¡Agua, soldado!',wbody:'¡Un vaso, ahora! ¡Meta de hoy: {G}!',check:'¡Rinde cuentas: {t}!',again:'¡Todavía no respondes: {t}!',habits:'¡Hábitos pendientes!',last:'¡Último aviso!',brief:'¡Arriba!'}
};
function fill(s,o){
  const n=firstName()||(CO().tone==='sargento'?'soldado':'');
  if(!n)s=s.replace(/¡\{n\}! /g,'¡Oye! ').replace(/\{n\}, /g,'').replace(/, \{n\}/g,'');
  s=s.replace(/\{(\w)\}/g,(m,k)=>k==='n'?n:o&&o[k]!=null?String(o[k]):'');
  return s.replace(/(^|[.!?] )([¡¿]?)(\p{Ll})/gu,(m,a,b,c)=>a+b+c.toUpperCase());
}
function fr(key,o){const c=CO(),bank=FR[c.tone]||FR.firme,list=bank[key]||FR.firme[key]||[''];return fill(list[Math.floor(Math.random()*list.length)],o)}

/* Voz del teléfono: prefiere una voz en español de Chile o Latinoamérica */
const canSpeak='speechSynthesis' in window;
let voiceUnlocked=false;
function pickVoice(){
  try{const vs=speechSynthesis.getVoices()||[],L=v=>(v.lang||'').replace('_','-').toLowerCase(),good=/google|natural|premium|enhanced|siri|paulina|m[oó]nica|jorge|diego|sabina|helena/i;
    for(const p of ['es-cl','es-419','es-us','es-mx','es-ar','es-co','es-es','es']){const x=vs.find(v=>L(v).startsWith(p)&&good.test(v.name))||vs.find(v=>L(v).startsWith(p));if(x)return x}}catch(e){}
  return null;
}
function say(t){
  if(!canSpeak||!CO().voice||!t||Date.now()-(toast.mute||0)<500)return;
  try{const sp=speechSynthesis;sp.cancel();
    const u=new SpeechSynthesisUtterance(String(t).replace(/[^\p{L}\p{N}\p{P}\s]/gu,'').slice(0,320)),v=pickVoice(),tn=CO().tone;
    if(v){u.voice=v;u.lang=v.lang}else u.lang='es-CL';
    u.rate=tn==='sargento'?1.1:tn==='suave'?.96:1.03;u.pitch=tn==='sargento'?.8:tn==='suave'?1.08:.95;
    const b=document.querySelectorAll('.co-say');b.forEach(x=>x.classList.add('talking'));u.onend=u.onerror=()=>b.forEach(x=>x.classList.remove('talking'));
    sp.speak(u);
  }catch(e){}
}
/* En iPhone la voz y el sonido solo se activan después de un toque */
document.addEventListener('pointerdown',()=>{if(voiceUnlocked||!canSpeak)return;voiceUnlocked=true;try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(e){}},{passive:true,capture:true});
if(canSpeak)try{speechSynthesis.getVoices();speechSynthesis.addEventListener('voiceschanged',()=>{})}catch(e){}
function whistle(){
  const a=actx;if(!a||a.state!=='running')return;const t=a.currentTime;
  const o=a.createOscillator(),g=a.createGain(),l=a.createOscillator(),lg=a.createGain();
  o.type='sine';o.frequency.value=2800;l.frequency.value=34;lg.gain.value=160;l.connect(lg).connect(o.frequency);
  [[0,.32],[.42,.95]].forEach(([s,e])=>{g.gain.setValueAtTime(0,t+s);g.gain.linearRampToValueAtTime(.16,t+s+.02);g.gain.setValueAtTime(.16,t+e-.05);g.gain.linearRampToValueAtTime(0,t+e)});
  o.connect(g).connect(a.destination);o.start(t);l.start(t);o.stop(t+1);l.stop(t+1);
}

/* Estado del día en este dispositivo: qué ya te mostré, hasta cuándo pospusiste, cuándo tomaste agua */
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const hmMin=x=>{const [h,m]=x.split(':').map(Number);return h*60+m};
const atDay=(x,k=today())=>{const [y,mo,d]=k.split('-').map(Number),[h,m]=x.split(':').map(Number);return new Date(y,mo-1,d,h,m).getTime()};
let coS=null;
function CS(){
  const k=today();
  if(!coS||coS.me!==me){try{coS=JSON.parse(localStorage.getItem('esquina.coach.'+me)||'null')}catch(e){coS=null}}
  if(!coS||coS.day!==k)coS={me,day:k,seen:{},snz:{},n:{},lastDrink:0,lastPrompt:0,ml:null,lastSync:coS&&coS.lastSync||0};
  coS.me=me;return coS;
}
function csSave(){try{if(coS&&me)localStorage.setItem('esquina.coach.'+me,JSON.stringify(coS))}catch(e){}}
function coachDrank(){const s=CS();s.lastDrink=Date.now();s.n.wa=0;csSave()}

function dayBlocks(k=today()){return S.week.blocks.filter(b=>b.day===dow(k)).sort((a,b)=>a.start.localeCompare(b.start))}
function planDone(k,id){const d=WD()[k];return d?d[id]:undefined}
function setPlan(k,id,v){const D=WD();if(v==null){if(D[k]){delete D[k][id];if(!Object.keys(D[k]).length)delete D[k]}}else(D[k]=D[k]||{})[id]=v?1:0;save('week')}
function planBtns(b,v){
  return `<div class="pl"><button type="button" class="pl-b ok ${v===1?'on':''}" data-plan="${esc(b.id)}" data-v="1" aria-pressed="${v===1}" aria-label="Cumplí ${esc(b.title)}">${ICON_OK}</button><button type="button" class="pl-b no ${v===0?'on':''}" data-plan="${esc(b.id)}" data-v="0" aria-pressed="${v===0}" aria-label="No cumplí ${esc(b.title)}">${ICON_NO}</button></div>`;
}
const litros=ml=>(ml/1000).toLocaleString('es-CL',{maximumFractionDigits:2})+(ml===1000?' litro':' litros');
function waterInfo(){
  const c=CO(),w=W(),ml=w.log[today()]||0,now=Date.now(),f=atDay(c.water.from),t=atDay(c.water.to),p=Math.max(0,Math.min(1,(now-f)/Math.max(1,t-f)));
  return {ml,goal:w.goal,w:Math.floor(ml/250),W:Math.ceil(w.goal/250),e:Math.max(1,Math.ceil(w.goal*p/250)),G:litros(w.goal),inWin:now>=f&&now<=t,from:f,to:t};
}
/* Bloques que ya terminaron (hoy y ayer) y que todavía no respondes */
function owedPlans(){
  const c=CO(),k=today(),y=addDays(k,-1),nowHM=hm(new Date()),out=[];
  for(const kk of [y,k])for(const b of dayBlocks(kk))
    if((kk<k||b.end<=nowHM)&&planDone(kk,b.id)===undefined&&atDay(b.end,kk)>c.since)out.push({k:kk,id:b.id});
  return out.slice(-8);
}
function coachDue(){
  const c=CO(),s=CS(),k=today(),now=Date.now(),nowHM=hm(new Date());
  if(!c.intro)return {kind:'intro'};
  for(const b of dayBlocks(k))
    if(b.start<=nowHM&&nowHM<b.end&&planDone(k,b.id)===undefined&&!s.seen['st:'+b.id]&&!(s.snz['st:'+b.id]>now))
      return {kind:'start',b,late:hmMin(nowHM)-hmMin(b.start)>15};
  const owed=owedPlans();if(owed.length)return {kind:'check',items:owed};
  const tb=dayBlocks(k);
  if(tb.length&&nowHM>='05:00'&&nowHM<'12:00'&&!s.seen.br)return {kind:'brief'};
  const wi=waterInfo();
  if(wi.inWin&&wi.ml<wi.goal&&now>=Math.max(s.lastDrink||0,s.lastPrompt||0,wi.from-c.water.every*6e4)+c.water.every*6e4)return {kind:'water'};
  const hp=H().list.filter(h=>!doneOn(k)[h.id]);
  if(hp.length&&nowHM>=c.habitsAt&&!s.seen.hb&&!(s.snz.hb>now))return {kind:'habits'};
  return null;
}
let co=null;
function coachBlocked(){
  const a=document.activeElement;
  return !me||ownerMode||loadingView||!premium()||document.visibilityState!=='visible'||!$('#alarm').hidden||!$('#night').hidden||$('#app').hidden||
    [...document.querySelectorAll('.sheet-bg')].some(x=>!x.hidden)||!!(a&&a.closest&&a.closest('#view')&&a.matches('input,textarea,select'));
}
function coachTick(){
  if(!me||co)return;const c=CO();if(!c.on)return;
  const s=CS(),ml=W().log[today()]||0;if(s.ml!=null&&ml>s.ml){s.lastDrink=Date.now();s.n.wa=0}s.ml=ml;csSave();
  if(coachBlocked())return;
  const d=coachDue();if(d)coachShow(d);
}
setInterval(coachTick,20000);

function coachMsg(){
  const c=CO(),k=today();
  if(co.kind==='intro')return fr('intro');
  if(co.kind==='start')return fr(co.late?'late':'start',{t:co.b.title,h:co.b.start});
  if(co.kind==='check'){const it=co.items;if(it.length===1){const b=S.week.blocks.find(x=>x.id===it[0].id);return fr('check',{t:b?b.title:'tu bloque'})}return fr('checks',{c:it.length})}
  if(co.kind==='water')return fr('water',waterInfo());
  if(co.kind==='habits')return fr('habits',{c:H().list.filter(h=>!doneOn(k)[h.id]).length,h:c.habitsAt});
  if(co.kind==='brief'){const tb=dayBlocks(k),f=tb[0];return fr('brief',{b:tb.length===1?'un bloque: '+f.title+' a las '+f.start:tb.length+' bloques y el primero es '+f.title+' a las '+f.start,G:litros(W().goal)})}
  return '';
}
function coachShow(d){
  co={...d,phase:'ask',mood:''};co.msg=coachMsg();
  drawCoach();const el=$('#coach');el.hidden=false;el.scrollTop=0;lockScroll(true);
  try{navigator.vibrate&&navigator.vibrate([260,120,260])}catch(e){}
  whistle();say(co.msg);
}
function coachResult(mood,msg){co.phase='result';co.mood=mood;co.msg=msg;drawCoach();say(msg);try{navigator.vibrate&&navigator.vibrate(mood==='fail'?[400,100,400]:60)}catch(e){}if(mood==='win')FX.rain()}
function coachClose(){co=null;const el=$('#coach');el.hidden=true;el.innerHTML='';el.className='overlay coach';lockScroll(false);render();syncAvisosSoon();setTimeout(coachTick,900)}
function coachLine(){
  const c=CO(),k=today(),nowHM=hm(new Date()),tb=dayBlocks(k),owe=owedPlans().length,wi=waterInfo(),hp=H().list.filter(h=>!doneOn(k)[h.id]).length;
  const ok=tb.filter(b=>planDone(k,b.id)===1).length;
  if(owe)return `Me debes ${owe} ${owe===1?'respuesta':'respuestas'}. Rinde cuentas.`;
  if(wi.inWin&&wi.ml<wi.goal&&wi.w<wi.e)return `Vas atrasado con el agua: ${wi.w} de ${wi.e} vasos a esta hora.`;
  if(hp&&nowHM>=c.habitsAt)return `Son más de las ${c.habitsAt} y te faltan ${hp} ${hp===1?'hábito':'hábitos'}.`;
  if(tb.length&&ok===tb.length)return 'Cumpliste todo lo planificado hoy. Así me gusta.';
  if(!S.week.blocks.length)return 'Arma tu semana en Semana y yo me encargo de que la cumplas.';
  return c.tone==='sargento'?'¡Vas bien, pero no aflojes!':c.tone==='suave'?'Vas bien. Sigue a tu ritmo.':'Vas bien. No aflojes.';
}
let pushDev='na';
function coachCard(){
  if(!premium())return ''; // sin plan el instructor descansa; la tarjeta del plan lo explica
  const c=CO();
  if(!c.on)return `<div class="card co-card off"><div class="co-head"><span class="co-av">${ICON_WHISTLE}</span><div style="flex:1;min-width:0"><div class="eyebrow">Tu instructor</div><div class="co-line">Está apagado. Nadie te va a exigir nada.</div></div></div><div class="co-btns"><button class="btn pri" type="button" data-co-on>Encender</button></div></div>`;
  const k=today(),nowHM=hm(new Date()),tb=dayBlocks(k),ok=tb.filter(b=>planDone(k,b.id)===1).length,wi=waterInfo(),hn=H().list.length,hd=H().list.filter(h=>doneOn(k)[h.id]).length;
  const next=tb.find(b=>b.start>nowHM);
  const push=pushDev==='off'?`<button class="btn pri" type="button" data-co-push>Activar avisos</button>`:pushDev==='ios'?`<button class="btn pri" type="button" data-settings="coach">Avisos en iPhone</button>`:'';
  return `<div class="card co-card" style="margin-bottom:12px"><div class="co-head"><span class="co-av">${ICON_WHISTLE}</span><div style="flex:1;min-width:0"><div class="eyebrow">Tu instructor · ${TONES[c.tone]}</div><div class="co-line">${esc(coachLine())}</div></div><button class="co-say" type="button" data-co-say aria-label="Escuchar al instructor">${ICON_SPEAK}</button></div>
  <div class="co-stats"><div><b class="num">${ok}/${tb.length}</b><span>planes</span></div><div><b class="num">${wi.w}/${wi.W}</b><span>vasos</span></div><div><b class="num">${hd}/${hn}</b><span>hábitos</span></div></div>
  ${next?`<div class="note">Próximo: <b>${esc(next.title)}</b> a las ${next.start}</div>`:''}
  <div class="co-btns">${push}<button class="btn" type="button" data-settings="coach">Ajustar</button></div></div>`;
}
function drawCoach(){
  const el=$('#coach'),c=CO(),s=CS(),k=today();
  el.className='overlay coach t-'+c.tone+(co.mood?' '+co.mood:'');
  let label='',big='',sub='',body='',acts='',foot='';
  const kind=co.kind,ph=co.phase;
  if(ph==='result'){
    label=co.mood==='win'?'Bien hecho':co.mood==='fail'?'Te estoy mirando':'Rendiste cuentas';
    big=co.mood==='win'?'¡Eso!':co.mood==='fail'?'Mal.':'Ojo.';
    acts=`<button class="btn red" type="button" data-co="close">${c.tone==='sargento'?'¡Entendido!':'Entendido'}</button>`;
  }else if(kind==='intro'){
    label='Preséntate';big='Tu instructor';
    body=`<div class="co-tones">${Object.entries({suave:'Te recuerda con cariño.',firme:'Te exige y te reta si fallas.',sargento:'Te grita. Sin piedad.'}).map(([t,d])=>`<button type="button" data-co="tone" data-v="${t}" class="${c.tone===t?'on':''}" aria-pressed="${c.tone===t}"><b>${TONES[t]}</b><span>${d}</span></button>`).join('')}</div>
      ${S.week.blocks.length?'':'<div class="co-note">Todavía no tienes nada planificado. Arma tu semana en la pestaña Semana y yo me encargo de que la cumplas.</div>'}`;
    acts=(pushDev==='off'?`<button class="btn" type="button" data-co="push">Avisarme también con la app cerrada</button>`:'')+`<button class="btn red" type="button" data-co="introok">Empezar</button>`;
    foot='Puedes cambiar el tono, el agua y la hora de los hábitos en Ajustes.';
  }else if(kind==='start'){
    const b=co.b,a=AREAS[b.area]||AREAS.salud;label=co.late?'Vas tarde':'Hora de cumplir';big=esc(b.title);sub=`${b.start}–${b.end} · ${esc(a.n)}`;
    if(ph==='confirm')acts=`<button class="btn red" type="button" data-co="go">Tienes razón, voy</button><button class="btn" type="button" data-co="skipok">Sí, hoy no lo hago</button>`;
    else acts=`<button class="btn red" type="button" data-co="go">${c.tone==='sargento'?'¡Voy!':co.late?'Ya estoy en eso':'Voy'}</button>`+
      (s.n['st:'+b.id]?'':`<button class="btn" type="button" data-co="later">En 10 minutos</button>`)+`<button class="btn ghost" type="button" data-co="skip">Hoy no lo hago</button>`;
  }else if(kind==='check'){
    const it=co.items.map(x=>({...x,b:S.week.blocks.find(q=>q.id===x.id)})).filter(x=>x.b);
    label='Rinde cuentas';big=it.length===1?esc(it[0].b.title):it.length+' bloques';
    body=`<div class="co-list">${it.map(x=>{const v=planDone(x.k,x.id);return `<div class="co-item"><div class="grow"><b>${esc(x.b.title)}</b><span>${x.k===k?'Hoy':'Ayer'} · ${x.b.start}–${x.b.end}</span></div><div class="co-yn"><button type="button" class="y ${v===1?'on':''}" data-co="ans" data-k="${x.k}" data-id="${esc(x.id)}" data-v="1">Sí</button><button type="button" class="n ${v===0?'on':''}" data-co="ans" data-k="${x.k}" data-id="${esc(x.id)}" data-v="0">No</button></div></div>`}).join('')}</div>`;
    foot='No se cierra hasta que respondas.';
  }else if(kind==='water'){
    const wi=waterInfo();label='Hora del agua';big=`${wi.w} de ${wi.W}`;sub='vasos de hoy';
    body=`<div class="co-water" aria-hidden="true">${[...Array(Math.min(16,wi.W))].map((_,i)=>`<i class="${i<wi.w?'on':i<wi.e?'due':''}"></i>`).join('')}</div>`;
    const left=2-(s.n.wa||0);
    acts=`<div class="row2"><button class="btn water" type="button" data-co="w" data-ml="250">+ Vaso</button><button class="btn water" type="button" data-co="w" data-ml="500">+ Botella</button></div>`+(left>0?`<button class="btn ghost" type="button" data-co="later">En 10 minutos (${left===1?'última vez':'quedan '+left})</button>`:'');
    foot=left>0?'':esc(fr('nosnooze'));
  }else if(kind==='habits'){
    const hl=H().list,pend=hl.filter(h=>!doneOn(k)[h.id]).length;label='Cierre del día';big=pend?pend+(pend===1?' pendiente':' pendientes'):'Listo';
    body=`<div class="co-list">${hl.map(h=>{const d=!!doneOn(k)[h.id];return `<button type="button" class="co-item co-hab ${d?'done':''}" data-co="hab" data-id="${esc(h.id)}" aria-pressed="${d}"><span class="ck">${ICON_OK}</span><span class="grow"><b>${esc(h.name)}</b></span><span class="num">+${+h.pts}</span></button>`}).join('')}</div>`;
    if(ph==='confirm')acts=`<button class="btn red" type="button" data-co="later">Tienes razón, voy a hacerlos</button><button class="btn" type="button" data-co="skipok">Sí, hoy no puedo</button>`;
    else acts=((s.n.hb||0)<3?`<button class="btn" type="button" data-co="later">Voy a hacerlos (30 min)</button>`:'')+`<button class="btn ghost" type="button" data-co="skip">Hoy no puedo</button>`;
    foot='Toca cada hábito que ya cumpliste.';
  }else if(kind==='brief'){
    const tb=dayBlocks(k);label='Tu día';big='Hoy';
    body=`<div class="co-list">${tb.map(b=>`<div class="co-item"><span class="dot" style="background:${(AREAS[b.area]||AREAS.salud).c}"></span><div class="grow"><b>${esc(b.title)}</b><span>${b.start}–${b.end}${b.lock?' · protegido':''}</span></div></div>`).join('')}</div><div class="co-note">Agua: ${esc(litros(W().goal))} · Hábitos: ${H().list.length}</div>`;
    acts=`<button class="btn red" type="button" data-co="close">${c.tone==='sargento'?'¡A darle!':'Vamos'}</button>`;
  }
  el.innerHTML=`<div class="co-in">
    <div class="co-top"><span class="co-av">${ICON_WHISTLE}</span><div class="co-who"><div class="eyebrow">Tu instructor · ${TONES[c.tone]}</div><b>${esc(label)}</b></div><button class="co-say" type="button" data-co="say" aria-label="Escuchar de nuevo">${ICON_SPEAK}</button></div>
    ${big?`<div class="co-big">${big}</div>`:''}${sub?`<div class="co-sub num">${sub}</div>`:''}
    <p class="co-msg">${esc(co.msg)}</p>
    ${body}
    ${acts?`<div class="co-acts">${acts}</div>`:''}
    ${foot?`<div class="co-foot">${foot}</div>`:''}
  </div>`;
}
$('#coach').addEventListener('click',async e=>{
  const b=e.target.closest('[data-co]');if(!b||!co)return;
  const a=b.dataset.co,c=CO(),s=CS(),k=today(),now=Date.now();
  audio();
  if(a==='say')return say(co.msg);
  if(a==='close'){if(co.kind==='brief'){s.seen.br=1;csSave()}return coachClose()}
  if(co.kind==='intro'){
    if(a==='tone'){c.tone=b.dataset.v;save('meta');co.msg=fr('intro');drawCoach();say(co.msg);return}
    if(a==='push'){b.disabled=true;await pushEnable();if(co)drawCoach();return}
    if(a==='introok'){c.intro=true;c.since=now;save('meta');s.seen.br=1;s.lastPrompt=now;csSave();toast(c.tone==='sargento'?'¡A la orden!':'Tu instructor está activo');return coachClose()}
  }
  if(co.kind==='start'){const id=co.b.id;
    if(a==='go'){s.seen['st:'+id]=1;csSave();const m=fr('go',{e:co.b.end});toast(m);say(m);return coachClose()}
    if(a==='later'){s.snz['st:'+id]=now+10*6e4;s.n['st:'+id]=1;csSave();const m=fr('snooze',{m:10});toast(m);say(m);return coachClose()}
    if(a==='skip'){co.phase='confirm';co.msg=fr('skipq');drawCoach();say(co.msg);return}
    if(a==='skipok'){s.seen['st:'+id]=1;csSave();setPlan(k,id,0);return coachResult('fail',fr('no'))}
  }
  if(co.kind==='check'&&a==='ans'){
    const v=+b.dataset.v;setPlan(b.dataset.k,b.dataset.id,v);
    const it=co.items.filter(x=>S.week.blocks.some(q=>q.id===x.id)),done=it.filter(x=>planDone(x.k,x.id)!==undefined);
    if(done.length<it.length){drawCoach();if(v)burstAt(`#coach [data-id="${CSS.escape(b.dataset.id)}"][data-v="1"]`);return}
    const y=it.filter(x=>planDone(x.k,x.id)===1).length;
    if(y)toast('+'+y*PLAN_XP+' XP por cumplir lo planificado');
    return y===it.length?coachResult('win',fr('yes')):y===0?coachResult('fail',fr('no')):coachResult('mixed',fr('mixed',{y,c:it.length}));
  }
  if(co.kind==='water'){
    if(a==='w'){const ml=+b.dataset.ml,w=W(),before=w.log[k]||0;w.log[k]=before+ml;coachDrank();s.lastPrompt=now;s.ml=w.log[k];csSave();save('habits');
      if(before<w.goal&&w.log[k]>=w.goal){toast('¡Meta de agua cumplida! +'+WATER_XP+' XP');return coachResult('win',fr('waterdone'))}
      const m=fr('waterok',{m:c.water.every});toast('+'+ml+' ml · '+m);say(m);return coachClose()}
    if(a==='later'){s.n.wa=(s.n.wa||0)+1;s.lastPrompt=now-c.water.every*6e4+10*6e4;csSave();const m=fr('snooze',{m:10});toast(m);say(m);return coachClose()}
  }
  if(co.kind==='habits'){
    if(a==='hab'){const h=H().list.find(x=>x.id===b.dataset.id);if(!h)return;const log=H().log;log[k]=log[k]||{};
      if(log[k][h.id]){delete log[k][h.id];if(!Object.keys(log[k]).length)delete log[k]}else{log[k][h.id]=h.pts;toast('+'+h.pts+' XP')}
      save('habits');if(H().list.every(x=>doneOn(k)[x.id])){s.seen.hb=1;csSave();return coachResult('win',fr('habitsok'))}
      drawCoach();return}
    if(a==='later'){s.n.hb=(s.n.hb||0)+1;s.snz.hb=now+30*6e4;csSave();const m=fr('snooze',{m:30});toast(m);say(m);return coachClose()}
    if(a==='skip'){co.phase='confirm';co.msg=fr('skipq');drawCoach();say(co.msg);return}
    if(a==='skipok'){s.seen.hb=1;csSave();return coachResult('fail',fr('habitsno'))}
  }
});

/* Avisos con la app cerrada (Web Push). En iPhone solo funcionan con la app instalada en la pantalla de inicio. */
const pushOK=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const b64uBytes=x=>{x=String(x).replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const r=atob(x),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u};
const b64uStr=buf=>{let r='';for(const x of new Uint8Array(buf))r+=String.fromCharCode(x);return btoa(r).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function swReg(){
  if(!('serviceWorker' in navigator))return null;
  try{const r=await navigator.serviceWorker.getRegistration();if(r&&r.active)return r}catch(e){}
  return Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),4000))]);
}
async function pushState(){
  if(!pushOK())return isIOS&&!standalone()?'ios':'na';
  if(Notification.permission==='denied')return 'denied';
  const reg=await swReg();if(!reg)return 'na';
  const sub=await reg.pushManager.getSubscription().catch(()=>null);
  return sub&&Notification.permission==='granted'?'on':'off';
}
async function refreshPush(){const v=await pushState().catch(()=>'na');if(v!==pushDev){pushDev=v;if(me&&!ownerMode&&tab==='inicio')render()}return v}
async function pushEnable(){
  if(!pushOK()){toast(isIOS&&!standalone()?'En iPhone primero agrega la app a tu pantalla de inicio y ábrela desde ahí':'Este navegador no permite avisos');return false}
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){pushDev=perm==='denied'?'denied':'off';toast('Sin permiso no puedo avisarte con la app cerrada');return false}
    const reg=await swReg();if(!reg)throw new Error('sin service worker');
    const {data:key,error}=await sb.rpc('instructor_clave');if(error||!key)throw error||new Error('sin clave');
    let sub=await reg.pushManager.getSubscription();
    if(sub){const cur=sub.options&&sub.options.applicationServerKey;if(cur&&b64uStr(cur)!==key){await sub.unsubscribe().catch(()=>{});sub=null}}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uBytes(key)});
    const j=sub.toJSON();
    const {error:e2}=await sb.from('push_subs').upsert({user_id:me,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth},{onConflict:'user_id,endpoint'});
    if(e2){if(e2.code==='23514'){toast('Este navegador no es compatible con los avisos');return false}throw e2}
    pushDev='on';CO().push=true;save('meta');syncAvisos(true);toast('Listo: te aviso aunque la app esté cerrada');return true;
  }catch(err){console.warn('avisos',err);toast('No se pudieron activar los avisos. Inténtalo otra vez.');return false}
}
async function pushDisable(){
  try{
    const reg=await swReg(),sub=reg&&await reg.pushManager.getSubscription();
    if(sub){await sb.from('push_subs').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe().catch(()=>{})}
    const {data}=await sb.from('push_subs').select('endpoint').limit(1);
    if(!data||!data.length){CO().push=false;save('meta');await sb.from('avisos').delete().is('enviado_at',null)}
    pushDev='off';toast('Avisos desactivados en este dispositivo');
  }catch(e){toast('No se pudo. Revisa tu conexión.')}
}
/* Al cerrar sesión, este dispositivo deja de recibir los avisos de esa cuenta */
async function pushForget(){
  try{const reg='serviceWorker' in navigator&&await navigator.serviceWorker.getRegistration(),sub=reg&&reg.pushManager&&await reg.pushManager.getSubscription();
    if(sub){await Promise.race([sb.from('push_subs').delete().eq('endpoint',sub.endpoint),new Promise(r=>setTimeout(r,2500))]);await sub.unsubscribe().catch(()=>{})}}catch(e){}
}
/* Arma los recordatorios de las próximas 36 horas y los deja en el servidor */
function planAvisos(){
  const c=CO(),s=CS(),now=Date.now(),end=now+36*36e5,k0=today(),out=[],T=PT[c.tone]||PT.firme;
  const add=(at,titulo,cuerpo,tag)=>{if(at>now+20e3&&at<=end)out.push({at:new Date(at).toISOString(),titulo:str(titulo,80),cuerpo:str(cuerpo,240),tag:str(tag,60),url:'app.html#coach'})};
  for(let i=0;i<2;i++){
    const k=addDays(k0,i),wg=W().goal;
    for(const b of dayBlocks(k)){
      if(planDone(k,b.id)!==undefined)continue;
      if(!(i===0&&s.seen['st:'+b.id]))add(atDay(b.start,k),b.title+' · '+b.start,fr('start',{t:b.title,h:b.start}),'b'+b.id+k);
      add(atDay(b.end,k),fill(T.check,{t:b.title}),fr('check',{t:b.title}),'c'+b.id+k);
      add(atDay(b.end,k)+45*6e4,fill(T.again,{t:b.title}),'Entra y dime si lo cumpliste.','c'+b.id+k);
    }
    const every=c.water.every*6e4,f=atDay(c.water.from,k),t=atDay(c.water.to,k);
    if(i===0){const wi=waterInfo();let left=Math.ceil((wi.goal-wi.ml)/250)+2;if(wi.ml<wi.goal)for(let at=Math.max(f,(s.lastDrink||0)+every,now+5*6e4);at<=t&&left>0;at+=every,left--)add(at,T.water,fill(T.wbody,{G:litros(wg)}),'agua')}
    else{let left=Math.ceil(wg/250)+2;for(let at=f;at<=t&&left>0;at+=every,left--)add(at,T.water,fill(T.wbody,{G:litros(wg)}),'agua')}
    const pend=i===0?H().list.filter(h=>!doneOn(k)[h.id]).length:H().list.length;
    if(pend&&!(i===0&&s.seen.hb)){add(atDay(c.habitsAt,k),T.habits,fr('habits',{c:pend,h:c.habitsAt}),'habitos');add(atDay(c.habitsAt,k)+45*6e4,T.last,fr('nosnooze'),'habitos')}
    if(i===1){const tb=dayBlocks(k);if(tb.length)add(atDay(c.water.from,k),T.brief,fr('brief',{b:tb.length===1?'un bloque: '+tb[0].title+' a las '+tb[0].start:tb.length+' bloques y el primero es '+tb[0].title+' a las '+tb[0].start,G:litros(wg)}),'dia')}
  }
  return out.sort((a,b)=>a.at.localeCompare(b.at)).slice(0,130);
}
let avT=null,avBusy=false,avAgain=false,avSig='';
function syncAvisosSoon(){if(!me)return;clearTimeout(avT);avT=setTimeout(()=>syncAvisos(),2500)}
async function syncAvisos(force){
  if(!me||!CO().push)return;
  if(avBusy){avAgain=true;return}
  const list=CO().on&&premium()?planAvisos():[],sig=JSON.stringify(list.map(a=>[a.at.slice(0,16),a.tag,a.titulo]));
  const s=CS();if(!force&&sig===avSig&&Date.now()-(s.lastSync||0)<20*6e4)return;
  const who=me;avBusy=true;
  try{
    const del=await sb.from('avisos').delete().is('enviado_at',null).neq('tag','prueba');if(del.error||who!==me)return;
    if(list.length){const ins=await sb.from('avisos').insert(list);if(ins.error)throw ins.error}
    avSig=sig;if(who===me){CS().lastSync=Date.now();csSave()}
  }catch(e){console.warn('avisos',e)}
  finally{avBusy=false;if(avAgain){avAgain=false;syncAvisosSoon()}}
}
let lastTest=0;
async function pushTest(btn){
  if(!CO().push||pushDev!=='on')return toast('Primero activa los avisos en este dispositivo');
  if(Date.now()-lastTest<30000)return toast('Espera un poco antes de probar otra vez');
  lastTest=Date.now();btn.disabled=true;
  const {error}=await sb.from('avisos').insert({at:new Date(Date.now()+3000).toISOString(),titulo:'Prueba del instructor',cuerpo:'Si ves esto, te puedo avisar aunque la app esté cerrada.',tag:'prueba',url:'app.html#coach'});
  btn.disabled=false;toast(error?'No se pudo mandar la prueba':'Te llega en menos de un minuto. Puedes cerrar la app.');
}
setInterval(()=>{if(me&&document.visibilityState==='visible')syncAvisos()},10*6e4);
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.coach&&me)setTimeout(coachTick,300)});

/* ---------- plan y pagos ----------
   Quién puede guardar lo decide Supabase (mi_plan y las reglas de user_docs y avisos); aquí solo se muestra.
   Se paga en Mercado Pago a través de la función esquina-pago: la app nunca ve la clave ni decide el precio. */
let PL=null,plBusy=false,plAt=0,plSig='',payBusy=false,planSel='anual',payBack='',payWait=null,lastNudge=0;
const base={}; // último estado guardado de cada sección, para deshacer cambios cuando no se puede guardar
{const q=new URLSearchParams(location.search),p=q.get('pago');
 if(p){payBack=/^(anual|mensual|error)$/.test(p)?p:'';try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}}
const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const plKey=()=>'esquina.plan.'+me, payKey=()=>'esquina.pago.'+me;
const locked=()=>!!(PL&&PL.cobro&&PL.escribir===false);
const premium=()=>!PL||!PL.cobro||PL.acceso!==false;
const dayFmt=iso=>{const d=new Date(iso);return isNaN(d)?'':d.getDate()+' de '+MESES[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' de '+d.getFullYear():'')};
const daysLeft=iso=>Math.max(0,Math.ceil((new Date(iso)-Date.now())/864e5));
function plCache(){try{const j=JSON.parse(localStorage.getItem(plKey())||'null');if(j&&typeof j==='object'){PL=j;plSig=JSON.stringify(j)}}catch(e){}}
async function planLoad(){
  if(!me||plBusy)return PL;plBusy=true;const who=me;
  try{
    const {data,error}=await sb.rpc('mi_plan');if(who!==me||error||!data||typeof data!=='object')return PL;
    const was=locked(),sig=JSON.stringify(data);PL=data;plAt=Date.now();
    try{localStorage.setItem(plKey(),sig)}catch(e){}
    if(sig!==plSig){plSig=sig;planChanged(was)}
    return PL;
  }finally{plBusy=false}
}
function planChanged(was){
  if(was&&!locked())for(const d of dirty){fails[d]=0;flush(d)} // lo que quedó pendiente se sube apenas vuelve el acceso
  if(!premium()&&co)coachClose();
  setSync();syncAvisosSoon();
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#view form');
  if(!ownerMode&&!typing&&!co)render();
  if(!$('#settings').hidden&&$('#set-plan'))$('#set-plan').outerHTML=planSettings();
}
/* Sin acceso: deshace el cambio y ofrece los planes, en vez de dejar algo que nunca se va a guardar */
function blockedSave(doc){
  try{S[doc]=clean(doc,base[doc]?JSON.parse(base[doc]):defaults()[doc])}catch(e){}
  if(booting||Date.now()-lastNudge<6000)return;lastNudge=Date.now();
  setTimeout(()=>{if(!me)return;render();openPlans()},0);
}
async function callPagoFn(body){
  const {data:{session}}=await sb.auth.getSession();if(!session)return {error:'Tu sesión venció. Vuelve a entrar.'};
  try{const r=await fetch(SB_URL+'/functions/v1/esquina-pago',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));return r.ok?{data:j}:{error:j.error||'No se pudo hacer. Inténtalo otra vez.'}}
  catch(e){return {error:'Sin conexión. Inténtalo otra vez.'}}
}
function payPending(){try{const j=JSON.parse(localStorage.getItem(payKey())||'null');if(j&&Date.now()-j.at<3*864e5)return j;localStorage.removeItem(payKey())}catch(e){}return null}
function payClear(){try{localStorage.removeItem(payKey())}catch(e){}}
let payChecking=false,payLast=0;
/* Pregunta a Mercado Pago (vía el servidor) si ya entró el pago */
async function payCheck(manual){
  if(!me||payChecking||(!manual&&Date.now()-payLast<20000))return;
  payChecking=true;payLast=Date.now();const who=me;
  try{const r=await callPagoFn({accion:'refrescar'});if(who!==me)return;if(r.error&&manual)toast(r.error);await planLoad()}finally{payChecking=false}
  if(who!==me)return;
  if(PL&&PL.motivo==='pago'&&payPending()){payClear();showPaid();return}
  if(manual)toast(PL&&PL.motivo==='pago'?'Tu plan está activo':'Todavía no vemos tu pago. Si pagaste recién, espera un minuto y revisa otra vez.');
}
function payAfterBoot(){
  const b=payBack;payBack='';
  if(b==='error'){toast('El pago no se completó. Puedes intentarlo otra vez.');openPlans();return}
  if(b){try{if(!payPending())localStorage.setItem(payKey(),JSON.stringify({at:Date.now(),plan:b}))}catch(e){}
    if(PL&&PL.motivo==='pago'){payClear();showPaid();return}
    openPlans('wait');payCheck(true);clearInterval(payWait);let n=0;
    payWait=setInterval(()=>{if(!me||++n>12||$('#plans').hidden||$('#plans').dataset.view!=='wait'){clearInterval(payWait);return}payCheck()},15000);return}
  if(payPending()&&!(PL&&PL.motivo==='pago'))payCheck();
}
/* ---- pantalla de planes ---- */
function plansIntro(){
  const p=PL||{};
  if(!p.cobro)return [owner?'Vista previa':'Planes',owner?'Así verá tu gente los planes. El cobro está apagado: si pagas ahora es un pago real a tu cuenta.':'Por ahora Mi Esquina es gratis. Así serán los planes.'];
  if(p.motivo==='sin')return p.modo==='basico'?['Vuelve con todo','Tu prueba terminó. Hábitos, plata y semana siguen gratis; el instructor y sus avisos vuelven con un plan.']:['Tu prueba terminó','Tus datos siguen guardados y puedes verlos y descargarlos. Para seguir anotando, elige tu plan.'];
  if(p.motivo==='prueba'){const n=daysLeft(p.prueba_hasta);return ['Elige tu plan',n<=1?'Hoy es tu último día gratis.':'Te quedan '+n+' días gratis. Si eliges ahora, sigues sin cortes.']}
  if(p.motivo==='pago')return ['Renueva tu plan','Tienes acceso hasta el '+dayFmt(p.vence)+'.'];
  return ['Planes',''];
}
function plansHTML(view){
  if(view==='ok'){const p=PL||{};return `
    <div class="pl-ok"><div class="pl-ok-ic">${ICON_CHECK}</div>
      <b class="disp">¡Bienvenido al equipo!</b>
      <p>${p.plan==='mensual'?'Tu plan mensual quedó activo'+(p.fundador?' con precio de fundador':'')+'. Se renueva solo y lo cancelas cuando quieras en Ajustes.':'Tu plan anual quedó activo hasta el '+esc(dayFmt(p.vence))+'.'}</p>
      <button class="btn red" type="button" data-pl-close>Seguir</button></div>`}
  if(view==='wait')return `
    <div class="pl-head"><b class="disp">Revisando tu pago</b><button type="button" class="x" data-pl-close aria-label="Cerrar">×</button></div>
    <div class="pl-wait"><span class="pl-spin" aria-hidden="true"></span><p>Estamos esperando la confirmación de Mercado Pago. Suele tardar segundos; con transferencia o pago en efectivo puede tardar más.</p></div>
    <button class="btn" type="button" data-pl-check>Revisar otra vez</button>
    <div class="note">Puedes cerrar esto: tu plan se activa solo apenas Mercado Pago lo confirme.</div>`;
  const p=PL||{},pr=p.precios||{anual:29990,mensual:2990,normal:4990,fundador:true,cupos:100};
  const fund=pr.mensual<pr.normal,ahorro=pr.mensual*12-pr.anual,[t,s]=plansIntro();
  const mensualOff=p.auto&&p.motivo==='pago';
  const opt=(k,inner)=>`<button type="button" class="pl-opt${planSel===k?' on':''}" role="radio" aria-checked="${planSel===k}" data-pl-sel="${k}">${inner}<span class="pl-ck" aria-hidden="true">${ICON_CHECK}</span></button>`;
  return `
  <div class="pl-head"><b class="disp">${esc(t)}</b><button type="button" class="x" data-pl-close aria-label="Cerrar">×</button></div>
  ${s?`<p class="pl-sub">${esc(s)}</p>`:''}
  <div class="pl-opts" role="radiogroup" aria-label="Plan">
    ${opt('anual',`<span class="pl-badge">Más conveniente</span><span class="pl-n">Anual</span><span class="pl-p"><b class="disp num">${clp(pr.anual)}</b> al año</span><span class="pl-s">Equivale a ${clp(Math.round(pr.anual/12))} al mes${ahorro>0?' · ahorras '+clp(ahorro):''}</span><span class="pl-s">Un solo pago con débito, crédito o saldo de Mercado Pago</span>`)}
    ${mensualOff?'':opt('mensual',`${fund?`<span class="pl-badge gold">Precio fundador</span>`:''}<span class="pl-n">Mensual</span><span class="pl-p"><b class="disp num">${clp(pr.mensual)}</b> al mes${fund?` <s class="num">${clp(pr.normal)}</s>`:''}</span><span class="pl-s">${fund?'Tu cuenta está entre las primeras 100: mantienes este precio mientras sigas suscrito.':'Se renueva solo cada mes.'}</span><span class="pl-s">Se cobra solo cada mes con tarjeta de crédito · cancelas cuando quieras</span>`)}
  </div>
  <ul class="pl-inc">${['Instructor con voz y avisos con la app cerrada','Hábitos, agua y despertador con cinturones','Tu plata y tu semana','Tus datos en todos tus equipos'].map(x=>`<li>${ICON_CHECK}<span>${x}</span></li>`).join('')}</ul>
  <button class="btn red pl-go" type="button" data-pl-go>Pagar ${clp(planSel==='mensual'&&!mensualOff?pr.mensual:pr.anual)} con Mercado Pago</button>
  <div class="note pl-fine">Pagas en Mercado Pago: Mi Esquina nunca ve tu tarjeta. Precios en pesos chilenos con IVA incluido. <a href="privacidad.html#planes" target="_blank" rel="noopener">Condiciones</a></div>
  ${p.cobro?`<button class="btn sm pl-chk" type="button" data-pl-check>Ya pagué: revisar</button>`:''}`;
}
function openPlans(view){
  const el=$('#plans'),b=$('#plans-body');if(!el||!me)return;
  if(PL&&PL.auto&&PL.motivo==='pago'&&view!=='ok'&&view!=='wait')planSel='anual';
  el.dataset.view=view||'';b.innerHTML=plansHTML(view);
  if(el.hidden)showSheet(el);
}
function closePlans(){const el=$('#plans');clearInterval(payWait);hideSheet(el,()=>{if(el.hidden)$('#plans-body').innerHTML=''})}
function showPaid(){
  closeSettings();openPlans('ok');try{FX.rain()}catch(e){}
  if(CO().voice)say(CO().tone==='sargento'?'¡Bienvenido al equipo, soldado! ¡Ahora sí, a cumplir!':'¡Bienvenido al equipo! Ahora sí, a cumplir.');
  render();
}
async function payStart(btn){
  if(payBusy)return;payBusy=true;btn.disabled=true;const lbl=btn.textContent;btn.textContent='Abriendo Mercado Pago…';
  const plan=PL&&PL.auto&&PL.motivo==='pago'?'anual':planSel;
  const res=await callPagoFn({accion:'crear',plan});
  const url=res.data&&res.data.url;
  if(res.error||!/^https:\/\/([a-z0-9-]+\.)*mercadopago\.(cl|com)\//.test(url||'')){payBusy=false;btn.disabled=false;btn.textContent=lbl;toast(res.error||'No se pudo abrir Mercado Pago');return}
  try{localStorage.setItem(payKey(),JSON.stringify({at:Date.now(),plan}))}catch(e){}
  if(dirty.size)await flushAll();
  location.assign(url);
  setTimeout(()=>{payBusy=false;btn.disabled=false;btn.textContent=lbl},5000);
}
$('#plans').addEventListener('click',async e=>{
  if(e.target.id==='plans')return closePlans();
  const b=e.target.closest('button');if(!b)return;const ds=b.dataset;
  if(ds.plClose!==undefined)return closePlans();
  if(ds.plSel){planSel=ds.plSel;$('#plans-body').innerHTML=plansHTML();return}
  if(ds.plGo!==undefined)return payStart(b);
  if(ds.plCheck!==undefined){b.disabled=true;b.textContent='Revisando…';await payCheck(true);if(!$('#plans').hidden&&$('#plans').dataset.view!=='ok')openPlans($('#plans').dataset.view);return}
});
dragToClose($('#plans'),closePlans);
/* ---- tarjeta en Inicio ---- */
function planCard(){
  const p=PL;if(!p||!p.cobro||p.motivo==='dueno'||p.motivo==='libre')return '';
  const pend=payPending();
  if(p.motivo==='sin'){
    if(p.modo==='basico')return `<div class="card pl-card warn"><div class="eyebrow">Plan</div><div class="pl-ct">Tu prueba del instructor terminó</div><div class="note">Hábitos, plata y semana siguen gratis. El instructor y sus avisos vuelven con un plan.</div><div class="co-btns"><button class="btn red" type="button" data-planes>Ver planes</button>${pend?'<button class="btn" type="button" data-pay-check>Ya pagué</button>':''}</div></div>`;
    return `<div class="card hero pl-lock"><div class="eyebrow">Tu prueba terminó</div><div class="pl-ct disp">Vuelve al ring</div><p>Tus datos siguen guardados: puedes verlos y descargarlos. Para seguir anotando, elige tu plan.</p><div class="co-btns"><button class="btn red" type="button" data-planes>Elegir plan</button>${pend?'<button class="btn" type="button" data-pay-check>Ya pagué: revisar</button>':'<button class="btn" type="button" data-settings="datos">Descargar mis datos</button>'}</div></div>`;
  }
  if(p.motivo==='prueba'){
    const n=daysLeft(p.prueba_hasta),tot=+p.prueba_dias||14,pct=Math.max(4,Math.min(100,Math.round((tot-n)/tot*100))),hot=n<=3;
    return `<div class="card pl-card${hot?' hot':''}"><div class="pl-row"><div style="min-width:0"><div class="eyebrow">Prueba gratis</div><div class="pl-ct">${n<=1?'Hoy es tu último día':'Te quedan '+n+' días'}</div></div><button class="btn ${hot?'red':'pri'} sm" type="button" data-planes>Ver planes</button></div><div class="bar pl-bar"><i style="width:${pct}%"></i></div><div class="note">Después: ${clp((p.precios||{}).anual||29990)} al año o ${clp((p.precios||{}).mensual||2990)} al mes.${pend?' <button class="lnk" type="button" data-pay-check>Ya pagué: revisar</button>':''}</div></div>`;
  }
  if(p.motivo==='pago'&&!p.auto&&p.vence&&daysLeft(p.vence)<=10)
    return `<div class="card pl-card hot"><div class="pl-row"><div style="min-width:0"><div class="eyebrow">Tu plan</div><div class="pl-ct">Termina el ${esc(dayFmt(p.vence))}</div></div><button class="btn red sm" type="button" data-planes>Renovar</button></div></div>`;
  return '';
}
/* ---- sección en Ajustes ---- */
function planSettings(){
  const p=PL;
  if(!p||(!p.cobro&&!owner))return '<div id="set-plan" hidden></div>';
  let line,btns='';
  if(!p.cobro)line='El cobro está apagado: todos usan la app gratis. Lo enciendes en tu panel, en Cobros.';
  else if(p.motivo==='dueno')line='Eres el dueño: tienes todo sin pagar.';
  else if(p.motivo==='prueba'){line='Prueba gratis hasta el '+dayFmt(p.prueba_hasta)+'.';btns='<button class="btn red" type="button" data-planes>Ver planes</button>'}
  else if(p.motivo==='sin'){line='Tu prueba terminó el '+dayFmt(p.prueba_hasta)+'. Tus datos siguen guardados.';btns='<button class="btn red" type="button" data-planes>Elegir plan</button>'}
  else if(p.plan==='mensual'&&p.estado==='activa'){line='Plan mensual de '+clp(p.monto)+(p.fundador?' (precio fundador)':'')+'. Se renueva solo; el próximo cobro es cerca del '+dayFmt(new Date(new Date(p.vence)-3*864e5))+'.';btns='<button class="btn" type="button" data-pl-cancel>Cancelar suscripción</button>'}
  else if(p.plan==='mensual'){line='Cancelaste el plan mensual. Tienes acceso hasta el '+dayFmt(p.vence)+' y no se te vuelve a cobrar.';btns='<button class="btn red" type="button" data-planes>Volver a suscribirme</button>'}
  else{line='Plan anual hasta el '+dayFmt(p.vence)+'.';if(daysLeft(p.vence)<=30)btns='<button class="btn red" type="button" data-planes>Renovar</button>'}
  return `<div class="set-sec" id="set-plan"><h4>Tu plan</h4><div>${esc(line)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${btns}${p.cobro&&p.motivo!=='dueno'?'<button class="btn" type="button" data-pay-check>Revisar mi pago</button>':''}${owner&&!p.cobro?'<button class="btn" type="button" data-planes>Ver la pantalla de planes</button>':''}</div></div>`;
}
async function payCancel(btn){
  const p=PL||{};
  if(!confirm('¿Cancelar tu plan mensual? No se te vuelve a cobrar y sigues con todo hasta el '+dayFmt(p.vence)+'.'))return;
  btn.disabled=true;btn.textContent='Cancelando…';
  const r=await callPagoFn({accion:'cancelar'});
  if(r.error){btn.disabled=false;btn.textContent='Cancelar suscripción';return toast(r.error)}
  await planLoad();toast('Plan cancelado. Sigues con todo hasta el '+dayFmt(p.vence)+'.');
  if($('#set-plan'))$('#set-plan').outerHTML=planSettings();
}

/* ---------- ajustes ---------- */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function openSettings(focus){
  const cd=S.meta.countdown||{};
  $('#set-body').innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center"><b class="disp" style="font-size:28px;text-transform:uppercase">Ajustes</b><button type="button" class="x" data-close-set aria-label="Cerrar">×</button></div>
  ${owner?`<div class="set-sec"><h4>Dueño</h4><button class="btn red" type="button" data-owner-open style="justify-self:start">${ICON_CROWN} Abrir el panel del dueño</button><div class="note">Solo tu cuenta ve este botón.</div></div>`:''}
  ${planSettings()}
  <div class="set-sec"><h4>Tu perfil</h4>
    <form class="row" id="st-name"><label>Nombre<input id="st-n" maxlength="40" value="${esc(S.meta.name)}" required></label><button class="btn" type="submit">Guardar</button></form>
    <div class="note">Entras con ${esc(email)}</div></div>
  ${coachSettings()}
  <div class="set-sec" id="set-cd"><h4>Tu fecha importante</h4>
    <form class="row" id="st-cd"><label>Qué es<input id="st-cdl" maxlength="40" value="${esc(cd.label)}" placeholder="Ej: Mi pelea, examen de grado"></label><label>Fecha<input id="st-cdd" type="date" value="${esc(cd.date)}"></label><button class="btn" type="submit">Guardar</button></form>
    ${cd.date?'<button class="btn sm" type="button" data-cd-clear style="justify-self:start">Quitar fecha</button>':''}</div>
  <div class="set-sec"><h4>Nombres de tus áreas</h4><div class="note">Ponle a cada color el nombre que tiene en tu vida.</div>
    <form class="row" id="st-areas">${AREA_KEYS.map(k=>`<label><span style="display:flex;align-items:center;gap:6px"><span class="dot" style="background:var(--a-${k})"></span>${esc(AREA_DEF[k])}</span><input data-area="${k}" maxlength="24" value="${esc(obj(S.meta.areaNames)[k]||'')}" placeholder="${esc(AREA_DEF[k])}"></label>`).join('')}<button class="btn" type="submit">Guardar nombres</button></form></div>
  <div class="set-sec"><h4>Instalar en tu celular</h4>
    ${standalone()?'<div class="note">Ya la estás usando como app. 👊</div>':installEvt?'<button class="btn pri" type="button" data-install style="justify-self:start">Instalar Mi Esquina</button>':isIOS?'<div>En Safari, toca <b>Compartir</b> (el cuadrado con la flecha) y elige <b>Agregar a pantalla de inicio</b>.</div>':'<div>En Chrome, abre el menú de los tres puntos y elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>. En iPhone, usa Safari: <b>Compartir</b> y <b>Agregar a pantalla de inicio</b>.</div>'}</div>
  <div class="set-sec" id="set-datos"><h4>Tus datos</h4>
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
    <form class="row" id="st-del" style="margin-top:6px"><label>Para borrar tu cuenta y todos tus datos, escribe BORRAR${PL&&PL.auto?'. Tu plan mensual también se cancela.':''}<input id="st-d" autocomplete="off" maxlength="10"></label><button class="btn red" type="submit">Borrar mi cuenta</button></form></div>`;
  showSheet($('#settings'));
  if(focus==='cd')setTimeout(()=>{const el=$('#set-cd');el.scrollIntoView({block:'center'});$('#st-cdl').focus()},60);
  if(focus==='coach')setTimeout(()=>{const el=$('#set-coach');if(el)el.scrollIntoView({block:'start'})},60);
  if(focus==='datos')setTimeout(()=>{const el=$('#set-datos');if(el)el.scrollIntoView({block:'start'})},60);
  drawPushRow();
}
function coachSettings(){
  const c=CO(),w=c.water;
  return `<div class="set-sec" id="set-coach"><h4>Tu instructor</h4>
    <div class="note">Te recuerda lo que planificaste, te pide cuentas, te obliga a tomar agua y a cerrar tus hábitos. Su pantalla no se cierra hasta que respondes.</div>
    <form class="row" id="st-coach">
      <label class="inl"><input type="checkbox" id="co-on" ${c.on?'checked':''}> Instructor encendido</label>
      <label class="inl"><input type="checkbox" id="co-voice" ${c.voice?'checked':''} ${canSpeak?'':'disabled'}> Que me hable en voz alta</label>
      <label>Tono<select id="co-tone">${Object.entries(TONES).map(([k,n])=>`<option value="${k}" ${c.tone===k?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>Agua cada<select id="co-every">${WATER_EVERY.map(m=>`<option value="${m}" ${w.every===m?'selected':''}>${m<60?m+' min':m===60?'1 hora':(m/60).toLocaleString('es-CL')+' horas'}</option>`).join('')}</select></label>
      <label>Agua desde<input id="co-from" type="time" value="${esc(w.from)}" required></label>
      <label>Agua hasta<input id="co-to" type="time" value="${esc(w.to)}" required></label>
      <label>Revisar hábitos a las<input id="co-hab" type="time" value="${esc(c.habitsAt)}" required></label>
      <button class="btn" type="submit">Guardar</button>
    </form>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-co-try>${ICON_SPEAK} Escuchar</button></div>
    <div class="co-push" id="co-push"><div class="note">Revisando avisos…</div></div></div>`;
}
async function drawPushRow(){
  const el=$('#co-push');if(!el)return;const v=await refreshPush();if(!$('#co-push'))return;
  const txt={on:'Avisos activados en este dispositivo. Te llegan aunque la app esté cerrada.',off:'Con los avisos te recuerdo todo aunque la app esté cerrada.',denied:'Bloqueaste los avisos para esta página. Actívalos en los ajustes del navegador y vuelve aquí.',
    ios:'En iPhone los avisos funcionan con la app instalada: en Safari toca Compartir, elige Agregar a pantalla de inicio y abre Mi Esquina desde ese ícono.',na:'Este navegador no permite avisos con la app cerrada. Mientras la tengas abierta, igual te hablo y te exijo.'}[v];
  el.innerHTML=`<div class="note">${txt}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${v==='off'?'<button class="btn pri" type="button" data-push-on>Activar avisos</button>':''}${v==='on'?'<button class="btn" type="button" data-push-test>Probar aviso</button><button class="btn" type="button" data-push-off>Desactivar en este dispositivo</button>':''}</div>`;
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
  const keepName=S.meta.name,keepCoach=CO();
  for(const d of found){S[d]=clean(d,data[d]);save(d)}
  if(!S.meta.name)S.meta.name=keepName;
  if(!obj(data.meta).coach)S.meta.coach=keepCoach; // respaldos de antes del instructor

  S.meta.onboarded=true;save('meta');
  tab='inicio';closeSettings();drawTabs();entering=true;render();toast('Datos importados');
}
$('#settings').addEventListener('click',async e=>{
  if(e.target.id==='settings')return closeSettings();
  const b=e.target.closest('button');if(!b)return;const ds=b.dataset;
  if(ds.closeSet!==undefined)return closeSettings();
  if(ds.ownerOpen!==undefined){closeSettings();enterOwner();return}
  if(ds.coTry!==undefined){audio();say(fr('start',{t:'tu primer bloque',h:hm(new Date())}));return}
  if(ds.pushOn!==undefined){b.disabled=true;await pushEnable();drawPushRow();render();return}
  if(ds.pushOff!==undefined){b.disabled=true;await pushDisable();drawPushRow();render();return}
  if(ds.pushTest!==undefined){await pushTest(b);return}
  if(ds.plCancel!==undefined){await payCancel(b);return}
  if(ds.cdClear!==undefined){S.meta.countdown={label:'',date:''};save('meta');render();openSettings();toast('Fecha quitada');return}
  if(ds.install!==undefined&&installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(err){}installEvt=null;openSettings();return}
  if(ds.export!==undefined){const blob=new Blob([JSON.stringify(exportJSON(),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mi-esquina-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);return}
  if(ds.logout!==undefined){await logout();return}
});
$('#settings').addEventListener('submit',async e=>{
  e.preventDefault();const id=e.target.id;
  if(id==='st-name'){const n=$('#st-n').value.trim().slice(0,40);if(!n)return toast('Escribe tu nombre');S.meta.name=n;save('meta');render();toast('Nombre guardado');
    sb.from('perfiles').update({nombre:n}).eq('user_id',me).then(()=>{},()=>{});sb.auth.updateUser({data:{nombre:n}}).then(()=>{},()=>{});return}
  if(id==='st-coach'){const c=CO(),f=$('#co-from').value,t=$('#co-to').value,h=$('#co-hab').value;
    if(!isHM(f)||!isHM(t)||!isHM(h))return toast('Revisa las horas');if(t<=f)return toast('La hora final del agua debe ser después de la inicial');
    const wasOn=c.on;c.on=$('#co-on').checked;c.voice=$('#co-voice').checked;c.tone=TONES[$('#co-tone').value]?$('#co-tone').value:'firme';
    c.water={every:WATER_EVERY.includes(+$('#co-every').value)?+$('#co-every').value:60,from:f,to:t};c.habitsAt=h;
    if(c.on&&!wasOn){c.since=Date.now()}
    save('meta');render();syncAvisos(true);toast(c.on?(c.tone==='sargento'?'¡Entendido!':'Instructor guardado'):'Instructor apagado');
    if(c.on)say(c.tone==='sargento'?'¡Cambios guardados, soldado!':'Listo. Así quedamos.');return}
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
    swReg().then(g=>g&&g.pushManager.getSubscription()).then(x=>x&&x.unsubscribe()).catch(()=>{});
    const id=me;manualOut=true;teardown();clearCache(id);
    await sb.auth.signOut({scope:'local'}).catch(()=>{});
    showAuth('entrar','Tu cuenta y todos tus datos fueron borrados.','ok');
  }catch(err){btn.disabled=false;btn.textContent='Borrar mi cuenta';toast(String(err.message||'No se pudo borrar').slice(0,90))}
}
function clearCache(id){try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('esquina:'+id+':'))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k));localStorage.removeItem('esquina.coach.'+id)}catch(e){}}
async function logout(){
  if(dirty.size){await flushAll()}
  if(dirty.size&&!confirm('Hay cambios que todavía no llegan a la nube (estás sin conexión). Si sales ahora, se pierden. ¿Salir igual?'))return;
  await pushForget();
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
{const h=location.hash||'';if(hashGasto(h)||h==='#despertar'||h==='#coach')pendingHash=h;
 try{const r=new URLSearchParams(location.search).get('ref');if(r)sessionStorage.setItem('esquina.ref',r.slice(0,40))}catch(e){}}
function teardown(){
  loadingView=false;ownerReset();
  me=null;email='';S=defaults();dirty.clear();for(const k in timers)clearTimeout(timers[k]);
  disarm();stopRing();ch=null;$('#alarm').hidden=true;$('#sheet').hidden=true;closeSettings();$('#view').innerHTML='';
  PL=null;plSig='';plAt=0;for(const k in base)delete base[k];clearInterval(payWait);$('#plans').hidden=true;$('#plans-body').innerHTML='';
  co=null;coS=null;avSig='';pushDev='na';clearTimeout(avT);$('#coach').hidden=true;$('#coach').innerHTML='';lockScroll(false);try{canSpeak&&speechSynthesis.cancel()}catch(e){}
}
async function boot(session){
  if(booting||(me&&me===session.user.id))return;booting=true;
  try{
    teardown();me=session.user.id;email=session.user.email||'';plCache();projHint();
    const metaName=str(obj(session.user.user_metadata).nombre,40);
    // 1) lo que hay en este dispositivo, para mostrar algo al instante
    let had=false;
    for(const d of DOCS){try{const c=JSON.parse(localStorage.getItem(cacheKey(d))||'null');if(c){had=true;S[d]=clean(d,c.d);base[d]=JSON.stringify(S[d]);if(c.dirty){dirty.add(d);rev[d]=(rev[d]||0)+1}}}catch(e){}}
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
        if(got[d]){S[d]=clean(d,got[d]);base[d]=JSON.stringify(S[d])}
        else{if(d==='meta'&&!S.meta.name)S.meta.name=metaName;save(d)} // primera vez: guarda los valores iniciales
        cacheWrite(d);
      }
      if(!S.meta.name){S.meta.name=metaName;save('meta')}
      lastPull=Date.now();
      if(loadingView){loadingView=false;entering=true;drawTabs();render()}else if(JSON.stringify(S)!==before){drawTabs();render()}
      setSync();
    }
    let coachWait=3000;
    if(pendingHash){const h=pendingHash;pendingHash='';clearHash();const g=hashGasto(h);if(g)openQuick(g);else if(h==='#despertar')startChallenge('link');else if(h==='#coach')coachWait=400}
    checkOwner();
    const who=me;planLoad().then(()=>{if(me===who)payAfterBoot()});
    refreshPush();syncAvisosSoon();setTimeout(coachTick,coachWait);
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
  for(const r of data||[]){if(!DOCS.includes(r.doc))continue;const c=clean(r.doc,r.data);if(JSON.stringify(c)!==JSON.stringify(S[r.doc])){S[r.doc]=c;base[r.doc]=JSON.stringify(c);cacheWrite(r.doc);changed=true}}
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#view form');
  if(changed&&!typing&&$('#sheet').hidden&&$('#settings').hidden&&$('#plans').hidden&&$('#alarm').hidden&&!co)render();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){pull();if(owner)odRefresh();if(me){if(payPending())payCheck();else if(Date.now()-plAt>5*6e4)planLoad();setTimeout(coachTick,1200);syncAvisos()}}else for(const d of [...dirty])flush(d)});

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
