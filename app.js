(() => {
  "use strict";
  const DB_KEY = "poultryFarmManager_v1";
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
  const nowISO = () => new Date().toISOString();
  const localDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const dateTime = (iso) => new Date(iso).toLocaleString("en-IN", {dateStyle:"medium",timeStyle:"short"});
  const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const makeId = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let currentUser = null;
  let activeTab = "sell";

  function freshDB() {
    return {version:1, users:[{id:"admin-default",username:"admin",password:"Farm@123",role:"admin",createdAt:nowISO()}],
      stockStart:null, stockAdditions:[], sales:[], createdAt:nowISO()};
  }
  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) { const db=freshDB(); saveDB(db); return db; }
      const parsed=JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.sales)) throw new Error("Invalid data");
      parsed.stockAdditions ||= []; parsed.sales ||= []; parsed.users ||= [];
      return parsed;
    } catch (e) {
      alert("Saved app data could not be read. If you have a backup, restore it from Settings. A fresh database will be created only if no usable data is found.");
      return freshDB();
    }
  }
  let db = loadDB();
  function saveDB(next=db) { db=next; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function isAdmin() { return currentUser && currentUser.role === "admin"; }
  function totalStock() { return (Number(db.stockStart)||0) + db.stockAdditions.reduce((s,x)=>s+Number(x.count||0),0); }
  function soldCount() { return db.sales.reduce((s,x)=>s+Number(x.roosters||0),0); }
  function remaining() { return Math.max(0,totalStock()-soldCount()); }
  function totalRevenue() { return db.sales.reduce((s,x)=>s+Number(x.amount||0),0); }
  function setMessage(id, text, isError=false) { const el=$(id); if(el){el.textContent=text; el.style.color=isError?"#c32635":"#087443";} }

  function showLogin() {
    $("loginView").classList.remove("hidden"); $("mainView").classList.add("hidden");
    $("loginPassword").value=""; $("loginError").textContent="";
  }
  function showApp() {
    $("loginView").classList.add("hidden"); $("mainView").classList.remove("hidden");
    $("currentUser").textContent=`${currentUser.username} · ${currentUser.role}`;
    $("footerRole").textContent=isAdmin()?"Administrator access":"User access";
    document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",!isAdmin()));
    $("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
    $("welcomeTitle").textContent=`Welcome, ${currentUser.username}`;
    renderAll(); switchTab("sell");
    if(db.stockStart===null && isAdmin()) showStockSetup();
  }
  function showStockSetup() {
    const existing=$("stockSetupModal"); if(existing) existing.remove();
    const wrap=document.createElement("div"); wrap.id="stockSetupModal"; wrap.className="modal-backdrop";
    wrap.innerHTML=`<div class="modal"><h2>Set your starting stock</h2><p>How many roosters are currently available in your farm? You can add more stock later.</p><form id="stockSetupForm"><div class="field"><label for="initialStock">Number of roosters</label><input id="initialStock" type="number" min="0" step="1" required value="0"></div><div class="modal-actions"><button class="primary" type="submit">Save Starting Stock</button></div></form></div>`;
    $("modalRoot").appendChild(wrap);
    $("stockSetupForm").addEventListener("submit",e=>{e.preventDefault();const n=Number($("initialStock").value);if(!Number.isInteger(n)||n<0)return;db.stockStart=n;saveDB();wrap.remove();renderAll();});
  }
  function switchTab(tab) {
    if((tab==="users"||tab==="stock")&&!isAdmin()) tab="sell";
    activeTab=tab;
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.add("hidden"));
    $(`${tab}Panel`).classList.remove("hidden");
    if(tab==="history") renderHistory();
    if(tab==="users") renderUsers();
    if(tab==="stock") renderStockHistory();
  }
  function renderStats() {
    $("totalStock").textContent=totalStock();
    $("remainingStock").textContent=remaining();
    $("totalSales").textContent=money(totalRevenue());
    $("soldCount").textContent=soldCount();
    $("stockHelp").textContent=`Available: ${remaining()} rooster(s)`;
    $("roostersSold").max=remaining();
  }
  function renderAll(){renderStats();renderHistory();if(isAdmin()){renderUsers();renderStockHistory();}}
  function renderHistory() {
    const list=$("historyList"); if(!list) return;
    const q=($("historySearch")?.value||"").trim().toLowerCase();
    const date=$("historyDate")?.value||"";
    const records=[...db.sales].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).filter(s=>
      (!date||localDate(s.createdAt)===date) &&
      (!q||`${s.customer||""} ${s.username||""} ${s.id}`.toLowerCase().includes(q)));
    list.innerHTML=records.map(s=>`<article class="sale-card">
      <div class="sale-main"><div class="sale-title">Sale · ${escapeHTML(s.customer||"Walk-in customer")} <span class="role-badge">${escapeHTML(s.roosters)} rooster(s)</span></div>
      <div class="sale-meta">${escapeHTML(dateTime(s.createdAt))} · ${escapeHTML(s.weight)} kg · ${money(s.price)}/kg · recorded by ${escapeHTML(s.username)}</div>
      <div class="sale-meta">Record ID: ${escapeHTML(s.id.slice(0,8))} · Remaining after sale: ${Math.max(0,totalStock()-db.sales.filter(x=>x.createdAt<=s.createdAt).reduce((n,x)=>n+Number(x.roosters),0))}</div></div>
      <div><div class="sale-amount">${money(s.amount)}</div><div class="sale-actions"><button class="outline small" data-view="${escapeHTML(s.id)}">Details</button>${isAdmin()?`<button class="danger" data-delete-sale="${escapeHTML(s.id)}">Delete</button>`:""}</div></div>
    </article>`).join("");
    $("historyEmpty").classList.toggle("hidden",records.length!==0);
    list.querySelectorAll("[data-delete-sale]").forEach(b=>b.addEventListener("click",()=>confirmDeleteSale(b.dataset.deleteSale)));
    list.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showSaleDetails(b.dataset.view)));
  }
  function showSaleDetails(id) {
    const s=db.sales.find(x=>x.id===id); if(!s)return;
    const wrap=document.createElement("div");wrap.className="modal-backdrop";
    wrap.innerHTML=`<div class="modal"><h2>Sale details</h2><p><strong>Date:</strong> ${escapeHTML(dateTime(s.createdAt))}<br><strong>Customer:</strong> ${escapeHTML(s.customer||"Walk-in customer")}<br><strong>Roosters:</strong> ${s.roosters}<br><strong>Total weight:</strong> ${s.weight} kg<br><strong>Rate:</strong> ${money(s.price)}/kg<br><strong>Total amount:</strong> ${money(s.amount)}<br><strong>Recorded by:</strong> ${escapeHTML(s.username)}<br><strong>Record ID:</strong> ${escapeHTML(s.id)}</p><div class="modal-actions"><button class="primary" type="button">Close</button></div></div>`;
    $("modalRoot").appendChild(wrap);wrap.querySelector("button").addEventListener("click",()=>wrap.remove());wrap.addEventListener("click",e=>{if(e.target===wrap)wrap.remove();});
  }
  function confirmDeleteSale(id) {
    const s=db.sales.find(x=>x.id===id);if(!s||!isAdmin())return;
    const wrap=document.createElement("div");wrap.className="modal-backdrop";
    wrap.innerHTML=`<div class="modal"><h2>Delete this sale?</h2><p>This removes the ${s.roosters} rooster(s) sale record for ${money(s.amount)}. The remaining stock count will be recalculated automatically.</p><div class="modal-actions"><button class="outline" data-cancel>Cancel</button><button class="danger" data-confirm>Delete sale</button></div></div>`;
    $("modalRoot").appendChild(wrap);
    wrap.querySelector("[data-cancel]").onclick=()=>wrap.remove();
    wrap.querySelector("[data-confirm]").onclick=()=>{db.sales=db.sales.filter(x=>x.id!==id);saveDB();wrap.remove();renderAll();};
  }
  function renderStockHistory() {
    const el=$("stockHistory");if(!el)return;
    const items=[...(db.stockAdditions||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    el.innerHTML=items.length?items.map(x=>`<div class="stock-entry"><span>+${x.count} rooster(s) · ${escapeHTML(dateTime(x.createdAt))} · ${escapeHTML(x.username)}</span><strong>Added</strong></div>`).join(""):`<div class="empty-state">No stock additions recorded.</div>`;
  }
  function renderUsers() {
    const el=$("userList");if(!el)return;
    el.innerHTML=db.users.map(u=>`<div class="user-row"><div><div class="user-name">${escapeHTML(u.username)} <span class="role-badge ${u.role==="admin"?"admin":""}">${u.role==="admin"?"Admin":"User"}</span></div><div class="user-sub">Created ${escapeHTML(dateTime(u.createdAt))}${u.id===currentUser.id?" · You":""}</div></div><div>${u.id!==currentUser.id?`<button class="danger" data-remove-user="${escapeHTML(u.id)}">Remove</button>`:`<span class="user-sub">Current account</span>`}</div></div>`).join("");
    el.querySelectorAll("[data-remove-user]").forEach(b=>b.addEventListener("click",()=>removeUser(b.dataset.removeUser)));
  }
  function removeUser(id) {
    if(!isAdmin())return;
    const u=db.users.find(x=>x.id===id);if(!u)return;
    if(u.role==="admin"&&db.users.filter(x=>x.role==="admin").length<=1){setMessage("userMessage","You cannot remove the only admin account.",true);return;}
    if(!confirm(`Remove account "${u.username}"? They will no longer be able to log in.`))return;
    db.users=db.users.filter(x=>x.id!==id);saveDB();renderUsers();setMessage("userMessage",`Account ${u.username} removed.`);
  }
  function setPricePreview() {
    const price=Number(document.querySelector('input[name="price"]:checked')?.value||300);
    const weight=Number($("weightKg").value)||0;
    $("ratePreview").textContent=`${money(price)} / kg`;
    $("amountPreview").textContent=money(price*weight);
  }

  $("loginForm").addEventListener("submit",e=>{
    e.preventDefault();const username=$("loginUsername").value.trim().toLowerCase(),password=$("loginPassword").value;
    const user=db.users.find(u=>u.username.toLowerCase()===username&&u.password===password);
    if(!user){$("loginError").textContent="Incorrect username or password. Ask the farm admin to create an account.";return;}
    currentUser=user;showApp();
  });
  $("logoutBtn").addEventListener("click",()=>{currentUser=null;showLogin();});
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.querySelectorAll('input[name="price"]').forEach(x=>x.addEventListener("change",setPricePreview));
  $("weightKg").addEventListener("input",setPricePreview);
  $("saleForm").addEventListener("reset",()=>setTimeout(()=>{setPricePreview();setMessage("saleMessage","");},0));
  $("saleForm").addEventListener("submit",e=>{
    e.preventDefault();if(!currentUser)return;
    const roosters=Number($("roostersSold").value),weight=Number($("weightKg").value),price=Number(document.querySelector('input[name="price"]:checked')?.value||300);
    if(!Number.isInteger(roosters)||roosters<1){setMessage("saleMessage","Enter a whole number of roosters greater than zero.",true);return;}
    if(roosters>remaining()){setMessage("saleMessage",`Only ${remaining()} rooster(s) are available. Update stock or change the quantity.`,true);return;}
    if(!Number.isFinite(weight)||weight<=0){setMessage("saleMessage","Enter a valid total weight greater than zero.",true);return;}
    const sale={id:makeId(),createdAt:nowISO(),roosters,weight:Number(weight.toFixed(2)),price,amount:Number((weight*price).toFixed(2)),customer:$("customerName").value.trim(),username:currentUser.username};
    db.sales.push(sale);saveDB();$("saleForm").reset();renderAll();
    setMessage("saleMessage",`Sale saved: ${roosters} rooster(s), ${weight.toFixed(2)} kg × ${money(price)} = ${money(sale.amount)}. Remaining: ${remaining()}.`);
    setPricePreview();
  });
  $("historySearch").addEventListener("input",renderHistory);
  $("historyDate").addEventListener("change",renderHistory);
  $("clearFilters").addEventListener("click",()=>{$("historySearch").value="";$("historyDate").value="";renderHistory();});
  $("stockForm").addEventListener("submit",e=>{
    e.preventDefault();if(!isAdmin())return;
    const count=Number($("stockAdd").value);if(!Number.isInteger(count)||count<1)return;
    if(db.stockStart===null)db.stockStart=0;
    db.stockAdditions.push({id:makeId(),count,createdAt:nowISO(),username:currentUser.username});saveDB();$("stockForm").reset();renderAll();
    alert(`${count} rooster(s) added. Remaining stock: ${remaining()}.`);
  });
  $("userForm").addEventListener("submit",e=>{
    e.preventDefault();if(!isAdmin())return;
    const username=$("newUsername").value.trim(),password=$("newPassword").value,role=$("newRole").value;
    if(!/^[A-Za-z0-9_.-]{3,30}$/.test(username)){setMessage("userMessage","Use 3–30 letters, numbers, dots, dashes, or underscores.",true);return;}
    if(password.length<6){setMessage("userMessage","Password must contain at least 6 characters.",true);return;}
    if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase())){setMessage("userMessage","That username already exists.",true);return;}
    db.users.push({id:makeId(),username,password,role,createdAt:nowISO()});saveDB();$("userForm").reset();renderUsers();setMessage("userMessage",`Account "${username}" created. Share the login details privately.`);
  });
  $("passwordForm").addEventListener("submit",e=>{
    e.preventDefault();const old=$("oldPassword").value,nw=$("newOwnPassword").value;
    const u=db.users.find(x=>x.id===currentUser.id);
    if(!u||u.password!==old){setMessage("passwordMessage","Current password is incorrect.",true);return;}
    if(nw.length<6){setMessage("passwordMessage","New password must be at least 6 characters.",true);return;}
    u.password=nw;saveDB();$("passwordForm").reset();setMessage("passwordMessage","Password updated successfully.");
  });
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`poultry-farm-backup-${localDate(nowISO())}.json`;a.click();URL.revokeObjectURL(url);setMessage("settingsMessage","Backup exported. Store it somewhere safe.");
  });
  $("importFile").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!isAdmin()){setMessage("settingsMessage","Only an admin can restore a backup.",true);e.target.value="";return;}
    try{
      const imported=JSON.parse(await file.text());
      if(!imported||!Array.isArray(imported.users)||!Array.isArray(imported.sales)||!Array.isArray(imported.stockAdditions))throw new Error("This file is not a valid Poultry Farm Manager backup.");
      if(!confirm("Importing will replace all data on this device. Continue?"))return;
      db=imported;saveDB();currentUser=db.users.find(u=>u.id===currentUser.id)||db.users.find(u=>u.role==="admin")||null;
      if(!currentUser){showLogin();return;}showApp();setMessage("settingsMessage","Backup imported successfully.");
    }catch(err){setMessage("settingsMessage",err.message||"Could not import this backup.",true);}
    finally{e.target.value="";}
  });
  setPricePreview();
  if("serviceWorker" in navigator && location.protocol!=="file:") window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
})();