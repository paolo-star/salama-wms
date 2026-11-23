/*
 * SALAMA WMS – Interface : menu, rendu, tableaux, QR et codes-barres, exports Excel et PDF
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – interface : coquille, navigation, composants, exports ============ */
const NAV=[
  ['Pilotage',[['dash','Tableau de bord'],['alertes','Alertes et actions'],['actions','Registre des actions']]],
  ['Équipes',[['rh','Ressources humaines']]],
  ['Entrées',[['reception','Réception (X3)'],['qualite','Quarantaine et libération'],['rangement','Mise en emplacement']]],
  ['Stock',[['stock','Stocks, lots et FEFO'],['emplacements','Emplacements et QR'],['transferts','Transferts'],['inventaires','Inventaires'],['transfo','Transformation produits'],['froid','Chaîne du froid']]],
  ['Distribution 2027',[['commandes','Commandes et validation'],['plan','Plan de distribution'],['preparation','Préparation (picking)'],['emballage','Contrôle et emballage'],['expedition','Chargement et expédition']]],
  ['Dernier kilomètre',[['pod','Livraison et POD'],['agences','Agences régionales']]],
  ['Traçabilité',[['rappels','Rappels de lots'],['audit','Journal d’audit'],['recette','Recette et intégrité']]],
  ['Espace et analyse',[['espace','Volumes, espaces, CBM'],['abc','Classement ABC']]],
  ['Redevabilité et conformité',[['bailleurs','Stock par bailleur'],['kpi','Indicateurs bailleurs'],['interop','Interopérabilité nationale'],['tracabilite','Exigences et validation'],['reclamations','Réclamations et destructions']]],
  ['Paramétrage',[['articles','Catalogue articles'],['reseau','Réseau et flotte'],['roles','Rôles et séparation des tâches'],['scanner','Scanner et lecteurs'],['x3','Interface Sage X3'],['formation','Modules de formation'],['apropos','À propos']]]
];
let VIEW='dash';
function badgeCount(v){
  if(v==='qualite')return S.lots.filter(l=>l.statut==='Quarantaine').length;
  if(v==='rangement')return putawayTasks().length;
  if(v==='commandes')return S.orders.filter(o=>o.statut==='Soumise').length;
  if(v==='pod')return S.missions.filter(m=>m.statut==='En transit').length;
  if(v==='alertes')return alertList().filter(a=>a.niv!=='info').length;
  if(v==='x3')return S.x3msg.filter(m=>m.statut==='En file'||m.statut==='Rejeté').length;
  if(v==='froid')return (S.excursions||[]).filter(e=>e.statut==='Ouverte').length;
  if(v==='actions')return (S.actions||[]).filter(a=>a.statut!=='Clôturée').length;
  if(v==='expedition')return S.colis.filter(c=>c.statut==='Bloqué').length;
  return 0;
}
function shell(){
  document.getElementById('root').innerHTML=`<div class="app"><aside class="rail" id="rail">
  <div class="brand"><img src="${LOGO_S}" alt="SALAMA"><div><small>WMS multi-sites</small><b>SALAMA Entrepôts & Distribution</b></div></div>
  <nav class="nav" id="nav"></nav>
  <div class="dev"><img src="${LOGO_J}" alt="JPN Management Consulting"><span>Développé par JPN Management Consulting<br>© 2026 – Tous droits réservés</span></div></aside>
  <div class="main"><header class="top">
    <button class="btn menu" id="menuBtn" aria-label="Menu">☰ Menu</button>
    <label>Site<select id="siteSel">${REF.sites.map(s=>`<option value="${s.code}">${s.nom}</option>`).join('')}${REF.agences.map(a=>`<option value="${a.code}">${a.nom}</option>`).join('')}</select></label>
    <label>Utilisateur (démonstration)<select id="userSel">${S.users.map(u=>`<option value="${u.id}">${esc(u.nom)} – ${esc(ROLES[u.role].n)}</option>`).join('')}</select></label>
    <form class="scan" id="scanForm"><input id="scanIn" data-scan="route" placeholder="Scanner : GS1 (01)…(17)…(10)…, SSCC (00)…, ou adresse S1-R-A01-T01-N0-P1" aria-label="Zone de scan"><button class="btn p">Rechercher</button></form>
    <span id="netPill"></span>
  </header>
  <main class="page" id="page"></main>
  <footer class="foot"><span><span class="wmark">Démonstrateur – données fictives</span> · Structure et paramètres issus des documents SALAMA (plan de distribution 2027 V11, cahier des charges WMS–GS1–ERP v1.2)</span>
  <span><img src="${LOGO_J}" alt="">Conçu et développé par JPN Management Consulting · © 2026 Tous droits réservés</span></footer></div></div><div id="modal"></div><div id="toast"></div>`;
  $('#siteSel').value=S.site;$('#userSel').value=S.cur;
  $('#siteSel').onchange=e=>{S.site=e.target.value;save();render()};
  $('#userSel').onchange=e=>{S.cur=e.target.value;save();toast('Profil actif : '+me().nom+' – '+ROLES[me().role].n);render()};
  $('#menuBtn').onclick=()=>$('#rail').classList.toggle('open');
  $('#scanForm').onsubmit=e=>{e.preventDefault();globalScan($('#scanIn').value)};
  window.addEventListener('hashchange',()=>{VIEW=(location.hash||'#dash').slice(1);if(!VIEWS[VIEW])VIEW='dash';render()});
}
function renderNav(){
  $('#nav').innerHTML=NAV.map(([g,items])=>`<div class="grp">${g}</div>`+items.map(([k,l])=>{const n=badgeCount(k);return `<a href="#${k}" class="${VIEW===k?'on':''}">${l}${n?`<span class="n">${n}</span>`:''}</a>`}).join('')).join('');
  $$('#nav a').forEach(a=>a.onclick=()=>$('#rail').classList.remove('open'));
  $('#netPill').innerHTML=scanPill()+' '+`${S.offline?'<span class="pill warn">Mode dégradé (hors ligne)</span>':'<span class="pill ok">Réseau OK</span>'} ${S.x3down?'<span class="pill bad">X3 simulé : indisponible</span>':'<span class="pill info" title="Connecteur simulé dans ce démonstrateur">Sage X3 simulé</span>'}`;
}
function render(){if(!VIEWS[VIEW])VIEW='dash';renderNav();const p=$('#page');p.innerHTML=VIEWS[VIEW]();(BIND[VIEW]||(()=>{}))();bindCommon(p);try{p.focus({preventScroll:true})}catch(e){}window.scrollTo(0,0)}
function refresh(){save();const y=window.scrollY;renderNav();const p=$('#page');p.innerHTML=VIEWS[VIEW]();(BIND[VIEW]||(()=>{}))();bindCommon(p);window.scrollTo(0,y)}
function bindCommon(root){$$('[data-x]',root).forEach(b=>b.onclick=ev=>{ev.preventDefault();const f=ACT[b.dataset.x];if(f)f(b.dataset.a,b.dataset.b,b)})}
function toast(t,err){const el=$('#toast');el.innerHTML=`<div class="toast ${err?'err':''}">${esc(t)}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>el.innerHTML='',err?6000:3500)}
function deny(perm){toast('Action réservée : « '+(PERM_LIB[perm]||perm)+' ». Changez de profil en haut de page (séparation des tâches).',true)}
function need(perm){if(can(perm))return true;deny(perm);return false}
function modal(title,body,foot,opts={}){$('#modal').innerHTML=`<div class="modal" id="mbg"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${opts.w?'max-width:'+opts.w:''}"><div class="mhead"><h2>${esc(title)}</h2><button class="btn s" id="mclose">Fermer</button></div><div class="mbody">${body}</div>${foot?`<div class="mfoot">${foot}</div>`:''}</div></div>`;
  $('#mclose').onclick=closeModal;$('#mbg').onclick=e=>{if(e.target.id==='mbg')closeModal()};bindCommon($('#modal'));const f=$('#modal input,#modal select');if(f)setTimeout(()=>f.focus(),30)}
function closeModal(){$('#modal').innerHTML='';INV_OPEN=null;REC_OPEN=null}
function ph(t,sub,actions=''){return `<div class="ph"><div><h1>${t}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="row">${actions}</div></div>`}
function table(cols,rows,opts={}){
  if(!rows.length)return `<div class="card muted small">${opts.empty||'Aucune ligne.'}</div>`;
  return `<div class="tw" ${opts.max?`style="max-height:${opts.max}px"`:''}><table${opts.id?` id="${opts.id}"`:''}><thead><tr>${cols.map(c=>`<th class="${c.r?'r':''}">${c.t}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${opts.rowClass?opts.rowClass(r):''}">${cols.map(c=>`<td class="${c.r?'r':''}">${c.f?c.f(r):esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const pill=(t,c='neu')=>`<span class="pill ${c}">${esc(t)}</span>`;
const locTag=c=>`<span class="loc">${esc(c)}</span>`;
function lotPill(st){return pill(st,{Libéré:'ok',Quarantaine:'warn',Bloqué:'bad',Rappelé:'bad',Expiré:'bad',Endommagé:'bad',Retourné:'info','Destruction autorisée':'dec'}[st]||'neu')}
function expPill(exp){const m=monthsLeft(exp);const c=m<=0?'bad':m<=3?'bad':m<=6?'warn':m<=12?'info':'ok';return `<span class="pill ${c}">${fr(exp)} · ${m<=0?'périmé':fmt(m,1)+' mois'}</span>`}
function bar(v,c){const col=c||(v>1?'var(--red)':v>.85?'var(--orange)':'var(--green)');return `<div class="bar" title="${pct(v,1)}"><i style="width:${Math.min(100,v*100)}%;background:${col}"></i></div>`}
function ordPill(s){return pill(s,{Brouillon:'neu',Soumise:'warn',Validée:'info',Planifiée:'info','En préparation':'warn',Préparée:'info',Contrôlée:'info',Emballée:'info','En transit':'warn',Livrée:'ok',Facturée:'ok',Clôturée:'dec',Rejetée:'bad'}[s]||'neu')}
const FLOW=['Brouillon','Soumise','Validée','Planifiée','En préparation','Contrôlée','Emballée','En transit','Livrée','Clôturée'];
function flowHTML(s){const i=FLOW.indexOf(s);return `<div class="flow">${FLOW.map((x,k)=>`<span class="${k<i?'done':k===i?'cur':''}">${x}</span>`).join('')}</div>`}
function artLabel(c){const a=ART[c];return a?`<b>${esc(a.des)}</b><br><span class="small muted">${esc(a.code)} · ${esc(a.ud)}</span>`:esc(c)}
function opt(list,sel){return list.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return `<option value="${esc(v)}" ${v==sel?'selected':''}>${esc(l)}</option>`}).join('')}
const siteNom=c=>(REF.sites.find(s=>s.code===c)||REF.agences.find(a=>a.code===c)||{nom:c}).nom;

/* ---------- QR et codes-barres ---------- */
function qrSVG(text,size=64){try{const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),c=size/n;let p='';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))p+=`M${(k*c).toFixed(2)} ${(r*c).toFixed(2)}h${c.toFixed(2)}v${c.toFixed(2)}h-${c.toFixed(2)}z`;return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR ${esc(text)}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`}catch(e){return ''}}
function qrDataURL(text,px=4){try{const q=qrcode(0,'M');q.addData(text);q.make();return q.createDataURL(px,2)}catch(e){return null}}
function barcodeDataURL(sscc){try{const c=document.createElement('canvas');JsBarcode(c,'(00)'+sscc,{format:'CODE128',ean128:true,displayValue:true,fontSize:14,height:60,margin:6});return c.toDataURL('image/png')}catch(e){return null}}

/* ---------- Téléchargements : capacité « downloads » de l'artefact, sinon lien local ---------- */
let DL=null;
async function initDownloads(){DL=null}
async function saveFile(filename,data,mime){
  if(DL){try{await DL.save({filename,data});toast('Fichier proposé au téléchargement : '+filename)}catch(e){toast(e&&e.code==='declined'?'Téléchargement annulé.':'Téléchargement impossible ici ('+(e&&e.code||'erreur')+').',true)}return}
  try{const blob=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast('Fichier enregistré : '+filename)}catch(e){toast('Téléchargement impossible dans cette vue.',true)}
}
function xlsxExport(name,sheets){if(typeof XLSX==='undefined')return toast('Bibliothèque Excel non chargée.',true);const wb=XLSX.utils.book_new();
  sheets.forEach(([n,rows])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Info:'Aucune donnée'}]),n.slice(0,31)));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SALAMA – WMS (démonstrateur)'],['Export du',frt(Date.now())],['Utilisateur',me().nom+' – '+ROLES[me().role].n],['Avertissement','Données fictives de démonstration'],['Développement','JPN Management Consulting – © 2026 Tous droits réservés']]),'Informations');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});saveFile(name+'.xlsx',new Uint8Array(out),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
/* En-tête et pied de page PDF communs */
function pdfDoc(title,ref,orient='p'){
  const {jsPDF}=window.jspdf;const d=new jsPDF({orientation:orient,unit:'mm',format:'a4'});
  const san=t=>Array.isArray(t)?t.map(san):String(t).replace(/→/g,'>').replace(/←/g,'<').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/[\u202F\u00A0]/g,' ').replace(/×/g,'x');const ot=d.text.bind(d);d.text=(t,...a)=>ot(san(t),...a);const os=d.splitTextToSize.bind(d);d.splitTextToSize=(t,...a)=>os(san(t),...a);const W=d.internal.pageSize.getWidth();
  try{d.addImage(LOGO_S,'PNG',12,8,30,18)}catch(e){}
  d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(19,48,74);d.text(title,48,15);
  d.setFont('helvetica','normal');d.setFontSize(9);d.setTextColor(90,107,98);d.text(ref,48,21);
  d.setFillColor(22,152,77);d.rect(0,28,W,1.6,'F');d.setFillColor(232,119,42);d.rect(0,29.6,W,.8,'F');
  d.__foot=()=>{const n=d.getNumberOfPages();for(let i=1;i<=n;i++){d.setPage(i);const H=d.internal.pageSize.getHeight();d.setFontSize(7.5);d.setTextColor(120);
    try{d.addImage(LOGO_J,'PNG',12,H-11,7,7)}catch(e){}d.text('SALAMA WMS – démonstrateur, données fictives · Développé par JPN Management Consulting · © 2026 Tous droits réservés',21,H-6.5);d.text('Page '+i+'/'+n,W-24,H-6.5)}};
  return d;
}
function pdfTable(d,y,head,rows,widths,opts={}){
  const W=d.internal.pageSize.getWidth(),H=d.internal.pageSize.getHeight();let x0=12;d.setFontSize(opts.fs||8);
  const drawHead=()=>{d.setFillColor(227,243,233);d.rect(x0,y-4,W-24,6,'F');d.setFont('helvetica','bold');d.setTextColor(19,48,74);let x=x0+1;head.forEach((h,i)=>{d.text(String(h),x,y);x+=widths[i]});y+=5;d.setFont('helvetica','normal');d.setTextColor(30)};
  drawHead();
  rows.forEach(r=>{const lines=r.map((c,i)=>d.splitTextToSize(String(c??''),widths[i]-2));const hgt=Math.max(...lines.map(l=>l.length))*3.6+1.4;
    if(y+hgt>H-16){d.addPage();y=20;drawHead()}let x=x0+1;lines.forEach((l,i)=>{d.text(l,x,y);x+=widths[i]});y+=hgt;d.setDrawColor(214,224,218);d.line(x0,y-2.6,W-12,y-2.6)});
  return y+2;
}
function svgLine(series,labels,opts={}){
  const W=640,H=220,p={l:46,r:12,t:14,b:28};const all=series.flatMap(s=>s.v).concat(opts.ref||[]);const mx=Math.max(...all)*1.08||1,mn=0;
  const X=i=>p.l+(W-p.l-p.r)*i/Math.max(1,labels.length-1),Y=v=>p.t+(H-p.t-p.b)*(1-(v-mn)/(mx-mn));
  const ticks=4;let g='';for(let i=0;i<=ticks;i++){const v=mn+(mx-mn)*i/ticks;g+=`<line x1="${p.l}" x2="${W-p.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${p.l-6}" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`}
  labels.forEach((l,i)=>{if(i%Math.ceil(labels.length/8)===0)g+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle">${esc(l)}</text>`});
  (opts.refs||[]).forEach(r=>g+=`<line x1="${p.l}" x2="${W-p.r}" y1="${Y(r.v)}" y2="${Y(r.v)}" stroke="${r.c}" stroke-dasharray="5 4"/><text x="${W-p.r}" y="${Y(r.v)-4}" text-anchor="end" style="fill:${r.c}">${esc(r.l)}</text>`);
  series.forEach(s=>{g+=`<polyline fill="none" stroke="${s.c}" stroke-width="2.2" points="${s.v.map((v,i)=>X(i)+','+Y(v)).join(' ')}"/>`;const i=s.v.length-1;g+=`<circle cx="${X(i)}" cy="${Y(s.v[i])}" r="4" fill="${s.c}"/>`});
  return `<div style="overflow-x:auto"><svg class="svgc" viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px" role="img" aria-label="${esc(opts.label||'graphique')}">${g}</svg></div><div class="row small">${series.map(s=>`<span><i style="display:inline-block;width:12px;height:3px;background:${s.c};vertical-align:middle"></i> ${esc(s.n)}</span>`).join('')}</div>`;
}
