/*
 * SALAMA WMS – Noyau : utilitaires, référentiels, GS1, FEFO, colisage, choix des véhicules, données de démonstration
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – noyau : utilitaires, référentiels, données de démonstration, règles métier ============ */
'use strict';
const APP_VER='1.0';const APP_REL='1.5';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(n,d=0)=>fmt(n*100,d)+' %';
const uid=(p)=>p+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
const DAY=864e5;
const iso=d=>{d=new Date(d);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fr=d=>{if(!d)return '';d=new Date(d);return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()};
const frt=d=>{d=new Date(d);return fr(d)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const addD=(d,n)=>new Date(new Date(d).getTime()+n*DAY);
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const monthsLeft=exp=>(new Date(exp)-today())/(30.44*DAY);
const sum=(a,f=x=>x)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const by=(a,k)=>a.reduce((m,x)=>{const v=typeof k==='function'?k(x):x[k];(m[v]=m[v]||[]).push(x);return m},{});

/* ---------- Référentiels issus des documents SALAMA ---------- */
const REF={
  sites:[
    {code:'S1',nom:'SALAMA 1 – Anosiala',cap:2900,occRef:3963,froid:true,racks:true},
    {code:'S2',nom:'SALAMA 2 – Alakamisy',cap:1600,occRef:1453,froid:false,racks:false},
    {code:'S3',nom:'SALAMA 3 – Ambohidratrimo',cap:1350,occRef:1215,froid:false,racks:false}
  ],
  agences:[
    {code:'AG-ANT',nom:'Agence Antsiranana'},{code:'AG-FIA',nom:'Agence Fianarantsoa'},{code:'AG-MAJ',nom:'Agence Mahajanga'},
    {code:'AG-TOA',nom:'Agence Toamasina'},{code:'AG-TOL',nom:'Agence Toliary'}
  ],
  routes:{R01:'Centre urbain & Est proche',R02:'Centre Ouest',R03:'Est littoral',R04:'Est enclavé & maritime',R05:'Nord-Ouest principal',R06:'Melaky & Betsiboka enclavé',R07:'Nord DIANA',R08:'Nord SAVA',R09:'Hautes terres & Sud-Est',R10:'Sud-Ouest & Grand Sud'},
  /* cartons de reconditionnement standard confirmés par SALAMA le 31/10/2026 (cm) */
  cartons:[{code:'007',l:54,w:40,h:35,tare:.6},{code:'003',l:36,w:32,h:26,tare:.35},{code:'001',l:25,w:21,h:12,tare:.15}],
  /* gabarits 3PL de l'annexe B (BPU par arrêt) */
  vclasses:[
    {code:'V1',lib:'1–3,5 t (≤ 10 m³)',t:3.5,m3:10},{code:'V2',lib:'3,5–5 t (10–20 m³)',t:5,m3:20},{code:'V3',lib:'5–7,5 t (20–27 m³)',t:7.5,m3:27},
    {code:'V4',lib:'10–15 t (33–45 m³)',t:15,m3:45},{code:'V5',lib:'15–25 t (45–50 m³)',t:25,m3:50}
  ],
  /* cycles 2027 : C1 validé (premier départ 08/02/2027) ; C2–C4 indicatifs, à confirmer par la Direction */
  cycles:[{c:'C1',dep:'2027-02-08',ok:true},{c:'C2',dep:'2027-05-10',ok:false},{c:'C3',dep:'2027-08-09',ok:false},{c:'C4',dep:'2027-11-08',ok:false}],
  feries:['2026-12-25','2027-01-01','2027-03-08','2027-03-29','2027-05-01','2027-05-06','2027-05-17','2027-06-26','2027-08-15','2027-11-01','2027-12-25'],
  fill:{cible:.95,alerte:.80},
  prio:{P1:'Urgence vitale – 24 h',P2:'Urgence programme – 72 h',P3:'Standard – 10 jours',P4:'Cycle planifié'},
  statutsLot:['Quarantaine','Libéré','Bloqué','Rappelé','Expiré','Endommagé','Retourné','Destruction autorisée'],
  gs1Prefix:'0614141' /* préfixe d'exemple officiel GS1 – à remplacer par le préfixe SALAMA */
};
const SP=SP_RAW.map(([code,route,nom,seq,km,j,veh])=>({code,route,nom,seq,km,j,veh}));
const DEST=[];SP.forEach(s=>s.seq.forEach((d,i)=>{if(!DEST.find(x=>x.nom===d&&x.sp===s.code))DEST.push({code:'D'+String(DEST.length+1).padStart(3,'0'),nom:d,sp:s.code,route:s.route,ordre:i+1})}));
const FLEET=FLEET_RAW.map(([type,mod,t,imm,m3,etat],i)=>({id:'F'+String(i+1).padStart(2,'0'),type,mod,t,imm,m3,etat}));
/* capacité de route : tonnage maximum lu dans la recommandation du plan V11 */
function spMax(sp){const v=sp.veh||'';if(/4x4 de bout|^4x4$/.test(v))return {t:.9,m3:3,only4x4:true};
  if(/1–3,5 t/.test(v))return {t:3.5,m3:10};if(/3,5–5 t/.test(v))return {t:5,m3:20};if(/5–7,5 t/.test(v))return {t:7.5,m3:27};
  if(/8 t/.test(v))return {t:8,m3:30};if(/10–15 t/.test(v))return {t:15,m3:45};if(/Camion R0/.test(v))return {t:8,m3:30,passage:v.replace('Camion ','')};return {t:15,m3:45}}

/* ---------- Rôles et séparation des tâches ---------- */
const ROLES={
  REC:{n:'Agent de réception',p:['rec']},
  PR:{n:'Pharmacien responsable (AQ)',p:['qa','recall','transfo_ok','destroy']},
  CHE:{n:"Chef d'entrepôt – Direction Stock",p:['put','trf','trf_ok','inv_ok','abc','space','rh']},
  MAG:{n:'Magasinier – cariste',p:['put','trf','inv_count']},
  PREP:{n:'Préparateur',p:['pick']},
  CTRL:{n:'Contrôleur – emballeur',p:['ctrl','pack','transfo']},
  COM:{n:'Agent commercial DVM',p:['ord']},
  DVM:{n:'Validateur DVM / DAS',p:['ord_ok','stopgo']},
  PLA:{n:'Planificateur transport',p:['plan','load']},
  CHA:{n:'Chauffeur – transporteur 3PL',p:['pod']},
  AGE:{n:'Responsable agence',p:['rec_ag','pod','ord']},
  INV:{n:'Contrôle interne – inventaire',p:['inv_ok2']},
  ADM:{n:'Administrateur DSI',p:['admin','x3']},
  AUD:{n:'Auditeur (lecture seule)',p:[]}
};
const PERM_LIB={rec:'Réceptionner',qa:'Libérer / bloquer un lot',recall:'Lancer un rappel',transfo_ok:'Approuver une transformation',destroy:'Autoriser une destruction',put:'Ranger',trf:'Transférer',trf_ok:'Approuver un transfert inter-sites',inv_ok:'Valider un écart d’inventaire (niveau 1)',inv_ok2:'Valider un écart d’inventaire (niveau 2)',inv_count:'Compter',abc:'Reclasser ABC / re-slotting',space:'Prévisions d’espace',pick:'Préparer (picking)',ctrl:'Contrôler',pack:'Emballer – colisage',transfo:'Créer une transformation',ord:'Saisir une commande',ord_ok:'Valider une commande (gel)',stopgo:'Décider le stop / go J-15',plan:'Planifier – réserver J-20',load:'Charger – expédier',pod:'Enregistrer une POD',rec_ag:'Réceptionner en agence',admin:'Paramétrer',x3:'Rejouer les flux X3',rh:'Gérer les équipes (RH entrepôt)'};
const SOD=[
  ['Réception','Libération qualité','Un même utilisateur ne peut pas réceptionner puis libérer le même lot.'],
  ['Saisie de commande','Validation DVM / DAS','Le saisisseur ne valide jamais sa propre commande (VAL-004).'],
  ['Préparation','Contrôle final','Le contrôleur doit être différent du préparateur.'],
  ['Comptage','Validation d’écart','Le compteur ne valide pas l’ajustement ; au-delà du seuil, double validation Stock + Contrôle interne.'],
  ['Création de transformation','Approbation AQ','Toute nouvelle identité produit est approuvée par le Pharmacien responsable.'],
  ['Demande de transfert inter-sites','Approbation','Le demandeur n’approuve pas son propre transfert.'],
  ['Paramétrage DSI','Opérations','L’administrateur paramètre mais n’exécute aucune opération de stock.']
];

/* ---------- Articles de démonstration (données fictives, structure du catalogue SALAMA) ---------- */
/* [code, désignation, UD, catégorie, température, programme, transport, carton l,w,h cm, kg carton, UD/carton, UD l,w,h cm, kg UD, prix MGA/UD, durée résiduelle min (mois)] */
const ART_RAW=[
 ['PARA500','Paracétamol 500 mg comprimé','Boîte de 1000 cp','Médicament','Ambiant','FANOME','Ambiant',52,34,30,18,20,16,12,14,.85,9500,6],
 ['AMOX500','Amoxicilline 500 mg gélule','Boîte de 1000 gél','Médicament','Ambiant','FANOME','Ambiant',45,30,28,11,10,15,14,13,1.05,32000,6],
 ['SRO','Sels de réhydratation orale (SRO)','Sachet 20,5 g','Médicament','Ambiant','UNICEF','Ambiant',40,30,30,22,1000,10,7,.5,.022,350,9],
 ['ZINC20','Zinc 20 mg comprimé dispersible','Boîte de 100 cp','Médicament','Ambiant','UNICEF','Ambiant',40,30,25,6,100,8,6,3,.055,2800,9],
 ['ASAQ','Artésunate-amodiaquine 100/270 mg','Boîte de 25 blisters','Médicament','Ambiant','Fonds mondial','Haute valeur',38,28,26,7,40,12,8,5,.16,21000,9],
 ['ARTI60','Artésunate 60 mg injectable','Flacon + solvant','Médicament','Ambiant','Fonds mondial','Haute valeur',35,25,20,4,100,6,3,3,.03,7800,9],
 ['OCYT10','Ocytocine 10 UI/ml injectable','Boîte de 50 amp.','Médicament','Froid 2–8 °C','UNFPA','Thermosensible',30,25,20,4,20,10,8,4,.17,26000,9],
 ['INSR','Insuline humaine rapide 100 UI/ml','Flacon 10 ml','Médicament','Froid 2–8 °C','FANOME','Thermosensible',28,22,18,3,50,4,4,8,.05,18500,9],
 ['FERAF','Fer + acide folique comprimé','Boîte de 1000 cp','Médicament','Ambiant','UNFPA','Ambiant',44,30,26,14,16,14,10,11,.8,8200,6],
 ['TRICLO','Triclofem injectable 150 mg/ml','Flacon 1 ml','Médicament','Ambiant','UNFPA','Haute valeur',36,26,18,5,200,3,3,5,.018,2100,9],
 ['MGSO4','Sulfate de magnésium 50 % injectable','Boîte de 10 amp.','Médicament','Ambiant','UNFPA','Ambiant',34,24,22,6,40,12,6,4,.13,6400,6],
 ['CEFT1G','Ceftriaxone 1 g injectable','Boîte de 50 fl.','Médicament','Ambiant','FANOME','Ambiant',40,30,24,6,10,18,14,9,.55,54000,9],
 ['METRO250','Métronidazole 250 mg comprimé','Boîte de 1000 cp','Médicament','Ambiant','FANOME','Ambiant',44,30,26,12,16,14,10,11,.7,11000,6],
 ['COTRI480','Cotrimoxazole 400/80 mg comprimé','Boîte de 1000 cp','Médicament','Ambiant','FANOME','Ambiant',44,30,26,13,16,14,10,11,.78,10500,6],
 ['RL500','Ringer lactate 500 ml','Flacon 500 ml','Soluté','Ambiant','FANOME','Ambiant',38,26,22,11,20,9,6,19,.54,2600,12],
 ['G5500','Glucose 5 % 500 ml','Flacon 500 ml','Soluté','Ambiant','FANOME','Ambiant',38,26,22,11,20,9,6,19,.54,2400,12],
 ['SER5','Seringue 5 ml usage unique','Boîte de 100','Consommable','Ambiant','FANOME','Ambiant',50,40,35,8,20,24,12,9,.4,9000,12],
 ['GANTM','Gants d’examen taille M','Boîte de 100','Consommable','Ambiant','FANOME','Ambiant',50,25,24,6,10,24,12,6,.6,14000,12],
 ['PERF','Perfuseur à prise d’air','Unité','Consommable','Ambiant','FANOME','Ambiant',55,40,32,9,500,18,12,1.5,.018,900,12],
 ['TDRP','Test diagnostic rapide paludisme','Boîte de 25 tests','Diagnostic','Ambiant','Fonds mondial','Haute valeur',48,32,30,7,40,20,12,6,.17,26000,9],
 ['ALC70','Alcool à 70 % 1 L','Flacon 1 L','Consommable','Ambiant','FANOME','Dangereux',40,30,30,13,12,10,10,25,1.05,6500,12],
 ['COMP10','Compresses stériles 10×10 cm','Boîte de 100','Consommable','Ambiant','FANOME','Ambiant',45,35,30,5,20,20,12,8,.24,7500,12],
 ['DIAZ10','Diazépam 10 mg/2 ml injectable','Boîte de 10 amp.','Psychotrope','Ambiant','FANOME','Stupéfiant',30,20,15,2,50,10,5,3,.04,3800,9],
 ['MORPH10','Morphine 10 mg/ml injectable','Boîte de 10 amp.','Stupéfiant','Ambiant','FANOME','Stupéfiant',30,20,15,2,50,10,5,3,.04,9500,9],
 ['LIDO2','Lidocaïne 2 % flacon 20 ml','Flacon 20 ml','Médicament','Ambiant','FANOME','Ambiant',32,22,16,4,100,3,3,7,.04,1900,9],
 ['MEBEN','Mébendazole 500 mg comprimé','Boîte de 100 cp','Médicament','Ambiant','UNICEF','Ambiant',40,30,25,7,100,8,6,3,.06,4200,9],
 ['VITA','Vitamine A 200 000 UI capsule','Pot de 500 caps','Médicament','Ambiant','UNICEF','Ambiant',36,28,24,6,40,7,7,9,.14,15000,9],
 ['PRESM','Préservatifs masculins','Boîte de 144','Consommable','Ambiant','UNFPA','Ambiant',50,35,30,10,40,17,9,8,.24,5200,12]
];
function gtinCheck(s){let t=0;const r=s.split('').reverse();r.forEach((c,i)=>t+=(+c)*(i%2===0?3:1));return (10-t%10)%10}
function mkGTIN(i){const b='0'+REF.gs1Prefix+String(10000+i).slice(-5);return b+gtinCheck(b)}
function mkSSCC(n){const b='0'+REF.gs1Prefix+String(n).padStart(9,'0');return b+gtinCheck(b)}
function mkGLN(i){const b=REF.gs1Prefix+String(10000+i).slice(-5);return b+gtinCheck(b)}

/* ---------- Analyse GS1 (codes lus par scanner en mode clavier) ---------- */
function parseGS1(raw){const u=String(raw||'').trim();const m=u.match(/^https?:\/\/[^/]+\/(?:.*\/)?(01|00)\/(\d{14}|\d{18})(?:\/10\/([^/?#]+))?(?:\?(.*))?$/);
  if(m){const r={type:'gs1',raw:u,erreurs:[]};if(m[1]==='00')r.sscc=m[2];else r.gtin=m[2];if(m[3])r.lot=decodeURIComponent(m[3]);const q=new URLSearchParams(m[4]||'');const e=q.get('17');if(e){const y=+e.slice(0,2),mo=+e.slice(2,4),d=+e.slice(4,6);r.exp=iso(new Date(2000+y,mo-1,d||new Date(2000+y,mo,0).getDate()))}
    if(r.gtin&&gtinCheck(r.gtin.slice(0,13))!=r.gtin[13])r.erreurs.push('Clé de contrôle GTIN invalide');if(r.sscc&&gtinCheck(r.sscc.slice(0,17))!=r.sscc[17])r.erreurs.push('Clé de contrôle SSCC invalide');return r}
  return parseGS1Core(raw)}
function parseGS1Core(raw){
  raw=String(raw||'').trim();if(!raw)return null;
  if(/^LOC\|/.test(raw))return {type:'loc',loc:raw.split('|')[1]};
  if(/^S[123]-|^AG-/.test(raw))return {type:'loc',loc:raw};
  const out={};let s=raw.replace(/\u001d/g,'|');
  if(s.includes('(')){const re=/\((\d{2,4})\)([^(]*)/g;let m;while((m=re.exec(s)))out[m[1]]=m[2].replace(/\|/g,'').trim()}
  else{let i=0;const fixed={'00':18,'01':14,'17':6,'11':6};while(i<s.length){const ai=s.substr(i,2);i+=2;if(fixed[ai]){out[ai]=s.substr(i,fixed[ai]);i+=fixed[ai]}else{let j=s.indexOf('|',i);if(j<0)j=s.length;out[ai]=s.slice(i,j);i=j+1}}}
  const r={type:'gs1',raw};if(out['00'])r.sscc=out['00'];if(out['01'])r.gtin=out['01'];if(out['10'])r.lot=out['10'];if(out['21'])r.serie=out['21'];
  if(out['17']){const y=+out['17'].slice(0,2),m=+out['17'].slice(2,4),d=+out['17'].slice(4,6);const last=new Date(2000+y,m,0).getDate();r.exp=iso(new Date(2000+y,m-1,d||last))}
  r.erreurs=[];if(r.gtin&&(r.gtin.length!==14||gtinCheck(r.gtin.slice(0,13))!=r.gtin[13]))r.erreurs.push('Clé de contrôle GTIN invalide');
  if(r.sscc&&(r.sscc.length!==18||gtinCheck(r.sscc.slice(0,17))!=r.sscc[17]))r.erreurs.push('Clé de contrôle SSCC invalide');
  return r;
}
function gs1String(a,lot,exp){const e=new Date(exp);return '(01)'+a.gtin+'(17)'+String(e.getFullYear()).slice(2)+String(e.getMonth()+1).padStart(2,'0')+String(e.getDate()).padStart(2,'0')+'(10)'+lot}

/* ---------- Calendrier : jalons J-n en jours calendaires ramenés au jour ouvré précédent ---------- */
const isWork=d=>{d=new Date(d);const w=d.getDay();return w!==0&&w!==6&&!REF.feries.includes(iso(d))};
const prevWork=d=>{d=new Date(d);while(!isWork(d))d=addD(d,-1);return d};
const jalon=(dep,n)=>prevWork(addD(dep,-n));
function workDaysBetween(a,b){let n=0,d=new Date(a);while(d<b){d=addD(d,1);if(isWork(d))n++}return n}

/* ---------- Calculs physiques : CBM, colisage, plus petite unité de distribution ---------- */
const cm3=(l,w,h)=>l*w*h/1e6;
function colisage(lines){
  /* lines : [{art, qty}] en UD → cartons d'origine complets + reliquat en vrac reconditionné en cartons 001/003/007 */
  const res={orig:[],recon:[],kg:0,m3:0,colis:0,detail:[]};const vrac={};
  lines.forEach(l=>{const a=ART[l.art];if(!a||!(l.qty>0))return;const full=Math.floor(l.qty/a.udc),rem=l.qty-full*a.udc;
    const cv=cm3(a.cl,a.cw,a.ch);if(full>0){res.orig.push({art:a.code,n:full,kg:full*a.ckg,m3:full*cv});res.kg+=full*a.ckg;res.m3+=full*cv;res.colis+=full}
    if(rem>0){const k=a.tr+'|'+a.temp;(vrac[k]=vrac[k]||{tr:a.tr,temp:a.temp,m3:0,kg:0,items:[]});const v=rem*cm3(a.ul,a.uw,a.uh);vrac[k].m3+=v;vrac[k].kg+=rem*a.ukg;vrac[k].items.push({art:a.code,qty:rem})}
    res.detail.push({art:a.code,qty:l.qty,full,rem,udc:a.udc})});
  const eff=.85;
  Object.values(vrac).forEach(g=>{let left=g.m3;const cnt={};
    while(left>1e-9){const c7=REF.cartons[0],c3=REF.cartons[1],c1=REF.cartons[2];const v7=cm3(c7.l,c7.w,c7.h)*eff,v3=cm3(c3.l,c3.w,c3.h)*eff,v1=cm3(c1.l,c1.w,c1.h)*eff;
      const c=left>v3?c7:left>v1?c3:c1;const cap=cm3(c.l,c.w,c.h)*eff;cnt[c.code]=(cnt[c.code]||0)+1;left-=cap}
    Object.entries(cnt).forEach(([code,n])=>{const c=REF.cartons.find(x=>x.code===code);const v=cm3(c.l,c.w,c.h)*n;res.recon.push({carton:code,n,tr:g.tr,temp:g.temp,m3:v,kg:0});res.m3+=v;res.colis+=n;res.kg+=c.tare*n});
    res.kg+=g.kg;const tot=sum(res.recon.filter(r=>r.tr===g.tr&&r.temp===g.temp),r=>r.m3);res.recon.filter(r=>r.tr===g.tr&&r.temp===g.temp).forEach(r=>r.kg=g.kg*r.m3/tot+REF.cartons.find(c=>c.code===r.carton).tare*r.n);
  });
  return res;
}
/* Choix du véhicule : minimise nb × (volume + 15 m³ de pénalité), respecte la classe d'accès de la route */
function choixVehicule(m3,kg,sp){
  const mx=spMax(sp);let cands=REF.vclasses.filter(v=>v.t<=mx.t+.01);
  if(mx.only4x4)cands=[{code:'4x4',lib:'4x4 (0,8 t – 3 m³)',t:.8,m3:3}];
  if(!cands.length)cands=[REF.vclasses[0]];
  const internes=[{code:'INT8',lib:'Camion interne 8 t – 30 m³',t:8,m3:30,interne:true},{code:'INT12',lib:'Camion interne 12 t – 40 m³',t:12,m3:40,interne:true},{code:'INT3',lib:'Camion interne 3 t – 20 m³',t:3,m3:20,interne:true}];
  if(/interne/.test(sp.veh))cands=cands.concat(internes.filter(v=>v.t<=mx.t+.01));
  let best=null;cands.forEach(v=>{const n=Math.max(1,Math.ceil(Math.max(m3/(v.m3),kg/(v.t*1000))-1e-9));const score=n*(v.m3+15);if(!best||score<best.score)best={...v,n,score,fill:m3/(n*v.m3),fillKg:kg/(n*v.t*1000)}});
  best.statut=best.fill>=REF.fill.cible?'PLEIN':best.fill>=REF.fill.alerte?'À COMPLÉTER':'MUTUALISER';
  if(mx.passage){best.statut='EN PASSAGE';best.lib='Livré par '+mx.passage}
  return best;
}
const palettesDe=(a,qty)=>{const cv=cm3(a.cl,a.cw,a.ch);const cpp=Math.max(1,Math.floor(1.44*.85/cv));return qty/a.udc/cpp};

/* ---------- État et persistance ---------- */
let S=null,ART={},LOC={};
const STORE_KEY='salama_wms_v1';
function indexes(){ART={};S.articles.forEach(a=>ART[a.code]=a);LOC={};S.locations.forEach(l=>LOC[l.code]=l)}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(S))}catch(e){}}
function load(){try{const t=localStorage.getItem(STORE_KEY);if(t){const s=JSON.parse(t);if(s&&s.ver===APP_VER)return s}}catch(e){}return null}
function me(){return S.users.find(u=>u.id===S.cur)||S.users[0]}
function can(p){const u=me();return (ROLES[u.role]?.p||[]).includes(p)}
function audit(action,objet,detail){const u=me();S.audit.unshift({ts:Date.now(),user:u.nom,role:ROLES[u.role].n,action,objet,detail:detail||''});if(S.audit.length>800)S.audit.length=800}
function x3(flux,objet,ref,payload){const m={id:uid('X3'),ts:Date.now(),flux,objet,ref,payload:payload||{},statut:S.x3down?'En file':'Accusé',essais:S.x3down?0:1,err:''};S.x3msg.unshift(m);return m}
function nextNo(k,p){S.seq[k]=(S.seq[k]||0)+1;return p+String(S.seq[k]).padStart(5,'0')}
function lotOf(id){return S.lots.find(l=>l.id===id)}
function stockOfLot(id){return S.stock.filter(s=>s.lotId===id&&s.qty>0)}

/* ---------- Génération des emplacements (adresses jusqu'à la case) ---------- */
function genLocations(){
  const L=[];let g=1;
  const add=(o)=>{o.gln=mkGLN(g++);o.statut=o.statut||'Actif';L.push(o)};
  REF.sites.forEach(si=>{const s=si.code;
    add({code:s+'-QUAI-R1',site:s,zone:'QUAI',type:'Quai réception',temp:'Ambiant',capPal:12,abc:'-'});
    add({code:s+'-QUA-01',site:s,zone:'QUA',type:'Quarantaine',temp:'Ambiant',capPal:40,abc:'-'});
    add({code:s+'-NC-01',site:s,zone:'NC',type:'Non-conformes / bloqués',temp:'Ambiant',capPal:15,abc:'-'});
    add({code:s+'-RET-01',site:s,zone:'RET',type:'Retours',temp:'Ambiant',capPal:10,abc:'-'});
    add({code:s+'-DEST-01',site:s,zone:'DEST',type:'Destruction (sous scellé)',temp:'Ambiant',capPal:10,abc:'-'});
    if(si.racks){
      for(let a=1;a<=4;a++)for(let t=1;t<=8;t++)for(let n=0;n<=3;n++)for(let p=1;p<=2;p++)
        add({code:`${s}-R-A${String(a).padStart(2,'0')}-T${String(t).padStart(2,'0')}-N${n}-P${p}`,site:s,zone:'R',type:'Rack palettes',temp:'Ambiant',capPal:1,abc:a===1&&n<=1?'A':a<=2?'B':'C'});
      for(let e=1;e<=2;e++)for(let t=1;t<=6;t++)for(let n=1;n<=4;n++)for(let c=1;c<=4;c++)
        add({code:`${s}-P-E${String(e).padStart(2,'0')}-T${String(t).padStart(2,'0')}-N${n}-C${String(c).padStart(2,'0')}`,site:s,zone:'P',type:'Picking – case',temp:'Ambiant',capPal:.06,abc:n<=2?'A':'B'});
    }
    if(si.froid)for(let a=1;a<=2;a++)for(let t=1;t<=4;t++)for(let n=1;n<=3;n++)for(let p=1;p<=2;p++)
      add({code:`${s}-F-A${String(a).padStart(2,'0')}-T${String(t).padStart(2,'0')}-N${n}-P${p}`,site:s,zone:'F',type:'Chambre froide 2–8 °C',temp:'Froid 2–8 °C',capPal:.5,abc:'A'});
    if(si.code==='S1')for(let c=1;c<=4;c++)add({code:`${s}-STUP-C${String(c).padStart(2,'0')}`,site:s,zone:'STUP',type:'Coffre stupéfiants',temp:'Ambiant',capPal:.2,abc:'A',restr:'Stupéfiant'});
    const blocs=si.racks?3:10;for(let b=1;b<=blocs;b++)for(let e=1;e<=6;e++)
      add({code:`${s}-SOL-B${String(b).padStart(2,'0')}-E${String(e).padStart(2,'0')}`,site:s,zone:'SOL',type:si.racks?'Sol temporaire (durée max. 15 j)':'Sol marqué – bloc',temp:'Ambiant',capPal:4,abc:b<=3?'A':b<=6?'B':'C'});
    for(let r=1;r<=10;r++)add({code:`${s}-EXP-R${String(r).padStart(2,'0')}`,site:s,zone:'EXP',type:'Staging expédition route R'+String(r).padStart(2,'0'),temp:'Ambiant',capPal:20,abc:'-'});
  });
  REF.agences.forEach(a=>{for(let e=1;e<=3;e++)for(let c=1;c<=4;c++)add({code:`${a.code}-E${String(e).padStart(2,'0')}-C${String(c).padStart(2,'0')}`,site:a.code,zone:'AG',type:'Agence – étagère',temp:'Ambiant',capPal:.5,abc:'-'});add({code:a.code+'-QUAI',site:a.code,zone:'QUAI',type:'Agence – réception',temp:'Ambiant',capPal:6,abc:'-'})});
  return L;
}

/* ---------- Données de démonstration ---------- */
function rnd(seed){let s=seed;return ()=>{s=(s*9301+49297)%233280;return s/233280}}
function genDemo(){
  const R=rnd(20271);
  S={ver:APP_VER,created:Date.now(),seq:{},x3down:false,offline:false,cur:'U03',site:'S1',
    users:[
      {id:'U01',nom:'H. Rakoto',role:'REC',site:'S1',pin:'1111'},{id:'U02',nom:'Dr N. Rasoa',role:'PR',site:'S1',pin:'2222'},
      {id:'U03',nom:'T. Andriana',role:'CHE',site:'S1',pin:'3333'},{id:'U04',nom:'J. Randria',role:'MAG',site:'S1',pin:'4444'},
      {id:'U05',nom:'F. Rabe',role:'PREP',site:'S1',pin:'5555'},{id:'U06',nom:'L. Razafy',role:'CTRL',site:'S1',pin:'6666'},
      {id:'U07',nom:'M. Raharison',role:'COM',site:'S1',pin:'7777'},{id:'U08',nom:'V. Rasolo',role:'DVM',site:'S1',pin:'8888'},
      {id:'U09',nom:'A. Ravelo',role:'PLA',site:'S1',pin:'9999'},{id:'U10',nom:'P. Rakotobe',role:'CHA',site:'S1',pin:'1010'},
      {id:'U11',nom:'S. Randrianasolo',role:'AGE',site:'AG-TOA',pin:'1212'},{id:'U12',nom:'O. Rajaona',role:'INV',site:'S1',pin:'1313'},
      {id:'U13',nom:'K. Rakotomalala',role:'ADM',site:'S1',pin:'1414'},{id:'U14',nom:'B. Ramanana',role:'AUD',site:'S1',pin:'1515'},
      {id:'U15',nom:'E. Rafidy',role:'PREP',site:'S1',pin:'1616'},{id:'U16',nom:'G. Ranaivo',role:'DVM',site:'S1',pin:'1717'}
    ],
    articles:[],locations:genLocations(),lots:[],stock:[],pos:[],receipts:[],orders:[],missions:[],waves:[],colis:[],pods:[],transfers:[],counts:[],transfos:[],recalls:[],x3msg:[],audit:[],ral:[],
    transporteurs:[
      {id:'T1',nom:'Transports Mahery SARL',adr:'Lot II M 45, Antananarivo',tel:'+261 34 00 000 01',lot:'Lot 5 – R09/R10'},
      {id:'T2',nom:'Trans-Nord Logistique',adr:'Rue Colbert, Antsiranana',tel:'+261 32 00 000 02',lot:'Lot 3 – R07/R08'},
      {id:'T3',nom:'Flotte interne SALAMA',adr:'Anosiala, Ambohidratrimo',tel:'+261 20 00 000 00',lot:'Interne'}
    ]
  };
  S.articles=ART_RAW.map((r,i)=>({code:r[0],x3:'X3-'+r[0],gtin:mkGTIN(i+1),des:r[1],ud:r[2],cat:r[3],temp:r[4],prog:r[5],tr:r[6],cl:r[7],cw:r[8],ch:r[9],ckg:r[10],udc:r[11],ul:r[12],uw:r[13],uh:r[14],ukg:r[15],prix:r[16],minRes:r[17],abc:'',actif:true}));
  indexes();
  /* lots et stock */
  let ln=1,sscc=1;
  S.articles.forEach((a,i)=>{
    const nl=2+Math.floor(R()*2);
    for(let k=0;k<nl;k++){
      const m=[3,7,14,22,30][(i+k)%5]+Math.floor(R()*3)-(i%9===0&&k===0?5:0);
      const exp=iso(addD(today(),Math.round(m*30.44)));const fab=iso(addD(exp,-730));
      let st='Libéré';if(m<=0)st='Expiré';if(i===6&&k===1)st='Quarantaine';if(i===12&&k===0)st='Bloqué';
      const lot={id:'L'+String(ln++).padStart(4,'0'),art:a.code,lot:(a.code.slice(0,3)+String(2600+ln*7)).toUpperCase()+'-'+(k+1),exp,fab,statut:st,fourn:['Fournisseur A (Inde)','Fournisseur B (France)','Fournisseur C (Chine)'][(i+k)%3],parent:null,recu:iso(addD(today(),-(30+ln*3)))};
      S.lots.push(lot);
      const qty=a.udc*(30+Math.floor(R()*90));
      const site=(a.temp.startsWith('Froid')||a.tr==='Stupéfiant')?'S1':k===2?'S2':(i%5===4&&k===1)?'S3':'S1';
      let zone=a.temp.startsWith('Froid')?'F':a.tr==='Stupéfiant'&&site==='S1'?'STUP':site==='S1'?'R':'SOL';
      if(st==='Quarantaine')zone='QUA';if(st==='Bloqué'||st==='Expiré')zone='NC';
      const used=new Set(S.stock.map(s=>s.loc));
      const cv=cm3(a.cl,a.cw,a.ch),cpp=Math.max(1,Math.floor(1.44*.85/cv));
      if(['R','SOL'].includes(zone)){let left=qty;const free=S.locations.filter(l=>l.site===site&&(l.zone===zone||l.zone==='SOL')&&!used.has(l.code)).sort((x,y)=>(x.zone===zone?-1:1)-(y.zone===zone?-1:1));
        let fi=0;while(left>0&&fi<free.length){const L=free[fi++];const q=Math.min(left,Math.round(cpp*a.udc*L.capPal));S.stock.push({id:uid('ST'),lotId:lot.id,loc:L.code,qty:q,sscc:mkSSCC(sscc++)});left-=q}
        if(left>0)S.stock[S.stock.length-1].qty+=left}
      else{const cands=S.locations.filter(l=>l.site===site&&l.zone===zone);const loc=(cands.find(l=>!used.has(l.code))||cands[0]).code;S.stock.push({id:uid('ST'),lotId:lot.id,loc,qty,sscc:mkSSCC(sscc++)})}
      if(zone==='R'&&k===0){const pk=S.locations.filter(l=>l.site==='S1'&&l.zone==='P'&&!used.has(l.code))[0];if(pk)S.stock.push({id:uid('ST'),lotId:lot.id,loc:pk.code,qty:Math.max(1,Math.round(a.udc*.6)),sscc:''})}
    }
  });
  S.seq.sscc=sscc;
  /* commandes d'achat X3 attendues */
  [['POH-2026-0412','Fournisseur A (Inde)','S1',3,[['AMOX500',400],['PARA500',600],['COTRI480',320]]],
   ['POH-2026-0418','UNICEF Supply Division','S1',6,[['SRO',60000],['ZINC20',5000],['MEBEN',3000]]],
   ['POH-2026-0425','UNFPA Procurement','S1',10,[['OCYT10',400],['TRICLO',8000],['PRESM',1200]]]].forEach(([no,f,site,d,l])=>
     S.pos.push({no,fourn:f,site,date:iso(addD(today(),d)),statut:'Attendue',lignes:l.map(([art,qty])=>({art,qty}))}));
  /* commandes clients du cycle C1 2027 */
  const prios=['P4','P4','P4','P4','P3','P4','P4','P2','P4','P4','P4','P4','P3','P4','P1','P4','P4','P4'];
  const dests=['Antananarivo Ville','Ambatolampy','Antsirabe I','Moramanga','Toamasina I','Fenerive Est','Mahajanga I','Antsohihy','Ambanja','Antsiranana I','Sambava','Fianarantsoa','Ambalavao','Manakara','Morondava','Toliara I','Ambovombe Androy','Tolagnaro'];
  const big=new Set();const flowSt=['Clôturée','Livrée','En transit','Emballée','En préparation','Planifiée','Validée','Validée','Validée','Validée','Validée','Validée','Validée','Soumise','Soumise','Brouillon','Validée','Validée'];
  const extra=[['R01-B',['Ambatolampy','Antsirabe I','Betafo','Antanifotsy']],['R03-A',['Moramanga','Toamasina I','Toamasina Ii']],['R05-A',['Maevatanana','Marovoay','Mahajanga Ii']],['R09-B',['Fianarantsoa','Ambohimahasoa','Lalangina','Isandra']],['R10-F',['Betroka','Bekily','Tsihombe','Amboasary Sud']]];
  extra.forEach(([sp,ds],j)=>ds.forEach((dn,k)=>{dests.push(dn);prios.push('P4');flowSt.push('Validée');big.add(dests.length-1)}));
  dests.forEach((dn,i)=>{const d=DEST.find(x=>x.nom===dn&&(!big.has(i)||true));const lines=[];const n=3+(i%4);
    for(let k=0;k<n;k++){const a=S.articles[(i*3+k*5)%S.articles.length];if(lines.find(l=>l.art===a.code))continue;lines.push({art:a.code,qty:Math.round(a.udc*((big.has(i)?10:2)+((i+k)%6)*(big.has(i)?5:1.7)))+(k%2?Math.round(a.udc*.4):0)})}
    const o={no:nextNo('cmd','CMD-'),x3:'SOH-27-'+String(1100+i),dest:d.code,destNom:d.nom,sp:d.sp,route:d.route,cycle:'C1',prio:prios[i],lignes:lines,statut:flowSt[i],ver:1,
      creePar:'M. Raharison',validePar:['Soumise','Brouillon'].includes(flowSt[i])?'':'V. Rasolo',date:iso(addD(today(),-20+i)),hist:[]};
    o.calc=colisage(o.lignes);S.orders.push(o)});
  /* mission déjà livrée pour illustrer POD et rappel aval */
  const shippedOrd=S.orders.filter(o=>['Clôturée','Livrée','En transit'].includes(o.statut));
  shippedOrd.forEach((o,i)=>{const sp=SP.find(s=>s.code===o.sp);const v=choixVehicule(o.calc.m3,o.calc.kg,sp);
    const ms={id:nextNo('mis','MIS-'),cycle:'C1',sp:o.sp,orders:[o.no],veh:v,vehId:i===2?'':FLEET.find(f=>f.type==='Camion'&&f.t>=8)?.imm,source:i===2?'3PL':'Interne',transp:i===2?'T1':'T3',chauffeur:i===2?'R. Solofo':'P. Rakotobe',telCh:'+261 34 11 222 3'+i,plaque:i===2?'5521 TBC':'2952 TBM',modele:i===2?'Mercedes Axor 15 t':'Renault D13 8 t',statut:o.statut==='En transit'?'En transit':'Livrée',depart:iso(addD(today(),-6+i)),stopgo:'GO',scelle:'SC-'+(40210+i)};
    S.missions.push(ms);o.mission=ms.id;
    /* sorties de stock FEFO + colis */
    const contents=[];o.lignes.forEach(l=>{let need=l.qty;fefoLots(l.art,'S1').forEach(st=>{if(need<=0)return;const q=Math.min(need,st.qty);st.qty-=q;need-=q;contents.push({art:l.art,lotId:st.lotId,qty:q})})});
    const c={sscc:mkSSCC(S.seq.sscc++),order:o.no,mission:ms.id,type:'Palette mixte',kg:o.calc.kg,m3:o.calc.m3,contenu:contents,statut:o.statut==='En transit'?'Chargé':'Livré'};S.colis.push(c);
    if(o.statut!=='En transit'){const pod={no:'POD-'+o.no.slice(4),mission:ms.id,order:o.no,date:addD(today(),-3+i).getTime(),transp:'Flotte interne SALAMA',adrT:'Anosiala',chauffeur:ms.chauffeur,tel:ms.telCh,plaque:ms.plaque,modele:ms.modele,
      recNom:'Dr '+['R. Hery','N. Faly'][i],recTel:'+261 33 44 555 6'+i,grade:'Médecin',fonction:'Médecin chef CSB2',qualite:'Responsable réception',lignes:contents.map(x=>({...x,recu:x.qty,motif:''})),sigR:'',sigL:'',hash:'',source:'Démonstration'};
      S.pods.push(pod);o.pod=pod.no}
  });
  S.orders.filter(o=>['Emballée','En préparation','Planifiée'].includes(o.statut)).forEach(o=>{const sp=SP.find(s=>s.code===o.sp);const v=choixVehicule(o.calc.m3,o.calc.kg,sp);
    const ms={id:nextNo('mis','MIS-'),cycle:'C1',sp:o.sp,orders:[o.no],veh:v,vehId:'',source:/interne/.test(sp.veh)?'Interne':'3PL',transp:/interne/.test(sp.veh)?'T3':'T2',chauffeur:'',telCh:'',plaque:'',modele:'',statut:o.statut==='Planifiée'?'Réservée J-20':o.statut==='En préparation'?'GO – en préparation':'Prête au chargement',depart:jalonDep('C1'),stopgo:o.statut==='Planifiée'?'':'GO',scelle:''};S.missions.push(ms);o.mission=ms.id});
  S.orders.filter(o=>o.statut==='Emballée').forEach(o=>{const contents=[];o.lignes.forEach(l=>{let need=l.qty;fefoLots(l.art,'S1').forEach(st=>{if(need<=0)return;const q=Math.min(need,st.qty);st.qty-=q;need-=q;contents.push({art:l.art,lotId:st.lotId,qty:q})})});
    S.colis.push({sscc:mkSSCC(S.seq.sscc++),order:o.no,mission:o.mission,type:'Palette mixte',kg:o.calc.kg,m3:o.calc.m3,contenu:contents,statut:'Emballé'})});
  /* journal X3 et audit initial */
  ['Articles (ITM)','Partenaires (BPC/BPS)','Commandes d’achat (POH)','Commandes clients (SOH)'].forEach(f=>x3(f,'Synchronisation initiale','Chargement de démonstration',{}));
  audit('Initialisation','Base de démonstration','Données fictives générées – structure SALAMA (3 entrepôts, 5 agences, 44 sous-parcours)');
  computeABC();
  return S;
}
function jalonDep(c){return (REF.cycles.find(x=>x.c===c)||REF.cycles[0]).dep}
/* FEFO : lots libérés, péremption la plus proche d'abord, durée résiduelle ≥ seuil article */
function fefoLots(art,site,opts={}){
  const a=ART[art];const minM=opts.ignoreMin?0:(a?.minRes||0);
  return S.stock.filter(st=>{const lt=lotOf(st.lotId);const l=LOC[st.loc];return lt&&lt.art===art&&st.qty>0&&lt.statut==='Libéré'&&l&&(!site||l.site===site)&&!['QUA','NC','RET','DEST','EXP','QUAI'].includes(l.zone)&&monthsLeft(lt.exp)>=minM})
    .sort((x,y)=>{const a1=lotOf(x.lotId),b1=lotOf(y.lotId);return new Date(a1.exp)-new Date(b1.exp)||(LOC[x.loc].zone==='P'?-1:1)});
}
function dispo(art,site){return sum(fefoLots(art,site),s=>s.qty)}
/* ABC : valeur des sorties sur les commandes (Pareto 80 / 15 / 5) */
function computeABC(){
  const v={};S.articles.forEach(a=>v[a.code]=0);
  S.orders.forEach(o=>o.lignes.forEach(l=>v[l.art]+=l.qty*(ART[l.art]?.prix||0)));
  S.articles.forEach(a=>v[a.code]+=sum(S.stock.filter(s=>lotOf(s.lotId)?.art===a.code),s=>s.qty)*a.prix*.05);
  const tot=sum(Object.values(v));let cum=0;
  Object.entries(v).sort((a,b)=>b[1]-a[1]).forEach(([k,x])=>{cum+=x;ART[k].abcVal=x;ART[k].abc=cum/tot<=.8?'A':cum/tot<=.95?'B':'C'});
}
/* Suggestion d'emplacement : compatibilité température / stupéfiants, classe ABC, capacité libre, proximité */
function occLoc(code){const L=LOC[code];return sum(S.stock.filter(s=>s.loc===code&&s.qty>0),s=>{const a=ART[lotOf(s.lotId)?.art];return a?palettesDe(a,s.qty):0})}
function suggestLoc(stockLine,site){
  const lt=lotOf(stockLine.lotId),a=ART[lt.art];const need=palettesDe(a,stockLine.qty);
  let zones=a.temp.startsWith('Froid')?['F']:a.tr==='Stupéfiant'?['STUP']:['R','SOL'];
  const c=S.locations.filter(l=>l.site===site&&zones.includes(l.zone)&&l.statut==='Actif').map(l=>({l,free:l.capPal-occLoc(l.code)})).filter(x=>x.free>=Math.min(need,x.l.capPal)*.98||x.free>=need);
  c.sort((x,y)=>(x.l.abc===a.abc?-1:0)-(y.l.abc===a.abc?-1:0)||(x.l.zone==='R'?-1:1)-(y.l.zone==='R'?-1:1)||x.l.code.localeCompare(y.l.code));
  return c[0]?.l||null;
}
function occSite(site){const ls=S.locations.filter(l=>l.site===site&&!['QUAI','EXP','DEST'].includes(l.zone));const cap=sum(ls,l=>l.capPal);const occ=sum(ls,l=>occLoc(l.code));return {cap,occ,taux:cap?occ/cap:0}}
async function sha256(t){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))|0;return 'x'+(h>>>0).toString(16)}}
