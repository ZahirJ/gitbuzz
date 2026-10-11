/* GitBuzz · app.js
   UI, state and the loop/lick players. Song data comes from songs/*.js through GitBuzz.songs;
   music theory, tab text and sound come from theory.js, notation.js and audio.js. */
(function(){
'use strict';
const GB=window.GitBuzz,T=GB.theory,N=GB.notation,A=GB.audio;
const {SHARP,MIXED,IVL,OPEN,STRING_NAMES:SNAME}=T;
const FRETS=T.FRETS;
const parseChord=T.parseChord;
function nm(pc){return T.noteName(pc,song())}
function keyName(s){return T.keyName(s)}
function keyData(){return T.keyData(song())}
function boxCells(k){return T.boxCells(song(),k)}
/* ---------- state ---------- */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let custom=store.get('nn-songs',[]);
let done=store.get('nn-missions',{});
const S={song:store.get('nn-song','maka'),section:'Verse',idx:0,scale:'pent',box:1,follow:true,labels:'notes',colorIv:null,playing:false,bpm:null,home:false};

const LVL=['','Easy','Medium','Harder'];
function allSongs(){return GB.songs.concat(custom)}
function song(){return allSongs().find(s=>s.id===S.song)||GB.songs[0]}
function prog(){const s=song();return s.sections[S.section]||Object.values(s.sections)[0]}
/* ---------- render ---------- */
const $=id=>document.getElementById(id);
function renderSongs(){
  const el=$('songs');el.innerHTML='';
  allSongs().forEach(s=>{
    const b=document.createElement('button');b.className='song';b.setAttribute('aria-pressed',s.id===S.song);
    b.innerHTML=`<span class="t" dir="auto"></span><span class="a" dir="auto"></span><span class="k"></span>`;
    b.querySelector('.t').textContent=s.name;b.querySelector('.a').textContent=s.artist||'';
    b.querySelector('.k').textContent=keyName(s);
    b.onclick=()=>{stop();S.lick=null;S.sheetChord=null;$('lickNow').hidden=true;S.song=s.id;store.set('nn-song',s.id);S.section=Object.keys(s.sections)[0];S.idx=0;S.bpm=null;S.colorIv=null;renderAll()};
    el.appendChild(b);
  });
  const a=document.createElement('button');a.className='song add';a.innerHTML='<span class="t">+ Add a song</span><span class="a">Paste chords from your tabs</span>';
  a.onclick=()=>{$('fName').focus();$('addForm').scrollIntoView({behavior:'smooth',block:'center'})};
  el.appendChild(a);
}

function renderSections(){
  const el=$('sections');el.innerHTML='';
  Object.keys(song().sections).forEach(k=>{
    const b=document.createElement('button');b.textContent=k;b.setAttribute('aria-pressed',k===S.section);
    b.onclick=()=>{clearLick();S.sheetChord=null;S.section=k;S.idx=0;S.colorIv=null;if(S.playing){restartLoop()}renderAll()};el.appendChild(b);
  });
}
function renderStrip(){
  const el=$('strip');el.innerHTML='';
  prog().forEach(([c,b],i)=>{
    const x=document.createElement('button');x.className='chip';x.setAttribute('aria-current',i===S.idx);
    x.innerHTML=`<span></span><small>${b} beats</small>`;x.firstChild.textContent=c;
    x.onclick=()=>{S.idx=i;S.colorIv=null;S.sheetChord=null;renderChordDependent();renderSheetPressed()};el.appendChild(x);
  });
  const p=prog();const cur=p[S.idx][0];const nxt=p[(S.idx+1)%p.length][0];
  $('cur').textContent=cur;$('nxt').textContent='next: '+nxt;
}
function renderTransport(){
  const s=song();if(S.bpm==null)S.bpm=s.bpm||100;
  $('tempo').value=S.bpm;$('bpm').textContent=S.bpm;$('tempoNote').textContent=s.tempoNote||'Timing is a simple loop of 4 beats per chord unless you set it.';
  $('play').innerHTML=S.playing?'<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="1"/></svg>':'<svg viewBox="0 0 20 20"><path d="M5 3l12 7-12 7z"/></svg>';
  $('play').setAttribute('aria-label',S.playing?'Stop loop':'Play loop');
}
function segBind(id,key,map){
  document.querySelectorAll('#'+id+' button').forEach(b=>{
    const v=b.dataset.v;b.setAttribute('aria-pressed',String(map?map(v)===S[key]:v===S[key]));
    b.onclick=()=>{clearLick();S[key]=map?map(v):v;renderControls();renderBoard();renderTab()};
  });
}
function renderControls(){
  segBind('scaleSeg','scale');segBind('labelSeg','labels');segBind('followSeg','follow',v=>v==='on');
  const el=$('boxSeg');el.innerHTML='';
  const all=document.createElement('button');all.textContent='Whole neck';all.setAttribute('aria-pressed',S.box===0);all.onclick=()=>{clearLick();S.box=0;renderControls();renderBoard();renderTab()};el.appendChild(all);
  for(let k=1;k<=5;k++){const bx=boxCells(k);const b=document.createElement('button');b.textContent=`Box ${k} · fr ${bx.start}`;b.setAttribute('aria-pressed',S.box===k);b.onclick=()=>{clearLick();S.box=k;renderControls();renderBoard();renderTab()};el.appendChild(b)}
}
function currentChord(){if(S.sheetChord)return parseChord(GB.chordsheet.readChord(S.sheetChord)||'C');return parseChord(prog()[S.idx][0])||parseChord('C')}

function renderBoard(){
  const kd=keyData();const ch=currentChord();
  const scale=S.scale==='pent'?kd.pent:kd.full;
  const box=S.box?boxCells(S.box):null;
  const boxSet=box?new Set(box.cells.map(c=>c.s+'-'+c.f)):null;
  const colorPc=S.colorIv==null?null:(ch.root+S.colorIv)%12;
  const W=1100,nutX=56,fw=(W-nutX-14)/FRETS,top=28,gap=38;
  const xOf=f=>f===0?nutX-26:nutX+(f-0.5)*fw;
  const yOf=s=>top+(5-s)*gap; // high e (5) on top
  let o='';
  o+=`<rect x="0" y="0" width="${W}" height="262" fill="var(--wood)"/>`;
  o+=`<rect x="${nutX}" y="${top-12}" width="${W-nutX-14}" height="${gap*5+24}" fill="var(--wood-2)"/>`;
  [3,5,7,9,15].forEach(f=>{o+=`<circle cx="${nutX+(f-0.5)*fw}" cy="${top+gap*2.5}" r="7" fill="var(--inlay)"/>`});
  o+=`<circle cx="${nutX+11.5*fw}" cy="${top+gap*1.5}" r="7" fill="var(--inlay)"/><circle cx="${nutX+11.5*fw}" cy="${top+gap*3.5}" r="7" fill="var(--inlay)"/>`;
  if(box){const x1=box.min===0?nutX-44:nutX+(box.min-1)*fw;const x2=nutX+box.max*fw;
    o+=`<rect x="${x1+2}" y="${top-16}" width="${x2-x1-4}" height="${gap*5+32}" rx="8" fill="none" stroke="var(--color)" stroke-opacity=".55" stroke-width="2" stroke-dasharray="6 5"/>`}
  for(let f=1;f<=FRETS;f++){const x=nutX+f*fw;o+=`<line x1="${x}" y1="${top-12}" x2="${x}" y2="${top+gap*5+12}" stroke="var(--fret)" stroke-width="2"/>`}
  o+=`<rect x="${nutX-5}" y="${top-12}" width="6" height="${gap*5+24}" fill="var(--nut)"/>`;
  for(let s=0;s<6;s++){const y=yOf(s);o+=`<line x1="${nutX-44}" y1="${y}" x2="${W-14}" y2="${y}" stroke="var(--string)" stroke-width="${1+ (5-s)*0.0 + (s<3?(3-s)*0.6:0.4)}"/>`;
    o+=`<text x="10" y="${y+4}" font-family="var(--font-mono)" font-size="12" fill="var(--fret)">${['E','A','D','G','B','e'][s]}</text>`}
  for(let f=0;f<=FRETS;f++){o+=`<text x="${xOf(f)}" y="252" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="${[3,5,7,9,12,15].includes(f)?'var(--nut)':'var(--fret)'}">${f}</text>`}
  if(S.lick){
    const pos=new Map();S.lick.notes.forEach(([s,f],i)=>{if(f==null)return;const k=s+'-'+f;if(!pos.has(k))pos.set(k,{s,f,n:[]});pos.get(k).n.push(i)});
    const order=[];S.lick.notes.forEach(([s,f])=>{if(f!=null)order.push(s+'-'+f)});
    for(let s=0;s<6;s++)for(let f=0;f<=FRETS;f++){const pc=(OPEN[s]+f)%12;if(kd.pent.includes(pc)&&!pos.has(s+'-'+f))o+=`<circle cx="${xOf(f)}" cy="${yOf(s)}" r="9" fill="var(--scale)" opacity=".22"/>`}
    let num=0;const firstNum=new Map();order.forEach(k=>{num++;if(!firstNum.has(k))firstNum.set(k,[]);firstNum.get(k).push(num)});
    pos.forEach((p,k)=>{const x=xOf(p.f),y=yOf(p.s),pc=(OPEN[p.s]+p.f)%12;const cur=S.lickCur===k;
      const lbl=firstNum.get(k).join(',');
      o+=`<g class="dot" data-midi="${OPEN[p.s]+p.f}"><title>${nm(pc)} · string ${6-p.s}, fret ${p.f}</title>`;
      if(cur)o+=`<circle cx="${x}" cy="${y}" r="19" fill="none" stroke="var(--color)" stroke-width="4"/>`;
      o+=`<circle class="body" cx="${x}" cy="${y}" r="${cur?16:14}" fill="${cur?'var(--color)':pc===song().tonic?'var(--root)':'var(--chord)'}"/>`;
      o+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-family="var(--font-mono)" font-weight="700" font-size="${lbl.length>3?9:11}" fill="${pc===song().tonic&&!cur?'#fff':'#1A2030'}" pointer-events="none">${lbl}</text></g>`});
    $('board').innerHTML=o;
    $('boardTitle').textContent='Lick: '+S.lick.name;
    $('keyInfo').textContent='Numbers show the playing order · red = home note';
    return;
  }
  for(let s=0;s<6;s++)for(let f=0;f<=FRETS;f++){
    const midi=OPEN[s]+f,pc=midi%12;
    const inScale=scale.includes(pc);const isChord=S.follow&&ch.tones.includes(pc);const isColor=colorPc===pc;
    if(!(inScale||isChord||isColor))continue;
    if(box){
      if(S.scale==='pent'&&inScale&&!isChord&&!isColor){if(!boxSet.has(s+'-'+f))continue}
      else if(f<box.min||f>box.max)continue;
    }
    const isRoot=isChord&&pc===ch.root;const special=isChord&&!kd.pent.includes(pc);
    let fill='var(--scale)',ink='var(--scale-ink)',op=1;
    if(isRoot){fill='var(--root)';ink='#fff'}
    else if(isChord&&special){fill='var(--special)';ink='#fff'}
    else if(isChord){fill='var(--chord)';ink='#1A2030'}
    else if(isColor){fill='var(--color)';ink='#1A2030'}
    else if(S.follow)op=.62;
    const x=xOf(f),y=yOf(s);
    let label='';
    if(S.labels==='notes')label=nm(pc);else if(S.labels==='intervals')label=IVL[(pc-ch.root+12)%12];
    o+=`<g class="dot" data-midi="${midi}" opacity="${op}"><title>${nm(pc)} · string ${6-s}, fret ${f}</title>`;
    if(isColor)o+=`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="var(--color)" stroke-width="2.5" stroke-dasharray="4 3"/>`;
    if(S.home&&pc===song().tonic)o+=`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="var(--root)" stroke-width="3.5"/>`;
    o+=`<circle class="body" cx="${x}" cy="${y}" r="13" fill="${fill}"/>`;
    if(label)o+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-family="var(--font-mono)" font-weight="700" font-size="${label.length>2?10:12}" fill="${ink}" pointer-events="none">${label}</text>`;
    o+='</g>';
  }
  $('board').innerHTML=o;
  const s=song();
  $('keyInfo').textContent=s.mode==='major'?`Key ${nm(s.tonic)} major · ${nm(kd.minorRoot)} minor pentatonic = ${nm(s.tonic)} major pentatonic`:`Key ${keyName(s)} · ${nm(kd.minorRoot)} minor pentatonic`;
  $('boardTitle').textContent=(S.scale==='pent'?'Pentatonic':'Full scale')+(S.box?` · Box ${S.box}`:' · whole neck');if(S.sheetChord)$('boardTitle').textContent+=' · '+S.sheetChord+' from the sheet';
}
function renderTab(){
  if(!S.box){$('tabBlock').hidden=true;return}$('tabBlock').hidden=false;
  const box=boxCells(S.box);let notes=box.cells.slice();
  if(S.scale==='full'){const kd=keyData();notes=[];
    for(let s=0;s<6;s++)for(let f=box.min;f<=box.max;f++){const m=OPEN[s]+f;if(kd.full.includes(m%12))notes.push({s,f,midi:m})}
    // keep ascending, drop a note if same pitch appears on the next string
    notes.sort((a,b)=>a.s-b.s||a.f-b.f);const seen=new Set();notes=notes.filter(n=>{if(seen.has(n.midi))return false;seen.add(n.midi);return true});
  }
  const names=['E','A','D','G','B','e'];const lines=[[],[],[],[],[],[]];
  notes.forEach(n=>{for(let s=0;s<6;s++){lines[s].push(s===n.s?String(n.f).padEnd(2,'-')+'-':'---')}});
  $('tab').textContent=[5,4,3,2,1,0].map(s=>names[s]+'|-'+lines[s].join('')+'|').join('\n');
  $('tabLabel').textContent=`Box ${S.box} as tab (${S.scale==='pent'?'pentatonic':'full scale'}), play it up and back down`;
}
function renderColor(){
  const ch=currentChord();const kd=keyData();
  $('colorChord').textContent=ch.sym;
  const t=$('chordTones');t.innerHTML='';
  ch.tones.forEach(pc=>{const sp=document.createElement('span');sp.className='tone';
    const special=!kd.pent.includes(pc);sp.style.background=pc===ch.root?'var(--root)':special?'var(--special)':'var(--chord)';
    if(pc===ch.root||special)sp.style.color='#fff';sp.textContent=nm(pc)+' ('+IVL[(pc-ch.root+12)%12]+')';t.appendChild(sp)});
  const sp=ch.tones.filter(pc=>!kd.pent.includes(pc));
  $('specialNote').textContent=sp.length?`${sp.map(nm).join(' and ')} ${sp.length>1?'are':'is'} in this chord but not in the pentatonic. Landing on ${sp.length>1?'them':'it'} right when ${ch.sym} arrives makes your solo follow the chords.`:`All of ${ch.sym}'s notes are already in the pentatonic, so any amber or red dot is a safe landing.`;
  const base=ch.root;const cands=ch.minor?[[2,'add9'],[5,'add11'],[10,'7'],[9,'6']]:[[2,'add9'],[5,'sus4'],[9,'6'],[11,'maj7'],[10,'7']];
  const list=$('colorList');list.innerHTML='';
  const rootName=ch.sym.replace(/\/.*$/,'').match(/^[A-G][#b]?/)[0];
  cands.filter(([iv])=>!ch.iv.includes(iv)).map(([iv,suf])=>{const pc=(base+iv)%12;return {iv,suf,pc,inKey:kd.full.includes(pc)}})
   .sort((a,b)=>b.inKey-a.inKey)
   .forEach(c=>{
    const b=document.createElement('button');b.className='colorbtn';b.type='button';b.setAttribute('aria-pressed',S.colorIv===c.iv);
    const chordName=rootName+(ch.minor?'m':'')+(c.suf==='sus4'&&!ch.minor?'sus4':c.suf);
    b.innerHTML=`<span class="nm"></span><span class="ad"></span><span class="pill ${c.inKey?'in':'out'}">${c.inKey?'fits the key':'outside the key'}</span>`;
    b.querySelector('.nm').textContent=chordName;
    b.querySelector('.ad').textContent=(c.suf==='sus4'?'replace the 3rd with ':'add ')+nm(c.pc);
    b.onclick=()=>{S.colorIv=S.colorIv===c.iv?null:c.iv;renderColor();renderBoard()};
    list.appendChild(b);
  });
}
function renderMissions(){
  const s=song();const ms=s.missions||[
    ['Find home: Box 1','Loop the Verse and use only the dots in Box 1. Start and end each phrase on the key note, '+nm(s.tonic)+'.'],
    ['Land on the chords','With "Follow chord" on, land on an amber or red dot each time the chord changes.'],
    ['Find the special notes','Look for pink dots: chord notes outside the pentatonic. Hit each one when its chord arrives.'],
    ['Connect two boxes','Play one phrase that starts in Box 1 and ends in Box 2.'],
    ['Add color','Try each chord’s add9 or sus4 from the Color panel, in your strumming and in your solo.']];
  $('missionTitle').textContent='Missions for '+s.name;
  const el=$('missions');el.innerHTML='';const d=done[s.id]||[];
  ms.forEach(([t,p],i)=>{
    const row=document.createElement('label');row.className='mission'+(d.includes(i)?' done':'');
    row.innerHTML=`<input type="checkbox" id="m-${s.id}-${i}"><div style="display:grid;gap:3px;min-width:0"><h3></h3><p dir="auto"></p></div>`;
    row.querySelector('h3').textContent=(i+1)+'. '+t;row.querySelector('p').textContent=p;
    const cb=row.querySelector('input');cb.checked=d.includes(i);
    cb.onchange=()=>{const arr=new Set(done[s.id]||[]);cb.checked?arr.add(i):arr.delete(i);done[s.id]=[...arr];store.set('nn-missions',done);renderMissions()};
    el.appendChild(row);
  });
  const n=d.length;$('missionCount').textContent=`${n} of ${ms.length} done`;$('missionBar').style.width=(n/ms.length*100)+'%';
  const ln=$('links');ln.innerHTML='';
  (s.links||[['Find on Spotify','https://open.spotify.com/search/'+encodeURIComponent((s.artist||'')+' '+s.name)],['Search Ultimate Guitar','https://www.ultimate-guitar.com/search.php?search_type=title&value='+encodeURIComponent(s.name)]]).forEach(([t,u])=>{const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';a.textContent=t+' ↗';ln.appendChild(a)});
  if(s.custom){const del=document.createElement('button');del.className='btn';del.type='button';del.textContent='Remove this song';
    del.onclick=()=>{if(del.dataset.armed){custom=custom.filter(c=>c.id!==s.id);store.set('nn-songs',custom);delete sheets[s.id];store.set('gb-sheets',sheets);S.song=GB.songs[0].id;renderAll()}else{del.dataset.armed='1';del.textContent='Tap again to remove'}};ln.appendChild(del)}
  renderSources();
}
function guideFor(s){
  if(s.guide)return s.guide;
  // custom songs: pick the nearest chord tone inside Box 1 for each verse chord
  const box=boxCells(1);const verse=s.sections.Verse||Object.values(s.sections)[0];
  let prev=box.cells[4];const targets=[];
  verse.slice(0,6).forEach(([c])=>{const ch=parseChord(c);if(!ch)return;
    const cand=box.cells.filter(n=>ch.tones.includes(n.midi%12));if(!cand.length)return;
    cand.sort((a,b)=>Math.abs(a.midi-prev.midi)-Math.abs(b.midi-prev.midi));prev=cand[0];
    targets.push([c,prev.s,prev.f,nm(prev.midi%12)])});
  return {targets,special:null,record:'Start by playing only in the gaps between sung lines and in any instrumental parts.'};
}
function showMe(cfg){
  clearLick();Object.assign(S,{box:1,scale:'pent',labels:'notes',colorIv:null},cfg);
  if(cfg.section){S.section=cfg.section;S.idx=cfg.idx||0}
  renderSections();renderStrip();renderControls();renderBoard();renderTab();renderColor();
  $('board').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderGuide(){
  const s=song();const g=guideFor(s);const box=boxCells(1);const home=nm(s.tonic);
  const homes=box.cells.filter(c=>c.midi%12===s.tonic);
  const bendFret=box.start+2;const bendFrom=nm((OPEN[3]+bendFret)%12),bendTo=nm((OPEN[3]+bendFret+2)%12);
  $('guideTitle').textContent='How to solo with the box: '+s.name;
  $('guideIntro').textContent=`The box is a map of notes that fit the whole song. You don't need to know theory to use it. Any note in it sounds fine over every chord. The steps below turn "fine" into "musical". For this song, Box 1 starts at fret ${box.start}, and the home note is ${home}.`;
  const steps=[
   {t:'Learn the shape',m:'5 min',cfg:{follow:false,home:false},
    html:`<p>Put one finger per fret: <strong>index on fret ${box.start}</strong>, ring finger 2 frets higher, pinky 3 frets higher. Play every note from the thick string to the thin one and back, one note per click. Set the tempo to 70 and press play with "Scale only" on.</p><pre class="tab">${N.miniTab(box.cells.map(c=>[c.s,c.f]),null,3)}</pre><p>Say the note names out loud as you go. When you can play it with your eyes closed, move on.</p>`},
   {t:'Find home',m:'3 min',cfg:{follow:false,home:true},
    html:`<p>The home note is <strong>${home}</strong>. In Box 1 it sits in ${homes.length} places:</p><pre class="tab">${N.miniTab(homes.map(c=>[c.s,c.f]),homes.map(()=>home))}</pre><p>Loop the verse and play <strong>only these notes</strong>, in any rhythm. Ending a phrase on home sounds finished. Ending anywhere else sounds like a question. Both are useful.</p>`},
   {t:'Play short, then rest',m:'5 min',cfg:{follow:false,home:true},
    html:`<p>Play 3 or 4 notes from the box, then stop for the rest of the bar. In the next bar, answer yourself.</p><ul><li><strong>Rule: one bar on, one bar off.</strong></li><li>Repeat the same rhythm with different notes. A repeated rhythm sounds planned.</li><li>Start each phrase on home, then try ending on it instead.</li></ul><p>Most beginners play too many notes. The gaps are what make it sound like a solo instead of a scale.</p>`},
   {t:'Land on the chord',m:'7 min',cfg:{follow:true,home:false,section:'Verse',idx:0},
    html:`<p>Now turn on <strong>Follow chord</strong>. The amber and red dots are the notes of the chord playing right now. Play anything in the box, but on the <strong>first beat of each new chord</strong>, arrive on its target:</p><pre class="tab">${g.targets.length?N.miniTab(g.targets.map(t=>[t[1],t[2]]),g.targets.map(t=>t[0])):'Add verse chords to see targets.'}</pre><p>${g.targets.length?'Targets in order: '+g.targets.map(t=>`${t[0]} → ${t[3]}`).join(', ')+'.':''} They are close together, so your hand barely moves. First play just the targets, one per chord. Then add a couple of notes before each one.</p>`},
   g.special?{t:'Add the special note',m:'3 min',cfg:{follow:true,home:false,section:'Verse',idx:g.special.chordIdx},
    html:`<p>One note outside the box makes the song sound like itself. Here it is <strong>${g.special.note}</strong>, the pink dot.</p><pre class="tab">${N.miniTab([g.special.pos],[g.special.note])}</pre><p>${g.special.text}</p>`}
   :{t:'Add the special notes',m:'3 min',cfg:{follow:true,home:false},
    html:`<p>With Follow chord on, look for pink dots. They are chord notes outside the box. Land on one right when its chord arrives, then return to the box.</p>`},
   {t:'Make the notes sing',m:'any time',cfg:{follow:true,home:true},
    html:`<ul><li><strong>Slide</strong> into a target from 2 frets below instead of just pressing it.</li><li><strong>Bend:</strong> on the G string, fret ${bendFret} (${bendFrom}), push the string up until it sounds like ${bendTo}, the next box note. Check the pitch by playing fret ${bendFret+2} first.</li><li><strong>Vibrato</strong> on the last note of a phrase: shake the string gently up and down.</li></ul><p>One of these on the last note of each phrase is enough.</p>`},
   {t:'Play with the record',m:'5 min',cfg:{follow:true,home:false},
    html:`<p>Set the tempo to ${s.bpm||'the song’s'} bpm, then play along with the real track instead of the loop. Stay in Box 1.</p><p>${g.record}</p><p>When Box 1 feels easy, try the same phrases in Box 2.</p>`}
  ];
  const el=$('steps');el.innerHTML='';
  steps.forEach((st,i)=>{const d=document.createElement('div');d.className='step';
    d.innerHTML=`<div class="step-head"><span class="step-num">${i+1}</span><h3></h3><span class="mins">${st.m}</span></div>${st.html}`;
    d.querySelector('h3').textContent=st.t;
    const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='Show me on the board';b.onclick=()=>showMe(st.cfg);d.appendChild(b);
    el.appendChild(d)});
}
function renderLicks(){
  const s=song();const list=s.licks;const el=$('lickList');el.innerHTML='';
  $('licksTitle').textContent='Licks for '+s.name;
  if(!list){el.innerHTML='<p class="note">No licks are written for this song yet. Use the guide above: a target note on each chord change plus a short phrase before it is a lick of your own.</p>';return}
  list.forEach((L,i)=>{
    const d=document.createElement('div');d.className='lick'+(S.lick===L?' on':'');
    d.innerHTML=`<div class="meta"><span class="lvl l${L.lvl}">${LVL[L.lvl]}</span><span class="note">${L.where}</span></div><h3></h3><span class="prog">${L.chords.map(c=>c[0]).join(' → ')}</span><pre class="tab"></pre><p></p><div class="row"></div>`;
    d.querySelector('h3').textContent=L.name;d.querySelector('pre').textContent=N.lickTab(L);d.querySelector('p').textContent=L.tip;
    const r=d.querySelector('.row');
    const p=document.createElement('button');p.className='btn primary';p.type='button';p.textContent='Play it';p.onclick=()=>playLick(L,true);
    const v=document.createElement('button');v.className='btn';v.type='button';v.textContent='Show on board';v.onclick=()=>showLick(L,true);
    r.append(p,v);el.appendChild(d)});
}
function showLick(L,scroll){
  stop();S.lick=L;S.lickCur=null;$('lickNow').hidden=false;$('lickNowName').textContent=L.name+' · '+L.chords.map(c=>c[0]).join(' → ');
  $('lickNowTab').textContent=N.lickTab(L);renderBoard();renderLicks();
  if(scroll)$('board').closest('.panel').scrollIntoView({behavior:'smooth',block:'start'});
}
let lickTimers=[];
function stopLick(){lickTimers.forEach(clearTimeout);lickTimers=[];S.lickCur=null}
function clearLick(){stopLick();if(S.lick){S.lick=null;$('lickNow').hidden=true;renderLicks()}}
function playLick(L,scroll){
  if(!A.ensure())return;showLick(L,scroll);
  const spb=60/S.bpm;const t0=A.now()+.15;
  for(let k=0;k<4;k++)A.click(t0+k*spb,k===0);
  const start=t0+4*spb;let t=start;
  L.chords.forEach(([c,b])=>{const ch=parseChord(c)||parseChord('C');
    for(let k=0;k<b;k++)A.backingBeat(ch,t+k*spb,spb,k);t+=b*spb});
  let tn=start,prev=null;
  L.notes.forEach(([s,f,d,tech])=>{
    if(f!=null){const m=OPEN[s]+f;A.lickNote(m,tn,d*spb,tech,prev);prev=m;const k=s+'-'+f;
      lickTimers.push(setTimeout(()=>{S.lickCur=k;renderBoard()},Math.max(0,(tn-A.now())*1000)))}
    tn+=d*spb});
  lickTimers.push(setTimeout(()=>{S.lickCur=null;if(S.lick===L)renderBoard()},(t-A.now())*1000+200));
}
function renderChordDependent(){renderStrip();renderBoard();renderColor();
  document.querySelectorAll('#beats i').forEach(i=>i.classList.remove('on'))}
function renderAll(){renderSongs();renderSections();renderTransport();renderStrip();renderControls();renderBoard();renderTab();renderColor();renderGuide();renderLicks();renderMissions();renderSheet()}

/* ---------- loop player ---------- */
let timer=null,nextTime=0,beat=0,flat=[];
function buildFlat(){flat=[];prog().forEach(([c,b],i)=>{for(let k=0;k<b;k++)flat.push({i,k,c})})}
function schedule(){
  const spb=60/S.bpm;
  while(nextTime<A.now()+.15){
    const step=flat[beat%flat.length];const ch=parseChord(step.c)||parseChord('C');
    A.backingBeat(ch,nextTime,spb,step.k);
    const when=(nextTime-A.now())*1000;const st={...step};
    setTimeout(()=>{if(!S.playing)return;if(st.i!==S.idx){S.idx=st.i;if(S.colorIv!=null)S.colorIv=null;renderChordDependent()}
      document.querySelectorAll('#beats i').forEach((el,j)=>el.classList.toggle('on',j===st.k%4))},Math.max(0,when));
    nextTime+=spb;beat++;
  }
}
function start(){if(!A.ensure())return;if(S.sheetChord){S.sheetChord=null;renderSheetPressed()}if(S.lick){clearLick();renderBoard()}buildFlat();beat=flat.findIndex(f=>f.i===S.idx&&f.k===0);if(beat<0)beat=0;nextTime=A.now()+.08;S.playing=true;timer=setInterval(schedule,25);schedule();renderTransport()}
function stop(){stopLick();S.playing=false;clearInterval(timer);timer=null;renderTransport();document.querySelectorAll('#beats i').forEach(i=>i.classList.remove('on'))}
function restartLoop(){stop();S.idx=0;start()}

$('play').onclick=()=>S.playing?stop():start();
$('lickClear').onclick=()=>{clearLick();renderBoard()};
$('lickReplay').onclick=()=>{if(S.lick){stopLick();playLick(S.lick,false)}};
$('tempo').oninput=e=>{S.bpm=+e.target.value;$('bpm').textContent=S.bpm};
$('board').addEventListener('click',e=>{const g=e.target.closest('.dot');if(!g||!A.ensure())return;A.pluck(+g.dataset.midi,A.now()+.01)});

/* ---------- add song ---------- */
SHARP.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=MIXED[i]===n?n:n+' / '+MIXED[i];$('fRoot').appendChild(o)});
function parseLine(txt){const toks=txt.replace(/\|/g,' ').split(/\s+/).filter(Boolean);const out=[],bad=[];
  toks.forEach(t=>{const [c,b]=t.split(':');if(parseChord(c)){out.push([c,b&&+b>0?Math.min(16,+b):4])}else if(/^[A-G]/.test(t))bad.push(t)});return {out,bad}}
$('addForm').addEventListener('submit',e=>{e.preventDefault();const err=$('fErr');err.textContent='';
  const name=$('fName').value.trim();const v=parseLine($('fVerse').value),c=parseLine($('fChorus').value);
  if(!name){err.textContent='Add a song name so you can find it again.';return}
  if(!v.out.length){err.textContent='Paste at least one verse chord, for example: Am G F E.';return}
  const bad=v.bad.concat(c.bad);if(bad.length){err.textContent='These chords weren’t recognised: '+bad.join(', ')+'. Simplify them (for example, Cadd9 → C) and try again.';return}
  const s={id:'c'+Date.now(),custom:true,name,artist:$('fArtist').value.trim(),tonic:+$('fRoot').value,mode:$('fMode').value,bpm:100,sections:{Verse:v.out}};
  if(c.out.length)s.sections.Chorus=c.out;
  custom.push(s);store.set('nn-songs',custom);stop();S.song=s.id;S.section='Verse';S.idx=0;S.bpm=null;S.colorIv=null;store.set('nn-song',s.id);
  e.target.reset();renderAll();window.scrollTo({top:0,behavior:'smooth'});
});


/* ---------- song sheet: chords over lyrics; lyrics stay in this browser ---------- */
let sheets=store.get('gb-sheets',{});
const today=()=>new Date().toISOString().slice(0,10);
function renderSheet(){
  const s=song(),sh=sheets[s.id],box=$('sheet');
  $('sheetEmpty').hidden=!!sh;box.hidden=!sh;$('sheetTools').hidden=!sh;
  $('sheetFrom').textContent=sh?`From your pasted ${sh.from}, ${sh.added}`:'';
  box.innerHTML='';if(!sh)return;
  if(sh.rtl===undefined)sh.rtl=sh.sheet.some(it=>it.kind==='line'&&/[\u0590-\u05FF]/.test(it.segs.map(x=>x.text).join('')));
  box.dir=sh.rtl?'rtl':'ltr';
  const btn=c=>{const b=document.createElement('button');b.type='button';b.className='sh-ch';b.textContent=c||'';
    if(c){b.dataset.chord=c;b.setAttribute('aria-pressed',String(S.sheetChord===c))}else{b.disabled=true;b.tabIndex=-1}return b};
  sh.sheet.forEach(it=>{
    let el=document.createElement('div');
    if(it.kind==='header'){el.className='sh-head';el.textContent=it.name;if(it.inferred){const i=document.createElement('i');i.textContent=' · guessed';el.appendChild(i)}}
    else if(it.kind==='line'){el.className='sh-line';el.dir=/[\u0590-\u05FF\u0600-\u06FF]/.test(it.segs.map(x=>x.text).join(''))?'rtl':'ltr';
      it.segs.forEach(sg=>{const seg=document.createElement('span');seg.className='sh-seg';const t=document.createElement('span');t.textContent=sg.text;seg.append(btn(sg.chord),t);el.appendChild(seg)})}
    else if(it.kind==='chords'){el.className='sh-chords';el.dir=sh.rtl?'rtl':'ltr';it.chords.forEach(c=>el.appendChild(btn(c)))}
    else if(it.kind==='tab'){el.className='sh-tab';el.dir='ltr';el.textContent=it.text}
    else if(it.kind==='lyric'){el.className='sh-lyric';el.dir='auto';el.textContent=it.text}
    else return;
    box.appendChild(el)});
}
function renderSheetPressed(){document.querySelectorAll('#sheet .sh-ch[data-chord]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chord===S.sheetChord)))}
$('sheet').addEventListener('click',e=>{const b=e.target.closest('.sh-ch[data-chord]');if(!b)return;
  if(S.playing)stop();clearLick();S.sheetChord=b.dataset.chord;S.colorIv=null;$('cur').textContent=S.sheetChord;$('nxt').textContent='from the sheet';
  renderBoard();renderColor();renderSheetPressed();
  const ch=parseChord(GB.chordsheet.readChord(S.sheetChord)||'');if(ch&&A.ensure())A.stab(ch,A.now()+.02,.9)});
$('sheetRemove').onclick=()=>{const b=$('sheetRemove');if(b.dataset.armed){delete sheets[song().id];store.set('gb-sheets',sheets);delete b.dataset.armed;b.textContent='Remove the lyrics from this browser';S.sheetChord=null;renderSheet();renderBoard();renderSources()}else{b.dataset.armed='1';b.textContent='Tap again to remove'}};
$('sheetGoAdd').onclick=e=>{e.preventDefault();$('addPanel').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('impText').focus(),400)};

/* ---------- where the data comes from (provenance from the merge) ---------- */
const SRC_NAME={'tab4u':'Tab4U','ultimate-guitar':'Ultimate Guitar','web':'Web chord sheet','audio':'Recording','paste':'Pasted page','manual':'GitBuzz (by hand)'};
const FIELD_NAME={name:'name',artist:'artist',credits:'credits',key:'key',bpm:'tempo',missions:'missions',guide:'guide notes',licks:'licks',tempoNote:'tempo note'};
function renderSources(){
  const s=song(),list=$('sourcesList'),srcs=s.sources||[],sh=sheets[s.id];
  $('sourcesBox').hidden=!srcs.length&&!sh;list.innerHTML='';
  const wrap=document.createElement('div');wrap.className='src-list';
  const prov=s.provenance||{};
  const seen=new Set();
  srcs.forEach(src=>{
    const gave=Object.entries(prov).filter(([k,v])=>k!=='sections'&&v===src.plugin).map(([k])=>FIELD_NAME[k]||k);
    Object.entries(prov.sections||{}).forEach(([sec,v])=>{if(v.split(':')[0]===src.plugin)gave.push(sec+' chords'+(v===src.plugin&&src.plugin==='audio'?' (timed)':''))});
    const key=src.plugin+'|'+src.ref;if(seen.has(key))return;seen.add(key);
    const row=document.createElement('div');row.className='src-item';
    const p=document.createElement('span');p.className='pill in';p.textContent=SRC_NAME[src.plugin]||src.plugin;row.appendChild(p);
    const ref=document.createElement(/^https:\/\//.test(src.ref)?'a':'span');ref.className='ref';ref.textContent=src.ref.replace(/^https:\/\/(www\.)?/,'').slice(0,70);if(ref.tagName==='A'){ref.href=src.ref;ref.target='_blank';ref.rel='noopener'}row.appendChild(ref);
    const g=document.createElement('span');g.textContent=gave.length?'gave '+[...new Set(gave)].join(', '):'(cross-check only)';row.appendChild(g);
    wrap.appendChild(row)});
  if(prov.key==='guessed from chords'){const r=document.createElement('div');r.className='src-item';r.textContent='Key: guessed from the chords.';wrap.appendChild(r)}
  if(prov.bpm==='default'){const r=document.createElement('div');r.className='src-item';r.textContent='Tempo: no source yet, so 100 bpm is a starting guess.';wrap.appendChild(r)}
  if(sh){const r=document.createElement('div');r.className='src-item';const p=document.createElement('span');p.className='pill';p.textContent='Lyrics';r.append(p,document.createTextNode(`your pasted ${sh.from}, kept in this browser only`));wrap.appendChild(r)}
  (s.conflicts||[]).forEach(c=>{const r=document.createElement('div');r.className='src-item src-conf';r.textContent=`Sources disagree on ${FIELD_NAME[c.field]||c.field}: used ${SRC_NAME[c.chosen]||c.chosen} (${c.value}), ${SRC_NAME[c.other]||c.other} says ${c.otherValue}.`;wrap.appendChild(r)});
  (s.notes||[]).forEach(n=>{const r=document.createElement('div');r.className='src-item note';r.dir='auto';r.textContent=n;wrap.appendChild(r)});
  list.appendChild(wrap);
}

/* ---------- add a song from a link or a pasted page ---------- */
SHARP.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=MIXED[i]===n?n:n+' / '+MIXED[i];$('impRoot').appendChild(o)});
const URL_HINT={
  'tab4u':'This is a Tab4U page. Open it, select the whole page, copy it, and paste it below. Or copy the request for Claude, which reads the chords for the shared song list and can measure the tempo from a recording.',
  'ultimate-guitar':'This is an Ultimate Guitar page. Open it, select the whole page, copy it, and paste it below. Pro and Official tabs are interactive players, so only regular chord pages can be read. Or copy the request for Claude.',
  'audio':'This is an audio file. The browser can’t analyze audio here. Copy the request for Claude, which measures the tempo, tuning, key and chord timing and merges them into the song.',
  'web':'GitBuzz will try to read chords over lyrics from any chord page. Open it, copy the whole page, and paste it below, or copy the request for Claude.'
};
function updateUrlHint(){
  const url=$('impUrl').value.trim(),route=GB.ingest.routeUrl(url);
  $('impUrlHint').hidden=!route;if(!route)return;
  $('impUrlText').textContent=URL_HINT[route.id]||URL_HINT.web;
  const open=$('impUrlOpen');open.hidden=!/^https:\/\//i.test(url);open.href=/^https:\/\//i.test(url)?url:'#';
  $('impAsk').textContent='Add this song to GitBuzz with the add-song-by-url skill: '+url;$('impAskMsg').textContent='';
}
$('impUrl').addEventListener('input',updateUrlHint);
$('impAskCopy').onclick=()=>{const t=$('impAsk').textContent,msg=$('impAskMsg');
  const sel=()=>{const r=document.createRange();r.selectNodeContents($('impAsk'));const w=getSelection();w.removeAllRanges();w.addRange(r);msg.textContent='Selected. Press Ctrl+C or ⌘C to copy.'};
  try{navigator.clipboard.writeText(t).then(()=>{msg.textContent='Copied. Paste it to Claude.'},sel)}catch(e){sel()}};
let pending=null;
$('impRead').onclick=()=>{
  const err=$('impErr');err.textContent='';$('impPreview').hidden=true;pending=null;
  const text=$('impText').value;
  if(!text.trim()){err.textContent='Paste the song page first.';return}
  let res;try{res=GB.ingest.parse(text)}catch(e){err.textContent='Could not read the page: '+e.message;return}
  const st=res.stats;
  if(!st.chordLines){err.textContent='No chord lines found. Copy the whole song page, including the chords shown above the lyrics.';return}
  const pv=GB.merge.mergeRecords('preview',[res.record]);
  pending={res,pv};
  $('impFound').textContent=`Read as a ${res.pluginLabel}. Found ${st.sections.length} section${st.sections.length===1?'':'s'} and ${st.chordLines} chord lines; ${st.matchedLines} of them are matched to lyric lines`+(st.tabLines?`, plus ${st.tabLines} tab lines`:'')+'.'+(st.inferred.length?` Unlabeled parts were named by guess: ${st.inferred.join(', ')}.`:'');
  $('impName').value=res.record.fields.name||'';$('impArtist').value=res.record.fields.artist||'';
  $('impRoot').value=pv.tonic;$('impMode').value=pv.mode;
  $('impKeyNote').textContent=(pv.provenance.key==='paste'?'Key as written on the page.':'Key guessed from the chords.')+' '+pv.notes.filter(n=>/^Key/.test(n)).join(' ');
  const secs=$('impSections');secs.innerHTML='';
  Object.entries(pv.sections).forEach(([name,prog])=>{const r=document.createElement('div');r.className='imp-sec';const b=document.createElement('b');b.textContent=name;r.appendChild(b);
    prog.forEach(([c])=>{const x=document.createElement('span');x.className='c';x.textContent=c;r.appendChild(x)});secs.appendChild(r)});
  const tgt=$('impTarget');tgt.innerHTML='';const norm=x=>String(x||'').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase();
  let match=allSongs().find(s=>norm(s.name)&&norm(s.name)===norm(res.record.fields.name));
  allSongs().forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;tgt.appendChild(o)});
  tgt.value=(match||song()).id;
  $('impPreview').hidden=false;$('impPreview').scrollIntoView({behavior:'smooth',block:'nearest'});
};
function saveSheet(id){sheets[id]={sheet:pending.res.sheet,from:pending.res.pluginLabel,added:today()};store.set('gb-sheets',sheets)}
function selectSong(id){stop();S.lick=null;S.sheetChord=null;S.song=id;store.set('nn-song',id);const s=song();S.section=Object.keys(s.sections)[0];S.idx=0;S.bpm=null;S.colorIv=null;renderAll()}
$('impAdd').onclick=()=>{
  if(!pending)return;const err=$('impErr');err.textContent='';
  const name=$('impName').value.trim();if(!name){err.textContent='Add a song name so you can find it again.';return}
  const f=pending.res.record.fields,edits={};
  if(name!==(f.name||''))edits.name=name;
  const artist=$('impArtist').value.trim();if(artist!==(f.artist||''))edits.artist=artist;
  const key={tonic:+$('impRoot').value,mode:$('impMode').value};if(key.tonic!==pending.pv.tonic||key.mode!==pending.pv.mode)edits.key=key;
  const records=[pending.res.record];if(Object.keys(edits).length)records.push({plugin:'manual',ref:'edited in GitBuzz',fetched:today(),confidence:'high',fields:edits});
  const id='u'+Date.now();const s=GB.merge.mergeRecords(id,records);s.custom=true;
  custom.push(s);store.set('nn-songs',custom);saveSheet(id);
  $('impText').value='';$('impPreview').hidden=true;pending=null;selectSong(id);window.scrollTo({top:0,behavior:'smooth'});
};
$('impAttach').onclick=()=>{if(!pending)return;const id=$('impTarget').value;saveSheet(id);$('impText').value='';$('impPreview').hidden=true;pending=null;selectSong(id);$('sheetPanel').scrollIntoView({behavior:'smooth',block:'start'})};

if(!allSongs().some(s=>s.id===S.song))S.song=GB.songs[0].id;
S.section=Object.keys(song().sections)[0];
renderAll();
})();
