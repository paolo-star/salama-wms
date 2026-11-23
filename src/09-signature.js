/*
 * SALAMA WMS – Signature manuscrite numérique de la POD
 * © 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
 * Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
 */
/* ============ SALAMA WMS – signature manuscrite numérique (doigt, stylet ou souris) sur téléphone, tablette ou PC ============ */
const deviceKind=()=>{const u=navigator.userAgent||'';return /iPad|Tablet|SM-T|Tab/i.test(u)?'Tablette':/Android|iPhone|Mobile/i.test(u)?'Téléphone':'Ordinateur'};
function sigBlock(id,titre,nomField){return `<div class="sigbox"><div class="row" style="justify-content:space-between"><div class="fl">${titre}</div><div class="row"><button type="button" class="btn s" data-sigclear="${id}">Effacer</button><button type="button" class="btn s p" data-sigfull="${id}" data-signame="${nomField}" data-sigtitle="${esc(titre)}">Signer en plein écran</button></div></div>
  <canvas class="sig" id="${id}" aria-label="${esc(titre)} : signez avec le doigt, un stylet ou la souris"></canvas><div class="small muted" id="${id}_cap">Signez dans le cadre avec le doigt, un stylet ou la souris.</div></div>`}
/* Zone de signature : haute définition (devicePixelRatio), tracé lissé, compte des points pour refuser un simple clic */
function sigPad(id){const c=$('#'+id);if(!c)return;const dpr=Math.max(1,window.devicePixelRatio||1);const ctx=c.getContext('2d');
  const setup=()=>{const b=c.getBoundingClientRect();c.width=Math.round(b.width*dpr);c.height=Math.round(b.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#13304A';ctx.fillStyle='#fff';ctx.fillRect(0,0,b.width,b.height)};setup();
  let dr=false,last=null;c.dataset.pts='0';
  const pos=e=>{const b=c.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]};
  c.onpointerdown=e=>{e.preventDefault();dr=true;last=pos(e);try{c.setPointerCapture(e.pointerId)}catch(_){}};
  c.onpointermove=e=>{if(!dr)return;e.preventDefault();const p=pos(e);const w=e.pressure&&e.pointerType==='pen'?1.2+e.pressure*2.4:2.4;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(last[0],last[1]);const mx=(last[0]+p[0])/2,my=(last[1]+p[1])/2;ctx.quadraticCurveTo(last[0],last[1],mx,my);ctx.lineTo(p[0],p[1]);ctx.stroke();last=p;c.dataset.pts=String(+c.dataset.pts+1);if(+c.dataset.pts>=12)c.dataset.signed='1'};
  c.onpointerup=c.onpointercancel=()=>{dr=false;if(c.dataset.signed){c.dataset.ts=String(Date.now());c.dataset.dev=deviceKind();sigCaption(id)}};
  c.__clear=()=>{setup();delete c.dataset.signed;delete c.dataset.ts;c.dataset.pts='0';const cap=$('#'+id+'_cap');if(cap)cap.textContent='Signez dans le cadre avec le doigt, un stylet ou la souris.'};
  const box=c.closest('.sigbox');if(box){box.querySelector('[data-sigclear]').onclick=()=>c.__clear();box.querySelector('[data-sigfull]').onclick=ev=>sigFull(id,ev.currentTarget.dataset.signame,ev.currentTarget.dataset.sigtitle)}}
function sigCaption(id){const c=$('#'+id),cap=$('#'+id+'_cap');if(!cap)return;cap.innerHTML=pill('Signé','ok')+` le ${frt(+c.dataset.ts)} · ${esc(c.dataset.dev||'')}`}
/* Plein écran : grand cadre adapté au téléphone en mode paysage, puis report dans le POD */
function sigFull(id,nameField,titre){const nom=($('#'+nameField)?.value||'').trim();const ov=document.createElement('div');ov.className='sigfull';ov.setAttribute('role','dialog');ov.setAttribute('aria-label',titre);
  ov.innerHTML=`<div class="sfh"><div><b>${esc(titre)}</b><br><span class="small">${nom?esc(nom)+' · ':''}${fr(Date.now())} · tournez l’appareil à l’horizontale pour plus d’espace</span></div><div class="row"><button class="btn s" id="sfC">Effacer</button><button class="btn s" id="sfX">Annuler</button><button class="btn s p" id="sfOK">Valider la signature</button></div></div><canvas class="sig sfc" id="sfCanvas"></canvas><div class="sfl">Signature – ${nom?esc(nom):'nom à saisir dans le formulaire'}</div>`;
  document.getElementById('root').appendChild(ov);sigPad('sfCanvas');const big=$('#sfCanvas');const onRz=()=>{if(!big.dataset.signed)big.__clear()};window.addEventListener('resize',onRz);const close=()=>{window.removeEventListener('resize',onRz);ov.remove()};
  $('#sfC').onclick=()=>big.__clear();$('#sfX').onclick=close;
  $('#sfOK').onclick=()=>{if(!big.dataset.signed)return toast('Signature trop courte : signez dans le cadre.',true);const small=$('#'+id);const sc=small.getContext('2d');const b=small.getBoundingClientRect();
    sc.setTransform(1,0,0,1,0,0);sc.fillStyle='#fff';sc.fillRect(0,0,small.width,small.height);const bx=inkBox(big);const pad=small.height*.08;const r=Math.min((small.width-2*pad)/bx.w,(small.height-2*pad)/bx.h,1.5);const w=bx.w*r,h=bx.h*r;sc.drawImage(big,bx.x,bx.y,bx.w,bx.h,(small.width-w)/2,(small.height-h)/2,w,h);
    const dpr=Math.max(1,window.devicePixelRatio||1);sc.setTransform(dpr,0,0,dpr,0,0);sc.lineWidth=2.4;sc.lineCap='round';sc.strokeStyle='#13304A';
    small.dataset.signed='1';small.dataset.pts=big.dataset.pts;small.dataset.ts=String(Date.now());small.dataset.dev=deviceKind()+' (plein écran)';sigCaption(id);close()}}
function sigMeta(id,nom){const c=$('#'+id);return {nom:nom||'',ts:+c.dataset.ts||Date.now(),appareil:c.dataset.dev||deviceKind(),points:+c.dataset.pts||0}}

/* Cadre de l'encre : la signature est recadrée avant d'être reportée dans le POD */
function inkBox(c){const ctx=c.getContext('2d');const {width:W,height:H}=c;const d=ctx.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=0,y1=0;
  for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){const i=(y*W+x)*4;if(d[i]<200||d[i+1]<200){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(x1<=x0||y1<=y0)return {x:0,y:0,w:W,h:H};const m=6;x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(W,x1+m);y1=Math.min(H,y1+m);return {x:x0,y:y0,w:x1-x0,h:y1-y0}}
