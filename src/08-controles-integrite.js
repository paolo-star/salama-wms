/*
 * SALAMA WMS – Contrôles d'intégrité : réservations, lots indisponibles, file X3 idempotente, alertes, chaîne du froid, recette
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS v1.2 – suites de l'évaluation : intégrité transactionnelle, blocage des lots en cours, mode dégradé,
   chaîne du froid, alertes regroupées et registre d'actions, recette pilote ============ */
function ensureExt(){S.actions=S.actions||[];S.excursions=S.excursions||[];S.recette=S.recette||{};S.syncLog=S.syncLog||[];
  if(!S.temps){S.temps={};const R=rnd(818);SENSORS.forEach(s=>{const arr=[];for(let h=47;h>=0;h--)arr.push({ts:Date.now()-h*36e5,v:+(s.base+(R()-.5)*1.6).toFixed(1)});S.temps[s.id]=arr})}}
const SENSORS=[{id:'TS-S1-F01',lib:'Chambre froide SALAMA 1 – allée F01',prefix:'S1-F-A01',base:5},{id:'TS-S1-F02',lib:'Chambre froide SALAMA 1 – allée F02',prefix:'S1-F-A02',base:4.6}];

/* ---------- Réservations : un stock déjà alloué à une vague ouverte n'est plus disponible ---------- */
function reservedQty(sid){return sum(S.waves.filter(w=>w.statut==='En cours').flatMap(w=>w.lignes.filter(l=>!l.done&&!l.annule&&l.sid===sid)),l=>l.qty)}
function dispo(art,site){return sum(fefoLots(art,site),s=>Math.max(0,s.qty-reservedQty(s.id)))}

/* ---------- Un lot qui devient indisponible l'est aussi pour les commandes réservées, en préparation et emballées ---------- */
function lotUnavailable(lotId,motif){const lt=lotOf(lotId);let realloc=0,ral=0,colisB=0;
  S.waves.filter(w=>w.statut==='En cours').forEach(w=>{w.lignes.filter(l=>l.lotId===lotId&&!l.done&&!l.annule).forEach(l=>{l.annule=true;l.motifAnnul=motif;
    let need=l.qty;fefoLots(l.art,'S1').filter(s=>s.lotId!==lotId).forEach(s=>{if(need<=0)return;const av=s.qty-reservedQty(s.id);if(av<=0)return;const q=Math.min(need,av);
      w.lignes.push({sid:s.id,loc:s.loc,lotId:s.lotId,art:l.art,order:l.order,qty:q,mode:l.mode,seq:Math.max(...w.lignes.map(x=>x.seq))+1,realloc:true});need-=q;realloc++});
    if(need>0){S.ral.push({id:uid('RAL'),order:l.order,art:l.art,qty:need,motif:'Lot '+lt.lot+' indisponible ('+motif+')',statut:'Ouvert',ts:Date.now()});ral++}});
    if(w.lignes.filter(l=>!l.annule).every(l=>l.done)){w.statut='Préparée';w.prepTs=Date.now()}});
  S.colis.filter(c=>['Emballé','Chargé'].includes(c.statut)&&c.contenu.some(x=>x.lotId===lotId)&&S.missions.find(m=>m.id===c.mission)?.statut!=='En transit').forEach(c=>{c.statutAvant=c.statut;c.statut='Bloqué';c.motifBlocage='Lot '+lt.lot+' : '+motif;colisB++});
  const transit=S.colis.filter(c=>c.contenu.some(x=>x.lotId===lotId)&&['Chargé','Livré'].includes(c.statut)&&S.missions.find(m=>m.id===c.mission)?.statut!=='Réservée J-20').length;
  audit('Blocage lot',lt.lot,`${motif} · ${realloc} réallocation(s) FEFO, ${ral} reste(s) à livrer, ${colisB} colis bloqué(s), ${transit} colis déjà expédié(s) ou livré(s) à rappeler`);
  if(realloc||ral||colisB||transit)toast(`Lot ${lt.lot} : ${realloc} prélèvement(s) réalloué(s), ${ral} reste(s) à livrer, ${colisB} colis bloqué(s) avant départ${transit?', '+transit+' colis déjà partis (voir Rappels)':''}.`);
  return {realloc,ral,colisB,transit}}
ACT.colisRetirer=sscc=>{if(!(can('pack')||can('qa')))return deny('pack');const c=S.colis.find(x=>x.sscc===sscc);
  c.contenu.forEach(x=>{const st=lotOf(x.lotId).statut;const site='S1';S.stock.push({id:uid('ST'),lotId:x.lotId,loc:site+(st==='Destruction autorisée'?'-DEST-01':'-NC-01'),qty:x.qty,sscc:c.sscc,retour:true});
    if(lotOf(x.lotId).statut!=='Libéré')S.ral.push({id:uid('RAL'),order:c.order,art:x.art,qty:x.qty,motif:'Colis retiré : '+c.motifBlocage,statut:'Ouvert',ts:Date.now()})});
  c.statut='Retiré';audit('Colis retiré',sscc,c.motifBlocage+' – contenu replacé en zone non conforme, reste à livrer créé');x3('Correction de mouvement','Retour en stock non conforme',sscc,{motif:c.motifBlocage});refresh()};

/* ---------- Interface X3 : idempotence, file d'attente, mode dégradé ---------- */
function x3(flux,objet,ref,payload){const key=flux+'|'+ref+'|'+JSON.stringify(payload||{}).length;const queued=S.x3down||S.offline;
  const m={id:uid('X3'),key,ts:Date.now(),flux,objet,ref,payload:payload||{},statut:queued?'En file':'Accusé',essais:queued?0:1,err:'',horsLigne:!!S.offline};S.x3msg.unshift(m);return m}
function syncQueue(){let n=0,d=0;const done=new Set(S.x3msg.filter(m=>m.statut==='Accusé').map(m=>m.key));
  S.x3msg.slice().reverse().forEach(m=>{if(m.statut!=='En file')return;if(done.has(m.key)){m.statut='Doublon ignoré';d++}else{m.statut='Accusé';m.essais++;m.syncTs=Date.now();done.add(m.key);n++}});
  S.pods.filter(p=>p.horsLigne&&!p.syncTs).forEach(p=>p.syncTs=Date.now());S.syncLog.unshift({ts:Date.now(),n,d});return {n,d}}
ACT.offToggle=()=>{S.offline=!S.offline;if(!S.offline&&!S.x3down){const r=syncQueue();audit('Mode dégradé','Réseau','Réseau rétabli : '+r.n+' opération(s) synchronisée(s), '+r.d+' doublon(s) ignoré(s)');toast('Réseau rétabli : '+r.n+' opération(s) synchronisée(s) une seule fois, '+r.d+' doublon(s) ignoré(s).')}
  else audit('Mode dégradé','Réseau','Activé : opérations conservées localement, file X3 en attente');refresh()};
ACT.x3Toggle=()=>{if(!need('admin'))return;S.x3down=!S.x3down;if(!S.x3down&&!S.offline){const r=syncQueue();toast(r.n+' message(s) transmis, '+r.d+' doublon(s) ignoré(s).')}audit('Interface X3','Connexion',S.x3down?'Indisponibilité simulée':'Rétablie');refresh()};
ACT.x3Replay=()=>{if(!(can('x3')||can('admin')))return deny('x3');if(S.x3down||S.offline)return toast('Connexion indisponible : la file est conservée.',true);const r=syncQueue();audit('Interface X3','File',r.n+' rejoué(s), '+r.d+' doublon(s) ignoré(s)');toast(r.n+' message(s) rejoué(s), '+r.d+' doublon(s) ignoré(s).');refresh()};
ACT.x3Dup=()=>{const m=S.x3msg.find(x=>x.statut==='Accusé');if(!m)return;S.x3msg.unshift({...m,id:uid('X3'),ts:Date.now(),statut:'En file',essais:0,test:'Double envoi simulé'});if(!S.x3down&&!S.offline)syncQueue();toast('Double envoi simulé : le second message est reconnu et ignoré.');refresh()};

/* ---------- Alertes regroupées par lot + registre d'actions ---------- */
function alertList(){const A=[];const t=today();const g={};
  S.stock.forEach(s=>{const lt=lotOf(s.lotId);const L=LOC[s.loc];if(!lt||!L||s.qty<=0||!STORAGE_Z.includes(L.zone))return;(g[lt.id]=g[lt.id]||{lt,lignes:[]}).lignes.push(s)});
  Object.values(g).forEach(({lt,lignes})=>{const m=monthsLeft(lt.exp);const q=sum(lignes,s=>s.qty);const det=lignes.map(s=>s.loc+' : '+fmt(s.qty)).join(' · ');const a=ART[lt.art];const val=q*(a?.prix||0);
    if(m<=0)A.push({key:'PER0|'+lt.id,niv:'bad',cat:'Péremption',txt:`Lot périmé ${lt.lot} (${a?.des}) : ${fmt(q)} UD encore en stockage`,det,val,go:'stock'});
    else if(m<=3&&lt.statut==='Libéré')A.push({key:'PER3|'+lt.id,niv:'bad',cat:'Péremption ≤ 3 mois',txt:`${a?.des} – lot ${lt.lot} – ${fmt(q)} UD (${fmt(val/1e6,1)} M MGA) : redistribuer, retourner ou proposer à la destruction`,det,val,go:'stock'});
    else if(m<=6&&lt.statut==='Libéré')A.push({key:'PER6|'+lt.id,niv:'warn',cat:'Péremption ≤ 6 mois',txt:`${a?.des} – lot ${lt.lot} – ${fmt(q)} UD : prioriser en FEFO`,det,val,go:'stock'})});
  S.lots.filter(l=>l.statut==='Quarantaine').forEach(l=>A.push({key:'QUA|'+l.id,niv:'warn',cat:'Quarantaine',txt:`Lot ${l.lot} (${ART[l.art]?.des}) en attente de décision pharmaceutique${l.motif?' – '+l.motif:''}`,go:'qualite'}));
  S.excursions.filter(e=>e.statut==='Ouverte').forEach(e=>A.push({key:'EXC|'+e.id,niv:'bad',cat:'Chaîne du froid',txt:`${e.id} – ${e.lieu} : ${fmt(e.max,1)} °C pendant ${dur(e.duree)} · ${e.lots.length} lot(s) en quarantaine`,go:'froid'}));
  const pt=putawayTasks();if(pt.length)A.push({key:'PUT',niv:'warn',cat:'Rangement',txt:`${pt.length} palette(s) libérée(s) encore en quarantaine : à ranger`,det:pt.map(s=>s.loc+' '+(s.sscc||'')).join(' · '),go:'rangement'});
  S.missions.filter(m=>m.statut==='Réservée J-20'&&!m.stopgo).forEach(m=>{const d=jalon(m.depart||jalonDep(m.cycle),15);A.push({key:'SG|'+m.id,niv:t>=d?'bad':'info',cat:'Stop / go J-15',txt:`${m.id} – ${m.sp} : décision attendue le ${fr(d)}`,go:'plan'})});
  S.missions.filter(m=>m.statut==='En transit').forEach(m=>{const lim=addD(m.depart,7);if(t>lim)A.push({key:'POD|'+m.id,niv:'bad',cat:'POD',txt:`${m.id} – POD non reçue à J+7 (départ ${fr(m.depart)})`,go:'pod'})});
  S.colis.filter(c=>c.statut==='Bloqué').forEach(c=>A.push({key:'COL|'+c.sscc,niv:'bad',cat:'Colis bloqué',txt:`${c.sscc} (${c.order}) : ${c.motifBlocage} – à retirer avant départ`,go:'expedition'}));
  S.orders.filter(o=>o.statut==='Soumise').forEach(o=>A.push({key:'VAL|'+o.no,niv:'warn',cat:'Validation',txt:`${o.no} (${o.destNom}) attend la validation DVM / DAS`,go:'commandes'}));
  const q=S.x3msg.filter(m=>m.statut==='En file'||m.statut==='Rejeté');if(q.length)A.push({key:'X3Q',niv:'bad',cat:'Interface X3',txt:`${q.length} message(s) X3 en attente de transmission`,go:'x3'});
  REF.sites.forEach(s=>{const r=s.occRef/s.cap;if(r>.85)A.push({key:'CAP|'+s.code,niv:r>1?'bad':'warn',cat:'Capacité',txt:`${s.nom} : occupation de référence ${pct(r,1)} (seuil 85 %)`,go:'espace'})});
  S.ral.filter(r=>r.statut==='Ouvert').forEach(r=>A.push({key:'RAL|'+r.id,niv:'warn',cat:'Reste à livrer',txt:`${r.order} – ${ART[r.art]?.des} : ${fmt(r.qty)} UD (${r.motif})`,go:'pod'}));
  return A}
VIEWS.alertes=()=>{const A=alertList();const g=by(A,'cat');
  return ph('Alertes et actions','Une alerte par lot (quantité totale et détail par emplacement), puis une action suivie jusqu’à sa clôture : responsable, échéance, décision et preuve.',`<button class="btn" data-x="xlsAlerts">Exporter (Excel)</button><a class="btn" href="#actions">Registre des actions</a>`)+
  Object.entries(g).map(([k,v])=>`<div class="card"><h2>${esc(k)} <span class="pill neu">${v.length}</span></h2>${table([{t:'Niveau',f:a=>pill(a.niv==='bad'?'Critique':a.niv==='warn'?'Vigilance':'Information',a.niv)},{t:'Alerte',f:a=>esc(a.txt)+(a.det?`<br><span class="small muted">${esc(a.det)}</span>`:'')},{t:'Action',f:a=>{const ac=S.actions.find(x=>x.key===a.key&&x.statut!=='Clôturée');return ac?pill(ac.statut+' – '+ac.resp+' – '+fr(ac.ech),'info'):`<button class="btn s p" data-x="actNew" data-a="${esc(a.key)}">Créer une action</button>`}},{t:'',f:a=>`<a class="btn s" href="#${a.go}">Traiter</a>`}],v)}</div>`).join('')||'<div class="card">Aucune alerte.</div>'};
ACT.actNew=key=>{const a=alertList().find(x=>x.key===key);if(!a)return;
  modal('Nouvelle action',`<p>${esc(a.txt)}</p><div class="fx"><label>Responsable<select id="acR">${S.users.filter(u=>u.role!=='AUD').map(u=>`<option>${esc(u.nom+' – '+ROLES[u.role].n)}</option>`).join('')}</select></label><label>Échéance<input id="acE" type="date" value="${iso(addD(today(),a.niv==='bad'?3:10))}"></label><label>Décision / action prévue<select id="acD"><option>Redistribuer vers une agence ou un client</option><option>Retour fournisseur</option><option>Proposer à la destruction</option><option>Décision pharmaceutique</option><option>Ranger / corriger l’emplacement</option><option>Relancer le transporteur</option><option>Corriger l’interface X3</option><option>Autre</option></select></label><label style="grid-column:1/-1">Commentaire<textarea id="acC"></textarea></label></div>`,
  `<button class="btn p" data-x="actSave" data-a="${esc(key)}">Créer</button>`)};
ACT.actSave=key=>{const a=alertList().find(x=>x.key===key);const ac={id:nextNo('act','ACT-'),key,cat:a.cat,txt:a.txt,resp:$('#acR').value.split(' – ')[0],ech:$('#acE').value,decision:$('#acD').value,com:$('#acC').value,statut:'Ouverte',by:me().nom,ts:Date.now()};
  S.actions.unshift(ac);audit('Action',ac.id,ac.cat+' – '+ac.decision+' – '+ac.resp);closeModal();toast('Action '+ac.id+' créée.');refresh()};
VIEWS.actions=()=>ph('Registre des actions','Chaque action issue d’une alerte est suivie jusqu’à sa clôture, avec la preuve d’exécution (KZN-001, KZN-002).')+
  table([{t:'N°',f:a=>`<span class="mono">${a.id}</span>`},{t:'Catégorie',k:'cat'},{t:'Constat',k:'txt'},{t:'Décision',k:'decision'},{t:'Responsable',k:'resp'},{t:'Échéance',f:a=>pill(fr(a.ech),a.statut!=='Clôturée'&&new Date(a.ech)<today()?'bad':'info')},{t:'Statut',f:a=>pill(a.statut,a.statut==='Clôturée'?'ok':'warn')},{t:'Preuve',f:a=>esc(a.preuve||'')},{t:'',f:a=>a.statut==='Clôturée'?esc(a.closedBy||''):`<button class="btn s n" data-x="actClose" data-a="${a.id}">Clôturer</button>`}],S.actions,{empty:'Aucune action. Créez-en depuis l’écran Alertes et actions.'});
ACT.actClose=id=>modal('Clôturer '+id,`<label class="fl">Preuve de clôture (n° de bon de transfert, PV de destruction, décision AQ, référence X3…)<textarea id="acP"></textarea></label>`,`<button class="btn p" data-x="actCloseOk" data-a="${id}">Clôturer</button>`);
ACT.actCloseOk=id=>{const p=$('#acP').value.trim();if(!p)return toast('La preuve de clôture est obligatoire.',true);const a=S.actions.find(x=>x.id===id);a.statut='Clôturée';a.preuve=p;a.closedBy=me().nom+' – '+frt(Date.now());audit('Action',id,'Clôturée – '+p);closeModal();refresh()};

/* ---------- Chaîne du froid : relevés, excursions, décision pharmaceutique ---------- */
VIEWS.froid=()=>{const ex=S.excursions;
  return ph('Chaîne du froid','Relevés des capteurs rattachés aux emplacements 2–8 °C, alarmes, excursions liées aux lots exposés, quarantaine automatique et décision documentée du Pharmacien responsable avant toute remise en circulation (COLD-001 à COLD-006). Les excursions relevées à la livraison (POD) arrivent ici aussi.')+
  `<div class="grid g2">${SENSORS.map(s=>{const r=S.temps[s.id]||[];const last=r[r.length-1];return `<div class="card"><div class="row" style="justify-content:space-between"><h2>${esc(s.lib)}</h2>${last?pill(fmt(last.v,1)+' °C',last.v<2||last.v>8?'bad':'ok'):''}</div><p class="small muted">Capteur ${s.id} · emplacements ${s.prefix}-… · 48 dernières heures (relevés simulés)</p>
   ${svgLine([{n:'Température °C',v:r.map(x=>x.v),c:'var(--blue)'}],r.map(x=>hm(x.ts)),{refs:[{v:8,l:'8 °C',c:'var(--red)'},{v:2,l:'2 °C',c:'var(--red)'}],label:'Températures '+s.id})}
   ${can('qa')||can('admin')||can('trf_ok')?`<button class="btn s d" data-x="froidSim" data-a="${s.id}">Simuler une excursion (test)</button>`:''}</div>`}).join('')}</div>
  <div class="card"><h2>Excursions</h2>${table([{t:'N°',f:e=>`<span class="mono">${e.id}</span>`},{t:'Origine',f:e=>esc(e.type+' – '+e.lieu)},{t:'Période',f:e=>frt(e.start)+' → '+hm(e.end)},{t:'Max.',r:1,f:e=>fmt(e.max,1)+' °C'},{t:'Durée',f:e=>dur(e.duree)},{t:'Lots exposés',f:e=>e.lots.map(id=>esc(lotOf(id)?.lot+' – '+ART[lotOf(id)?.art]?.des)).join('<br>')},{t:'Statut',f:e=>pill(e.statut,e.statut==='Ouverte'?'bad':'ok')+(e.decision?`<br><span class="small">${esc(e.decision)} · ${esc(e.decBy)}</span>`:'')},{t:'',f:e=>e.statut==='Ouverte'?`<button class="btn s n" data-x="froidDec" data-a="${e.id}">Décision AQ</button>`:''}],ex,{empty:'Aucune excursion enregistrée.'})}</div>`};
function openExcursion(type,lieu,lots,max,start,end){const e={id:nextNo('exc','EXC-'),type,lieu,lots,max,start,end,duree:end-start,statut:'Ouverte'};S.excursions.unshift(e);
  lots.forEach(id=>{const l=lotOf(id);if(!l||l.statut!=='Libéré')return;l.statut='Quarantaine';l.motif='Excursion de température '+e.id+' ('+fmt(max,1)+' °C)';lotUnavailable(id,'excursion de température');x3('Changement de statut qualité','Statut lot',l.lot,{vers:'Quarantaine',motif:e.id})});
  audit('Chaîne du froid',e.id,`${type} ${lieu} : max ${fmt(max,1)} °C, ${lots.length} lot(s) en quarantaine`);return e}
ACT.froidSim=id=>{const s=SENSORS.find(x=>x.id===id);const r=S.temps[id];const start=Date.now()-3*36e5;[10.2,11.4,9.6].forEach((v,i)=>r.push({ts:start+i*36e5,v}));r.sort((a,b)=>a.ts-b.ts);
  const lots=[...new Set(S.stock.filter(x=>x.qty>0&&x.loc.startsWith(s.prefix)).map(x=>x.lotId))];const e=openExcursion('Stockage',s.lib,lots,11.4,start,start+3*36e5);toast(e.id+' : '+lots.length+' lot(s) mis en quarantaine en attente de décision AQ.');refresh()};
ACT.froidDec=id=>{if(!need('qa'))return;const e=S.excursions.find(x=>x.id===id);
  modal('Décision pharmaceutique – '+id,`<p>${esc(e.type+' – '+e.lieu)} · maximum ${fmt(e.max,1)} °C pendant ${dur(e.duree)}.</p><div class="fx"><label>Décision<select id="fdD"><option>Libérer – excursion dans les limites de stabilité</option><option>Bloquer – retour fournisseur</option><option>Destruction autorisée</option></select></label><label style="grid-column:1/-1">Justification (données de stabilité, avis du fabricant, référence du dossier)<textarea id="fdJ"></textarea></label><label>Code PIN<input id="fdP" type="password" autocomplete="off"></label></div>`,`<button class="btn p" data-x="froidDecOk" data-a="${id}">Signer la décision</button>`)};
ACT.froidDecOk=id=>{const e=S.excursions.find(x=>x.id===id);if($('#fdP').value!==me().pin)return toast('PIN incorrect.',true);const j=$('#fdJ').value.trim();if(!j)return toast('Justification obligatoire.',true);const d=$('#fdD').value;
  const st=d.startsWith('Libérer')?'Libéré':d.startsWith('Destruction')?'Destruction autorisée':'Bloqué';
  e.lots.forEach(lid=>{const l=lotOf(lid);if(!l)return;l.statut=st;l.motif=e.id+' : '+d+' – '+j;l.qaBy=me().nom;l.qaTs=Date.now();if(st!=='Libéré')stockOfLot(lid).forEach(s=>{if(STORAGE_Z.includes(LOC[s.loc]?.zone))s.loc=(LOC[s.loc].site)+(st==='Bloqué'?'-NC-01':'-DEST-01')});x3('Changement de statut qualité','Statut lot',l.lot,{vers:st,motif:e.id})});
  e.statut='Clôturée';e.decision=d;e.justif=j;e.decBy=me().nom+' – '+frt(Date.now());audit('Chaîne du froid',id,'Décision : '+d+' – '+j);closeModal();refresh()};

/* ---------- Recette pilote et contrôles d'intégrité ---------- */
function integrite(){const C=[];
  const neg=S.stock.filter(s=>s.qty<0);C.push(['Aucun stock négatif',neg.length===0,neg.length?neg.length+' ligne(s)':'']);
  const over=S.stock.filter(s=>reservedQty(s.id)>s.qty);C.push(['Aucune réservation supérieure au stock (pas de double allocation)',over.length===0,over.map(s=>s.loc).join(', ')]);
  const badLines=S.waves.filter(w=>w.statut==='En cours').flatMap(w=>w.lignes.filter(l=>!l.done&&!l.annule&&lotOf(l.lotId)?.statut!=='Libéré'));C.push(['Aucun prélèvement en attente sur un lot non libéré',badLines.length===0,badLines.map(l=>lotOf(l.lotId).lot).join(', ')]);
  const badColis=S.colis.filter(c=>['Emballé','Chargé'].includes(c.statut)&&c.contenu.some(x=>lotOf(x.lotId)?.statut!=='Libéré')&&S.missions.find(m=>m.id===c.mission)?.statut!=='En transit');C.push(['Aucun colis prêt au départ contenant un lot bloqué, rappelé ou en quarantaine',badColis.length===0,badColis.map(c=>c.sscc).join(', ')]);
  const keys={};S.x3msg.filter(m=>m.statut==='Accusé').forEach(m=>keys[m.key]=(keys[m.key]||0)+1);const dups=Object.entries(keys).filter(([k,n])=>n>1&&!/initiale/.test(k));C.push(['Chaque mouvement transmis une seule fois à X3',dups.length===0,dups.length+' doublon(s)']);
  const q=S.x3msg.filter(m=>m.statut==='En file').length;C.push(['File X3 vide (stock WMS et X3 rapprochés)',q===0,q?q+' message(s) en attente':'']);
  const lotNoExp=S.lots.filter(l=>!l.exp);C.push(['Tout lot a une date de péremption',lotNoExp.length===0,'']);
  const podMiss=S.orders.filter(o=>o.statut==='Livrée'&&!o.pod);C.push(['Toute livraison a une POD',podMiss.length===0,podMiss.map(o=>o.no).join(', ')]);
  return C}
const RECETTE=[
  ['r1','Réceptionner via Sage X3 trois lots d’un même article, dont un mis en quarantaine'],
  ['r2','Libérer deux lots (Pharmacien responsable, autre profil que le réceptionnaire) et les ranger par scan'],
  ['r3','Préparer deux commandes en parallèle par deux préparateurs ; vérifier l’allocation FEFO sans double allocation'],
  ['r4','Bloquer un lot pendant la préparation : vérifier la réallocation FEFO et le blocage des colis concernés'],
  ['r5','Contrôler, emballer et charger par scan des SSCC, puis confirmer le départ'],
  ['r6','Passer en mode dégradé, enregistrer une livraison partielle (POD signée), rétablir le réseau : synchronisation unique'],
  ['r7','Lancer un rappel du lot expédié : stock restant et destinataires livrés retrouvés en moins de 30 minutes'],
  ['r8','Simuler une excursion de température et documenter la décision du Pharmacien responsable'],
  ['r9','Rapprocher le stock WMS et Sage X3 (contrôles d’intégrité tous verts)']];
VIEWS.recette=()=>{const C=integrite();
  return ph('Recette pilote et intégrité','Scénario qui conditionne le passage au pilote : un entrepôt central, une agence et une route du plan 2027. Les contrôles d’intégrité sont recalculés à chaque ouverture de l’écran.',`<button class="btn" data-x="recXls">Exporter le PV (Excel)</button>`)+
  `<div class="card"><h2>Contrôles d’intégrité automatiques</h2>${table([{t:'Contrôle',f:c=>c[0]},{t:'Résultat',f:c=>c[1]?pill('Conforme','ok'):pill('Non conforme','bad')},{t:'Détail',f:c=>esc(c[2])}],C)}</div>
  <div class="card"><h2>Scénario de recette décisif</h2>${table([{t:'Étape',f:r=>`<b>${r[0].slice(1)}</b>`},{t:'Action à réaliser',f:r=>esc(r[1])},{t:'Résultat',f:r=>{const v=S.recette[r[0]];return v?pill(v.ok?'Concluant':'Non concluant',v.ok?'ok':'bad')+`<br><span class="small muted">${esc(v.by)} · ${frt(v.ts)}${v.obs?' · '+esc(v.obs):''}</span>`:pill('À faire','neu')}},{t:'',f:r=>`<div class="row"><button class="btn s p" data-x="recTick" data-a="${r[0]}" data-b="1">Concluant</button><button class="btn s d" data-x="recTick" data-a="${r[0]}" data-b="0">Non concluant</button></div>`}],RECETTE)}
  <div class="note w small">Dans ce démonstrateur, les données restent dans le navigateur et les comptes sont des profils de démonstration ; X3 est simulé. La recette transactionnelle réelle (stock partagé sur serveur, comptes individuels, connexion X3, douchettes et terminaux prévus) se fait sur l’environnement de préproduction du pilote.</div></div>`};
ACT.recTick=(k,ok)=>modal('Résultat de l’étape '+k.slice(1),`<label class="fl">Observation<textarea id="rtO"></textarea></label>`,`<button class="btn p" data-x="recTickOk" data-a="${k}" data-b="${ok}">Enregistrer</button>`);
ACT.recTickOk=(k,ok)=>{S.recette[k]={ok:ok==='1',obs:$('#rtO').value,by:me().nom,ts:Date.now()};audit('Recette pilote','Étape '+k.slice(1),(ok==='1'?'Concluant':'Non concluant'));closeModal();refresh()};
ACT.recXls=()=>xlsxExport('SALAMA_WMS_PV_recette_'+iso(today()),[['Intégrité',integrite().map(c=>({Contrôle:c[0],Résultat:c[1]?'Conforme':'Non conforme',Détail:c[2]}))],['Scénario',RECETTE.map(r=>{const v=S.recette[r[0]];return {Étape:r[0].slice(1),Action:r[1],Résultat:v?(v.ok?'Concluant':'Non concluant'):'À faire',Par:v?.by||'',Date:v?frt(v.ts):'',Observation:v?.obs||''}})]]);

/* ---------- Espaces : capacité modélisée par type de zone ---------- */
const _espace=VIEWS.espace;
VIEWS.espace=()=>{const rows=[];REF.sites.forEach(s=>{const g=by(S.locations.filter(l=>l.site===s.code&&STORAGE_Z.concat(['QUA','NC']).includes(l.zone)),'type');Object.entries(g).forEach(([t,ls])=>{const cap=sum(ls,l=>l.capPal),occ=sum(ls,l=>occLoc(l.code));rows.push({site:s.code,t,n:ls.length,cap,occ})})});
  return _espace()+`<div class="card"><h2>Échantillon WMS – capacité modélisée par type de zone (démonstration)</h2>${table([{t:'Site',k:'site'},{t:'Type de zone',k:'t'},{t:'Emplacements',r:1,k:'n'},{t:'Capacité (pal.)',r:1,f:r=>fmt(r.cap,1)},{t:'Occupé (pal.)',r:1,f:r=>fmt(r.occ,1)},{t:'Taux',f:r=>bar(r.cap?r.occ/r.cap:0)}],rows)}<p class="small muted">À valider avec SALAMA : capacité exploitable par zone (racks, sol marqué, débordement). Un taux de référence supérieur à 100 % signifie que des palettes sont stockées hors positions (allées, quais, débordement).</p></div>`};
