/* Página de inicio: muestra los precios vigentes y si ya empezó el cobro. Solo lee datos públicos, de nadie en particular. */
(()=>{
  const URL_='https://hkhweiduvkggbzfdpiyk.supabase.co/rest/v1/rpc/precios_publicos';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraHdlaWR1dmtnZ2J6ZmRwaXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzcwNDAsImV4cCI6MjEwNzMxMzA0MH0.9lNNRFDZKHqYRK_dr6-QSnH5ukIj9AGjWIqZD6qfsnQ';
  const clp=n=>'$'+Math.round(+n||0).toLocaleString('es-CL');
  const set=(id,t)=>{const el=document.getElementById(id);if(el)el.textContent=t};
  fetch(URL_,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:'{}'})
    .then(r=>r.ok?r.json():null).then(p=>{
      if(!p||typeof p!=='object')return;
      set('p-anual',clp(p.anual));set('p-anual-mes',clp(p.anual/12));
      if(p.cupos>0){set('p-mensual',clp(p.mensual));set('p-normal',clp(p.normal));set('p-cupos',' (quedan '+p.cupos+')')}
      else{set('p-mensual',clp(p.normal));set('p-normal','');set('p-mtxt','al mes. Se renueva solo y lo cancelas cuando quieras.')}
      if(!p.cobro)return;
      const d=+p.dias||14;
      set('hero-note',d+' días gratis. Sin tarjeta.');
      set('p-tit','Prueba '+d+' días gratis');
      set('p-intro','Crea tu cuenta y usa todo gratis durante '+d+' días. Después eliges tu plan.'+(p.cupos>0?' Las primeras 100 cuentas quedan con precio de fundador.':''));
      set('p-tag','Prueba gratis');
      set('p-cta','Empezar mis '+d+' días gratis');
    }).catch(()=>{});
})();
