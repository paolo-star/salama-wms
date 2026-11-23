/*
 * SALAMA WMS – Authentification, comptes, contrôle des doublons, activation par un administrateur, menu par catégories
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ===== v1.5 – Menu par catégories dépliables + authentification, contrôle des doublons, activation par un administrateur ===== */

/* ---------- 1. Menu : catégories dépliables (accordéon) ---------- */
NAV.forEach(g=>{if(g[0]==='Paramétrage'&&!g[1].some(x=>x[0]==='comptes'))g[1].splice(3,0,['comptes','Comptes et accès'])});
const NAV_ICON={
 'Pilotage':'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 'Équipes':'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 6M18 14c2 .7 3.5 3 3.5 6"/>',
 'Entrées':'<path d="M12 3v11M7 9l5 5 5-5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>',
 'Stock':'<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/>',
 'Distribution 2027':'<path d="M2 6h12v10H2zM14 10h4l4 4v2h-8M6 19a2 2 0 1 0 0-.01M18 19a2 2 0 1 0 0-.01"/>',
 'Dernier kilomètre':'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 'Traçabilité':'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5M8.5 11h5M11 8.5v5"/>',
 'Espace et analyse':'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>',
 'Redevabilité et conformité':'<path d="M12 2l8 3v6c0 5-3.5 9.3-8 11-4.5-1.7-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 'Paramétrage':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4z"/>'
};
let NAV_OPEN=null;try{NAV_OPEN=localStorage.getItem('salama_wms_navopen')}catch(e){}
function navGroupOf(v){const g=NAV.find(([,it])=>it.some(x=>x[0]===v));return g?g[0]:null}
renderNav=function(){
  const cur=navGroupOf(VIEW);if(NAV_OPEN===null)NAV_OPEN=cur;
  $('#nav').innerHTML=NAV.map(([g,items],gi)=>{
    const open=NAV_OPEN===g;const tot=sum(items,([k])=>badgeCount(k));
    return `<div class="ngrp ${open?'open':''} ${cur===g?'cur':''}"><button type="button" class="nhead" data-g="${esc(g)}" aria-expanded="${open}" aria-controls="ng${gi}">
      <svg viewBox="0 0 24 24" class="nic" aria-hidden="true">${NAV_ICON[g]||''}</svg><span class="nlab">${g}</span>${!open&&tot?`<span class="n">${tot}</span>`:''}<svg viewBox="0 0 24 24" class="chev" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
      <div class="nsub" id="ng${gi}" ${open?'':'hidden'}>${items.map(([k,l])=>{const n=badgeCount(k);return `<a href="#${k}" class="${VIEW===k?'on':''}">${l}${n?`<span class="n">${n}</span>`:''}</a>`}).join('')}</div></div>`}).join('');
  $$('#nav .nhead').forEach(b=>b.onclick=()=>{const g=b.dataset.g;NAV_OPEN=NAV_OPEN===g?'':g;try{localStorage.setItem('salama_wms_navopen',NAV_OPEN)}catch(e){}renderNav()});
  $$('#nav a').forEach(a=>a.onclick=()=>{NAV_OPEN=navGroupOf(a.getAttribute('href').slice(1));$('#rail').classList.remove('open')});
  $('#netPill').innerHTML=scanPill()+' '+`${S.offline?'<span class="pill warn">Mode dégradé (hors ligne)</span>':'<span class="pill ok">Réseau OK</span>'} ${S.x3down?'<span class="pill bad">X3 simulé : indisponible</span>':'<span class="pill info" title="Connecteur simulé dans ce démonstrateur">Sage X3 simulé</span>'}`;
};
window.addEventListener('hashchange',()=>{const g=navGroupOf((location.hash||'#dash').slice(1));if(g)NAV_OPEN=g});

/* ---------- 2. Comptes, sessions, courriels simulés ---------- */
const AUTH_DEMO_PW='Salama@2027';
const MANUEL_URL='manuel/SALAMA_WMS_Manuel_utilisation_v1.0.pdf';
/* Administrateurs nominatifs de la plateforme (mot de passe provisoire à changer à la première connexion) */
const REAL_ADMINS=[
 {uid:'ADM-JP',prenom:'Jean Paul',nom:'NKABA PAOLO',email:'adm-001@salama-wms.demo',tel:'—',mat:'ADM-001',pin:'1980',salt:'S-JP-7Q2',h:'1109f25e1996b1'},
 {uid:'ADM-HK',prenom:'Hervé',nom:'KOMBO',email:'adm-002@salama-wms.demo',tel:'—',mat:'ADM-002',pin:'2611',salt:'S-HK-4M9',h:'1f715d4406b1a4'}];
const AUTH_IDLE_MIN=20,AUTH_MAX_FAIL=5;
function pwHash(pw,salt){let s=salt+'|'+pw,h='';for(let i=0;i<500;i++){h=chainHash({prev:h,ts:i,user:s,role:salt,action:pw.length,objet:'pw',detail:h});}return h}
function normTxt(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function normTel(s){let d=String(s||'').replace(/\D/g,'');if(d.startsWith('261'))d=d.slice(3);if(d.startsWith('0'))d=d.slice(1);return d}
function lev(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;const d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
const ACC_ST={EMAIL:'Courriel à confirmer',PEND:'En attente d’activation',ACT:'Actif',REJ:'Rejeté',SUS:'Suspendu',LOCK:'Verrouillé'};
function ensureAuth(){
  if(!S.accounts){
    S.accounts=S.users.map((u,i)=>{const parts=u.nom.replace(/^Dr\s+/,'').split(' ');const login=(parts[0].replace('.','').toLowerCase()+'.'+parts.slice(1).join('').toLowerCase()).replace(/[^a-z.]/g,'')+'@salama.mg';const salt=uid('S');
      return {uid:u.id,nom:parts.slice(1).join(' '),prenom:parts[0],email:login,tel:'+261 34 10 '+String(100+i).padStart(3,'0')+' '+String(10+i),matricule:'SAL-'+String(1001+i),fonction:ROLES[u.role].n,site:u.site,role:u.role,statut:ACC_ST.ACT,emailOk:true,salt,pw:pwHash(AUTH_DEMO_PW,salt),demo:true,cree:S.created||Date.now(),activePar:'Initialisation',activeLe:S.created||Date.now(),fails:0}});
  }
  S.outbox=S.outbox||[];S.authlog=S.authlog||[];
  REAL_ADMINS.forEach(r=>{if(!S.accounts.some(a=>a.uid===r.uid)){const salt=r.salt;
    S.accounts.push({uid:r.uid,nom:r.nom,prenom:r.prenom,email:r.email,tel:r.tel,matricule:r.mat,fonction:'Administrateur de la plateforme',site:'S1',role:'ADM',statut:ACC_ST.ACT,emailOk:true,salt,pw:r.h,mustChange:true,demo:false,cree:Date.now(),activePar:'Initialisation',activeLe:Date.now(),fails:0,pin:r.pin});
    if(!S.users.some(u=>u.id===r.uid))S.users.push({id:r.uid,nom:r.prenom.split(' ')[0].charAt(0)+'. '+r.nom.charAt(0)+r.nom.slice(1).toLowerCase(),role:'ADM',site:'S1',pin:r.pin})}});
}
function accOf(uid){return (S.accounts||[]).find(a=>a.uid===uid)}
let AUTH_UID=null;try{AUTH_UID=sessionStorage.getItem('salama_wms_session')}catch(e){}
function authOK(){if(!S||!S.accounts)return false;const a=accOf(AUTH_UID);return !!(a&&a.statut===ACC_ST.ACT)}
function authSession(uidv){AUTH_UID=uidv;try{uidv?sessionStorage.setItem('salama_wms_session',uidv):sessionStorage.removeItem('salama_wms_session')}catch(e){}if(uidv){S.cur=uidv;authTouch()}}
function authLog(type,who,detail){S.authlog.unshift({ts:Date.now(),type,who,detail:detail||''});if(S.authlog.length>500)S.authlog.length=500}
function mailSend(to,subject,body,link){S.outbox.unshift({id:uid('MAIL'),ts:Date.now(),to,subject,body,link:link||null,lu:false});if(S.outbox.length>300)S.outbox.length=300}
function admins(){return S.accounts.filter(a=>a.statut===ACC_ST.ACT&&a.role==='ADM')}
/* inactivité */
let AUTH_LAST=Date.now();function authTouch(){AUTH_LAST=Date.now()}
['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,authTouch,{passive:true}));
setInterval(()=>{if(AUTH_UID&&Date.now()-AUTH_LAST>AUTH_IDLE_MIN*60000){const a=accOf(AUTH_UID);authLog('Déconnexion automatique',a?.email||'',AUTH_IDLE_MIN+' min d’inactivité');authSession(null);save();LOGIN_MSG={t:'warn',m:'Session fermée après '+AUTH_IDLE_MIN+' minutes d’inactivité. Reconnectez-vous.'};shell()}},30000);

/* ---------- 3. Page d’authentification (première page affichée) ---------- */
function curLang(){try{return LANG}catch(e){return 'fr'}}
let LOGIN_TAB='login',LOGIN_MSG=null,SIGNUP_ACK=false,LOGIN_MAILBOX='';
function loginPage(){
  ensureAuth();
  const sites=[...REF.sites.map(s=>[s.code,s.nom]),...REF.agences.map(a=>[a.code,a.nom])];
  const roleOpts=Object.entries(ROLES).filter(([k])=>k!=='ADM').map(([k,r])=>`<option value="${k}">${esc(r.n)}</option>`).join('');
  const msg=LOGIN_MSG?`<div class="amsg ${LOGIN_MSG.t}" role="status">${LOGIN_MSG.h||esc(LOGIN_MSG.m)}</div>`:'';
  const mails=LOGIN_MAILBOX?S.outbox.filter(m=>m.to.toLowerCase()===LOGIN_MAILBOX.toLowerCase()):[];
  document.getElementById('root').innerHTML=`<div class="auth">
  <section class="aside">
    <div class="abrand"><img src="${LOGO_S}" alt="SALAMA"><div><small>WMS multi-sites</small><b>SALAMA Entrepôts & Distribution</b></div></div>
    <h1>Accès sécurisé à la plateforme</h1>
    <p>Réception, stock, préparation, distribution 2027 et preuve de livraison pour les trois entrepôts centraux et les agences régionales.</p>
    <ul class="aflow"><li><b>1</b><span>Créer un compte (contrôle des doublons)</span></li><li><b>2</b><span>Confirmer l’adresse courriel</span></li><li><b>3</b><span>Activation et attribution du profil par un administrateur</span></li><li><b>4</b><span>Connexion avec les seuls droits du profil</span></li></ul>
    <p class="anote">Aucune donnée n’est visible avant la connexion d’un compte activé.</p>
    <div class="adev"><img src="${LOGO_J}" alt="JPN Management Consulting"><span>Développé par JPN Management Consulting<br>© 2026 – Tous droits réservés</span></div>
  </section>
  <section class="amain">
    <div class="atop"><button class="btn s" id="langBtnA" type="button" data-noi18n>${curLang()==='en'?'<b>EN</b> | FR':'<b>FR</b> | EN'}</button></div>
    <div class="acard">
      <div class="atabs" role="tablist"><button role="tab" type="button" class="${LOGIN_TAB==='login'?'on':''}" data-tab="login">Se connecter</button><button role="tab" type="button" class="${LOGIN_TAB==='signup'?'on':''}" data-tab="signup">Créer un compte</button></div>
      ${msg}
      ${LOGIN_TAB==='login'?`<form id="loginForm" class="aform" autocomplete="on">
        <label>Courriel professionnel ou matricule<input id="lgId" autocomplete="username" required></label>
        <label>Mot de passe<input id="lgPw" type="password" autocomplete="current-password" required></label>
        <button class="btn p big">Se connecter</button>
        <div class="alinks"><button type="button" class="lnk" id="forgot">Mot de passe oublié</button><button type="button" class="lnk" id="goSignup">Pas encore de compte ? Créer un compte</button></div>
      </form>`:`<form id="signupForm" class="aform" autocomplete="off" novalidate>
        <div class="g2"><label>Nom<input id="suNom" required></label><label>Prénom(s)<input id="suPrenom" required></label></div>
        <div class="g2"><label>Matricule SALAMA<input id="suMat" placeholder="SAL-0000" required></label><label>Fonction<input id="suFonc" required></label></div>
        <div class="g2"><label>Courriel professionnel<input id="suMail" type="email" required></label><label>Téléphone<input id="suTel" placeholder="+261 34 00 000 00" required></label></div>
        <div class="g2"><label>Site d’affectation<select id="suSite">${sites.map(([c,n])=>`<option value="${c}">${esc(n)}</option>`).join('')}</select></label><label>Profil demandé<select id="suRole">${roleOpts}</select></label></div>
        <div class="g2"><label>Mot de passe<input id="suPw" type="password" autocomplete="new-password" required></label><label>Confirmation du mot de passe<input id="suPw2" type="password" autocomplete="new-password" required></label></div>
        <p class="hint">Au moins 10 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
        <div class="dup" id="dupBox" aria-live="polite"></div>
        <label class="chk"><input type="checkbox" id="suCharte"> J’accepte la charte d’utilisation du système et le traitement de mes données personnelles pour la gestion des accès.</label>
        <button class="btn p big" id="suBtn">Envoyer la demande de compte</button>
        <p class="hint">Le profil demandé est indicatif : l’administrateur attribue le profil définitif selon la fonction (principe du moindre privilège).</p>
      </form>`}
    </div>
    <details class="acard demo" ${mails.length?'open':''}><summary>Boîte de réception simulée (démonstration)</summary>
      <p class="hint">Dans ce démonstrateur, les courriels ne partent pas : ils s’affichent ici. Saisissez une adresse pour consulter ses messages.</p>
      <form id="mbForm" class="row"><input id="mbAddr" value="${esc(LOGIN_MAILBOX)}" placeholder="adresse@salama.mg" style="flex:1"><button class="btn s">Ouvrir</button></form>
      ${LOGIN_MAILBOX?(mails.length?mails.map(m=>`<div class="mail"><div class="small">${frt(m.ts)} · à ${esc(m.to)}</div><b>${esc(m.subject)}</b><div class="mbody2">${esc(m.body).replace(/\n/g,'<br>')}</div>${m.link?`<button type="button" class="btn s p" data-link="${esc(m.link)}">${m.link.startsWith('confirm:')?'Confirmer mon adresse':'Ouvrir le lien'}</button>`:''}</div>`).join(''):'<p class="small">Aucun message pour cette adresse.</p>'):''}
    </details>
    <details class="acard demo"><summary>Comptes de démonstration (recette uniquement)</summary>
      <p class="hint">Mot de passe commun des comptes de démonstration : <code>${AUTH_DEMO_PW}</code>. En production : comptes nominatifs, aucun mot de passe affiché, double authentification pour les administrateurs.</p>
      <div class="demolist">${S.accounts.filter(a=>a.demo&&a.statut===ACC_ST.ACT).map(a=>`<button type="button" class="btn s" data-fill="${esc(a.email)}">${esc(a.prenom+' '+a.nom)} – ${esc(ROLES[a.role].n)}</button>`).join('')}</div>
    </details>
    <p class="aman"><a href="${MANUEL_URL}" target="_blank" rel="noopener">Manuel d’utilisation (PDF)</a></p><footer class="afoot"><span><span class="wmark">Démonstrateur – données fictives</span> · Version ${APP_REL}</span><span><img src="${LOGO_J}" alt="">Conçu et développé par JPN Management Consulting · © 2026 Tous droits réservés</span></footer>
  </section></div><div id="modal"></div><div id="toast"></div>`;
  $$('.atabs [data-tab]').forEach(b=>b.onclick=()=>{LOGIN_TAB=b.dataset.tab;LOGIN_MSG=null;loginPage()});
  $('#langBtnA').onclick=()=>{if(typeof langToggle==='function')langToggle()};
  $('#mbForm').onsubmit=e=>{e.preventDefault();LOGIN_MAILBOX=$('#mbAddr').value.trim();loginPage()};
  $$('[data-link]').forEach(b=>b.onclick=()=>authLink(b.dataset.link));
  $$('[data-fill]').forEach(b=>b.onclick=()=>{LOGIN_TAB='login';LOGIN_MSG=null;loginPage();$('#lgId').value=b.dataset.fill;$('#lgPw').value=AUTH_DEMO_PW;$('#lgPw').focus()});
  if(LOGIN_TAB==='login'){
    $('#loginForm').onsubmit=e=>{e.preventDefault();authLogin($('#lgId').value,$('#lgPw').value)};
    $('#goSignup').onclick=()=>{LOGIN_TAB='signup';LOGIN_MSG=null;loginPage()};
    $('#forgot').onclick=authForgot;
  }else{
    const ids=['suNom','suPrenom','suMat','suMail','suTel'];ids.forEach(i=>$('#'+i).addEventListener('input',()=>{SIGNUP_ACK=false;dupRender()}));
    $('#signupForm').onsubmit=e=>{e.preventDefault();authSignup()};dupRender();
  }
  if(typeof i18nApply==='function')i18nApply();
}
/* ---- contrôle des doublons ---- */
function dupCheck(f){
  const res=[];const accs=S.accounts.filter(a=>a.statut!==ACC_ST.REJ);
  const mail=f.mail.trim().toLowerCase(),tel=normTel(f.tel),mat=normTxt(f.mat),full=normTxt(f.nom+f.prenom),full2=normTxt(f.prenom+f.nom);
  const hit=(k,lbl,a,block)=>res.push({k,lbl,a,block});
  if(mail){const a=accs.find(x=>x.email.toLowerCase()===mail);if(a)hit('mail','Courriel déjà utilisé',a,true)}
  if(tel.length>=7){const a=accs.find(x=>normTel(x.tel)===tel);if(a)hit('tel','Téléphone déjà enregistré',a,true)}
  if(mat){const a=accs.find(x=>normTxt(x.matricule)===mat);if(a)hit('mat','Matricule déjà enregistré',a,true)}
  if(f.nom&&f.prenom){const a=accs.find(x=>{const n=normTxt(x.nom+x.prenom),n2=normTxt(x.prenom+x.nom);return n===full||n===full2||n2===full||lev(n,full)<=1||normTxt(x.nom)===normTxt(f.nom)&&normTxt(x.prenom)[0]===normTxt(f.prenom)[0]});if(a)hit('nom','Homonyme ou nom très proche',a,false)}
  return res;
}
function signupVals(){return {nom:$('#suNom').value.trim(),prenom:$('#suPrenom').value.trim(),mat:$('#suMat').value.trim(),mail:$('#suMail').value.trim(),tel:$('#suTel').value.trim()}}
function dupRender(){
  const f=signupVals();const r=dupCheck(f);const ok=k=>!r.some(x=>x.k===k);
  const line=(k,lbl,filled)=>`<li class="${!filled?'na':ok(k)?'ok':r.find(x=>x.k===k).block?'ko':'wa'}">${!filled?'○':ok(k)?'✓':r.find(x=>x.k===k).block?'✕':'!'} ${lbl}</li>`;
  let h=`<b>Contrôle des doublons</b><ul>${line('mail','Courriel unique',!!f.mail)}${line('tel','Téléphone unique',normTel(f.tel).length>=7)}${line('mat','Matricule unique',!!f.mat)}${line('nom','Pas d’homonyme',!!(f.nom&&f.prenom))}</ul>`;
  r.forEach(x=>{const st=x.a.statut;h+=`<div class="dupx ${x.block?'ko':'wa'}">${esc(x.lbl)} : un compte existe déjà (${esc(x.a.prenom+' '+x.a.nom.charAt(0)+'.')}, ${esc(x.a.matricule)}, statut « ${esc(st)} »${st===ACC_ST.PEND?', demande déposée le '+fr(x.a.cree):''}). ${x.block?(st===ACC_ST.ACT?'Utilisez « Se connecter » ou « Mot de passe oublié ».':st===ACC_ST.PEND||st===ACC_ST.EMAIL?'Votre demande est déjà en cours de traitement : inutile d’en créer une autre.':'Contactez l’administrateur pour réactiver le compte existant.'):'S’il s’agit d’une autre personne, cochez la case ci-dessous.'}</div>`});
  if(r.some(x=>!x.block)&&!r.some(x=>x.block))h+=`<label class="chk"><input type="checkbox" id="dupAck" ${SIGNUP_ACK?'checked':''}> Je confirme être une personne différente et ne pas avoir déjà de compte.</label>`;
  $('#dupBox').innerHTML=h;const ack=$('#dupAck');if(ack)ack.onchange=()=>SIGNUP_ACK=ack.checked;
  return r;
}
function pwPolicy(p){return p.length>=10&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/\d/.test(p)&&/[^A-Za-z0-9]/.test(p)}
function authSignup(){
  const f=signupVals();const err=m=>{LOGIN_MSG={t:'err',m};const box=$('.acard .amsg');if(box){box.className='amsg err';box.textContent=m}else{$('.atabs').insertAdjacentHTML('afterend',`<div class="amsg err" role="status">${esc(m)}</div>`)}if(typeof i18nApply==='function')i18nApply()};
  if(!f.nom||!f.prenom||!f.mat||!f.mail||!f.tel||!$('#suFonc').value.trim())return err('Tous les champs sont obligatoires.');
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.mail))return err('Adresse courriel invalide.');
  if(normTel(f.tel).length<9)return err('Numéro de téléphone invalide (9 chiffres après l’indicatif +261).');
  const pw=$('#suPw').value;if(!pwPolicy(pw))return err('Le mot de passe ne respecte pas la règle de sécurité.');
  if(pw!==$('#suPw2').value)return err('Les deux mots de passe ne correspondent pas.');
  const d=dupRender();if(d.some(x=>x.block)){authLog('Demande refusée (doublon)',f.mail,d.map(x=>x.lbl).join(', '));save();return err('Demande bloquée : un compte existe déjà avec ces informations (voir le contrôle des doublons).')}
  if(d.length&&!SIGNUP_ACK)return err('Un homonyme existe : confirmez que vous n’avez pas déjà de compte.');
  if(!$('#suCharte').checked)return err('Veuillez accepter la charte d’utilisation.');
  const salt=uid('S');const tok=uid('TK')+uid('');const n=S.accounts.length+1;
  const a={uid:'A'+String(n).padStart(3,'0')+uid('').slice(1,4),nom:f.nom.toUpperCase(),prenom:f.prenom,email:f.mail.toLowerCase(),tel:f.tel,matricule:f.mat.toUpperCase(),fonction:$('#suFonc').value.trim(),site:$('#suSite').value,roleDemande:$('#suRole').value,role:null,statut:ACC_ST.EMAIL,emailOk:false,salt,pw:pwHash(pw,salt),tok,cree:Date.now(),fails:0,homonymeConfirme:d.length?true:false};
  S.accounts.push(a);authLog('Demande de compte',a.email,a.matricule+(a.homonymeConfirme?' · homonyme déclaré':''));
  mailSend(a.email,'SALAMA WMS – Confirmez votre adresse courriel',`Bonjour ${a.prenom} ${a.nom},\nVous avez demandé un compte sur SALAMA WMS (matricule ${a.matricule}).\nCliquez sur le lien ci-dessous pour confirmer votre adresse. Votre compte sera ensuite examiné par un administrateur avant toute ouverture d’accès.\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,'confirm:'+tok);
  save();LOGIN_TAB='login';LOGIN_MAILBOX=a.email;LOGIN_MSG={t:'info',m:'Demande enregistrée. Un lien de confirmation a été envoyé à '+a.email+'. Ouvrez-le pour confirmer votre adresse.'};loginPage();
}
function authLink(link){
  if(link.startsWith('confirm:')){const a=S.accounts.find(x=>x.tok===link.slice(8));
    if(!a){LOGIN_MSG={t:'err',m:'Lien invalide ou déjà utilisé.'};return loginPage()}
    a.emailOk=true;a.statut=ACC_ST.PEND;a.tok=null;a.confirmeLe=Date.now();authLog('Courriel confirmé',a.email);
    admins().forEach(ad=>mailSend(ad.email,'SALAMA WMS – Nouvelle demande de compte à examiner',`Demande de ${a.prenom} ${a.nom} (${a.matricule}, ${a.fonction}, ${siteName(a.site)}).\nProfil demandé : ${ROLES[a.roleDemande]?.n||'-'}.${a.homonymeConfirme?'\nAttention : homonyme déclaré lors de la demande.':''}\nÀ traiter dans Paramétrage › Comptes et accès.`));
    save();LOGIN_TAB='login';LOGIN_MSG={t:'warn',h:statusCard(a)};return loginPage()}
  if(link.startsWith('login:')){LOGIN_TAB='login';LOGIN_MSG=null;loginPage();$('#lgId').value=link.slice(6);$('#lgPw').focus();return}
  if(link.startsWith('reset:')){const a=S.accounts.find(x=>x.rtok===link.slice(6));if(!a){LOGIN_MSG={t:'err',m:'Lien invalide ou expiré.'};return loginPage()}
    modal('Nouveau mot de passe',`<p>${esc(a.email)}</p><label>Nouveau mot de passe<input id="rp1" type="password"></label><label>Confirmation<input id="rp2" type="password"></label><p class="hint">Au moins 10 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>`,'<button class="btn p" id="rpOk">Enregistrer</button>');
    $('#rpOk').onclick=()=>{const p=$('#rp1').value;if(!pwPolicy(p))return toast('Le mot de passe ne respecte pas la règle de sécurité.',true);if(p!==$('#rp2').value)return toast('Les deux mots de passe ne correspondent pas.',true);a.salt=uid('S');a.pw=pwHash(p,a.salt);a.rtok=null;a.fails=0;authLog('Mot de passe réinitialisé',a.email);save();closeModal();LOGIN_MSG={t:'ok',m:'Mot de passe modifié. Vous pouvez vous connecter.'};loginPage()};return}
}
function siteName(c){return (REF.sites.find(s=>s.code===c)||REF.agences.find(s=>s.code===c)||{nom:c}).nom}
function statusCard(a){
  const steps=[['Demande déposée',a.cree],['Adresse courriel confirmée',a.confirmeLe],['Activation par un administrateur',a.activeLe]];
  const head=a.statut===ACC_ST.PEND?'Statut : En attente d’activation par un administrateur':a.statut===ACC_ST.EMAIL?'Statut : Courriel à confirmer':'Statut : '+a.statut;
  const txt=a.statut===ACC_ST.PEND?'Votre adresse est confirmée. Un administrateur doit vérifier votre demande et attribuer votre profil. Vous recevrez un courriel dès l’activation. D’ici là, aucune donnée de la plateforme n’est accessible.'
   :a.statut===ACC_ST.EMAIL?'Ouvrez le lien de confirmation reçu par courriel (un nouveau lien vient d’être envoyé).'
   :a.statut===ACC_ST.REJ?'Votre demande n’a pas été retenue'+(a.motif?' : '+a.motif:'')+'. Contactez la DSI si nécessaire.'
   :a.statut===ACC_ST.SUS?'Votre compte est suspendu'+(a.motif?' : '+a.motif:'')+'. Contactez la DSI.'
   :a.statut===ACC_ST.LOCK?'Compte verrouillé après '+AUTH_MAX_FAIL+' tentatives incorrectes. Un administrateur doit le déverrouiller.':'';
  return `<b>${esc(head)}</b><p>${esc(txt)}</p><ol class="steps">${steps.map(([l,t])=>`<li class="${t?'done':''}">${t?'✓':'○'} ${esc(l)}${t?' · '+frt(t):''}</li>`).join('')}</ol><p class="small">${esc(a.prenom+' '+a.nom)} · ${esc(a.matricule)} · ${esc(a.email)}</p>`;
}
function authLogin(id,pw){
  ensureAuth();const k=String(id||'').trim().toLowerCase();
  const a=S.accounts.find(x=>x.email.toLowerCase()===k||x.matricule.toLowerCase()===k);
  const bad=()=>{LOGIN_MSG={t:'err',m:'Identifiant ou mot de passe incorrect.'};save();loginPage();$('#lgId').value=id};
  if(!a){authLog('Échec de connexion',k,'identifiant inconnu');return bad()}
  if(a.statut===ACC_ST.LOCK){LOGIN_MSG={t:'err',h:statusCard(a)};return loginPage()}
  if(pwHash(pw,a.salt)!==a.pw){a.fails=(a.fails||0)+1;authLog('Échec de connexion',a.email,'tentative '+a.fails+'/'+AUTH_MAX_FAIL);
    if(a.fails>=AUTH_MAX_FAIL&&a.statut===ACC_ST.ACT){a.statut=ACC_ST.LOCK;authLog('Compte verrouillé',a.email);admins().forEach(ad=>mailSend(ad.email,'SALAMA WMS – Compte verrouillé',`Le compte ${a.email} a été verrouillé après ${AUTH_MAX_FAIL} tentatives incorrectes.`))}
    return bad()}
  a.fails=0;
  if(a.statut===ACC_ST.EMAIL){a.tok=a.tok||uid('TK')+uid('');mailSend(a.email,'SALAMA WMS – Confirmez votre adresse courriel (rappel)',`Bonjour ${a.prenom},\nConfirmez votre adresse pour que votre demande soit transmise à un administrateur.`,'confirm:'+a.tok);LOGIN_MAILBOX=a.email}
  if(a.statut!==ACC_ST.ACT){authLog('Connexion refusée',a.email,a.statut);save();LOGIN_MSG={t:a.statut===ACC_ST.PEND||a.statut===ACC_ST.EMAIL?'warn':'err',h:statusCard(a)};return loginPage()}
  if(a.mustChange){
    modal('Première connexion : choisissez votre mot de passe',`<p>Bienvenue ${esc(a.prenom)}. Le mot de passe provisoire doit être remplacé avant d’accéder à la plateforme.</p><label>Nouveau mot de passe<input id="mc1" type="password" autocomplete="new-password"></label><label>Confirmation<input id="mc2" type="password" autocomplete="new-password"></label><p class="hint">Au moins 10 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>`,'<button class="btn p" id="mcOk">Enregistrer et continuer</button>');
    $('#mcOk').onclick=()=>{const p1=$('#mc1').value;if(!pwPolicy(p1))return toast('Le mot de passe ne respecte pas la règle de sécurité.',true);if(p1!==$('#mc2').value)return toast('Les deux mots de passe ne correspondent pas.',true);if(pwHash(p1,a.salt)===a.pw)return toast('Choisissez un mot de passe différent du mot de passe provisoire.',true);
      a.salt=uid('S');a.pw=pwHash(p1,a.salt);a.mustChange=false;authLog('Mot de passe initial changé',a.email);closeModal();authLogin(a.email,p1)};
    return}
  authLog('Connexion',a.email,ROLES[a.role].n);a.derniere=Date.now();
  if(!S.users.find(u=>u.id===a.uid))S.users.push({id:a.uid,nom:a.prenom.charAt(0)+'. '+a.nom.charAt(0)+a.nom.slice(1).toLowerCase(),role:a.role,site:a.site,pin:a.pin||'0000'});
  authSession(a.uid);S.site=a.site;LOGIN_MSG=null;LOGIN_MAILBOX='';save();
  if(typeof audit==='function')audit('Connexion','Compte',a.email);
  VIEW=(location.hash||'#dash').slice(1);if(!VIEWS[VIEW])VIEW='dash';NAV_OPEN=navGroupOf(VIEW);shell();render();
}
function authForgot(){
  modal('Mot de passe oublié','<p>Saisissez votre courriel professionnel. Si un compte actif existe, un lien de réinitialisation lui sera envoyé.</p><label>Courriel<input id="fgMail" type="email"></label>','<button class="btn p" id="fgOk">Envoyer le lien</button>');
  $('#fgOk').onclick=()=>{const m=$('#fgMail').value.trim().toLowerCase();const a=S.accounts.find(x=>x.email===m&&x.statut===ACC_ST.ACT);
    if(a){a.rtok=uid('RT')+uid('');mailSend(a.email,'SALAMA WMS – Réinitialisation du mot de passe','Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe. Lien valable 30 minutes.','reset:'+a.rtok);authLog('Demande de réinitialisation',a.email)}
    save();closeModal();LOGIN_MAILBOX=m;LOGIN_MSG={t:'info',m:'Si un compte actif correspond à cette adresse, un lien de réinitialisation a été envoyé.'};loginPage()};
}
function authLogout(){const a=accOf(AUTH_UID);authLog('Déconnexion',a?.email||'');if(typeof audit==='function')audit('Déconnexion','Compte',a?.email||'');authSession(null);save();LOGIN_MSG={t:'ok',m:'Vous êtes déconnecté.'};closeModal&&$('#modal')&&closeModal();shell()}

/* ---------- 4. Garde : rien ne s’affiche sans session active ---------- */
const _shell_auth=shell,_render_auth=render;
shell=function(){ensureAuth();if(!authOK())return loginPage();if(!shell._i){S.cur=AUTH_UID;shell._i=1}_shell_auth.apply(this,arguments);authHeader()};
render=function(){if(!authOK()){if(!$('.auth'))loginPage();return}return _render_auth.apply(this,arguments)};
const _handleScan_auth=handleScan;handleScan=function(){if(!authOK())return;return _handleScan_auth.apply(this,arguments)};
function authHeader(){
  const a=accOf(AUTH_UID);if(!a)return;const top=$('header.top');if(!top||$('#userBox'))return;
  const sel=$('#userSel');if(sel){const lab=sel.closest('label');
    if(a.role==='ADM'||a.demo){lab.firstChild.nodeValue='Profil de test (démonstration)';sel.onchange=e=>authSwitch(e.target.value)}else lab.remove()}
  const box=document.createElement('div');box.id='userBox';box.className='ubox';
  box.innerHTML=`<span><b>${esc(a.prenom+' '+a.nom)}</b><small>${esc(ROLES[a.role]?.n||'')}</small></span><button class="btn s" type="button" id="logoutBtn">Se déconnecter</button>`;
  top.appendChild(box);$('#logoutBtn').onclick=authLogout;
}
/* Changement de profil de test : exige le code PIN du profil visé (séparation des tâches) */
function authSwitch(id){
  const u=S.users.find(x=>x.id===id);$('#userSel').value=S.cur;if(!u)return;
  modal('Changer de profil de test',`<p>Profil visé : <b>${esc(u.nom)} – ${esc(ROLES[u.role].n)}</b>. Saisissez son code PIN.</p><label>Code PIN<input id="swPin" type="password" inputmode="numeric"></label><p class="hint">Les codes PIN de démonstration figurent dans Paramétrage › Rôles et séparation des tâches.</p>`,'<button class="btn p" id="swOk">Valider</button>');
  $('#swOk').onclick=()=>{if($('#swPin').value!==u.pin){toast('Code PIN incorrect.',true);return}
    let acc=accOf(u.id);if(!acc||acc.statut!==ACC_ST.ACT){toast('Ce profil n’a pas de compte actif.',true);return}
    authLog('Changement de profil (test)',acc.email,'depuis '+(accOf(AUTH_UID)?.email||''));if(typeof audit==='function')audit('Changement de profil de test','Compte',acc.email);
    authSession(u.id);save();closeModal();shell();render();toast('Profil actif : '+u.nom+' – '+ROLES[u.role].n)};
}

/* ---------- 5. Administration des comptes ---------- */
let ACC_TAB='dem';
VIEWS.comptes=()=>{
  ensureAuth();const isAdm=can('admin');
  const pend=S.accounts.filter(a=>a.statut===ACC_ST.PEND||a.statut===ACC_ST.EMAIL);
  const tabs=[['dem','Demandes à traiter ('+pend.length+')'],['all','Tous les comptes ('+S.accounts.length+')'],['mail','Courriels envoyés'],['log','Journal des connexions']];
  const rows=ACC_TAB==='dem'?pend:S.accounts;
  const stp=s=>pill(s,s===ACC_ST.ACT?'ok':s===ACC_ST.PEND||s===ACC_ST.EMAIL?'warn':'bad');
  const acts=a=>!isAdm?'':a.statut===ACC_ST.PEND?`<button class="btn s p" data-x="accAct" data-a="${a.uid}">Activer</button> <button class="btn s" data-x="accRej" data-a="${a.uid}">Rejeter</button>`
    :a.statut===ACC_ST.ACT?`<button class="btn s" data-x="accSus" data-a="${a.uid}">Suspendre</button>`
    :a.statut===ACC_ST.SUS||a.statut===ACC_ST.LOCK?`<button class="btn s" data-x="accRe" data-a="${a.uid}">${a.statut===ACC_ST.LOCK?'Déverrouiller':'Réactiver'}</button>`:a.statut===ACC_ST.EMAIL?'<span class="small">Attend la confirmation du courriel</span>':'';
  let body='';
  if(ACC_TAB==='mail')body=table([{t:'Date',f:m=>frt(m.ts)},{t:'Destinataire',k:'to'},{t:'Objet',k:'subject'}],S.outbox.slice(0,100));
  else if(ACC_TAB==='log')body=table([{t:'Date',f:l=>frt(l.ts)},{t:'Évènement',k:'type'},{t:'Compte',k:'who'},{t:'Détail',k:'detail'}],S.authlog.slice(0,200));
  else body=table([{t:'Nom',f:a=>`<b>${esc(a.prenom+' '+a.nom)}</b><div class="small">${esc(a.matricule)} · ${esc(a.fonction)}</div>`},{t:'Contact',f:a=>`${esc(a.email)}<div class="small">${esc(a.tel)}</div>`},{t:'Site',f:a=>esc(siteName(a.site))},{t:'Profil',f:a=>a.role?esc(ROLES[a.role].n):'<span class="small">Demandé : '+esc(ROLES[a.roleDemande]?.n||'-')+'</span>'},{t:'Statut',f:a=>stp(a.statut)+(a.homonymeConfirme?'<div class="small">Homonyme déclaré</div>':'')},{t:'Demande',f:a=>fr(a.cree)},{t:'',f:acts}],rows,{empty:'Aucune demande en attente.'});
  return ph('Comptes et accès','Création de compte en libre-service avec contrôle des doublons, confirmation du courriel, puis activation et attribution du profil par un administrateur. Aucun accès aux données avant activation. Un administrateur ne peut pas activer son propre compte.')+`
  ${isAdm?'':'<div class="card"><b>Consultation seule.</b> Les actions sur les comptes sont réservées à l’administrateur (profil Administrateur DSI).</div>'}
  <div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${ACC_TAB===k?'on':''}" data-x="accTab" data-a="${k}">${l}</button>`).join('')}</div>
  <div class="card">${body}</div>
  <div class="card small"><b>Règles appliquées.</b> Doublons bloquants : courriel, téléphone, matricule ; homonyme signalé et déclaré par le demandeur, visible par l’administrateur. Mot de passe d’au moins 10 caractères (4 types). Verrouillage après ${AUTH_MAX_FAIL} échecs. Déconnexion automatique après ${AUTH_IDLE_MIN} minutes d’inactivité. En production : envoi réel des courriels (serveur SMTP SALAMA), mots de passe chiffrés côté serveur (Argon2), double authentification pour les administrateurs, revue trimestrielle des accès.</div>`;
};
ACT.accTab=k=>{ACC_TAB=k;render()};
function accAdminOk(a){if(!need('admin'))return false;if(a.uid===AUTH_UID){toast('Un administrateur ne peut pas agir sur son propre compte (séparation des tâches).',true);return false}return true}
ACT.accAct=id=>{const a=accOf(id);if(!a||!accAdminOk(a))return;
  const sites=[...REF.sites.map(s=>[s.code,s.nom]),...REF.agences.map(x=>[x.code,x.nom])];
  modal('Activer le compte',`<p><b>${esc(a.prenom+' '+a.nom)}</b> · ${esc(a.matricule)} · ${esc(a.fonction)}<br>${esc(a.email)} · ${esc(a.tel)}</p>${a.homonymeConfirme?'<div class="card warnc">Homonyme déclaré lors de la demande : vérifiez l’identité (matricule RH) avant activation.</div>':''}
  <label>Profil attribué<select id="acRole">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${k===a.roleDemande?'selected':''}>${esc(r.n)}</option>`).join('')}</select></label>
  <label>Site<select id="acSite">${sites.map(([c,n])=>`<option value="${c}" ${c===a.site?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
  <label>Code PIN opérationnel attribué (4 chiffres)<input id="acPin" inputmode="numeric" maxlength="4" value="${String(Math.floor(1000+Math.random()*9000))}"></label>
  <label>Votre code PIN administrateur (ré-authentification)<input id="acAdm" type="password" inputmode="numeric"></label>`,'<button class="btn p" id="acOk">Activer et notifier</button>');
  $('#acOk').onclick=()=>{if($('#acAdm').value!==me().pin)return toast('Code PIN administrateur incorrect.',true);const pin=$('#acPin').value;if(!/^\d{4}$/.test(pin))return toast('Le code PIN doit comporter 4 chiffres.',true);
    a.role=$('#acRole').value;a.site=$('#acSite').value;a.pin=pin;a.statut=ACC_ST.ACT;a.activePar=me().nom;a.activeLe=Date.now();
    const nm=a.prenom.charAt(0)+'. '+a.nom.charAt(0)+a.nom.slice(1).toLowerCase();const u=S.users.find(x=>x.id===a.uid);if(u)Object.assign(u,{role:a.role,site:a.site,pin});else S.users.push({id:a.uid,nom:nm,role:a.role,site:a.site,pin});
    mailSend(a.email,'SALAMA WMS – Votre compte est activé',`Bonjour ${a.prenom},\nVotre compte SALAMA WMS a été activé le ${frt(Date.now())} par ${me().nom}.\nProfil attribué : ${ROLES[a.role].n} · Site : ${siteName(a.site)}.\nVotre code PIN opérationnel vous sera remis en main propre par la DSI.\nConnectez-vous avec votre courriel professionnel et votre mot de passe.`,'login:'+a.email);
    authLog('Compte activé',a.email,ROLES[a.role].n+' · '+a.site+' · par '+me().nom);audit('Activation de compte','Compte',a.email+' · '+ROLES[a.role].n);save();closeModal();render();toast('Compte activé ; courriel envoyé à '+a.email+'.')}};
ACT.accRej=id=>{const a=accOf(id);if(!a||!accAdminOk(a))return;
  modal('Rejeter la demande',`<p>${esc(a.prenom+' '+a.nom)} · ${esc(a.email)}</p><label>Motif (communiqué au demandeur)<input id="rjM" value="Doublon ou identité non vérifiée"></label>`,'<button class="btn d" id="rjOk">Rejeter et notifier</button>');
  $('#rjOk').onclick=()=>{const m=$('#rjM').value.trim();if(!m)return toast('Motif obligatoire.',true);a.statut=ACC_ST.REJ;a.motif=m;mailSend(a.email,'SALAMA WMS – Demande de compte non retenue',`Bonjour ${a.prenom},\nVotre demande de compte n’a pas été retenue. Motif : ${m}.\nPour toute question, contactez la DSI de SALAMA.`);authLog('Demande rejetée',a.email,m);audit('Rejet de demande de compte','Compte',a.email+' · '+m);save();closeModal();render()}};
ACT.accSus=id=>{const a=accOf(id);if(!a||!accAdminOk(a))return;
  modal('Suspendre le compte',`<p>${esc(a.prenom+' '+a.nom)} · ${esc(a.email)}</p><label>Motif<input id="ssM" value="Départ, mutation ou absence prolongée"></label>`,'<button class="btn d" id="ssOk">Suspendre</button>');
  $('#ssOk').onclick=()=>{a.statut=ACC_ST.SUS;a.motif=$('#ssM').value;mailSend(a.email,'SALAMA WMS – Compte suspendu',`Votre compte a été suspendu. Motif : ${a.motif}.`);authLog('Compte suspendu',a.email,a.motif);audit('Suspension de compte','Compte',a.email);save();closeModal();render()}};
ACT.accRe=id=>{const a=accOf(id);if(!a||!accAdminOk(a))return;const was=a.statut;a.statut=ACC_ST.ACT;a.fails=0;a.motif='';mailSend(a.email,'SALAMA WMS – Compte réactivé','Votre compte est de nouveau actif. Vous pouvez vous connecter.','login:'+a.email);authLog(was===ACC_ST.LOCK?'Compte déverrouillé':'Compte réactivé',a.email,'par '+me().nom);audit('Réactivation de compte','Compte',a.email);save();render();toast('Compte réactivé.')};
const _badge_auth=badgeCount;badgeCount=function(v){if(v==='comptes')return (S.accounts||[]).filter(a=>a.statut===ACC_ST.PEND).length;return _badge_auth(v)};
/* réinitialisation de la démonstration : on conserve la session de l’utilisateur connecté */
const _reset_auth=ACT.dataResetOk;ACT.dataResetOk=()=>{const keep=AUTH_UID;_reset_auth();ensureAuth();if(accOf(keep))authSession(keep);else authSession(null);save();shell();render()};

/* Manuel d’utilisation : lien depuis À propos et Modules de formation */
['apropos','formation'].forEach(k=>{const v=VIEWS[k];if(!v)return;VIEWS[k]=function(){const h=v.apply(this,arguments);const card=`<div class="card"><h2>Manuel d’utilisation</h2><p>Guide complet de l’outil, écran par écran, avec captures d’écran, profils, règles de contrôle et circuit de test de bout en bout.</p><a class="btn p" href="${MANUEL_URL}" target="_blank" rel="noopener">Ouvrir le manuel (PDF)</a></div>`;const i=h.indexOf('<div class="card">');return i<0?h+card:h.slice(0,i)+card+h.slice(i)}});
