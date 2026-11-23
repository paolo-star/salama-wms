/*
 * SALAMA WMS – Écrans Entrées et Stock : réception, quarantaine, rangement, stock, emplacements, transferts, inventaires, transformation
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – vues : pilotage, entrées, stock ============ */
const VIEWS={},BIND={},ACT={};
const STORAGE_Z=['R','SOL','P','F','STUP','AG'];
const KITS=[{code:'KIT-ACC',des:'Kit accouchement (recomposé SALAMA)',ud:'Kit',bom:[['MGSO4',1],['GANTM',1],['COMP10',1],['SER5',1],['LIDO2',1]],l:30,w:22,h:12,kg:1.6}];

function putawayTasks(){return S.stock.filter(s=>s.qty>0&&LOC[s.loc]&&['QUA','QUAI'].includes(LOC[s.loc].zone)&&lotOf(s.lotId)?.statut==='Libéré')}
function alertList(){
  const A=[];const t=today();
  S.stock.forEach(s=>{const lt=lotOf(s.lotId);const L=LOC[s.loc];if(!lt||!L||s.qty<=0)return;const m=monthsLeft(lt.exp);
    if(m<=0&&STORAGE_Z.includes(L.zone))A.push({niv:'bad',cat:'Péremption',txt:`Lot périmé ${lt.lot} (${ART[lt.art]?.des}) encore en zone de stockage ${s.loc}`,go:'stock'});
    else if(m>0&&m<=3&&lt.statut==='Libéré')A.push({niv:'bad',cat:'Péremption ≤ 3 mois',txt:`${ART[lt.art]?.des} – lot ${lt.lot} – ${fmt(s.qty)} UD en ${s.loc} : redistribuer, retourner ou proposer à la destruction`,go:'stock'});
    else if(m>3&&m<=6&&lt.statut==='Libéré')A.push({niv:'warn',cat:'Péremption ≤ 6 mois',txt:`${ART[lt.art]?.des} – lot ${lt.lot} : prioriser en FEFO sur les prochaines commandes`,go:'stock'})});
  S.lots.filter(l=>l.statut==='Quarantaine').forEach(l=>A.push({niv:'warn',cat:'Quarantaine',txt:`Lot ${l.lot} (${ART[l.art]?.des}) en attente de libération pharmaceutique`,go:'qualite'}));
  putawayTasks().forEach(s=>A.push({niv:'warn',cat:'Rangement',txt:`Lot libéré encore en ${s.loc} : à ranger`,go:'rangement'}));
  S.missions.filter(m=>m.statut==='Réservée J-20'&&!m.stopgo).forEach(m=>{const d=jalon(m.depart||jalonDep(m.cycle),15);A.push({niv:t>=d?'bad':'info',cat:'Stop / go J-15',txt:`${m.id} – ${m.sp} : décision stop / go attendue le ${fr(d)}`,go:'plan'})});
  S.missions.filter(m=>m.statut==='En transit').forEach(m=>{const lim=addD(m.depart,7);if(t>lim)A.push({niv:'bad',cat:'POD',txt:`${m.id} – POD non reçue à J+7 (départ ${fr(m.depart)})`,go:'pod'})});
  S.orders.filter(o=>o.statut==='Soumise').forEach(o=>A.push({niv:'warn',cat:'Validation',txt:`${o.no} (${o.destNom}) attend la validation DVM / DAS`,go:'commandes'}));
  S.x3msg.filter(m=>m.statut!=='Accusé').slice(0,10).forEach(m=>A.push({niv:'bad',cat:'Interface X3',txt:`${m.flux} – ${m.ref} : ${m.statut}`,go:'x3'}));
  REF.sites.forEach(s=>{const r=s.occRef/s.cap;if(r>.85)A.push({niv:r>1?'bad':'warn',cat:'Capacité',txt:`${s.nom} : occupation de référence ${pct(r,1)} (seuil 85 %)`,go:'espace'})});
  S.ral.filter(r=>r.statut==='Ouvert').forEach(r=>A.push({niv:'warn',cat:'Reste à livrer',txt:`${r.order} – ${ART[r.art]?.des} : ${fmt(r.qty)} UD (${r.motif})`,go:'pod'}));
  return A;
}

/* ---------------- Tableau de bord ---------------- */
VIEWS.dash=()=>{
  const lots=S.lots;const st=S.stock.filter(s=>s.qty>0);
  const val=sum(st,s=>s.qty*(ART[lotOf(s.lotId)?.art]?.prix||0));
  const near=st.filter(s=>{const m=monthsLeft(lotOf(s.lotId)?.exp);return m>0&&m<=6});
  const ord=S.orders;const ok=o=>['Validée','Planifiée','En préparation','Contrôlée','Emballée'].includes(o.statut);
  const podDue=S.missions.filter(m=>m.statut==='En transit').length;
  const pods=S.pods.length;const al=alertList();
  const sites=REF.sites.map(s=>{const o=occSite(s.code);return `<tr><td><b>${s.nom}</b></td><td class="r">${fmt(s.cap)}</td><td class="r">${fmt(s.occRef)}</td><td>${bar(s.occRef/s.cap)}</td><td class="r">${pct(s.occRef/s.cap,1)}</td><td class="r">${pct(o.taux,1)}</td></tr>`}).join('');
  const vol=sum(ord.filter(ok),o=>o.calc.m3),kg=sum(ord.filter(ok),o=>o.calc.kg);
  return ph('Tableau de bord',`Vue consolidée des trois entrepôts centraux et des cinq agences · ${fr(today())} · profil : ${esc(me().nom)} (${esc(ROLES[me().role].n)})`,`<button class="btn" data-x="xlsAlerts">Exporter les alertes (Excel)</button>`)+
  `<div class="kpis">
   <div class="kpi k-info"><b>${fmt(S.articles.length)}</b><span>articles actifs au catalogue</span></div>
   <div class="kpi k-info"><b>${fmt(lots.length)}</b><span>lots suivis (GTIN + lot + péremption)</span></div>
   <div class="kpi k-ok"><b>${fmt(val/1e6,1)} M</b><span>valeur du stock (MGA)</span></div>
   <div class="kpi ${near.length?'k-warn':'k-ok'}"><b>${near.length}</b><span>lignes de stock périmant sous 6 mois</span></div>
   <div class="kpi ${S.lots.filter(l=>l.statut==='Quarantaine').length?'k-warn':'k-ok'}"><b>${S.lots.filter(l=>l.statut==='Quarantaine').length}</b><span>lots en quarantaine</span></div>
   <div class="kpi k-info"><b>${ord.filter(ok).length}</b><span>commandes validées à distribuer (C1)</span></div>
   <div class="kpi k-info"><b>${fmt(vol,1)} m³</b><span>${fmt(kg/1000,1)} t connues dès la validation</span></div>
   <div class="kpi ${podDue?'k-warn':'k-ok'}"><b>${podDue}</b><span>missions en transit, POD attendue</span></div>
   <div class="kpi k-ok"><b>${pods}</b><span>POD électroniques enregistrées</span></div>
   <div class="kpi ${S.x3msg.filter(m=>m.statut==='En file'||m.statut==='Rejeté').length?'k-bad':'k-ok'}"><b>${S.x3msg.filter(m=>m.statut==='En file'||m.statut==='Rejeté').length}</b><span>messages X3 (simulé) en attente</span></div>
  </div>
  <div class="grid g2">
   <div class="card"><h2>Capacité des entrepôts – deux périmètres distincts</h2><div class="tw"><table><thead><tr><th>Site</th><th class="r">Capacité réf. (pal.)</th><th class="r">Occupé réf. 2026</th><th>Taux</th><th class="r">% réf.</th><th class="r">Éch. WMS</th></tr></thead><tbody>${sites}</tbody></table></div>
   <p class="small muted">Référence 2026 : base logistique consolidée SALAMA (cahier des charges v1.2, §2.1) – palettes en racks, au sol et en débordement ; un taux supérieur à 100 % signifie des palettes hors positions. Échantillon WMS : taux calculé sur les seuls emplacements modélisés dans ce démonstrateur, non comparable à la référence. Capacité exploitable par zone à valider avec SALAMA.</p></div>
   <div class="card"><h2>Alertes prioritaires</h2>${al.length?`<div class="tw" style="max-height:330px"><table><tbody>${al.slice(0,14).map(a=>`<tr><td>${pill(a.cat,a.niv)}</td><td>${esc(a.txt)}</td><td><a class="btn s" href="#${a.go}">Ouvrir</a></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Aucune alerte.</p>'}</div>
  </div>
  <div class="card"><h2>Cycle de la commande unique, du besoin à la clôture</h2>
   <div class="tw"><table><thead><tr><th>Commande</th><th>Destination</th><th>Sous-parcours</th><th>Priorité</th><th class="r">Colis</th><th class="r">m³</th><th>Étape</th></tr></thead><tbody>
   ${ord.slice(0,10).map(o=>`<tr><td><a href="#commandes" class="mono">${o.no}</a></td><td>${esc(o.destNom)}</td><td>${o.sp}</td><td>${pill(o.prio,o.prio==='P1'?'bad':o.prio==='P2'?'warn':'neu')}</td><td class="r">${fmt(o.calc.colis)}</td><td class="r">${fmt(o.calc.m3,2)}</td><td>${flowHTML(o.statut)}</td></tr>`).join('')}</tbody></table></div></div>`;
};
ACT.xlsAlerts=()=>xlsxExport('SALAMA_WMS_Alertes_'+iso(today()),[['Alertes',alertList().map(a=>({Niveau:a.niv,Catégorie:a.cat,Alerte:a.txt}))]]);
VIEWS.alertes=()=>{const A=alertList();const g=by(A,'cat');
  return ph('Alertes et actions','Chaque alerte renvoie à l’écran où elle se traite. Les seuils suivent le cahier des charges : péremption à 12 / 9 / 6 / 3 mois, POD à J+7, stop / go à J-15, occupation cible ≤ 85 %.',`<button class="btn" data-x="xlsAlerts">Exporter (Excel)</button>`)+
  Object.entries(g).map(([k,v])=>`<div class="card"><h2>${esc(k)} <span class="pill neu">${v.length}</span></h2>${table([{t:'Niveau',f:a=>pill(a.niv==='bad'?'Critique':a.niv==='warn'?'Vigilance':'Information',a.niv)},{t:'Alerte',k:'txt'},{t:'',f:a=>`<a class="btn s" href="#${a.go}">Traiter</a>`}],v)}</div>`).join('')||'<div class="card">Aucune alerte.</div>'};

/* ---------------- Réception ---------------- */
VIEWS.reception=()=>{
  const pos=S.pos.filter(p=>p.site===S.site||!REF.sites.find(s=>s.code===S.site));
  return ph('Réception des commandes d’achat',`Les commandes d’achat (POH) et avis d’expédition viennent de Sage X3. Chaque ligne est scannée (GTIN, lot, péremption), contrôlée (durée résiduelle, écarts) et placée en quarantaine physique et informatique (INB-001 à INB-008).`)+
  `<div class="note">Site actif : <b>${esc(siteNom(S.site))}</b>. Les quantités acceptées et rejetées remontent à X3 dans les 5 minutes (flux « Réception confirmée »).</div>`+
  table([{t:'Commande X3',f:p=>`<span class="mono">${p.no}</span>`},{t:'Fournisseur',k:'fourn'},{t:'Site',k:'site'},{t:'Date prévue',f:p=>fr(p.date)},{t:'Lignes',f:p=>p.lignes.map(l=>`${esc(ART[l.art]?.des)} : ${fmt(l.qty)} UD`).join('<br>')},{t:'Statut',f:p=>pill(p.statut,p.statut==='Reçue'?'ok':p.statut==='Partielle'?'warn':'info')},{t:'',f:p=>p.statut==='Reçue'?'':`<button class="btn p s" data-x="recOpen" data-a="${p.no}">Réceptionner</button>`}],pos,{empty:'Aucune commande d’achat attendue sur ce site.'})+
  `<div class="card"><h2>Réceptions enregistrées</h2>${table([{t:'N°',f:r=>`<span class="mono">${r.no}</span>`},{t:'Commande',k:'po'},{t:'Date',f:r=>frt(r.ts)},{t:'Agent',k:'user'},{t:'Lignes',f:r=>r.lignes.map(l=>`${esc(ART[l.art]?.des)} · lot ${esc(l.lot)} · ${fmt(l.recu)} UD${l.ecart?` · <b>écart ${fmt(l.ecart)}</b>`:''}`).join('<br>')},{t:'Véhicule / scellé',f:r=>esc(r.vehicule+' / '+r.scelle)}],S.receipts,{empty:'Aucune réception pour l’instant.'})}</div>`;
};
ACT.recOpen=(no)=>{if(!need('rec'))return;const p=S.pos.find(x=>x.no===no);setTimeout(()=>REC_OPEN=no,0);
  modal('Réception – '+no,`<div class="fx"><label>Fournisseur<input value="${esc(p.fourn)}" disabled></label><label>Véhicule (immatriculation)<input id="rVeh" placeholder="ex. 1234 TBA"></label><label>N° de scellé<input id="rSc" placeholder="ex. SC-00412"></label><label>Température à l’arrivée (°C)<input id="rTemp" type="number" step=".1" value="22"></label><label>Mode<select id="rBlind"><option value="0">Réception standard</option><option value="1">Réception aveugle (quantités attendues masquées)</option></select></label></div>
  <div class="note small">Scannez le code GS1 de chaque ligne (ou cliquez « Simuler le scan » pour générer un code de démonstration). Le lot, la péremption et le GTIN sont extraits et contrôlés automatiquement.</div>
  <div id="rLines">${p.lignes.map((l,i)=>{const a=ART[l.art];return `<div class="card" style="padding:10px"><div class="row" style="justify-content:space-between"><div>${artLabel(l.art)}<div class="small muted">GTIN ${a.gtin} · durée résiduelle minimale ${a.minRes} mois</div></div><span class="pill info rq" data-i="${i}">Attendu : ${fmt(l.qty)} UD</span></div>
   <div class="fx" style="margin-top:8px"><label>Scan GS1<input class="mono" data-scan="change" id="sc${i}" placeholder="(01)…(17)…(10)…"></label><label>Lot<input id="lt${i}"></label><label>Péremption<input type="date" id="ex${i}"></label><label>Quantité reçue (UD)<input type="number" id="q${i}" min="0"></label><label>État<select id="et${i}"><option>Conforme</option><option>Endommagé</option><option>Documentation incomplète</option></select></label></div>
   <div class="row" style="margin-top:6px"><button class="btn s" data-x="recSim" data-a="${i}" data-b="${no}">Simuler le scan</button><span id="msg${i}" class="small"></span></div></div>`}).join('')}</div>`,
  `<button class="btn" id="mcancel">Annuler</button><button class="btn p" data-x="recSave" data-a="${no}">Enregistrer et mettre en quarantaine</button>`);
  $('#mcancel').onclick=closeModal;
  $('#rBlind').onchange=e=>$$('.rq').forEach(x=>x.style.visibility=e.target.value==='1'?'hidden':'visible');
  p.lignes.forEach((l,i)=>{$('#sc'+i).addEventListener('change',e=>recApplyScan(no,i,e.target.value));$('#ex'+i).addEventListener('change',()=>recCheck(no,i))});
};
function recApplyScan(no,i,v){const p=S.pos.find(x=>x.no===no);const a=ART[p.lignes[i].art];const r=parseGS1(v);const m=$('#msg'+i);
  if(!r||r.type!=='gs1'){m.innerHTML=pill('Code non reconnu','bad');return}
  if(r.erreurs.length){m.innerHTML=pill(r.erreurs.join(' ; '),'bad');return}
  if(r.gtin&&r.gtin!==a.gtin){m.innerHTML=pill('GTIN '+r.gtin+' ≠ article attendu : ligne refusée','bad');return}
  if(r.lot)$('#lt'+i).value=r.lot;if(r.exp)$('#ex'+i).value=r.exp;recCheck(no,i)}
function recCheck(no,i){const p=S.pos.find(x=>x.no===no);const a=ART[p.lignes[i].art];const e=$('#ex'+i).value;const m=$('#msg'+i);if(!e)return;const ml=monthsLeft(e);
  m.innerHTML=ml<a.minRes?pill(`Durée résiduelle ${fmt(ml,1)} mois < ${a.minRes} mois : la ligne sera bloquée pour décision qualité (INB-007)`,'bad'):pill(`Durée résiduelle ${fmt(ml,1)} mois : conforme`,'ok')}
ACT.recSim=(i,no)=>{const p=S.pos.find(x=>x.no===no);const l=p.lignes[+i];const a=ART[l.art];const exp=iso(addD(today(),Math.round((a.minRes+8+ +i*3)*30.44)));const lot='R'+String(Date.now()).slice(-5)+i;
  $('#sc'+i).value=gs1String(a,lot,exp);recApplyScan(no,+i,$('#sc'+i).value);$('#q'+i).value=+i===1?l.qty-a.udc:l.qty};
ACT.recSave=(no)=>{const p=S.pos.find(x=>x.no===no);const site=p.site;const out=[];let err='';
  p.lignes.forEach((l,i)=>{const lot=$('#lt'+i).value.trim(),exp=$('#ex'+i).value,q=+$('#q'+i).value;if(!q)return;if(!lot||!exp){err='Lot et péremption obligatoires pour chaque ligne reçue (MDM-003).';return}out.push({...l,lot,exp,recu:q,etat:$('#et'+i).value,ecart:q-l.qty})});
  if(err)return toast(err,true);if(!out.length)return toast('Saisissez au moins une ligne reçue.',true);
  const rec={no:nextNo('rec','REC-'),po:no,site,ts:Date.now(),user:me().nom,userId:me().id,vehicule:$('#rVeh').value||'—',scelle:$('#rSc').value||'—',temp:$('#rTemp').value,lignes:out};
  out.forEach(l=>{const a=ART[l.art];const ml=monthsLeft(l.exp);const blocked=ml<a.minRes||l.etat!=='Conforme';
    const lt={id:'L'+String(S.lots.length+1).padStart(4,'0')+Math.random().toString(36).slice(2,4),art:l.art,lot:l.lot,exp:l.exp,fab:'',statut:blocked?'Bloqué':'Quarantaine',fourn:p.fourn,parent:null,recu:iso(today()),recBy:me().id,rec:rec.no,motif:blocked?(l.etat!=='Conforme'?l.etat:'Durée résiduelle insuffisante'):''};S.lots.push(lt);
    const npal=Math.max(1,Math.ceil(palettesDe(a,l.recu)));const per=Math.ceil(l.recu/npal);let left=l.recu;l.sscc=[];
    for(let k=0;k<npal&&left>0;k++){const q=Math.min(per,left);left-=q;const s=mkSSCC(S.seq.sscc++);l.sscc.push(s);S.stock.push({id:uid('ST'),lotId:lt.id,loc:(blocked?site+'-NC-01':site+'-QUA-01'),qty:q,sscc:s})}});
  S.receipts.unshift(rec);p.statut=out.length<p.lignes.length||out.some(l=>l.ecart<0)?'Partielle':'Reçue';
  x3('Réception confirmée (PTH)','Réception d’achat',rec.no,{po:no,lignes:out.map(l=>({art:ART[l.art].x3,lot:l.lot,qte:l.recu,ecart:l.ecart}))});
  audit('Réception',rec.no,`${out.length} ligne(s) – PO ${no} – mise en quarantaine`);closeModal();toast('Réception '+rec.no+' enregistrée : stock en quarantaine, étiquettes SSCC générées.');refresh()};

/* ---------------- Quarantaine et libération ---------------- */
VIEWS.qualite=()=>{
  const q=S.lots.filter(l=>['Quarantaine','Bloqué'].includes(l.statut));
  return ph('Quarantaine et libération pharmaceutique','Seul le Pharmacien responsable libère, bloque ou autorise la destruction d’un lot, avec ré-authentification (QLT-001 à QLT-004). Un lot non libéré ne peut être ni alloué ni préparé.')+
  table([{t:'Lot',f:l=>`<b class="mono">${esc(l.lot)}</b>`},{t:'Article',f:l=>artLabel(l.art)},{t:'Péremption',f:l=>expPill(l.exp)},{t:'Statut',f:l=>lotPill(l.statut)+(l.motif?`<br><span class="small muted">${esc(l.motif)}</span>`:'')},{t:'Emplacement',f:l=>stockOfLot(l.id).map(s=>locTag(s.loc)+' '+fmt(s.qty)).join('<br>')},{t:'Réception',f:l=>esc(l.rec||l.recu)},{t:'Décision',f:l=>`<div class="row"><button class="btn p s" data-x="qaDo" data-a="${l.id}" data-b="Libéré">Libérer</button><button class="btn d s" data-x="qaDo" data-a="${l.id}" data-b="Bloqué">Bloquer</button><button class="btn n s" data-x="qaDo" data-a="${l.id}" data-b="Destruction autorisée">Destruction</button></div>`}],q,{empty:'Aucun lot en quarantaine ou bloqué.'})+
  `<div class="card"><h2>Derniers lots libérés</h2>${table([{t:'Lot',k:'lot'},{t:'Article',f:l=>esc(ART[l.art]?.des)},{t:'Libéré par',f:l=>esc(l.qaBy||'—')},{t:'Le',f:l=>l.qaTs?frt(l.qaTs):'—'}],S.lots.filter(l=>l.qaTs).slice(-8).reverse(),{empty:'Aucune libération depuis l’ouverture.'})}</div>`};
ACT.qaDo=(id,st)=>{const need2=st==='Destruction autorisée'?'destroy':'qa';if(!need(need2))return;const l=lotOf(id);
  if(l.recBy&&l.recBy===me().id)return toast('Séparation des tâches : vous avez réceptionné ce lot, un autre pharmacien doit décider.',true);
  modal(`${st} – lot ${l.lot}`,`<p>${artLabel(l.art)}</p><div class="fx"><label>Motif / référence du dossier de lot<textarea id="qMot">${st==='Libéré'?'Contrôle documentaire et visuel conforme (CoA, étiquetage, intégrité).':''}</textarea></label><label>Code PIN (ré-authentification)<input id="qPin" type="password" inputmode="numeric" autocomplete="off"></label></div><p class="small muted">Démonstration : le PIN de chaque profil est affiché dans Paramétrage › Rôles.</p>`,
  `<button class="btn p" data-x="qaConfirm" data-a="${id}" data-b="${st}">Signer la décision</button>`)};
ACT.qaConfirm=(id,st)=>{if($('#qPin').value!==me().pin)return toast('PIN incorrect : décision non enregistrée.',true);if(!$('#qMot').value.trim())return toast('Motif obligatoire (QLT-003).',true);
  const l=lotOf(id);const prev=l.statut;l.statut=st;l.qaBy=me().nom;l.qaTs=Date.now();l.motif=$('#qMot').value.trim();
  if(st!=='Libéré')stockOfLot(id).forEach(s=>{const z=LOC[s.loc]?.site;s.loc=(z||'S1')+(st==='Destruction autorisée'?'-DEST-01':'-NC-01')});
  const ru=st!=='Libéré'?lotUnavailable(id,st.toLowerCase()):null;
  x3('Changement de statut qualité','Statut lot',l.lot,{de:prev,vers:st});audit('Décision qualité','Lot '+l.lot,`${prev} → ${st} · ${l.motif}`);closeModal();toast('Lot '+l.lot+' : '+st+(ru&&(ru.realloc||ru.ral||ru.colisB||ru.transit)?` – ${ru.realloc} prélèvement(s) réalloué(s), ${ru.ral} reste(s) à livrer, ${ru.colisB} colis bloqué(s) avant départ, ${ru.transit} colis déjà partis (voir Rappels)`:''));refresh()};

/* ---------------- Mise en emplacement ---------------- */
VIEWS.rangement=()=>{const t=putawayTasks().filter(s=>LOC[s.loc].site===S.site);
  return ph('Mise en emplacement (put-away)','Le WMS propose l’emplacement selon la température, la classe ABC, la capacité libre et les restrictions (stupéfiants, froid). L’agent scanne la palette puis l’étiquette de l’emplacement ; un emplacement incompatible est refusé (PUT-001, PUT-002).')+
  table([{t:'SSCC',f:s=>`<span class="mono small">${s.sscc||'—'}</span>`},{t:'Article / lot',f:s=>{const l=lotOf(s.lotId);return artLabel(l.art)+`<br><span class="small">Lot ${esc(l.lot)} · ${fr(l.exp)}</span>`}},{t:'Qté UD',r:1,f:s=>fmt(s.qty)},{t:'Palettes',r:1,f:s=>fmt(palettesDe(ART[lotOf(s.lotId).art],s.qty),2)},{t:'Depuis',f:s=>locTag(s.loc)},{t:'Emplacement proposé',f:s=>{const L=suggestLoc(s,LOC[s.loc].site);return L?locTag(L.code)+`<br><span class="small muted">${esc(L.type)} · ABC ${L.abc}</span>`:pill('Aucun emplacement libre compatible','bad')}},{t:'Scan destination',f:s=>`<div class="row"><input class="mono" data-scan="click" id="pa_${s.id}" placeholder="Scanner l’adresse" style="width:210px"><button class="btn p s" data-x="putDo" data-a="${s.id}">Confirmer</button></div>`}],t,{empty:'Aucune palette à ranger sur ce site. Les lots libérés en quarantaine apparaissent ici.'})};
ACT.putDo=(id)=>{if(!need('put'))return;const s=S.stock.find(x=>x.id===id);let code=($('#pa_'+id).value||'').trim();const sug=suggestLoc(s,LOC[s.loc].site);
  if(!code&&sug)code=sug.code;const r=parseGS1(code);if(r&&r.type==='loc')code=r.loc;const L=LOC[code];
  if(!L)return toast('Adresse inconnue : '+code,true);
  const a=ART[lotOf(s.lotId).art];
  if(a.temp.startsWith('Froid')&&L.temp!==a.temp)return toast('Refus : produit 2–8 °C, emplacement '+L.temp+' (PUT-002).',true);
  if(!a.temp.startsWith('Froid')&&L.zone==='F')return toast('Refus : la chambre froide est réservée aux produits thermosensibles.',true);
  if(a.tr==='Stupéfiant'&&L.zone!=='STUP'&&L.site==='S1')return toast('Refus : stupéfiant à ranger au coffre (zone STUP).',true);
  if(L.zone==='STUP'&&a.tr!=='Stupéfiant')return toast('Refus : coffre réservé aux stupéfiants.',true);
  if(!STORAGE_Z.includes(L.zone))return toast('Refus : '+L.type+' n’est pas une zone de stockage.',true);
  if(L.statut!=='Actif')return toast('Refus : emplacement bloqué.',true);
  if(occLoc(code)+palettesDe(a,s.qty)>L.capPal*1.0001&&L.zone==='R')return toast('Refus : capacité de l’emplacement dépassée.',true);
  const from=s.loc;s.loc=code;audit('Rangement',s.sscc||lotOf(s.lotId).lot,from+' → '+code+(sug&&sug.code!==code?' (hors suggestion)':''));x3('Mouvement interne','Changement d’emplacement',s.sscc||s.id,{de:from,vers:code});toast('Rangé en '+code);refresh()};

/* ---------------- Stocks, lots, FEFO ---------------- */
let stF={q:'',z:'',st:'',exp:''};
VIEWS.stock=()=>{
  let rows=S.stock.filter(s=>s.qty>0&&LOC[s.loc]?.site===S.site);
  rows=rows.filter(s=>{const l=lotOf(s.lotId),a=ART[l.art];return (!stF.q||(a.des+' '+a.code+' '+l.lot+' '+s.loc+' '+a.gtin).toLowerCase().includes(stF.q.toLowerCase()))&&(!stF.z||LOC[s.loc].zone===stF.z)&&(!stF.st||l.statut===stF.st)&&(!stF.exp||monthsLeft(l.exp)<=+stF.exp)});
  rows.sort((x,y)=>{const a=lotOf(x.lotId),b=lotOf(y.lotId);return a.art.localeCompare(b.art)||new Date(a.exp)-new Date(b.exp)});
  const rank={};const zones=[...new Set(S.locations.filter(l=>l.site===S.site).map(l=>l.zone))];
  return ph('Stocks, lots et FEFO',`Stock unique par site, zone, emplacement, article, lot, péremption, statut et programme (INV-001). Le rang FEFO indique l’ordre de sortie imposé.`,`<button class="btn" data-x="xlsStock">Exporter (Excel)</button>`)+
  `<div class="card"><div class="fx"><label>Recherche (article, lot, GTIN, adresse)<input id="fq" value="${esc(stF.q)}"></label><label>Zone<select id="fz"><option value="">Toutes</option>${opt(zones,stF.z)}</select></label><label>Statut<select id="fs"><option value="">Tous</option>${opt(REF.statutsLot,stF.st)}</select></label><label>Péremption sous<select id="fe"><option value="">—</option>${opt([['3','3 mois'],['6','6 mois'],['9','9 mois'],['12','12 mois']],stF.exp)}</select></label></div></div>`+
  table([{t:'Article',f:s=>artLabel(lotOf(s.lotId).art)},{t:'Programme',f:s=>esc(ART[lotOf(s.lotId).art].prog)},{t:'Lot',f:s=>`<span class="mono">${esc(lotOf(s.lotId).lot)}</span>`},{t:'Péremption',f:s=>expPill(lotOf(s.lotId).exp)},{t:'Statut',f:s=>lotPill(lotOf(s.lotId).statut)},{t:'Emplacement',f:s=>locTag(s.loc)},{t:'Qté UD',r:1,f:s=>fmt(s.qty)},{t:'Cartons + vrac',r:1,f:s=>{const a=ART[lotOf(s.lotId).art];return fmt(Math.floor(s.qty/a.udc))+' + '+fmt(s.qty%a.udc)}},{t:'Rang FEFO',r:1,f:s=>{const l=lotOf(s.lotId);if(l.statut!=='Libéré'||!STORAGE_Z.includes(LOC[s.loc].zone))return '—';rank[l.art]=(rank[l.art]||0)+1;return rank[l.art]===1?pill('1 – sortir d’abord','ok'):rank[l.art]}},{t:'SSCC',f:s=>`<span class="mono small">${s.sscc||'—'}</span>`}],rows,{max:640,empty:'Aucun stock ne correspond aux filtres sur ce site.'});
};
BIND.stock=()=>{[['fq','q'],['fz','z'],['fs','st'],['fe','exp']].forEach(([i,k])=>{const el=$('#'+i);el.addEventListener(i==='fq'?'change':'change',()=>{stF[k]=el.value;refresh()})})};
ACT.xlsStock=()=>xlsxExport('SALAMA_WMS_Stock_'+S.site+'_'+iso(today()),[['Stock',S.stock.filter(s=>s.qty>0).map(s=>{const l=lotOf(s.lotId),a=ART[l.art],L=LOC[s.loc];return {Site:L?.site,Zone:L?.zone,Emplacement:s.loc,GLN:L?.gln,Article:a.code,Désignation:a.des,GTIN:a.gtin,Programme:a.prog,Lot:l.lot,Péremption:l.exp,Statut:l.statut,'Qté UD':s.qty,'Cartons complets':Math.floor(s.qty/a.udc),'UD vrac':s.qty%a.udc,SSCC:s.sscc,'Valeur MGA':s.qty*a.prix}})]]);

/* ---------------- Emplacements et QR ---------------- */
let emZ='R';
VIEWS.emplacements=()=>{
  const ls=S.locations.filter(l=>l.site===S.site);const zones=by(ls,'zone');if(!zones[emZ])emZ=Object.keys(zones)[0];
  const cells=zones[emZ]||[];
  return ph('Emplacements et adressage',`Chaque emplacement a une adresse unique, lisible et scannable, jusqu’au plus petit endroit : site – zone – allée – travée – niveau – position ou case (MDM-004). Le code QR porte l’adresse et le GLN.`,`<button class="btn" data-x="labPDF">Étiquettes QR de la zone (PDF)</button>`)+
  `<div class="note">Exemples : <span class="loc">S1-R-A03-T07-N2-P1</span> = SALAMA 1, rack, allée 03, travée 07, niveau 2, position 1 · <span class="loc">S1-P-E01-T02-N1-C03</span> = étagère de picking, case 03 · <span class="loc">S2-SOL-B04-E02</span> = SALAMA 2 sans racks : bloc au sol marqué 04, emplacement 02.</div>
  <div class="tabs">${Object.keys(zones).map(z=>`<button class="${z===emZ?'on':''}" data-x="emZone" data-a="${z}">${z} · ${zones[z].length}</button>`).join('')}</div>
  <div class="card"><h3>${esc(cells[0]?.type||'')} – carte d’occupation</h3><div class="cell-map">${cells.map(l=>{const o=occLoc(l.code)/(l.capPal||1);const c=l.statut!=='Actif'?'var(--muted)':o>1?'var(--red)':o>.85?'var(--orange)':o>0?'var(--green)':'var(--surface-2)';return `<div title="${l.code} – ${pct(o)}" style="background:${c};color:${o>0||l.statut!=='Actif'?'#fff':'var(--muted)'}" data-x="locInfo" data-a="${l.code}">${l.code.split('-').slice(2).join('-')}</div>`}).join('')}</div>
  <p class="small muted">Vert : occupé · orange : &gt; 85 % · rouge : surcharge · gris : bloqué. Cliquez une case pour voir son contenu.</p></div>
  <div class="labels">${cells.slice(0,24).map(l=>`<div class="lab">${qrSVG('LOC|'+l.code+'|'+l.gln)}<div><b class="mono">${l.code}</b><br><span class="small muted">GLN ${l.gln}<br>${esc(l.type)} · ABC ${l.abc} · ${esc(l.temp)}</span></div></div>`).join('')}</div>`};
ACT.emZone=z=>{emZ=z;refresh()};
ACT.locInfo=code=>{const L=LOC[code];const st=S.stock.filter(s=>s.loc===code&&s.qty>0);
  modal('Emplacement '+code,`<div class="row">${qrSVG('LOC|'+code+'|'+L.gln,110)}<div><b>${esc(siteNom(L.site))}</b><br>${esc(L.type)}<br>GLN ${L.gln}<br>Capacité ${fmt(L.capPal,2)} palette(s) · ABC ${L.abc} · ${esc(L.temp)}<br>Statut : ${pill(L.statut,L.statut==='Actif'?'ok':'bad')}</div></div>`+
  table([{t:'Article',f:s=>artLabel(lotOf(s.lotId).art)},{t:'Lot',f:s=>esc(lotOf(s.lotId).lot)},{t:'Péremption',f:s=>expPill(lotOf(s.lotId).exp)},{t:'Qté',r:1,f:s=>fmt(s.qty)}],st,{empty:'Emplacement vide.'}),
  can('admin')||can('trf_ok')?`<button class="btn ${L.statut==='Actif'?'d':'p'}" data-x="locToggle" data-a="${code}">${L.statut==='Actif'?'Bloquer l’emplacement':'Réactiver'}</button>`:'')};
ACT.locToggle=c=>{const L=LOC[c];L.statut=L.statut==='Actif'?'Bloqué':'Actif';audit('Emplacement',c,'Statut '+L.statut);closeModal();refresh()};
ACT.labPDF=()=>{const ls=S.locations.filter(l=>l.site===S.site&&l.zone===emZ);const d=pdfDoc('Étiquettes d’emplacements – '+siteNom(S.site),'Zone '+emZ+' · '+ls.length+' étiquettes · '+fr(today()));
  let x=12,y=36;ls.forEach((l,i)=>{if(y>262){d.addPage();y=20}const q=qrDataURL('LOC|'+l.code+'|'+l.gln,3);if(q)d.addImage(q,'PNG',x,y,24,24);d.setFont('courier','bold');d.setFontSize(9);d.setTextColor(19,48,74);d.text(l.code,x+26,y+8);d.setFont('helvetica','normal');d.setFontSize(7);d.setTextColor(80);d.text('GLN '+l.gln,x+26,y+13);d.text(l.type+' · ABC '+l.abc,x+26,y+17);
    d.setDrawColor(200);d.rect(x-2,y-2,90,28);if(i%2===0)x=108;else{x=12;y+=31}});d.__foot();saveFile('Etiquettes_'+S.site+'_'+emZ+'.pdf',d.output('arraybuffer'),'application/pdf')};

/* ---------------- Transferts ---------------- */
VIEWS.transferts=()=>trfScanPanelWrap(ph('Transferts','Entre emplacements (immédiat, par scan), entre SALAMA 1, 2 et 3 (approbation, stock en transit, réception miroir) ou vers une agence régionale (TRF-001 à TRF-003).',`<button class="btn p" data-x="trfNew">Nouveau transfert</button>`)+
  table([{t:'N°',f:t=>`<span class="mono">${t.no}</span>`},{t:'Type',k:'type'},{t:'Article / lot',f:t=>artLabel(lotOf(t.lotId).art)+`<br><span class="small">Lot ${esc(lotOf(t.lotId).lot)}</span>`},{t:'Qté',r:1,f:t=>fmt(t.qty)},{t:'De',f:t=>locTag(t.from)},{t:'Vers',f:t=>locTag(t.to)},{t:'Demandé par',k:'by'},{t:'Statut',f:t=>pill(t.statut,t.statut==='Reçu'||t.statut==='Effectué'?'ok':t.statut==='En transit'?'warn':'info')},{t:'',f:t=>t.statut==='Demandé'?`<button class="btn s p" data-x="trfApp" data-a="${t.no}">Approuver et expédier</button>`:t.statut==='En transit'?`<button class="btn s p" data-x="trfRec" data-a="${t.no}">Réceptionner</button>`:''}],S.transfers,{empty:'Aucun transfert. Créez-en un, ou utilisez les propositions de re-slotting de l’écran ABC.'}));
function trfScanPanelWrap(h){const i=h.indexOf('<div class="tw"');return i<0?h+trfScanPanel():h.slice(0,i)+trfScanPanel()+h.slice(i)}
ACT.trfNew=(stockId,dest)=>{if(!need('trf'))return;const st=S.stock.filter(s=>s.qty>0&&LOC[s.loc]?.site===S.site&&lotOf(s.lotId).statut==='Libéré'&&STORAGE_Z.includes(LOC[s.loc].zone));
  modal('Nouveau transfert',`<div class="fx"><label>Type<select id="tType"><option>Entre emplacements</option><option>Inter-sites</option><option>Vers agence</option></select></label>
  <label style="grid-column:1/-1">Stock source<select id="tSrc">${st.map(s=>{const l=lotOf(s.lotId);return `<option value="${s.id}" ${s.id===stockId?'selected':''}>${s.loc} · ${esc(ART[l.art].des)} · lot ${esc(l.lot)} · ${fmt(s.qty)} UD</option>`}).join('')}</select></label>
  <label>Quantité (UD)<input id="tQty" type="number" min="1"></label><label>Destination (adresse, site ou agence)<input id="tTo" class="mono" value="${esc(dest||'')}" placeholder="S1-R-A01-T01-N0-P1 · S2 · AG-TOA"></label><label>Motif<input id="tMot" value="${dest?'Re-slotting ABC':''}"></label></div>`,
  `<button class="btn p" data-x="trfSave">Enregistrer</button>`);const s0=S.stock.find(s=>s.id===($('#tSrc').value));if(s0)$('#tQty').value=s0.qty;$('#tSrc').onchange=e=>{$('#tQty').value=S.stock.find(s=>s.id===e.target.value).qty}};
ACT.trfSave=()=>{const type=$('#tType').value,s=S.stock.find(x=>x.id===$('#tSrc').value),q=+$('#tQty').value;let to=$('#tTo').value.trim();
  if(!s||!(q>0)||q>s.qty)return toast('Quantité invalide.',true);const r=parseGS1(to);if(r&&r.type==='loc')to=r.loc;
  const t={no:nextNo('trf','TRF-'),type,lotId:s.lotId,qty:q,from:s.loc,to,by:me().nom,byId:me().id,ts:Date.now(),motif:$('#tMot').value,statut:'Demandé'};
  if(type==='Entre emplacements'){const L=LOC[to];if(!L||L.site!==LOC[s.loc].site)return toast('Adresse de destination inconnue ou d’un autre site.',true);if(!STORAGE_Z.includes(L.zone))return toast('La destination doit être une zone de stockage.',true);
    s.qty-=q;S.stock.push({id:uid('ST'),lotId:s.lotId,loc:to,qty:q,sscc:q===s.qty+q?s.sscc:''});t.statut='Effectué';}
  else{const site=type==='Vers agence'?REF.agences.find(a=>a.code===to):REF.sites.find(x=>x.code===to);if(!site)return toast('Indiquez le code du site (S1, S2, S3) ou de l’agence (AG-TOA…).',true);if(site.code===LOC[s.loc].site)return toast('Le site de destination doit être différent.',true)}
  S.transfers.unshift(t);audit('Transfert',t.no,`${type} ${t.from} → ${to} · ${q} UD`);closeModal();toast(t.statut==='Effectué'?'Transfert effectué.':'Transfert demandé : approbation requise par un autre profil.');refresh()};
ACT.trfApp=no=>{if(!need('trf_ok'))return;const t=S.transfers.find(x=>x.no===no);if(t.byId===me().id)return toast('Séparation des tâches : le demandeur ne peut pas approuver son propre transfert.',true);
  const s=S.stock.find(x=>x.loc===t.from&&x.lotId===t.lotId&&x.qty>=t.qty);if(!s)return toast('Stock source insuffisant.',true);s.qty-=t.qty;t.statut='En transit';t.app=me().nom;t.sscc=mkSSCC(S.seq.sscc++);
  x3('Transfert inter-sites (expédition)','Transfert de stock',t.no,{de:t.from,vers:t.to,qte:t.qty});audit('Transfert',no,'Approuvé et expédié – SSCC '+t.sscc);refresh()};
ACT.trfRec=no=>{const t=S.transfers.find(x=>x.no===no);if(!(can('trf')||can('rec')||can('rec_ag')))return deny('trf');
  const z=t.type==='Vers agence'?t.to+'-QUAI':t.to+'-QUA-01';const loc=LOC[z]?z:t.to+'-QUAI-R1';S.stock.push({id:uid('ST'),lotId:t.lotId,loc,qty:t.qty,sscc:t.sscc||''});t.statut='Reçu';t.recBy=me().nom;
  x3('Transfert inter-sites (réception miroir)','Transfert de stock',t.no,{recu:t.qty});audit('Transfert',no,'Réceptionné en '+loc);toast('Transfert réceptionné en '+loc+' (à ranger).');refresh()};

/* ---------------- Inventaires ---------------- */
VIEWS.inventaires=()=>ph('Inventaires','Comptage tournant, à l’aveugle (quantité théorique masquée), par zone ou par classe ABC. Deuxième comptage au-delà du seuil, puis validation hors compteur ; au-delà de 1 M MGA d’écart, double validation Stock + Contrôle interne (INV-006 à INV-008).',`<button class="btn p" data-x="invNew">Nouvelle campagne</button>`)+
  `<div class="note">Rappel SALAMA : comptage pendant deux créneaux protégés le mardi et le jeudi ; on range d’abord (une zone par catégorie, une adresse par emplacement), le rangement sert de premier comptage.</div>`+
  table([{t:'N°',f:c=>`<span class="mono">${c.no}</span>`},{t:'Site / zone',f:c=>c.site+' · '+c.zone},{t:'Type',k:'type'},{t:'Lignes',r:1,f:c=>c.lignes.length},{t:'Écarts',r:1,f:c=>c.lignes.filter(l=>l.c1!=null&&invQ(l)!==l.theo).length},{t:'Valeur écart (MGA)',r:1,f:c=>fmt(invVal(c))},{t:'Statut',f:c=>pill(c.statut,c.statut==='Ajusté'?'ok':'warn')},{t:'',f:c=>`<button class="btn s ${c.statut==='Ajusté'?'':'p'}" data-x="invOpen" data-a="${c.no}">${c.statut==='Ajusté'?'Voir':'Ouvrir'}</button>`}],S.counts,{empty:'Aucune campagne de comptage.'});
const invQ=l=>l.c2!=null?l.c2:l.c1;
const invVal=c=>sum(c.lignes.filter(l=>l.c1!=null),l=>Math.abs(invQ(l)-l.theo)*(ART[lotOf(l.lotId).art]?.prix||0));
ACT.invNew=()=>{if(!(can('inv_count')||can('inv_ok')))return deny('inv_count');const zones=[...new Set(S.locations.filter(l=>l.site===S.site&&STORAGE_Z.includes(l.zone)).map(l=>l.zone))];
  modal('Nouvelle campagne de comptage',`<div class="fx"><label>Zone<select id="iZ">${opt(zones.concat(['ABC-A']))}</select></label><label>Type<select id="iT"><option>Tournant à l’aveugle</option><option>Inventaire annuel</option><option>Comptage de contrôle</option></select></label><label>Seuil de 2e comptage (%)<input id="iS" type="number" value="2"></label></div>`,`<button class="btn p" data-x="invCreate">Créer</button>`)};
ACT.invCreate=()=>{const z=$('#iZ').value;let st=S.stock.filter(s=>s.qty>0&&LOC[s.loc]?.site===S.site&&(z==='ABC-A'?ART[lotOf(s.lotId).art].abc==='A'&&STORAGE_Z.includes(LOC[s.loc].zone):LOC[s.loc].zone===z)).slice(0,25);
  if(!st.length)return toast('Aucun stock dans ce périmètre.',true);
  const c={no:nextNo('inv','INV-'),site:S.site,zone:z,type:$('#iT').value,seuil:+$('#iS').value,statut:'Comptage',ts:Date.now(),by:me().nom,lignes:st.map(s=>({sid:s.id,loc:s.loc,lotId:s.lotId,theo:s.qty,c1:null,c2:null,who:''}))};
  S.counts.unshift(c);audit('Inventaire',c.no,'Campagne créée – blocage des mouvements du périmètre pendant le comptage (INV-007)');closeModal();refresh();ACT.invOpen(c.no)};
ACT.invOpen=no=>{const c=S.counts.find(x=>x.no===no);setTimeout(()=>INV_OPEN=no,0);SCTX.invLoc=null;const blind=c.statut==='Comptage';const val=invVal(c);
  modal('Campagne '+no+' – '+c.statut,`<p class="small muted">Douchette : scannez l’adresse, puis chaque produit (quantité ajoutée selon le réglage du lecteur). ${esc(c.type)} · ${c.site} · zone ${c.zone} · seuil de recomptage ${c.seuil} %. ${blind?'Quantités théoriques masquées pendant le comptage.':''}</p>`+
  table([{t:'Emplacement',f:l=>locTag(l.loc)},{t:'Article / lot',f:l=>esc(ART[lotOf(l.lotId).art].des)+'<br><span class="small">'+esc(lotOf(l.lotId).lot)+'</span>'},{t:'Théorique',r:1,f:l=>blind?'•••':fmt(l.theo)},{t:'Comptage 1',f:l=>c.statut==='Comptage'?`<input type="number" min="0" id="c1_${l.sid}" value="${l.c1??''}" style="width:90px">`:fmt(l.c1)},{t:'Comptage 2',f:l=>{const e=l.c1!=null&&Math.abs(l.c1-l.theo)/Math.max(1,l.theo)*100>c.seuil;return c.statut==='Recomptage'&&e?`<input type="number" min="0" id="c2_${l.sid}" value="${l.c2??''}" style="width:90px">`:l.c2!=null?fmt(l.c2):'—'}},{t:'Écart',r:1,f:l=>l.c1==null||blind?'—':(d=>pill((d>0?'+':'')+fmt(d),d===0?'ok':'bad'))(invQ(l)-l.theo)}],c.lignes)+
  (c.statut!=='Comptage'?`<div class="note ${val>1e6?'w':''}">Valeur absolue des écarts : <b>${fmt(val)} MGA</b>${val>1e6?' – double validation requise (Direction Stock + Contrôle interne).':''} ${c.v1?'<br>Validation niveau 1 : '+esc(c.v1):''} ${c.v2?'<br>Validation niveau 2 : '+esc(c.v2):''}</div>`:''),
  c.statut==='Comptage'?`<button class="btn p" data-x="invCount" data-a="${no}">Enregistrer le comptage</button>`:c.statut==='Recomptage'?`<button class="btn p" data-x="invCount2" data-a="${no}">Enregistrer le 2e comptage</button>`:c.statut==='À valider'?`<button class="btn p" data-x="invVal" data-a="${no}">Valider et ajuster X3</button>`:'',{w:'1100px'})};
ACT.invCount=no=>{if(!need('inv_count'))return;const c=S.counts.find(x=>x.no===no);let miss=0;c.lignes.forEach(l=>{const v=$('#c1_'+l.sid).value;if(v==='')miss++;else{l.c1=+v;l.who=me().id}});if(miss)return toast(miss+' ligne(s) non comptée(s).',true);
  c.counter=me().id;c.statut=c.lignes.some(l=>Math.abs(l.c1-l.theo)/Math.max(1,l.theo)*100>c.seuil)?'Recomptage':'À valider';audit('Inventaire',no,'Comptage 1 saisi');closeModal();refresh();ACT.invOpen(no)};
ACT.invCount2=no=>{if(!need('inv_count'))return;const c=S.counts.find(x=>x.no===no);c.lignes.forEach(l=>{const el=$('#c2_'+l.sid);if(el&&el.value!=='')l.c2=+el.value});c.statut='À valider';audit('Inventaire',no,'Comptage 2 saisi');closeModal();refresh();ACT.invOpen(no)};
ACT.invVal=no=>{const c=S.counts.find(x=>x.no===no);const val=invVal(c);
  if(c.lignes.some(l=>l.who===me().id))return toast('Séparation des tâches : le compteur ne valide pas ses propres écarts.',true);
  if(!c.v1){if(!need('inv_ok'))return;c.v1=me().nom+' – '+frt(Date.now());if(val>1e6){audit('Inventaire',no,'Validation niveau 1');closeModal();toast('Niveau 1 validé. Niveau 2 requis : profil Contrôle interne.');refresh();return}}
  else{if(!need('inv_ok2'))return;c.v2=me().nom+' – '+frt(Date.now())}
  c.lignes.forEach(l=>{const s=S.stock.find(x=>x.id===l.sid);const q=invQ(l);if(s&&q!==l.theo){x3('Ajustement d’inventaire','Régularisation de stock',c.no,{loc:l.loc,lot:lotOf(l.lotId).lot,avant:l.theo,apres:q});s.qty=q}});
  c.statut='Ajusté';audit('Inventaire',no,'Écarts validés et ajustés ('+fmt(val)+' MGA)');closeModal();toast('Inventaire ajusté et transmis à X3.');refresh()};

/* ---------------- Transformation produits ---------------- */
VIEWS.transfo=()=>ph('Transformation des produits','Reconditionnement (carton d’origine → unités de distribution), recomposition de kits et ré-étiquetage. Chaque produit transformé reçoit une identité propre (article, lot enfant, SSCC) et garde la filiation de ses lots d’origine. La péremption retenue est la plus courte des composants.',`<button class="btn p" data-x="tfNew">Nouvelle transformation</button>`)+
  table([{t:'N°',f:t=>`<span class="mono">${t.no}</span>`},{t:'Type',k:'type'},{t:'Entrées (lots parents)',f:t=>t.inputs.map(i=>`${esc(ART[lotOf(i.lotId).art].des)} · lot ${esc(lotOf(i.lotId).lot)} · ${fmt(i.qty)}`).join('<br>')},{t:'Sortie',f:t=>`<b>${esc(t.outDes)}</b><br><span class="small mono">${esc(t.outLot)} · exp. ${fr(t.outExp)} · ${fmt(t.outQty)} ${esc(t.outUd)}</span>`},{t:'Créé par',k:'by'},{t:'Statut',f:t=>pill(t.statut,t.statut==='Approuvée'?'ok':'warn')},{t:'',f:t=>t.statut==='À approuver'?`<button class="btn p s" data-x="tfApp" data-a="${t.no}">Approuver (AQ)</button>`:''}],S.transfos,{empty:'Aucune transformation.'});
ACT.tfNew=()=>{if(!need('transfo'))return;
  modal('Nouvelle transformation',`<div class="fx"><label>Type<select id="tfT"><option value="kit">Recomposition de kit (${KITS[0].des})</option><option value="recon">Reconditionnement d’un lot en unités de distribution</option></select></label><label>Quantité à produire<input id="tfQ" type="number" value="50" min="1"></label><label>Emplacement de sortie<input id="tfL" class="mono" value="${S.site}-P-E02-T06-N4-C04"></label></div><div id="tfPrev"></div>`,`<button class="btn p" data-x="tfSave">Soumettre à l’approbation AQ</button>`);
  const prev=()=>{const k=$('#tfT').value,q=+$('#tfQ').value||0;if(k==='kit'){$('#tfPrev').innerHTML='<h3>Composants alloués en FEFO</h3>'+table([{t:'Composant',f:r=>esc(ART[r[0]].des)},{t:'Par kit',r:1,f:r=>r[1]},{t:'Besoin',r:1,f:r=>fmt(r[1]*q)},{t:'Disponible',r:1,f:r=>fmt(dispo(r[0],S.site))},{t:'Lot FEFO',f:r=>{const f=fefoLots(r[0],S.site)[0];return f?esc(lotOf(f.lotId).lot)+' · '+fr(lotOf(f.lotId).exp):pill('Rupture','bad')}}],KITS[0].bom)}
    else{const f=fefoLots('SRO',S.site)[0];$('#tfPrev').innerHTML=`<div class="note">Exemple : reconditionnement du lot FEFO de SRO (${f?esc(lotOf(f.lotId).lot):'—'}) en sachets unitaires étiquetés, identité « SRO-UD » pour la livraison à la plus petite unité de distribution.</div>`}};
  $('#tfT').onchange=prev;$('#tfQ').oninput=prev;prev()};
ACT.tfSave=()=>{const k=$('#tfT').value,q=+$('#tfQ').value;const inputs=[];let ok=true;
  if(k==='kit'){KITS[0].bom.forEach(([c,n])=>{let needQ=n*q;fefoLots(c,S.site).forEach(s=>{if(needQ<=0)return;const t=Math.min(needQ,s.qty);inputs.push({sid:s.id,lotId:s.lotId,qty:t});needQ-=t});if(needQ>0)ok=false})}
  else{let needQ=q;fefoLots('SRO',S.site).forEach(s=>{if(needQ<=0)return;const t=Math.min(needQ,s.qty);inputs.push({sid:s.id,lotId:s.lotId,qty:t});needQ-=t});if(needQ>0)ok=false}
  if(!ok)return toast('Stock libéré insuffisant pour cette transformation.',true);
  const exp=inputs.map(i=>lotOf(i.lotId).exp).sort()[0];const n=nextNo('tfo','TFO-');
  const t={no:n,type:k==='kit'?'Recomposition de kit':'Reconditionnement',inputs,outArt:k==='kit'?KITS[0].code:'SRO-UD',outDes:k==='kit'?KITS[0].des:'SRO – sachet unitaire reconditionné',outUd:k==='kit'?'kit(s)':'sachet(s)',outQty:q,outLot:(k==='kit'?'KA':'SU')+n.slice(-5)+'-'+lotOf(inputs[0].lotId).lot.slice(0,6),outExp:exp,outLoc:$('#tfL').value.trim(),by:me().nom,byId:me().id,statut:'À approuver',ts:Date.now()};
  S.transfos.unshift(t);audit('Transformation',n,'Créée – en attente d’approbation AQ');closeModal();toast('Transformation '+n+' soumise au Pharmacien responsable.');refresh()};
ACT.tfApp=no=>{if(!need('transfo_ok'))return;const t=S.transfos.find(x=>x.no===no);if(t.byId===me().id)return toast('Séparation des tâches : approbation par un autre profil.',true);
  for(const i of t.inputs){const s=S.stock.find(x=>x.id===i.sid);if(!s||s.qty<i.qty)return toast('Le stock d’un composant a changé : recréez la transformation.',true)}
  t.inputs.forEach(i=>{S.stock.find(x=>x.id===i.sid).qty-=i.qty});
  if(!ART[t.outArt]){const k=KITS[0];const isKit=t.outArt===k.code;const a={code:t.outArt,x3:'X3-'+t.outArt,gtin:mkGTIN(800+S.articles.length),des:t.outDes,ud:isKit?'Kit':'Sachet',cat:isKit?'Kit':'Médicament',temp:'Ambiant',prog:isKit?'UNFPA':'UNICEF',tr:'Ambiant',cl:54,cw:40,ch:35,ckg:isKit?16:8,udc:isKit?10:300,ul:isKit?k.l:10,uw:isKit?k.w:7,uh:isKit?k.h:.6,ukg:isKit?k.kg:.025,prix:isKit?28000:400,minRes:6,abc:'C',actif:true,transfo:true};S.articles.push(a);ART[a.code]=a;
    x3('Création article (ITM)','Article transformé',a.code,{gtin:a.gtin})}
  const lt={id:'L'+String(S.lots.length+1).padStart(4,'0')+'T',art:t.outArt,lot:t.outLot,exp:t.outExp,statut:'Libéré',fourn:'Transformation SALAMA',parent:t.inputs.map(i=>i.lotId),recu:iso(today()),qaBy:me().nom,qaTs:Date.now()};S.lots.push(lt);
  const loc=LOC[t.outLoc]?t.outLoc:S.site+'-QUA-01';S.stock.push({id:uid('ST'),lotId:lt.id,loc,qty:t.outQty,sscc:mkSSCC(S.seq.sscc++)});
  t.statut='Approuvée';t.app=me().nom;x3('Ordre de fabrication / transformation','Consommation et production',no,{entrees:t.inputs.length,sortie:t.outLot});audit('Transformation',no,'Approuvée – lot enfant '+t.outLot+' créé avec filiation');toast('Lot '+t.outLot+' créé en '+loc+'.');refresh()};
