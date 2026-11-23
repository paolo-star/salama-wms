/*
 * SALAMA WMS – Douchette : lecture clavier, normalisation GS1, routage des scans par écran
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – lecteur de codes-barres et QR (douchette en mode clavier HID / Bluetooth) ============ */
const SCAN_DEF={enabled:true,suffix:'Enter',maxInterval:45,minLen:4,gsChar:'|',stripAim:true,azerty:true,beep:true,qtyMode:'UD'};
const SB={buf:'',t0:0,t:0};
let SCTX={pickLoc:null,putSid:null,invLoc:null,trf:{from:null,stockId:null,to:null}};
let INV_OPEN=null,REC_OPEN=null;
function scanCfg(){if(!S.scanCfg)S.scanCfg={...SCAN_DEF};return S.scanCfg}
const AZ={'&':'1','é':'2','"':'3',"'":'4','§':'6','è':'7','!':'8','ç':'9','à':'0'};
function normScan(raw){const c=scanCfg();let s=String(raw||'');
  if(c.stripAim)s=s.replace(/^\][A-Za-z][0-9A-Za-z]/,'');
  s=s.replace(/\u001d/g,'|');if(c.gsChar&&c.gsChar!=='|')s=s.split(c.gsChar).join('|');
  /* douchette en QWERTY sur un poste AZERTY : les chiffres arrivent sous forme de &é"'(§è!çà */
  if(c.azerty&&/[éèçà&§]/.test(s))s=s.split('').map(ch=>AZ[ch]??ch).join('');
  return s.trim()}
let AUD=null;function beep(ok=true){if(!scanCfg().beep)return;try{AUD=AUD||new (window.AudioContext||window.webkitAudioContext)();const o=AUD.createOscillator(),g=AUD.createGain();o.frequency.value=ok?1760:220;g.gain.value=.08;o.connect(g);g.connect(AUD.destination);o.start();o.stop(AUD.currentTime+(ok?.08:.25))}catch(e){}}
function scanPill(){const c=scanCfg();return c.enabled?`<span class="pill ok" title="Dernier scan : ${esc(S.lastScan||'—')}">Douchette prête</span>`:'<span class="pill neu">Douchette désactivée</span>'}
/* Écoute globale : une rafale de caractères très rapprochés suivie d'Entrée (ou Tab) est un scan */
document.addEventListener('keydown',e=>{if(!S||!scanCfg().enabled)return;const c=scanCfg();const el=document.activeElement;
  const editable=el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable);const now=performance.now();
  const isEnd=e.key==='Enter'||(c.suffix==='Tab'&&e.key==='Tab');
  if(isEnd){
    if(editable&&el.dataset&&el.dataset.scan!==undefined){e.preventDefault();onScanInput(el);SB.buf='';return}
    if(!editable&&SB.buf.length>=c.minLen&&(SB.t-SB.t0)/Math.max(1,SB.buf.length-1)<=c.maxInterval){e.preventDefault();handleScan(SB.buf)}
    SB.buf='';return}
  if(editable)return;
  if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(!SB.buf||now-SB.t>c.maxInterval*4){SB.buf='';SB.t0=now}SB.buf+=e.key;SB.t=now}
},true);
function onScanInput(el){el.value=normScan(el.value);const m=el.dataset.scan;
  if(m==='click'){const b=el.closest('.row')?.querySelector('.btn');if(b)b.click()}
  else if(m==='change')el.dispatchEvent(new Event('change',{bubbles:true}));
  else if(m==='route'){const v=el.value;el.value='';handleScan(v)}
  else if(m==='test')scanTest(el.value)}
function handleScan(raw){const v=normScan(raw);if(!v)return;S.lastScan=v;const r=parseGS1(v);
  if(/^STAFF\|/.test(v)){beep();return ACT.hrPoint(v.split('|')[1])}
  if(r&&r.erreurs&&r.erreurs.length){beep(false);return toast('Code rejeté : '+r.erreurs.join(' ; '),true)}
  const H=(INV_OPEN&&$('#modal .mbox'))?scanInv:(REC_OPEN&&$('#modal .mbox'))?scanRec:SCANH[VIEW];
  if(H){const ok=H(r,v);beep(ok!==false);return}
  beep();globalScan(v)}
const SCANH={};
/* Préparation : scanner l'adresse, puis le produit (GS1) → prélèvement confirmé à la quantité prévue */
SCANH.preparation=(r)=>{const open=S.waves.filter(w=>w.statut==='En cours').flatMap(w=>w.lignes.filter(l=>!l.done&&!l.annule).map(l=>({w,l})));
  if(!open.length){toast('Aucun prélèvement en attente.',true);return false}
  if(r.type==='loc'){const x=open.find(o=>o.l.loc===r.loc);if(!x){toast('Aucun prélèvement prévu en '+r.loc+'. Prochain : '+open[0].l.loc,true);return false}
    SCTX.pickLoc=r.loc;toast(`${r.loc} : prélever ${fmt(x.l.qty)} UD de ${ART[x.l.art].des}, lot ${lotOf(x.l.lotId).lot}. Scannez le produit.`);return true}
  if(r.gtin){if(!SCTX.pickLoc){toast('Scannez d’abord l’adresse de l’emplacement.',true);return false}
    const x=open.find(o=>o.l.loc===SCTX.pickLoc&&ART[o.l.art].gtin===r.gtin&&(!r.lot||lotOf(o.l.lotId).lot===r.lot));
    if(!x){toast('Produit ou lot non conforme pour '+SCTX.pickLoc+' : prélèvement bloqué (FEFO).',true);return false}
    const inp=$(`#pk_${x.w.id}_${x.l.seq}`);if(inp)inp.value=r.raw;ACT.pickDo(x.w.id,x.l.seq);SCTX.pickLoc=null;return true}
  toast('Code non reconnu pour la préparation.',true);return false};
/* Rangement : scanner le SSCC de la palette, puis l'adresse */
SCANH.rangement=(r)=>{if(r.sscc){const s=putawayTasks().find(x=>x.sscc===r.sscc);if(!s){toast('Palette '+r.sscc+' : aucune tâche de rangement.',true);return false}SCTX.putSid=s.id;const L=suggestLoc(s,LOC[s.loc].site);toast('Palette prise. Emplacement proposé : '+(L?L.code:'aucun')+'. Scannez l’adresse de dépôt.');return true}
  if(r.type==='loc'){const sid=SCTX.putSid||putawayTasks().filter(s=>LOC[s.loc].site===S.site)[0]?.id;if(!sid){toast('Scannez d’abord une palette.',true);return false}const inp=$('#pa_'+sid);if(inp)inp.value=r.loc;ACT.putDo(sid);SCTX.putSid=null;return true}
  toast('Scannez un SSCC puis une adresse.',true);return false};
/* Chargement : chaque SSCC scanné est chargé, dans l'ordre affiché */
SCANH.expedition=(r)=>{if(!r.sscc){toast('Scannez l’étiquette SSCC du colis.',true);return false}const c=S.colis.find(x=>x.sscc===r.sscc);if(!c){toast('SSCC inconnu.',true);return false}if(c.statut==='Chargé'){toast('Colis déjà chargé.');return true}
  const inp=$('#ld_'+c.sscc);if(inp)inp.value=r.raw;ACT.loadDo(c.sscc);return true};
/* Réception (fenêtre ouverte) : le GTIN scanné désigne la ligne de la commande d'achat */
function scanRec(r){if(!r.gtin){toast('Scannez le code GS1 du produit.',true);return false}const p=S.pos.find(x=>x.no===REC_OPEN);const i=p.lignes.findIndex(l=>ART[l.art].gtin===r.gtin);
  if(i<0){toast('GTIN '+r.gtin+' absent de la commande '+REC_OPEN+' : produit non attendu.',true);return false}$('#sc'+i).value=r.raw;recApplyScan(REC_OPEN,i,r.raw);const q=$('#q'+i);if(!q.value){const a=ART[p.lignes[i].art];q.value=scanCfg().qtyMode==='Carton'?a.udc:1}else if(scanCfg().qtyMode!=='Aucun')q.value=+q.value+(scanCfg().qtyMode==='Carton'?ART[p.lignes[i].art].udc:1);return true}
/* Comptage (fenêtre de campagne ouverte) : adresse, puis chaque scan produit ajoute 1 UD ou 1 carton */
function scanInv(r){const c=S.counts.find(x=>x.no===INV_OPEN);if(!c||!['Comptage','Recomptage'].includes(c.statut)){toast('Campagne non ouverte au comptage.',true);return false}
  if(r.type==='loc'){if(!c.lignes.some(l=>l.loc===r.loc)){toast(r.loc+' hors du périmètre de la campagne.',true);return false}SCTX.invLoc=r.loc;$$('#modal tr').forEach(tr=>tr.classList.toggle('hl',tr.textContent.includes(r.loc)));toast('Emplacement '+r.loc+' : scannez chaque carton ou unité.');return true}
  if(r.gtin){if(!SCTX.invLoc){toast('Scannez d’abord l’adresse.',true);return false}
    const l=c.lignes.find(x=>x.loc===SCTX.invLoc&&ART[lotOf(x.lotId).art].gtin===r.gtin&&(!r.lot||lotOf(x.lotId).lot===r.lot));
    if(!l){toast('Produit ou lot non attendu en '+SCTX.invLoc+' : signalez l’écart au chef d’équipe (article à ajouter au comptage).',true);return false}
    const id=(c.statut==='Recomptage'?'#c2_':'#c1_')+l.sid;const el=$(id);if(!el){toast('Cette ligne n’est pas à recompter.',true);return false}
    const a=ART[lotOf(l.lotId).art];const step=scanCfg().qtyMode==='Carton'?a.udc:1;el.value=(+el.value||0)+step;toast(a.des+' : '+el.value+' compté(s) en '+SCTX.invLoc);return true}
  return false}
/* Transfert rapide : adresse source → produit ou SSCC → adresse destination */
SCANH.transferts=(r)=>{const T=SCTX.trf;
  if(r.sscc||r.gtin){const st=S.stock.find(s=>s.qty>0&&(r.sscc?s.sscc===r.sscc:(ART[lotOf(s.lotId).art].gtin===r.gtin&&(!r.lot||lotOf(s.lotId).lot===r.lot)))&&(!T.from||s.loc===T.from));
    if(!st){toast('Stock introuvable'+(T.from?' en '+T.from:'')+'.',true);return false}T.stockId=st.id;T.from=st.loc;refresh();return true}
  if(r.type==='loc'){if(!T.stockId){T.from=r.loc;refresh();return true}T.to=r.loc;refresh();return true}
  return false};
SCANH.inventaires=()=>{toast('Ouvrez d’abord une campagne de comptage, puis scannez.',true);return false};
SCANH.stock=(r,v)=>{globalScan(v);return true};
function trfScanPanel(){const T=SCTX.trf;const s=T.stockId&&S.stock.find(x=>x.id===T.stockId);
  return `<div class="card"><h2>Transfert rapide par scan</h2><div class="flow"><span class="${T.from?'done':'cur'}">1. Adresse source ${T.from?locTag(T.from):''}</span><span class="${s?'done':T.from?'cur':''}">2. Produit ou SSCC ${s?esc(ART[lotOf(s.lotId).art].des)+' · lot '+esc(lotOf(s.lotId).lot):''}</span><span class="${T.to?'done':s?'cur':''}">3. Adresse destination ${T.to?locTag(T.to):''}</span></div>
  ${s?`<div class="row" style="margin-top:8px"><label class="fl">Quantité (UD, max ${fmt(s.qty)})<input id="tsQ" type="number" value="${s.qty}" min="1" max="${s.qty}"></label>${T.to?`<button class="btn p" data-x="trfScanOk">Valider le transfert</button>`:''}<button class="btn" data-x="trfScanReset">Recommencer</button></div>`:'<p class="small muted">Avec la douchette, scannez l’étiquette de l’emplacement, puis le produit ou la palette, puis l’emplacement de destination. Sans douchette, saisissez le code dans la zone de scan en haut de page.</p>'}</div>`}
ACT.trfScanReset=()=>{SCTX.trf={from:null,stockId:null,to:null};refresh()};
ACT.trfScanOk=()=>{if(!need('trf'))return;const T=SCTX.trf;const s=S.stock.find(x=>x.id===T.stockId);const q=+$('#tsQ').value;const L=LOC[T.to];
  if(!L||L.site!==LOC[s.loc].site)return toast('Destination inconnue ou d’un autre site : utilisez un transfert inter-sites.',true);if(!STORAGE_Z.includes(L.zone))return toast('La destination doit être une zone de stockage.',true);
  const a=ART[lotOf(s.lotId).art];if(a.temp.startsWith('Froid')!==(L.zone==='F'))return toast('Température incompatible avec la destination.',true);if(!(q>0)||q>s.qty)return toast('Quantité invalide.',true);
  s.qty-=q;S.stock.push({id:uid('ST'),lotId:s.lotId,loc:T.to,qty:q,sscc:s.qty===0?s.sscc:''});const t={no:nextNo('trf','TRF-'),type:'Entre emplacements',lotId:s.lotId,qty:q,from:T.from,to:T.to,by:me().nom,byId:me().id,ts:Date.now(),motif:'Transfert par scan',statut:'Effectué'};S.transfers.unshift(t);
  audit('Transfert',t.no,'Par scan '+T.from+' → '+T.to+' · '+q+' UD');SCTX.trf={from:null,stockId:null,to:null};toast('Transfert '+t.no+' effectué.');refresh()};

/* ---------------- Paramétrage du lecteur ---------------- */
VIEWS.scanner=()=>{const c=scanCfg();
  return ph('Scanner et lecteurs de codes','Douchettes 1D/2D (GS1-128, GS1 DataMatrix, QR) en mode clavier USB ou Bluetooth. Le WMS reconnaît un scan à la vitesse de frappe, quel que soit l’écran, et l’oriente selon l’opération en cours : réception, rangement, comptage, transfert, préparation, chargement, pointage.')+
  `<div class="grid g2"><div class="card"><h2>Réglages côté WMS</h2><div class="fx">
   <label>Lecteur<select id="scE"><option value="1" ${c.enabled?'selected':''}>Activé</option><option value="0" ${c.enabled?'':'selected'}>Désactivé</option></select></label>
   <label>Suffixe envoyé par la douchette<select id="scS">${opt(['Enter','Tab'],c.suffix)}</select></label>
   <label>Délai max. entre caractères (ms)<input id="scI" type="number" value="${c.maxInterval}"></label>
   <label>Longueur minimale d’un code<input id="scL" type="number" value="${c.minLen}"></label>
   <label>Caractère de remplacement du séparateur GS1 (FNC1 / GS)<input id="scG" value="${esc(c.gsChar)}" maxlength="3"></label>
   <label>Retirer l’identifiant AIM (]C1, ]d2, ]Q3)<select id="scA"><option value="1" ${c.stripAim?'selected':''}>Oui</option><option value="0" ${c.stripAim?'':'selected'}>Non</option></select></label>
   <label>Corriger une douchette QWERTY sur poste AZERTY<select id="scZ"><option value="1" ${c.azerty?'selected':''}>Oui</option><option value="0" ${c.azerty?'':'selected'}>Non</option></select></label>
   <label>Quantité ajoutée par scan (comptage, réception)<select id="scQ">${opt([['UD','1 unité de distribution'],['Carton','1 carton d’origine'],['Aucun','Aucune (saisie manuelle)']],c.qtyMode)}</select></label>
   <label>Bip de confirmation<select id="scB"><option value="1" ${c.beep?'selected':''}>Oui</option><option value="0" ${c.beep?'':'selected'}>Non</option></select></label></div>
   <div class="row" style="margin-top:10px"><button class="btn p" data-x="scSave">Enregistrer</button></div></div>
  <div class="card"><h2>Tester la douchette</h2><p class="small muted">Cliquez dans le champ, puis scannez une étiquette (adresse, produit, SSCC ou badge). Sans douchette, tapez un code et appuyez sur Entrée.</p>
   <input id="scT" class="mono" data-scan="test" placeholder="Scannez ici…" style="width:100%"><div id="scR" style="margin-top:10px"></div>
   <p class="small muted">Dernier scan reçu : <span class="mono">${esc(S.lastScan||'—')}</span></p></div></div>
  <div class="card"><h2>Configurer la douchette (à faire une fois, avec le manuel du fabricant)</h2><ol class="small">
   <li>Mode d’interface : clavier USB (HID) ou Bluetooth HID ; langue du clavier identique à celle du poste (AZERTY France), sinon activer la correction ci-dessus.</li>
   <li>Suffixe : Entrée (CR) après chaque lecture ; aucun préfixe, ou préfixe AIM si plusieurs symbologies coexistent.</li>
   <li>Symbologies à activer : GS1-128 (Code 128), GS1 DataMatrix, QR Code, EAN-13 ; désactiver les symbologies inutiles pour éviter les lectures parasites.</li>
   <li>Séparateur GS1 : transmettre le caractère GS (ASCII 29) ou le remplacer par « | » (renseigner le même caractère ici).</li>
   <li>Imprimer les étiquettes : emplacements (Stock › Emplacements et QR), colis SSCC (Contrôle et emballage), badges agents (Ressources humaines › Badges).</li>
   <li>Tester sur ce champ chaque type d’étiquette, puis faire un essai réel de comptage et de préparation sur une allée pilote.</li></ol>
   <p class="small muted">Les terminaux Android à scanner intégré fonctionnent de la même façon (service « clavier » ou « keyboard wedge » de l’appareil). La lecture par la caméra d’un téléphone n’est pas disponible dans cette version de démonstration.</p></div>
  <div class="card"><h2>Ce que fait un scan selon l’écran</h2>${table([{t:'Écran',f:r=>r[0]},{t:'Séquence de scan',f:r=>r[1]}],[['Réception (fenêtre ouverte)','GS1 produit → ligne de la commande X3, lot et péremption remplis, quantité incrémentée'],['Mise en emplacement','SSCC de la palette → adresse de dépôt (contrôle de compatibilité)'],['Inventaires (campagne ouverte)','Adresse → chaque produit scanné ajoute 1 UD ou 1 carton au comptage'],['Transferts','Adresse source → produit ou SSCC → adresse destination → quantité'],['Préparation','Adresse → produit : le prélèvement est validé si le lot est le lot FEFO prévu'],['Chargement','SSCC de chaque colis, dans l’ordre de chargement inverse'],['Ressources humaines / tout écran','Badge agent → pointage d’arrivée ou de départ'],['Autres écrans','Recherche : emplacement, produit, lot, SSCC, commande']])}</div>`};
ACT.scSave=()=>{const c=scanCfg();c.enabled=$('#scE').value==='1';c.suffix=$('#scS').value;c.maxInterval=+$('#scI').value||45;c.minLen=+$('#scL').value||4;c.gsChar=$('#scG').value||'|';c.stripAim=$('#scA').value==='1';c.azerty=$('#scZ').value==='1';c.qtyMode=$('#scQ').value;c.beep=$('#scB').value==='1';audit('Paramétrage','Lecteur','Réglages de la douchette mis à jour');toast('Réglages du lecteur enregistrés.');refresh()};
function scanTest(v){const n=normScan(v);const r=parseGS1(n);S.lastScan=n;beep(!(r&&r.erreurs&&r.erreurs.length));const el=$('#scR');if(!el)return;
  const rows=[['Brut',esc(v)],['Normalisé',esc(n)]];
  if(/^STAFF\|/.test(n))rows.push(['Type','Badge agent : '+esc(staffNom(n.split('|')[1]))]);
  else if(r?.type==='loc')rows.push(['Type','Adresse d’emplacement'],['Emplacement',LOC[r.loc]?locTag(r.loc)+' '+esc(LOC[r.loc].type):pill('Inconnu','bad')]);
  else if(r){if(r.gtin)rows.push(['GTIN (01)',r.gtin+' '+(S.articles.find(a=>a.gtin===r.gtin)?pill(S.articles.find(a=>a.gtin===r.gtin).des,'ok'):pill('Absent du catalogue','warn'))]);if(r.lot)rows.push(['Lot (10)',esc(r.lot)]);if(r.exp)rows.push(['Péremption (17)',fr(r.exp)]);if(r.sscc)rows.push(['SSCC (00)',r.sscc]);if(r.erreurs.length)rows.push(['Contrôle',pill(r.erreurs.join(' ; '),'bad')]);else rows.push(['Contrôle',pill('Clés de contrôle valides','ok')])}
  el.innerHTML=table([{t:'Élément',f:x=>x[0]},{t:'Valeur',f:x=>x[1]}],rows);$('#scT').value=''}
