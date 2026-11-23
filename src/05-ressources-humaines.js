/*
 * SALAMA WMS – Ressources humaines de l'entrepôt : pointage, tâches, performance, cibles, badges
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – ressources humaines de l'entrepôt : pointage, tâches, cibles, performance ============ */
const FONCTIONS=['Préparateur','Contrôleur – emballeur','Cariste – magasinier','Réceptionnaire','Chauffeur','Chef d’équipe'];
const TASK_TYPES={'Préparation':'Préparateur','Contrôle':'Contrôleur – emballeur','Emballage':'Contrôleur – emballeur','Rangement':'Cariste – magasinier','Comptage':'Cariste – magasinier','Réception':'Réceptionnaire','Chargement':'Cariste – magasinier'};
const TARGET_DEF={
  'Préparateur':{cmd:8,colis:150,lignes:80,dureeCmd:50,unite:'colis'},
  'Contrôleur – emballeur':{cmd:16,colis:280,lignes:150,dureeCmd:20,unite:'colis'},
  'Cariste – magasinier':{cmd:30,colis:0,lignes:40,dureeCmd:12,unite:'palettes / tâches'},
  'Réceptionnaire':{cmd:6,colis:0,lignes:45,dureeCmd:40,unite:'lignes'},
  'Chauffeur':{cmd:1,colis:0,lignes:0,dureeCmd:0,unite:'missions'},
  'Chef d’équipe':{cmd:0,colis:0,lignes:0,dureeCmd:0,unite:'—'}
};
const HR_PAR={debut:'07:30',fin:'16:00',pause:60};
function ensureHR(){
  if(S.staff&&S.tasks&&S.pointages&&S.targets)return;
  const R=rnd(4477);
  S.targets=JSON.parse(JSON.stringify(TARGET_DEF));S.hrPar={...HR_PAR};
  S.staff=[
    {id:'P01',nom:'F. Rabe',fct:'Préparateur',equipe:'Équipe A',site:'S1',userId:'U05',f:1.12},{id:'P02',nom:'E. Rafidy',fct:'Préparateur',equipe:'Équipe A',site:'S1',userId:'U15',f:.92},
    {id:'P03',nom:'N. Andry',fct:'Préparateur',equipe:'Équipe B',site:'S1',f:1.0},{id:'P04',nom:'C. Hanta',fct:'Préparateur',equipe:'Équipe B',site:'S1',f:1.21},
    {id:'P05',nom:'D. Tiana',fct:'Préparateur',equipe:'Équipe A',site:'S1',f:.78},{id:'P06',nom:'L. Razafy',fct:'Contrôleur – emballeur',equipe:'Équipe A',site:'S1',userId:'U06',f:1.0},
    {id:'P07',nom:'R. Mamy',fct:'Contrôleur – emballeur',equipe:'Équipe B',site:'S1',f:.95},{id:'P08',nom:'J. Randria',fct:'Cariste – magasinier',equipe:'Équipe A',site:'S1',userId:'U04',f:1.05},
    {id:'P09',nom:'Y. Lova',fct:'Cariste – magasinier',equipe:'Équipe B',site:'S1',f:.9},{id:'P10',nom:'H. Rakoto',fct:'Réceptionnaire',equipe:'Équipe A',site:'S1',userId:'U01',f:1.0},
    {id:'P11',nom:'P. Rakotobe',fct:'Chauffeur',equipe:'Transport',site:'S1',userId:'U10',f:1.0},{id:'P12',nom:'T. Andriana',fct:'Chef d’équipe',equipe:'Encadrement',site:'S1',userId:'U03',f:1.0}
  ];
  S.tasks=[];S.pointages=[];
  const days=[];let d=addD(today(),-1);while(days.length<10){if(isWork(d))days.unshift(new Date(d));d=addD(d,-1)}
  const at=(day,h,m)=>{const x=new Date(day);x.setHours(h,m,0,0);return x.getTime()};
  days.forEach((day,di)=>S.staff.forEach(st=>{
    if(R()<.06&&st.fct!=='Chef d’équipe')return; /* absence */
    const late=R()<(st.f<.85?.35:.1);const arr=at(day,7,(late?32:5)+Math.floor(R()*20));const dep=at(day,15,40+Math.floor(R()*45));
    S.pointages.push({id:uid('PT'),staff:st.id,date:iso(day),arr,dep});
    const T=S.targets[st.fct];if(!T||!T.cmd||st.fct==='Chauffeur')return;
    let t=arr+15*6e4;const n=Math.max(1,Math.round(T.cmd*st.f*(.85+R()*.3)));
    for(let k=0;k<n;k++){
      const type=st.fct==='Préparateur'?'Préparation':st.fct==='Contrôleur – emballeur'?'Contrôle':st.fct==='Réceptionnaire'?'Réception':(R()<.7?'Rangement':'Comptage');
      const lignes=st.fct==='Cariste – magasinier'?1+Math.floor(R()*2):Math.max(2,Math.round((T.lignes/T.cmd)*(.6+R()*.8)));
      const colis=T.colis?Math.max(1,Math.round((T.colis/T.cmd)*(.5+R())*(.9+st.f*.1))):0;
      const dur=Math.max(4,(T.dureeCmd||20)*(.7+R()*.6)/st.f)*6e4;
      if(t+dur>dep-10*6e4)break;
      const err=type==='Préparation'&&R()<(st.f<.85?.22:.07)?1:0;
      S.tasks.push({id:uid('TK'),staff:st.id,type,ref:(type==='Préparation'||type==='Contrôle')?'CMD-H'+String(di*40+k+1).padStart(4,'0'):type==='Réception'?'REC-H'+(di*10+k):'Tâche '+(k+1),start:t,end:t+dur,colis,lignes,err,statut:'Terminée',source:'Historique de démonstration'});
      t+=dur+(4+R()*10)*6e4;if(k===2)t+=20*6e4;
    }
  }));
}
const staffOfUser=uidv=>S.staff.find(s=>s.userId===uidv);
const staffNom=id=>S.staff.find(s=>s.id===id)?.nom||id;
const minutes=ms=>ms/6e4;
const hm=ts=>{if(!ts)return '—';const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const dur=ms=>{if(ms==null||ms<0)return '—';const m=Math.round(ms/6e4);return m>=60?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'):m+' min'};
/* Démarrage et fin de tâche, appelés aussi par la préparation, le contrôle et le rangement */
function taskStart(staffId,type,ref,extra={}){let t=S.tasks.find(x=>x.staff===staffId&&x.ref===ref&&x.type===type&&x.statut==='En cours');if(t)return t;
  t={id:uid('TK'),staff:staffId,type,ref,start:Date.now(),end:null,colis:0,lignes:0,err:0,statut:'En cours',...extra};S.tasks.push(t);
  if(!S.pointages.find(p=>p.staff===staffId&&p.date===iso(today())))S.pointages.push({id:uid('PT'),staff:staffId,date:iso(today()),arr:Date.now(),dep:null,auto:true});return t}
function taskEnd(t,data={}){if(!t||t.statut==='Terminée')return;Object.assign(t,data);t.end=Date.now();t.statut='Terminée'}

/* Agrégats de performance sur une période */
function perfStats(from,to){const T=S.targets;return S.staff.map(st=>{
  const pts=S.pointages.filter(p=>p.staff===st.id&&p.date>=iso(from)&&p.date<=iso(to));
  const tks=S.tasks.filter(t=>t.staff===st.id&&t.statut==='Terminée'&&t.start>=from.getTime()&&t.start<addD(to,1).getTime());
  const jours=pts.length;const pres=sum(pts,p=>(p.dep||Date.now())-p.arr)-jours*S.hrPar.pause*6e4;const prod=sum(tks,t=>t.end-t.start);
  const main=st.fct==='Préparateur'?'Préparation':st.fct==='Contrôleur – emballeur'?'Contrôle':null;
  const cmd=tks.filter(t=>!main||t.type===main).length;const colis=sum(tks,t=>t.colis);const lignes=sum(tks,t=>t.lignes);const err=sum(tks,t=>t.err||0);
  const tg=T[st.fct]||{};const durMoy=cmd?sum(tks.filter(t=>!main||t.type===main),t=>t.end-t.start)/cmd:null;
  const base=tg.colis?colis/(tg.colis*Math.max(1,jours)):tg.cmd?cmd/(tg.cmd*Math.max(1,jours)):null;
  const debut=S.hrPar.debut.split(':').map(Number);const ponct=jours?pts.filter(p=>{const d=new Date(p.arr);return d.getHours()*60+d.getMinutes()<=debut[0]*60+debut[1]}).length/jours:null;
  const tErr=lignes?err/lignes:0;
  const score=base==null?null:Math.round(50*Math.min(1,base)+30*Math.max(0,1-tErr/.02)+20*(ponct??0));
  return {st,jours,pres,prod,occ:pres>0?prod/pres:0,cmd,colis,lignes,err,tErr,durMoy,colisH:prod>0?colis/(prod/36e5):0,atteinte:base,ponct,score,tg}})}

let hrTab='jour',hrPer=7;
VIEWS.rh=()=>{ensureHR();const chef=can('rh');const mine=staffOfUser(me().id);
  const tabs=[['jour','Aujourd’hui'],['taches','Tâches'],['perf','Performance et classement'],['cmd','Temps prise → fin de commande'],['cibles','Cibles journalières'],['badges','Badges et pointage']];
  return ph('Ressources humaines de l’entrepôt','Pointage d’arrivée et de départ, tâches horodatées (début et fin), cibles journalières par fonction, temps de préparation par commande et indicateurs individuels. Les données servent au pilotage de la charge et à l’accompagnement des équipes.',
   `${mine?`<button class="btn p" data-x="hrPoint" data-a="${mine.id}">Pointer (${esc(mine.nom)})</button>`:''}${chef?'<button class="btn" data-x="hrXls">Exporter (Excel)</button>':''}`)+
  `<div class="note small">Données nominatives : accès complet réservé au chef d’entrepôt (Direction Stock) ; chaque agent voit ses propres résultats. Avant usage réel : information du personnel et des délégués, règles validées par la Direction et les RH, conformité au Code du travail et à la loi malgache sur la protection des données personnelles (à vérifier avec le juriste de SALAMA). Historique affiché : données fictives de démonstration.</div>
  <div class="tabs">${tabs.map(([k,l])=>`<button class="${hrTab===k?'on':''}" data-x="hrTab" data-a="${k}">${l}</button>`).join('')}</div>`+(HRV[hrTab]||HRV.jour)(chef,mine)};
const HRV={};
HRV.jour=(chef,mine)=>{const d0=today();const P=perfStats(d0,d0);const rows=P.filter(p=>chef||p.st.id===mine?.id).filter(p=>p.st.fct!=='Chef d’équipe');
  const present=S.pointages.filter(p=>p.date===iso(d0)).length;const enCours=S.tasks.filter(t=>t.statut==='En cours');
  return `<div class="kpis"><div class="kpi k-info"><b>${present} / ${S.staff.length}</b><span>agents pointés aujourd’hui</span></div><div class="kpi k-warn"><b>${enCours.length}</b><span>tâches en cours</span></div><div class="kpi k-ok"><b>${fmt(sum(rows,p=>p.colis))}</b><span>colis préparés aujourd’hui</span></div><div class="kpi k-ok"><b>${fmt(sum(rows.filter(p=>p.st.fct==='Préparateur'),p=>p.cmd))}</b><span>commandes préparées aujourd’hui</span></div></div>`+
  table([{t:'Agent',f:p=>`<b>${esc(p.st.nom)}</b><br><span class="small muted">${esc(p.st.fct)} · ${esc(p.st.equipe)}</span>`},{t:'Arrivée',f:p=>{const pt=S.pointages.find(x=>x.staff===p.st.id&&x.date===iso(d0));return pt?hm(pt.arr):pill('Non pointé','neu')}},{t:'Départ',f:p=>hm(S.pointages.find(x=>x.staff===p.st.id&&x.date===iso(d0))?.dep)},{t:'Tâche en cours',f:p=>{const t=enCours.find(x=>x.staff===p.st.id);return t?`${pill(t.type,'warn')} ${esc(t.ref)}<br><span class="small muted">depuis ${hm(t.start)} (${dur(Date.now()-t.start)})</span>`:'—'}},{t:'Commandes / cible',f:p=>`${fmt(p.cmd)} / ${fmt(p.tg.cmd||0)}`},{t:'Colis / cible',f:p=>p.tg.colis?`${bar(p.colis/p.tg.colis,p.colis>=p.tg.colis?'var(--green)':'var(--orange)')}<span class="small">${fmt(p.colis)} / ${fmt(p.tg.colis)}</span>`:'—'},{t:'Temps moyen / commande',f:p=>dur(p.durMoy)}],rows,{empty:'Aucun agent.'});};
HRV.taches=(chef,mine)=>{const list=S.tasks.filter(t=>chef||t.staff===mine?.id).slice().sort((a,b)=>b.start-a.start).slice(0,150);
  return `<div class="row"><button class="btn p" data-x="hrTaskNew">Nouvelle tâche</button><span class="small muted">Les tâches de préparation, de contrôle et de rangement sont aussi créées automatiquement par les écrans opérationnels (prise de la commande, dernier prélèvement, contrôle).</span></div>`+
  table([{t:'Agent',f:t=>esc(staffNom(t.staff))},{t:'Type',f:t=>pill(t.type,'info')},{t:'Référence',f:t=>`<span class="mono small">${esc(t.ref)}</span>`},{t:'Date',f:t=>fr(t.start)},{t:'Début',f:t=>hm(t.start)},{t:'Fin',f:t=>hm(t.end)},{t:'Durée',f:t=>dur((t.end||Date.now())-t.start)},{t:'Lignes',r:1,f:t=>fmt(t.lignes)},{t:'Colis',r:1,f:t=>fmt(t.colis)},{t:'Erreurs',r:1,f:t=>t.err?pill(t.err,'bad'):'0'},{t:'',f:t=>t.statut==='En cours'?`<button class="btn s o" data-x="hrTaskEnd" data-a="${t.id}">Terminer</button>`:pill('Terminée','ok')}],list,{max:620,empty:'Aucune tâche.'})};
HRV.perf=(chef,mine)=>{const to=today(),from=addD(to,-(hrPer-1));const P=perfStats(from,to).filter(p=>p.score!=null&&(chef||p.st.id===mine?.id)).sort((a,b)=>b.score-a.score);
  const preps=P.filter(p=>p.st.fct==='Préparateur');const mx=Math.max(1,...preps.map(p=>p.colis));
  return `<div class="row"><label class="fl">Période<select id="hrPer">${opt([[1,'Aujourd’hui'],[7,'7 derniers jours'],[14,'14 derniers jours'],[30,'30 derniers jours']],hrPer)}</select></label><span class="small muted">Score sur 100 : productivité par rapport à la cible (50), qualité – taux d’erreur au contrôle, 0 point à 2 % (30), ponctualité – arrivée avant ${S.hrPar.debut} (20).</span></div>`+
  (chef&&preps.length?`<div class="card"><h2>Colis préparés par préparateur (${fr(from)} – ${fr(to)})</h2>${preps.map(p=>`<div class="row" style="margin:4px 0"><span style="width:120px">${esc(p.st.nom)}</span><div class="bar" style="flex:1;height:14px"><i style="width:${p.colis/mx*100}%;background:${(p.atteinte||0)>=1?'var(--green)':(p.atteinte||0)>=.85?'var(--orange)':'var(--red)'}"></i></div><span class="small" style="width:170px">${fmt(p.colis)} colis · ${pct(p.atteinte||0)} de la cible</span></div>`).join('')}</div>`:'')+
  table([{t:'Rang',r:1,f:p=>P.indexOf(p)+1},{t:'Agent',f:p=>`<b>${esc(p.st.nom)}</b><br><span class="small muted">${esc(p.st.fct)}</span>`},{t:'Jours',r:1,k:'jours'},{t:'Heures présentes',r:1,f:p=>fmt(p.pres/36e5,1)},{t:'Heures productives',r:1,f:p=>fmt(p.prod/36e5,1)},{t:'Occupation',r:1,f:p=>pct(p.occ)},{t:'Commandes',r:1,f:p=>fmt(p.cmd)},{t:'Colis',r:1,f:p=>fmt(p.colis)},{t:'Lignes',r:1,f:p=>fmt(p.lignes)},{t:'Colis / h',r:1,f:p=>fmt(p.colisH,1)},{t:'Temps moyen / commande',r:1,f:p=>dur(p.durMoy)},{t:'Cible atteinte',r:1,f:p=>pill(pct(p.atteinte||0),(p.atteinte||0)>=1?'ok':(p.atteinte||0)>=.85?'warn':'bad')},{t:'Taux d’erreur',r:1,f:p=>pct(p.tErr,1)},{t:'Ponctualité',r:1,f:p=>pct(p.ponct||0)},{t:'Score',r:1,f:p=>pill(p.score+' / 100',p.score>=80?'ok':p.score>=60?'warn':'bad')}],P,{empty:'Aucune donnée sur la période.'})+
  `<p class="small muted">Lecture : un écart de productivité s’analyse avec la nature des commandes (lignes, vrac, froid), les ruptures et l’affectation des tâches avant toute conclusion individuelle.</p>`};
HRV.cmd=(chef,mine)=>{const list=S.tasks.filter(t=>t.type==='Préparation'&&(chef||t.staff===mine?.id)).slice().sort((a,b)=>b.start-a.start).slice(0,120);const tg=S.targets['Préparateur'].dureeCmd;
  return `<p class="small muted">Indicateur : temps entre la prise de la commande par le préparateur (début) et le dernier prélèvement (fin). Cible actuelle : ${tg} min par commande. Les commandes du plan 2027 préparées dans le module Préparation alimentent ce tableau automatiquement.</p>`+
  table([{t:'Commande',f:t=>`<span class="mono">${esc(t.ref)}</span>`},{t:'Préparateur',f:t=>esc(staffNom(t.staff))},{t:'Date',f:t=>fr(t.start)},{t:'Prise',f:t=>hm(t.start)},{t:'Fin',f:t=>hm(t.end)},{t:'Durée',f:t=>t.end?pill(dur(t.end-t.start),minutes(t.end-t.start)<=tg?'ok':minutes(t.end-t.start)<=tg*1.3?'warn':'bad'):pill('En cours','warn')},{t:'Lignes',r:1,f:t=>fmt(t.lignes)},{t:'Colis',r:1,f:t=>fmt(t.colis)},{t:'Min / colis',r:1,f:t=>t.end&&t.colis?fmt(minutes(t.end-t.start)/t.colis,1):'—'}],list,{max:620,empty:'Aucune commande préparée.'})};
HRV.cibles=(chef)=>`<p class="small muted">Cibles par agent et par journée de ${S.hrPar.debut} à ${S.hrPar.fin} (pause ${S.hrPar.pause} min). Valeurs initiales indicatives : à recalibrer après 4 semaines de mesures réelles (baseline), puis à valider par la Direction.</p>`+
  table([{t:'Fonction',f:([k])=>`<b>${esc(k)}</b>`},{t:'Commandes / tâches par jour',f:([k,v])=>chef?`<input type="number" id="tg_cmd_${FONCTIONS.indexOf(k)}" value="${v.cmd}" style="width:90px">`:v.cmd},{t:'Colis par jour',f:([k,v])=>chef?`<input type="number" id="tg_colis_${FONCTIONS.indexOf(k)}" value="${v.colis}" style="width:90px">`:v.colis},{t:'Lignes par jour',f:([k,v])=>chef?`<input type="number" id="tg_lignes_${FONCTIONS.indexOf(k)}" value="${v.lignes}" style="width:90px">`:v.lignes},{t:'Durée cible par commande (min)',f:([k,v])=>chef?`<input type="number" id="tg_dureeCmd_${FONCTIONS.indexOf(k)}" value="${v.dureeCmd}" style="width:90px">`:v.dureeCmd}],Object.entries(S.targets))+
  (chef?`<div class="fx" style="margin-top:10px"><label>Heure officielle de début<input id="hpD" type="time" value="${S.hrPar.debut}"></label><label>Heure de fin<input id="hpF" type="time" value="${S.hrPar.fin}"></label><label>Pause (min)<input id="hpP" type="number" value="${S.hrPar.pause}"></label></div><div class="row" style="margin-top:10px"><button class="btn p" data-x="hrTgSave">Enregistrer les cibles</button></div>`:'');
HRV.badges=(chef)=>`<div class="row"><button class="btn" data-x="hrBadges">Imprimer les badges QR (PDF)</button><span class="small muted">Scanner le badge à l’entrée ou à la sortie pointe l’agent (arrivée puis départ). Le pointage manuel par le chef d’équipe reste possible.</span></div><div class="labels">${S.staff.map(s=>{const pt=S.pointages.find(p=>p.staff===s.id&&p.date===iso(today()));return `<div class="lab">${qrSVG('STAFF|'+s.id+'|'+s.nom)}<div><b>${esc(s.nom)}</b><br><span class="small muted">${esc(s.fct)} · ${s.id}<br>${pt?'Arrivée '+hm(pt.arr)+(pt.dep?' · départ '+hm(pt.dep):''):'Non pointé'}</span><br>${chef?`<button class="btn s" data-x="hrPoint" data-a="${s.id}">Pointer</button>`:''}</div></div>`}).join('')}</div>`;
BIND.rh=()=>{const s=$('#hrPer');if(s)s.onchange=e=>{hrPer=+e.target.value;refresh()}};
ACT.hrTab=k=>{hrTab=k;refresh()};
ACT.hrPoint=id=>{ensureHR();const st=S.staff.find(x=>x.id===id);if(!st)return toast('Badge inconnu.',true);const mine=staffOfUser(me().id);
  if(!can('rh')&&mine?.id!==id)return toast('Vous ne pouvez pointer que pour vous-même.',true);
  let p=S.pointages.find(x=>x.staff===id&&x.date===iso(today()));
  if(!p){p={id:uid('PT'),staff:id,date:iso(today()),arr:Date.now(),dep:null};S.pointages.push(p);toast('Arrivée de '+st.nom+' à '+hm(p.arr))}
  else if(!p.dep){const open=S.tasks.find(t=>t.staff===id&&t.statut==='En cours');if(open)return toast(st.nom+' a une tâche en cours ('+open.type+' '+open.ref+') : terminez-la avant le départ.',true);p.dep=Date.now();toast('Départ de '+st.nom+' à '+hm(p.dep))}
  else return toast(st.nom+' a déjà pointé l’arrivée et le départ aujourd’hui.',true);
  audit('Pointage',st.nom,p.dep?'Départ':'Arrivée');refresh()};
ACT.hrTaskNew=()=>{if(!can('rh'))return deny('rh');
  modal('Nouvelle tâche',`<div class="fx"><label>Agent<select id="tkS">${S.staff.map(s=>`<option value="${s.id}">${esc(s.nom)} – ${esc(s.fct)}</option>`).join('')}</select></label><label>Type<select id="tkT">${opt(Object.keys(TASK_TYPES))}</select></label><label>Référence (commande, zone, mission)<input id="tkR" placeholder="CMD-00012"></label><label>Démarrer<select id="tkG"><option value="1">Maintenant</option><option value="0">Plus tard (planifiée)</option></select></label></div>`,`<button class="btn p" data-x="hrTaskSave">Créer</button>`)};
ACT.hrTaskSave=()=>{const st=$('#tkS').value,type=$('#tkT').value,ref=$('#tkR').value.trim()||type;const busy=S.tasks.find(t=>t.staff===st&&t.statut==='En cours');
  if(busy&&$('#tkG').value==='1')return toast(staffNom(st)+' a déjà une tâche en cours : '+busy.type+' '+busy.ref+'.',true);
  if($('#tkG').value==='1')taskStart(st,type,ref,{by:me().nom});else S.tasks.push({id:uid('TK'),staff:st,type,ref,start:null,end:null,colis:0,lignes:0,err:0,statut:'Planifiée',by:me().nom});
  audit('Tâche',ref,type+' – '+staffNom(st));closeModal();refresh()};
ACT.hrTaskEnd=id=>{const t=S.tasks.find(x=>x.id===id);const mine=staffOfUser(me().id);if(!can('rh')&&mine?.id!==t.staff)return toast('Seul l’agent ou le chef peut terminer cette tâche.',true);
  modal('Terminer la tâche '+t.type+' '+t.ref,`<div class="fx"><label>Lignes traitées<input id="teL" type="number" value="${t.lignes||0}"></label><label>Colis<input id="teC" type="number" value="${t.colis||0}"></label></div>`,`<button class="btn p" data-x="hrTaskEndOk" data-a="${id}">Terminer</button>`)};
ACT.hrTaskEndOk=id=>{const t=S.tasks.find(x=>x.id===id);taskEnd(t,{lignes:+$('#teL').value,colis:+$('#teC').value});audit('Tâche',t.ref,'Terminée en '+dur(t.end-t.start));closeModal();refresh()};
ACT.hrTgSave=()=>{FONCTIONS.forEach((k,i)=>{['cmd','colis','lignes','dureeCmd'].forEach(f=>{const el=$(`#tg_${f}_${i}`);if(el)S.targets[k][f]=+el.value||0})});S.hrPar.debut=$('#hpD').value;S.hrPar.fin=$('#hpF').value;S.hrPar.pause=+$('#hpP').value;audit('Cibles RH','Paramètres','Cibles journalières mises à jour');toast('Cibles enregistrées.');refresh()};
ACT.hrBadges=()=>{const d=pdfDoc('Badges de pointage – entrepôts SALAMA','QR à scanner à l’arrivée et au départ');let x=12,y=36;
  S.staff.forEach((s,i)=>{if(y>250){d.addPage();y=20}d.setDrawColor(22,152,77);d.rect(x,y,88,40);try{d.addImage(LOGO_S,'PNG',x+3,y+3,22,13)}catch(e){}const q=qrDataURL('STAFF|'+s.id+'|'+s.nom,3);if(q)d.addImage(q,'PNG',x+56,y+5,30,30);
    d.setFont('helvetica','bold');d.setFontSize(11);d.setTextColor(19,48,74);d.text(s.nom,x+4,y+24);d.setFont('helvetica','normal');d.setFontSize(8);d.setTextColor(80);d.text(s.fct+' · '+s.equipe,x+4,y+30);d.text('Matricule '+s.id,x+4,y+35);
    if(i%2===0)x=108;else{x=12;y+=46}});d.__foot();saveFile('Badges_pointage_SALAMA.pdf',d.output('arraybuffer'),'application/pdf')};
ACT.hrXls=()=>{const P=perfStats(addD(today(),-(hrPer-1)),today());xlsxExport('SALAMA_WMS_RH_'+iso(today()),[['Performance',P.map(p=>({Agent:p.st.nom,Fonction:p.st.fct,Équipe:p.st.equipe,Jours:p.jours,'Heures présentes':+(p.pres/36e5).toFixed(1),'Heures productives':+(p.prod/36e5).toFixed(1),Commandes:p.cmd,Colis:p.colis,Lignes:p.lignes,'Colis/h':+p.colisH.toFixed(1),'Temps moyen/commande (min)':p.durMoy?+(p.durMoy/6e4).toFixed(0):'','Cible atteinte':p.atteinte==null?'':+p.atteinte.toFixed(2),'Taux erreur':+p.tErr.toFixed(3),Ponctualité:p.ponct==null?'':+p.ponct.toFixed(2),Score:p.score??''}))],['Tâches',S.tasks.map(t=>({Agent:staffNom(t.staff),Type:t.type,Référence:t.ref,Début:t.start?frt(t.start):'',Fin:t.end?frt(t.end):'','Durée (min)':t.end?Math.round((t.end-t.start)/6e4):'',Lignes:t.lignes,Colis:t.colis,Erreurs:t.err}))],['Pointages',S.pointages.map(p=>({Agent:staffNom(p.staff),Date:p.date,Arrivée:hm(p.arr),Départ:hm(p.dep)}))]])};
