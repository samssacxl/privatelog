
const KEY = "privatelog_v2";
const seed = {
  partners: [],
  encounters: [],
  locations: [],
  trips: [],
  settings: { theme: "system" }
};
let db = load();
let currentView = "home";
let selectedPartnerId = null;
let calendarCursor = new Date();

function load(){
  try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed); }
  catch { return structuredClone(seed); }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(db)); render(); }
const uid = () => crypto.randomUUID();
const fmt = d => new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00"));
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
function participantCount(e){ return (e.partnerIds||[]).length + 1; }
function contextLabel(e){ const n=participantCount(e); return n>=3 ? `${n}P` : ""; }
function partnerById(id){ return db.partners.find(p=>p.id===id); }
function encounterPartners(e){ return (e.partnerIds||[]).map(partnerById).filter(Boolean); }
function partnerEncounters(id){ return db.encounters.filter(e=>(e.partnerIds||[]).includes(id)).sort((a,b)=>b.date.localeCompare(a.date)); }
function generatedPartnerCode(firstDate){
  const base = (firstDate||new Date().toISOString().slice(0,10)).replaceAll("-","");
  const same = db.partners.filter(p=>p.displayId?.startsWith(base)).length + 1;
  return `${base}-${String(same).padStart(3,"0")}`;
}
function ratingStars(v){
  if(v === "" || v == null) return "Not set";
  const n=Math.max(0,Math.min(5,Math.round(Number(v))));
  return `${"★".repeat(n)}${"☆".repeat(5-n)}`;
}
function setTitle(s){ document.querySelector("#pageTitle").textContent=s; }
function navActive(view){
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
function go(view){
  currentView=view; selectedPartnerId=null; navActive(view); render();
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>go(b.dataset.view));
document.querySelector("#quickAddBtn").onclick=()=>openEncounterModal();
document.querySelector("#importFile").onchange=importData;

function render(){
  const el=document.querySelector("#view");
  if(selectedPartnerId){ renderPartnerProfile(el,selectedPartnerId); return; }
  const map={home:renderHome,partners:renderPartners,timeline:renderTimeline,calendar:renderCalendar,more:renderMore};
  map[currentView](el);
}
function renderHome(el){
  setTitle("Home");
  const countries=new Set(db.encounters.map(e=>e.country).filter(Boolean));
  el.innerHTML=`
    <section class="hero-card">
      <div class="hero-icon" aria-hidden="true">✦</div>
      <div><div class="hero-kicker">Your private journal</div><h2>What happened today?</h2><p>Log an encounter in a few quick steps.</p></div>
      <button class="primary hero-action" onclick="openEncounterModal()"><span aria-hidden="true">✚</span> New encounter</button>
    </section>
    <div class="grid stats-grid">
      ${stat(db.partners.length,"👥 People")}
      ${stat(db.encounters.length,"♡ Encounters")}
      ${stat(countries.size,"◎ Countries")}
      ${stat(db.trips.length,"✈ Trips")}
    </div>
    <section class="section">
      <div class="section-head"><div><div class="section-icon">◷</div><h2>Recent journal</h2></div><button class="secondary compact" onclick="go('timeline')">View all →</button></div>
      <div class="list">${recentRows(db.encounters.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6))}</div>
    </section>
    <section class="section">
      <div class="section-head"><div><div class="section-icon">⚡</div><h2>Quick actions</h2></div></div>
      <div class="toolbar action-grid">
        <button class="secondary action-card" onclick="openPartnerModal()"><span>👤</span><strong>Add person</strong><small>Create a profile</small></button>
        <button class="secondary action-card" onclick="openTripModal()"><span>✈</span><strong>Add trip</strong><small>Group memories</small></button>
        <button class="secondary action-card" onclick="go('partners')"><span>👥</span><strong>Browse people</strong><small>View profiles</small></button>
      </div>
    </section>`;
}
function stat(n,label){ return `<div class="card stat"><strong>${n}</strong><span>${label}</span></div>`; }
function recentRows(items){
  if(!items.length) return `<div class="card empty"><div class="empty-icon">♡</div><strong>No encounters yet</strong><span>Tap “New encounter” to create your first journal entry.</span></div>`;
  return items.map(e=>{
    const names=encounterPartners(e).map(p=>esc(p.nickname)).join(", ")||"Unknown";
    return `<button class="row" onclick="openEncounterModal('${e.id}')">
      <div class="row-main"><div class="row-title">${names}</div>
      <div class="meta">${fmt(e.date)} · ${esc([e.venue,e.city,e.country].filter(Boolean).join(", "))}</div>
      <div class="badges"><span class="badge">${esc(e.protection||"Not set")}</span>${contextLabel(e)?`<span class="badge">${contextLabel(e)}</span>`:""}</div></div>
      <span class="chevron">›</span></button>`;
  }).join("");
}
function renderPartners(el){
  setTitle("People");
  el.innerHTML=`
    <div class="search"><input id="partnerSearch" placeholder="Search people by nickname, nationality or Instagram" /></div>
    <div class="section-head"><div><div class="section-icon">👥</div><h2>Your people</h2></div><button class="primary compact" onclick="openEncounterModal()">✚ Log</button></div>
    <div class="list" id="partnerList"></div>`;
  const input=document.querySelector("#partnerSearch");
  input.oninput=()=>drawPartnerList(input.value);
  drawPartnerList("");
}
function drawPartnerList(q){
  const list=document.querySelector("#partnerList");
  let items=db.partners.slice().sort((a,b)=>(b.favourite-a.favourite)||(Number(b.rating||-1)-Number(a.rating||-1))||a.nickname.localeCompare(b.nickname));
  q=q.toLowerCase().trim();
  if(q) items=items.filter(p=>[p.nickname,p.nationality,p.instagram,p.displayId].some(v=>(v||"").toLowerCase().includes(q)));
  list.innerHTML=items.length?items.map(p=>{
    const es=partnerEncounters(p.id);
    return `<button class="row" onclick="openPartner('${p.id}')">
      <div class="row-main">
        <div class="row-title">${p.favourite?"⭐ ":""}${esc(p.nickname)} ${p.nationality?`· ${esc(p.nationality)}`:""}</div>
        <div class="meta">${ratingStars(p.rating)} · ${es.length} encounter${es.length===1?"":"s"}</div>
      </div><span class="chevron">›</span></button>`;
  }).join(""):`<div class="card empty"><div class="empty-icon">⌕</div><strong>No people found</strong><span>Try another search or log a new encounter.</span></div>`;
}
function openPartner(id){ selectedPartnerId=id; render(); }
function renderPartnerProfile(el,id){
  const p=partnerById(id); if(!p){selectedPartnerId=null;go("partners");return;}
  setTitle("Partner");
  const es=partnerEncounters(id);
  const first=es.length?es[es.length-1].date:null, last=es.length?es[0].date:null;
  el.innerHTML=`
    <button class="secondary compact" onclick="selectedPartnerId=null;go('partners')">← People</button>
    <section class="section card">
      <div class="profile-head"><div>
        <div class="profile-id">${esc(p.displayId)}</div>
        <h1>${esc(p.nickname)}</h1>
        <div class="subtle">${esc(p.nationality||"Nationality not set")}</div>
      </div><button class="secondary compact" onclick="openPartnerModal('${p.id}')">Edit</button></div>
      <div class="badges">
        <span class="badge">${ratingStars(p.rating)}</span>
        ${p.favourite?`<span class="badge">⭐ Favourite</span>`:""}
      </div>
      ${p.instagram?`<p><a href="https://instagram.com/${encodeURIComponent(p.instagram.replace("@",""))}" target="_blank" rel="noreferrer">@${esc(p.instagram.replace("@",""))}</a></p>`:""}
      ${p.notes?`<p>${esc(p.notes)}</p>`:""}
    </section>
    <div class="grid stats-grid section">
      ${stat(es.length,"Encounters")}
      ${stat(first?fmt(first):"—","First")}
      ${stat(last?fmt(last):"—","Latest")}
      ${stat(p.rating===""?"—":ratingStars(p.rating),"Overall")}
    </div>
    <section class="section">
      <div class="section-head"><h2>History</h2><button class="primary compact" onclick="openEncounterModal(null,'${p.id}')">＋ Encounter</button></div>
      <div class="list">${recentRows(es)}</div>
    </section>`;
}
function renderTimeline(el){
  setTitle("Journal");
  const sorted=db.encounters.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!sorted.length){ el.innerHTML=`<div class="card empty">Your journal is empty.</div>`; return; }
  const groups={};
  sorted.forEach(e=>{
    const k=new Intl.DateTimeFormat("en-AU",{month:"long",year:"numeric"}).format(new Date(e.date+"T12:00:00"));
    (groups[k]??=[]).push(e);
  });
  el.innerHTML=Object.entries(groups).map(([k,arr])=>`<section class="section"><h2>${k}</h2><div class="list">${recentRows(arr)}</div></section>`).join("");
}
function renderCalendar(el){
  setTitle("Calendar");
  const y=calendarCursor.getFullYear(), m=calendarCursor.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const start=(first.getDay()+6)%7;
  let cells="";
  for(let i=0;i<start;i++) cells+=`<div></div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const es=db.encounters.filter(e=>e.date===date);
    const trip=db.trips.some(t=>date>=t.startDate&&date<=t.endDate);
    const fav=es.some(e=>encounterPartners(e).some(p=>p.favourite));
    const dots=[];
    if(es.length===1)dots.push("dot");
    if(es.length>1)dots.push("dot multiple");
    if(trip)dots.push("dot trip");
    if(fav)dots.push("dot favourite");
    cells+=`<button class="day" onclick="showDay('${date}')">${d}<div class="dots">${dots.map(c=>`<i class="${c}"></i>`).join("")}</div></button>`;
  }
  el.innerHTML=`
    <div class="section-head">
      <button class="secondary compact" onclick="moveMonth(-1)">←</button>
      <h2>${new Intl.DateTimeFormat("en-AU",{month:"long",year:"numeric"}).format(first)}</h2>
      <button class="secondary compact" onclick="moveMonth(1)">→</button>
    </div>
    <div class="calendar">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div class="day-name">${x}</div>`).join("")}${cells}</div>
    <div class="badges section"><span class="badge">🟢 One</span><span class="badge">🔵 Multiple</span><span class="badge">🟠 Trip</span><span class="badge">🔴 Favourite</span></div>`;
}
function moveMonth(n){ calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+n,1); render(); }
function showDay(date){
  const es=db.encounters.filter(e=>e.date===date);
  openSimpleModal(`<h2>${fmt(date)}</h2><div class="list">${recentRows(es)}</div>`);
}
function renderMore(el){
  setTitle("More");
  el.innerHTML=`
    <div class="tabs">
      <button class="secondary" onclick="renderMoreSection('search')">⌕ Search</button>
      <button class="secondary" onclick="renderMoreSection('trips')">✈ Trips</button>
      <button class="secondary" onclick="renderMoreSection('stats')">▥ Insights</button>
      <button class="secondary" onclick="renderMoreSection('network')">◎ Connections</button>
      <button class="secondary" onclick="renderMoreSection('settings')">⚙ Settings</button>
    </div>
    <div id="moreSection" class="section"></div>`;
  renderMoreSection("search");
}
function renderMoreSection(section){
  const el=document.querySelector("#moreSection");
  if(section==="search"){
    el.innerHTML=`<input id="globalSearch" placeholder="Search all records" /><div id="searchResults" class="list section"></div>`;
    const i=document.querySelector("#globalSearch"); i.oninput=()=>doSearch(i.value); doSearch("");
  } else if(section==="trips"){
    el.innerHTML=`<div class="section-head"><h2>Trips</h2><button class="primary compact" onclick="openTripModal()">＋ Add</button></div><div class="list">${db.trips.map(t=>`<button class="row" onclick="openTripModal('${t.id}')"><div><div class="row-title">${esc(t.name)}</div><div class="meta">${fmt(t.startDate)} – ${fmt(t.endDate)} · ${esc(t.city||t.country||"")}</div></div><span>›</span></button>`).join("")||`<div class="card empty">No trips yet.</div>`}</div>`;
  } else if(section==="stats"){
    const condoms=db.encounters.filter(e=>e.protection==="Condom").length;
    const bare=db.encounters.filter(e=>e.protection==="Bareback").length;
    const avg=db.partners.filter(p=>p.rating!=="").reduce((s,p)=>s+Number(p.rating),0)/(db.partners.filter(p=>p.rating!=="").length||1);
    el.innerHTML=`<div class="grid stats-grid">${stat(db.partners.length,"People")}${stat(db.encounters.length,"Encounters")}${stat(avg?avg.toFixed(1):"—","Average overall")}${stat(db.partners.filter(p=>p.favourite).length,"Favourites")}</div>
    <div class="card section"><h2>Protection</h2><p>Condom: ${condoms}</p><p>Bareback: ${bare}</p></div>`;
  } else if(section==="network"){
    el.innerHTML=`<div class="section-head"><h2>Network</h2><span class="subtle">Connections mean shared encounters.</span></div><div id="networkWrap"></div>`;
    drawNetwork();
  } else {
    el.innerHTML=`<div class="list">
      <button class="row" onclick="exportData()"><div><div class="row-title">↓ Export backup</div><div class="meta">Download all records as JSON</div></div><span>↓</span></button>
      <button class="row" onclick="document.querySelector('#importFile').click()"><div><div class="row-title">↑ Import backup</div><div class="meta">Replace current data from JSON</div></div><span>↑</span></button>
      <button class="row" onclick="installHelp()"><div><div class="row-title">▣ Install on iPhone</div><div class="meta">Safari → Share → Add to Home Screen</div></div><span>›</span></button>
      <button class="row" onclick="clearAll()"><div><div class="row-title">⌫ Delete all data</div><div class="meta">Cannot be undone</div></div><span>›</span></button>
    </div>`;
  }
}
function doSearch(q){
  const el=document.querySelector("#searchResults"); q=q.toLowerCase().trim();
  if(!q){el.innerHTML=`<div class="card empty">Search nickname, Instagram, country, city, venue, notes, protection or trip.</div>`;return;}
  const ps=db.partners.filter(p=>Object.values(p).some(v=>String(v).toLowerCase().includes(q)));
  const es=db.encounters.filter(e=>{
    const text=[...Object.values(e),...encounterPartners(e).map(p=>p.nickname)].join(" ").toLowerCase();
    return text.includes(q);
  });
  el.innerHTML=[...ps.map(p=>`<button class="row" onclick="openPartner('${p.id}')"><div><div class="row-title">${esc(p.nickname)}</div><div class="meta">Partner · ${esc(p.nationality||"")}</div></div><span>›</span></button>`),...es.map(e=>recentRows([e]))].join("")||`<div class="card empty">No results.</div>`;
}
function drawNetwork(){
  const wrap=document.querySelector("#networkWrap");
  const nodes=db.partners.slice(0,30);
  if(!nodes.length){wrap.innerHTML=`<div class="card empty">Add partners and shared encounters to see the network.</div>`;return;}
  const w=700,h=430,cx=w/2,cy=h/2,r=155;
  const pos=new Map(nodes.map((p,i)=>[p.id,{x:cx+r*Math.cos((i/nodes.length)*Math.PI*2),y:cy+r*Math.sin((i/nodes.length)*Math.PI*2)}]));
  const edges=new Map();
  db.encounters.forEach(e=>{
    const ids=(e.partnerIds||[]).filter(id=>pos.has(id));
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      const k=[ids[i],ids[j]].sort().join("|"); edges.set(k,(edges.get(k)||0)+1);
    }
  });
  const lines=[...edges].map(([k,count])=>{
    const [a,b]=k.split("|"),p1=pos.get(a),p2=pos.get(b);
    return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="currentColor" stroke-opacity=".25" stroke-width="${Math.min(8,1+count)}"/>`;
  }).join("");
  const circles=nodes.map(p=>{
    const q=pos.get(p.id);
    return `<g class="node" onclick="openPartner('${p.id}')"><circle cx="${q.x}" cy="${q.y}" r="23" fill="currentColor" opacity=".92"/><text x="${q.x}" y="${q.y+39}" text-anchor="middle" fill="currentColor" font-size="12">${esc(p.nickname).slice(0,12)}</text><text x="${q.x}" y="${q.y+5}" text-anchor="middle" fill="var(--bg)" font-size="13">${esc(p.nickname).slice(0,2).toUpperCase()}</text></g>`;
  }).join("");
  wrap.innerHTML=`<svg viewBox="0 0 ${w} ${h}">${lines}${circles}</svg>`;
}
function modal(){ return document.querySelector("#modal"); }
function openSimpleModal(html){ document.querySelector("#modalContent").innerHTML=`${html}<div class="modal-actions"><button class="secondary" value="cancel">Close</button></div>`; modal().showModal(); }

function openPartnerModal(id=null){
  const p=id?partnerById(id):{id:uid(),nickname:"",nationality:"",instagram:"",rating:"",favourite:false,notes:"",displayId:""};
  const editing=!!id;
  document.querySelector("#modalContent").innerHTML=`
    <h2>${editing?"Edit":"New"} person</h2>
    <div class="form-grid">
      <label>Nickname<input id="pNickname" required value="${esc(p.nickname)}"></label>
      <label>Nationality<input id="pNationality" value="${esc(p.nationality)}" placeholder="e.g. Thai"></label>
      <label>Instagram handle<input id="pInstagram" value="${esc(p.instagram)}" placeholder="@handle"></label>
      <label>Overall (optional)
        <select id="pRating"><option value="">Not set</option>${Array.from({length:6},(_,i)=>5-i).map(v=>`<option value="${v}" ${String(Math.round(Number(p.rating)))===String(v)?"selected":""}>${"★".repeat(v)}${"☆".repeat(5-v)}</option>`).join("")}</select>
      </label>
      <label><span><input id="pFavourite" type="checkbox" style="width:auto" ${p.favourite?"checked":""}> Favourite</span></label>
      <label>About<textarea id="pNotes">${esc(p.notes)}</textarea></label>
      ${editing?`<div class="profile-id">Partner ID: ${esc(p.displayId)}</div>`:`<label>First encounter date (used to create partner ID)<input id="pFirstDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label>`}
    </div>
    <div class="modal-actions">
      ${editing?`<button type="button" class="danger" onclick="deletePartner('${p.id}')">Delete</button>`:""}
      <button class="secondary" value="cancel">Cancel</button>
      <button type="button" class="primary" onclick="savePartner('${p.id}',${editing})">Save</button>
    </div>`;
  modal().showModal();
}
function savePartner(id,editing){
  const nickname=document.querySelector("#pNickname").value.trim();
  if(!nickname){alert("Nickname is required.");return;}
  const old=partnerById(id);
  const item={
    id,nickname,
    nationality:document.querySelector("#pNationality").value.trim(),
    instagram:document.querySelector("#pInstagram").value.trim().replace(/^@/,""),
    rating:document.querySelector("#pRating").value,
    favourite:document.querySelector("#pFavourite").checked,
    notes:document.querySelector("#pNotes").value.trim(),
    displayId: editing?old.displayId:generatedPartnerCode(document.querySelector("#pFirstDate").value)
  };
  if(editing) db.partners=db.partners.map(x=>x.id===id?item:x); else db.partners.push(item);
  modal().close(); save();
}
function deletePartner(id){
  if(!confirm("Delete this person? Their encounters will remain but the person link will be removed."))return;
  db.partners=db.partners.filter(p=>p.id!==id);
  db.encounters.forEach(e=>e.partnerIds=(e.partnerIds||[]).filter(x=>x!==id));
  selectedPartnerId=null; modal().close(); save();
}
let encounterDraftState={selectedIds:[],partnerRoles:{}};
function openEncounterModal(id=null,prefillPartner=null){
  const e=id?db.encounters.find(x=>x.id===id):{
    id:uid(),date:new Date().toISOString().slice(0,10),partnerIds:prefillPartner?[prefillPartner]:[],
    protection:"",myRole:"",partnerRoles:{},country:"",city:"",venue:"",tripId:"",notes:""
  };
  const editing=!!id;
  encounterDraftState={selectedIds:[...(e.partnerIds||[])],partnerRoles:{...(e.partnerRoles||{})}};
  const usedCountries=[...new Set(db.encounters.map(x=>x.country).filter(Boolean))];
  const usedCities=[...new Set(db.encounters.map(x=>x.city).filter(Boolean))];
  const usedVenues=[...new Set(db.encounters.map(x=>x.venue).filter(Boolean))];
  document.querySelector("#modalContent").innerHTML=`
    <h2>${editing?"Edit encounter":"What happened?"}</h2>
    <div class="form-grid">
      <label>When?<input id="eDate" type="date" value="${e.date}"></label>
      <label>Who was there?
        <input id="personSearch" placeholder="Search or type a new nickname" oninput="renderParticipantPicker(this.value)">
      </label>
      <div id="participantChoices" class="choice-grid"></div>
      <button type="button" id="inlineCreateButton" class="secondary" style="display:none" onclick="showInlinePersonForm()"></button>
      <div id="inlinePersonForm"></div>
      <label>Protection<select id="eProtection"><option value="">Not set</option>${["Condom","Bareback"].map(x=>`<option ${e.protection===x?"selected":""}>${x}</option>`).join("")}</select></label>
      <label>My role<select id="eMyRole"><option value="">Not set</option>${["Top","Bottom","Both","Side"].map(x=>`<option ${e.myRole===x?"selected":""}>${x}</option>`).join("")}</select></label>
      <div id="partnerRoleFields"></div>
      <div class="grid two">
        <label>Country<input id="eCountry" list="countryList" value="${esc(e.country)}"><datalist id="countryList">${usedCountries.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
        <label>City<input id="eCity" list="cityList" value="${esc(e.city)}"><datalist id="cityList">${usedCities.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
      </div>
      <label>Venue<input id="eVenue" list="venueList" value="${esc(e.venue)}"><datalist id="venueList">${usedVenues.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
      <label>Trip<select id="eTrip"><option value="">None</option>${db.trips.map(t=>`<option value="${t.id}" ${e.tripId===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select></label>
      <label>Anything you'd like to remember?<textarea id="eNotes">${esc(e.notes)}</textarea></label>
      <div class="subtle">The app automatically classifies shared encounters as 3P, 4P, 5P and so on.</div>
    </div>
    <div class="modal-actions">
      ${editing?`<button type="button" class="danger" onclick="deleteEncounter('${e.id}')">Delete</button>`:""}
      <button class="secondary" value="cancel">Cancel</button>
      <button type="button" class="primary" onclick="saveEncounter('${e.id}',${editing})">Save</button>
    </div>`;
  modal().showModal();
  renderParticipantPicker("");
}
function renderParticipantPicker(query=""){
  const wrap=document.querySelector("#participantChoices"); if(!wrap)return;
  const q=query.trim().toLowerCase();
  const people=db.partners.filter(p=>!q||[p.nickname,p.nationality,p.instagram].some(v=>(v||"").toLowerCase().includes(q)));
  wrap.innerHTML=people.map(p=>`<button type="button" class="choice ${encounterDraftState.selectedIds.includes(p.id)?"selected":""}" data-id="${p.id}" onclick="toggleParticipant('${p.id}')">${esc(p.nickname)}${p.nationality?`<span class="choice-sub">${esc(p.nationality)}</span>`:""}</button>`).join("")||`<div class="subtle">No matching people.</div>`;
  const create=document.querySelector("#inlineCreateButton");
  if(create){
    const exact=db.partners.some(p=>p.nickname.toLowerCase()===q);
    create.style.display=q&&!exact?"block":"none";
    create.textContent=q?`＋ Add “${query.trim()}” to this encounter`:"";
    create.dataset.nickname=query.trim();
  }
  updatePartnerRoleFields();
}
function toggleParticipant(id){
  const i=encounterDraftState.selectedIds.indexOf(id);
  if(i>=0) encounterDraftState.selectedIds.splice(i,1); else encounterDraftState.selectedIds.push(id);
  renderParticipantPicker(document.querySelector("#personSearch")?.value||"");
}
function selectedParticipantIds(){ return [...encounterDraftState.selectedIds]; }
function showInlinePersonForm(){
  const nickname=document.querySelector("#inlineCreateButton")?.dataset.nickname||"";
  document.querySelector("#inlinePersonForm").innerHTML=`<div class="inline-panel"><h3>New person</h3><div class="form-grid"><label>Nickname<input id="inlineNickname" value="${esc(nickname)}"></label><label>Nationality<input id="inlineNationality" placeholder="Optional"></label><label>Instagram handle<input id="inlineInstagram" placeholder="Optional"></label><label>Overall<select id="inlineOverall"><option value="">Not set</option>${Array.from({length:6},(_,i)=>5-i).map(v=>`<option value="${v}">${"★".repeat(v)}${"☆".repeat(5-v)}</option>`).join("")}</select></label></div><div class="modal-actions"><button type="button" class="secondary" onclick="document.querySelector('#inlinePersonForm').innerHTML=''">Cancel</button><button type="button" class="primary" onclick="createInlinePerson()">Add person</button></div></div>`;
}
function createInlinePerson(){
  const nickname=document.querySelector("#inlineNickname").value.trim();
  if(!nickname){alert("Nickname is required.");return;}
  const date=document.querySelector("#eDate")?.value||new Date().toISOString().slice(0,10);
  const person={id:uid(),nickname,nationality:document.querySelector("#inlineNationality").value.trim(),instagram:document.querySelector("#inlineInstagram").value.trim().replace(/^@/,""),rating:document.querySelector("#inlineOverall").value,favourite:false,notes:"",displayId:generatedPartnerCode(date)};
  db.partners.push(person);
  encounterDraftState.selectedIds.push(person.id);
  document.querySelector("#inlinePersonForm").innerHTML="";
  document.querySelector("#personSearch").value="";
  localStorage.setItem(KEY, JSON.stringify(db));
  renderParticipantPicker("");
}
function updatePartnerRoleFields(){
  const el=document.querySelector("#partnerRoleFields"); if(!el)return;
  const current={}; document.querySelectorAll(".partnerRole").forEach(s=>current[s.dataset.id]=s.value);
  encounterDraftState.partnerRoles={...encounterDraftState.partnerRoles,...current};
  el.innerHTML=selectedParticipantIds().map(id=>{
    const p=partnerById(id),v=encounterDraftState.partnerRoles[id]||"";
    return `<label>${esc(p.nickname)}'s role<select class="partnerRole" data-id="${id}" onchange="encounterDraftState.partnerRoles['${id}']=this.value"><option value="">Not set</option>${["Top","Bottom","Both","Side"].map(x=>`<option ${v===x?"selected":""}>${x}</option>`).join("")}</select></label>`;
  }).join("");
}
function saveEncounter(id,editing){
  const partnerIds=selectedParticipantIds();
  if(!partnerIds.length){alert("Select at least one partner.");return;}
  const partnerRoles={...encounterDraftState.partnerRoles}; document.querySelectorAll(".partnerRole").forEach(s=>partnerRoles[s.dataset.id]=s.value);
  const item={id,date:document.querySelector("#eDate").value,partnerIds,
    protection:document.querySelector("#eProtection").value,myRole:document.querySelector("#eMyRole").value,
    partnerRoles,country:document.querySelector("#eCountry").value.trim(),city:document.querySelector("#eCity").value.trim(),
    venue:document.querySelector("#eVenue").value.trim(),tripId:document.querySelector("#eTrip").value,
    notes:document.querySelector("#eNotes").value.trim()};
  if(editing) db.encounters=db.encounters.map(x=>x.id===id?item:x); else db.encounters.push(item);
  modal().close(); save();
}
function deleteEncounter(id){
  if(!confirm("Delete this encounter?"))return;
  db.encounters=db.encounters.filter(e=>e.id!==id); modal().close(); save();
}
function openTripModal(id=null){
  const t=id?db.trips.find(x=>x.id===id):{id:uid(),name:"",startDate:new Date().toISOString().slice(0,10),endDate:new Date().toISOString().slice(0,10),country:"",city:""};
  const editing=!!id;
  document.querySelector("#modalContent").innerHTML=`
    <h2>${editing?"Edit":"New"} trip</h2>
    <div class="form-grid">
      <label>Trip name<input id="tName" value="${esc(t.name)}"></label>
      <div class="grid two"><label>Start<input id="tStart" type="date" value="${t.startDate}"></label><label>End<input id="tEnd" type="date" value="${t.endDate}"></label></div>
      <div class="grid two"><label>Country<input id="tCountry" value="${esc(t.country)}"></label><label>City<input id="tCity" value="${esc(t.city)}"></label></div>
    </div>
    <div class="modal-actions">${editing?`<button type="button" class="danger" onclick="deleteTrip('${t.id}')">Delete</button>`:""}<button class="secondary" value="cancel">Cancel</button><button type="button" class="primary" onclick="saveTrip('${t.id}',${editing})">Save</button></div>`;
  modal().showModal();
}
function saveTrip(id,editing){
  const item={id,name:document.querySelector("#tName").value.trim(),startDate:document.querySelector("#tStart").value,endDate:document.querySelector("#tEnd").value,country:document.querySelector("#tCountry").value.trim(),city:document.querySelector("#tCity").value.trim()};
  if(!item.name){alert("Trip name is required.");return;}
  if(editing)db.trips=db.trips.map(x=>x.id===id?item:x);else db.trips.push(item);
  modal().close();save();
}
function deleteTrip(id){ if(!confirm("Delete this trip?"))return;db.trips=db.trips.filter(t=>t.id!==id);db.encounters.forEach(e=>{if(e.tripId===id)e.tripId=""});modal().close();save(); }
function exportData(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`PrivateLog-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
}
function importData(ev){
  const f=ev.target.files[0]; if(!f)return;
  const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result);if(!confirm("Replace all current data with this backup?"))return;db=data;save();alert("Import complete.");}catch{alert("Invalid backup file.");}};r.readAsText(f);ev.target.value="";
}
function clearAll(){ if(confirm("Permanently delete every record?")){db=structuredClone(seed);save();} }
function installHelp(){ alert("On iPhone: host the app, open it in Safari, tap Share, then Add to Home Screen."); }

if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("./sw.js");
render();
