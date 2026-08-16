(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const CATALOG=[
 {model:"Brine",weight:8,wholesale:120,retail:170},{model:"Drift",weight:10,wholesale:130,retail:180},
 {model:"Drift",weight:15,wholesale:140,retail:190},{model:"Drift",weight:20,wholesale:150,retail:200},
 {model:"Apex",weight:25,wholesale:200,retail:260},{model:"Apex",weight:35,wholesale:220,retail:280},
 {model:"Pulse",weight:40,wholesale:230,retail:300},{model:"Pulse",weight:50,wholesale:250,retail:320}
];
let state={view:"dashboard-view",history:[],shops:[],customers:[],sales:[],purchases:[],planned:[],catalogue:[],search:"",editingId:null};

const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now()+Math.floor(Math.random()*10000);
function toast(msg,type=""){const el=document.createElement("div");el.className="toast "+type;el.textContent=msg;$("#toast-container").appendChild(el);setTimeout(()=>el.remove(),2600)}
function fmtDate(d){if(!d)return"-";const x=new Date(d);return isNaN(x)?"-":x.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}
function monthSales(){return state.sales.filter(s=>new Date(s.date)>=monthStart())}
function total(s){return Math.max(0,Number(s.subtotal||0)+Number(s.shipping||0)-Number(s.discount||0))}
function due(s){return Math.max(0,total(s)-Number(s.paid||0))}
function buyerList(type){return type==="Shop"?state.shops:state.customers}
function catalogPrice(model,weight,tier){const x=CATALOG.find(c=>c.model===model&&Number(c.weight)===Number(weight));return x?(tier==="Retail"?x.retail:x.wholesale):0}
function buyerById(s){return buyerList(s.buyerType).find(x=>Number(x.id)===Number(s.buyerId))}
async function load(){
  await SigmaDB.initDB();
  [state.shops,state.customers,state.sales,state.purchases,state.planned]=await Promise.all(["shops","customers","sales","purchases","plannedPurchases"].map(SigmaDB.getAll));
  const existing=await SigmaDB.getAll("catalogue");state.catalogue=existing.length?existing:CATALOG.map(x=>({...x}));
  if(!existing.length)for(const x of CATALOG)await SigmaDB.saveItem("catalogue",{...x});
  if(!state.sales.length&&!state.purchases.length&&!state.shops.length&&!state.customers.length)await seedDemo();
}
async function seedDemo(){
  const shops=[{id:uid(),name:"Apex Marine",phone:"+91 90000 10001",address:"Chennai",createdAt:new Date().toISOString()},{id:uid(),name:"Oceanic Lures",phone:"+91 90000 10002",address:"Kochi",createdAt:new Date().toISOString()}];
  const customers=[{id:uid(),name:"Rahul Sharma",phone:"+91 90000 10003",address:"Chennai",createdAt:new Date().toISOString()},{id:uid(),name:"Vikram Nair",phone:"+91 90000 10004",address:"Kochi",createdAt:new Date().toISOString()}];
  for(const x of shops)await SigmaDB.saveItem("shops",x);for(const x of customers)await SigmaDB.saveItem("customers",x);
  state.shops=shops;state.customers=customers;
  const d=new Date().toISOString();
  const sales=[
    {orderNo:"SL-DEMO-001",buyerType:"Shop",buyerId:shops[0].id,buyerName:shops[0].name,tier:"Wholesale",date:d,items:[{model:"Brine",weight:8,qty:10,unitPrice:120}],shipping:80,discount:0,freeJigs:1,paid:1000,subtotal:1200},
    {orderNo:"SL-DEMO-002",buyerType:"Customer",buyerId:customers[0].id,buyerName:customers[0].name,tier:"Retail",date:d,items:[{model:"Pulse",weight:40,qty:2,unitPrice:300}],shipping:60,discount:20,freeJigs:0,paid:500,subtotal:600}
  ];
  for(const s of sales)await SigmaDB.saveItem("sales",s);
  const purchases=[{date:d,product:"Hooks",shop:"Demo Supplier",qty:100,unitPrice:5,total:500,paid:500,status:"Paid"},{date:d,product:"Resin",shop:"Demo Supplier",qty:5,unitPrice:350,total:1750,paid:1000,status:"Due"}];
  for(const p of purchases)await SigmaDB.saveItem("purchases",p);
  await refresh();toast("Demo data loaded","success");
}
async function refresh(){
  [state.shops,state.customers,state.sales,state.purchases,state.planned]=await Promise.all(["shops","customers","sales","purchases","plannedPurchases"].map(SigmaDB.getAll));
  render();
}
function setView(view,push=true){
  if(state.view!==view&&push)state.history.push(state.view);
  state.view=view;$$(".view-section").forEach(x=>x.classList.toggle("active",x.id===view));
  $("#global-header-back-btn").classList.toggle("hidden",state.history.length===0||view==="dashboard-view");
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.nav===view));
  render();window.scrollTo({top:0,behavior:"instant"});
}
function back(){if(state.history.length){state.view=state.history.pop();setView(state.view,false)}else setView("dashboard-view",false)}
function render(){renderDashboard();renderNewOrder();renderShops();renderCustomers();renderSales();renderPurchases();renderDues();renderPlanned();renderCatalogue();renderReports();renderBackup()}
function searchBar(){return `<div class="search-wrap"><span class="search-icon">⌕</span><input id="global-search" value="${esc(state.search)}" placeholder="Search shops, customers, sales, orders, invoices…"></div>`}
function renderDashboard(){
 const ms=monthSales(),gross=ms.reduce((a,s)=>a+total(s),0),received=ms.reduce((a,s)=>a+Number(s.paid||0),0),dues=ms.reduce((a,s)=>a+due(s),0),p=state.purchases.filter(x=>new Date(x.date)>=monthStart()).reduce((a,x)=>a+Number(x.total||0),0);
 $("#dashboard-view").innerHTML=`${searchBar()}<div class="card"><h2>This Month Overview</h2><div class="grid metrics">
 <div class="metric"><div class="label">Gross Sales</div><div class="value">${money(gross)}</div></div>
 <div class="metric"><div class="label">Material Purchases</div><div class="value">${money(p)}</div></div>
 <div class="metric"><div class="label">Amount Received</div><div class="value">${money(received)}</div></div>
 <div class="metric"><div class="label">Pending Dues</div><div class="value">${money(dues)}</div></div>
 <div class="metric"><div class="label">Orders</div><div class="value">${ms.length}</div></div>
 </div></div>
 <div class="card"><h2>Business Hub</h2><div class="action-grid">
 ${tile("🏪","Shops","shops-view")}${tile("👤","Customers","customers-view")}${tile("📊","All Sales","sales-view")}
 ${tile("💳","Payments & Dues","dues-view")}${tile("🛒","Material Purchases","purchases-view")}${tile("📝","Planned Purchases","planned-view")}
 ${tile("🎣","Catalogue & Prices","catalogue-view")}${tile("📈","Monthly Reports","reports-view")}${tile("💾","Backup & Restore","backup-view")}
 ${tile("➕","New Order","new-order-view")}
 </div></div>`;
}
function tile(icon,name,view){return `<button class="tile" data-nav="${view}"><b>${icon} ${name}</b><span>Open manager</span></button>`}
function orderForm(data=null){
 const x=data||{buyerType:"Shop",buyerId:"",buyerName:"",tier:"Wholesale",date:new Date().toISOString().slice(0,10),items:[{model:"Brine",weight:8,qty:1,unitPrice:120}],shipping:0,discount:0,freeJigs:0,paid:0};
 const rows=x.items.map((it,i)=>lineHTML(it,i,x.tier)).join("");
 const subtotal=x.items.reduce((a,it)=>a+Number(it.qty||0)*Number(it.unitPrice||0),0),grand=Math.max(0,subtotal+Number(x.shipping||0)-Number(x.discount||0));
 return `<div class="card"><div class="section-head"><h2>${data?"Edit Order":"New Order"}</h2></div>
 <div class="form-grid">
  <div class="field"><label>Buyer Type</label><select id="order-buyer-type"><option ${x.buyerType==="Shop"?"selected":""}>Shop</option><option ${x.buyerType==="Customer"?"selected":""}>Customer</option></select></div>
  <div class="field"><label>Buyer Name</label><input id="order-buyer-name" list="buyer-options" value="${esc(x.buyerName)}" placeholder="Name"></div>
  <datalist id="buyer-options">${buyerList(x.buyerType).map(b=>`<option value="${esc(b.name)}">`).join("")}</datalist>
  <div class="field"><label>Pricing Tier</label><select id="order-tier"><option ${x.tier==="Wholesale"?"selected":""}>Wholesale</option><option ${x.tier==="Retail"?"selected":""}>Retail</option></select></div>
  <div class="field"><label>Order Date</label><input id="order-date" type="date" value="${esc(String(x.date).slice(0,10))}"></div>
 </div>
 <div class="section-head" style="margin-top:18px"><h3>Lure Items</h3><button class="btn sm" id="add-line">＋ Add Lure</button></div>
 <div id="line-items">${rows}</div>
 <div class="form-grid">
  <div class="field"><label>Shipping Fee (₹)</label><input id="order-shipping" type="number" min="0" value="${Number(x.shipping||0)}"></div>
  <div class="field"><label>Discount (₹)</label><input id="order-discount" type="number" min="0" value="${Number(x.discount||0)}"></div>
  <div class="field"><label>Free Jigs Count</label><input id="order-free" type="number" min="0" value="${Number(x.freeJigs||0)}"></div>
  <div class="field"><label>Amount Paid Now (₹)</label><input id="order-paid" type="number" min="0" value="${Number(x.paid||0)}"></div>
 </div>
 <div class="summary" id="order-summary" style="margin-top:12px"></div>
 <div class="actions"><button class="btn secondary" id="save-draft">💾 Save Draft Order</button><button class="btn green" id="save-sale">✅ ${data?"Save Changes":"Convert & Mark as Sale"}</button></div>
 </div>`;
}
function lineHTML(it,i,tier){
 const modelOpts=["Brine","Drift","Apex","Pulse"].map(m=>`<option ${it.model===m?"selected":""}>${m}</option>`).join("");
 const weights=CATALOG.filter(x=>x.model===it.model).map(x=>x.weight);
 const weightOpts=weights.map(w=>`<option ${Number(it.weight)===w?"selected":""}>${w}</option>`).join("");
 return `<div class="line-item" data-line="${i}"><div class="line-grid">
 <div class="field"><label>Model</label><select class="li-model">${modelOpts}</select></div>
 <div class="field"><label>Weight</label><select class="li-weight">${weightOpts}</select></div>
 <div class="field"><label>Qty</label><input class="li-qty" type="number" min="1" value="${Number(it.qty||1)}"></div>
 <div class="field"><label>Unit Price</label><input class="li-price" type="number" min="0" value="${Number(it.unitPrice||0)}"></div>
 <button class="remove-line" title="Remove">✕</button></div></div>`;
}
function collectOrder(){
 const buyerType=$("#order-buyer-type").value,buyerName=$("#order-buyer-name").value.trim();
 let buyerId=(buyerList(buyerType).find(b=>b.name.toLowerCase()===buyerName.toLowerCase())||{}).id||null;
 const items=$$(".line-item").map(row=>({model:row.querySelector(".li-model").value,weight:Number(row.querySelector(".li-weight").value),qty:Number(row.querySelector(".li-qty").value||0),unitPrice:Number(row.querySelector(".li-price").value||0)})).filter(x=>x.qty>0);
 const subtotal=items.reduce((a,x)=>a+x.qty*x.unitPrice,0);
 return {buyerType,buyerId,buyerName,tier:$("#order-tier").value,date:$("#order-date").value,items,shipping:Number($("#order-shipping").value||0),discount:Number($("#order-discount").value||0),freeJigs:Number($("#order-free").value||0),paid:Number($("#order-paid").value||0),subtotal};
}
function renderNewOrder(){if(state.view!=="new-order-view")return;$("#new-order-view").innerHTML=orderForm(state.editingId?state.sales.find(s=>Number(s.id)===Number(state.editingId)):null);updateOrderSummary();bindOrderForm()}
function bindOrderForm(){
 $("#order-tier")?.addEventListener("change",()=>{ $$(".line-item").forEach(r=>{const m=r.querySelector(".li-model").value,w=r.querySelector(".li-weight").value;r.querySelector(".li-price").value=catalogPrice(m,w,$("#order-tier").value)});updateOrderSummary()});
 $("#order-buyer-type")?.addEventListener("change",()=>{$("#order-buyer-name").value="";$("#buyer-options").innerHTML=buyerList($("#order-buyer-type").value).map(b=>`<option value="${esc(b.name)}">`).join("")});
 $("#add-line")?.addEventListener("click",()=>{const tier=$("#order-tier").value;$("#line-items").insertAdjacentHTML("beforeend",lineHTML({model:"Brine",weight:8,qty:1,unitPrice:catalogPrice("Brine",8,tier)},Date.now(),tier));bindLineEvents();updateOrderSummary()});
 bindLineEvents();["order-shipping","order-discount","order-free","order-paid"].forEach(id=>$("#"+id)?.addEventListener("input",updateOrderSummary));
 $("#save-draft")?.addEventListener("click",()=>saveOrder(false));$("#save-sale")?.addEventListener("click",()=>saveOrder(true));
}
function bindLineEvents(){$$(".line-item").forEach(row=>{row.querySelector(".remove-line")?.addEventListener("click",()=>{if($$(".line-item").length===1)return toast("At least one lure is required","error");row.remove();updateOrderSummary()});row.querySelector(".li-model")?.addEventListener("change",()=>{const m=row.querySelector(".li-model").value;const ws=CATALOG.filter(x=>x.model===m).map(x=>x.weight);row.querySelector(".li-weight").innerHTML=ws.map(w=>`<option>${w}</option>`).join("");row.querySelector(".li-price").value=catalogPrice(m,ws[0],$("#order-tier").value);updateOrderSummary()});row.querySelector(".li-weight")?.addEventListener("change",()=>{row.querySelector(".li-price").value=catalogPrice(row.querySelector(".li-model").value,row.querySelector(".li-weight").value,$("#order-tier").value);updateOrderSummary()});row.querySelectorAll("input").forEach(i=>i.addEventListener("input",updateOrderSummary))})}
function updateOrderSummary(){const x=collectOrder(),grand=total(x),d=Math.max(0,grand-x.paid);const el=$("#order-summary");if(el)el.innerHTML=`<div><span>Subtotal</span><b>${money(x.subtotal)}</b></div><div><span>Shipping</span><b>${money(x.shipping)}</b></div><div><span>Discount</span><b>- ${money(x.discount)}</b></div><div><span>Free Jigs</span><b>${x.freeJigs}</b></div><div class="total"><span>Total</span><b>${money(grand)}</b></div><div><span>Paid</span><b>${money(x.paid)}</b></div><div class="due"><span>Balance Due</span><b>${money(d)}</b></div>`}
async function saveOrder(sold){
 try{
  const x=collectOrder();if(!x.buyerName)return toast("Enter buyer name","error");if(!x.items.length)return toast("Add at least one lure","error");
  if(!sold&&!state.editingId)x.status="Draft";else x.status="Sold";
  if(sold&&!x.orderNo)x.orderNo="SL-"+new Date().getFullYear()+"-"+String(uid()).slice(-6);
  if(state.editingId)x.id=Number(state.editingId);
  if(sold){
    let existing=buyerList(x.buyerType).find(b=>b.name.toLowerCase()===x.buyerName.toLowerCase());
    if(!existing){existing={id:uid(),name:x.buyerName,phone:"",address:"",createdAt:new Date().toISOString()};await SigmaDB.saveItem(x.buyerType==="Shop"?"shops":"customers",existing);x.buyerId=existing.id}
    else x.buyerId=existing.id;
  }
  await SigmaDB.saveItem("sales",x);state.editingId=null;toast(sold?"Sale saved":"Draft saved","success");setView("sales-view");
 }catch(e){console.error(e);toast("Could not save order","error")}
}
function renderShops(){renderParty("shops-view","Shop","shops")}
function renderCustomers(){renderParty("customers-view","Customer","customers")}
function renderParty(view,type,key){
 const arr=state[key].filter(x=>!state.search||x.name.toLowerCase().includes(state.search.toLowerCase())||String(x.phone||"").includes(state.search));
 $("#"+view).innerHTML=`<div class="section-head"><h2>${type}s</h2><button class="btn sm" data-new-party="${type}">＋ Add ${type}</button></div>${arr.length?`<div class="list">${arr.map(p=>{const ss=state.sales.filter(s=>s.status==="Sold"&&s.buyerType===type&&Number(s.buyerId)===Number(p.id));const v=ss.reduce((a,s)=>a+total(s),0);return `<div class="list-row" data-party="${type}" data-id="${p.id}"><div class="row-main"><div><div class="row-title">${esc(p.name)}</div><div class="row-sub">${esc(p.phone||"No phone")} · ${ss.length} orders</div></div><div class="price">${money(v)}</div></div></div>`}).join("")}</div>`:`<div class="empty">No confirmed ${type.toLowerCase()} records yet.</div>`}`;
}
function partyProfile(type,id){
 const p=buyerList(type).find(x=>Number(x.id)===Number(id));if(!p)return;
 const ss=state.sales.filter(s=>s.status==="Sold"&&s.buyerType===type&&Number(s.buyerId)===Number(id)).sort((a,b)=>new Date(b.date)-new Date(a.date));
 const sales=ss.reduce((a,s)=>a+total(s),0),paid=ss.reduce((a,s)=>a+Number(s.paid||0),0);
 openModal(`${type} Profile`,`<div class="card" style="padding:0;border:0;box-shadow:none"><div class="row-main"><div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.phone||"No phone")} · ${esc(p.address||"No address")}</div></div><button class="btn sm secondary" id="edit-party">✏️ Edit</button></div></div>
 <div class="grid metrics"><div class="metric"><div class="label">Total Sales</div><div class="value">${money(sales)}</div></div><div class="metric"><div class="label">Orders</div><div class="value">${ss.length}</div></div><div class="metric"><div class="label">Paid</div><div class="value">${money(paid)}</div></div><div class="metric"><div class="label">Dues</div><div class="value">${money(sales-paid)}</div></div></div>
 <div class="section-head" style="margin-top:18px"><h3>Order History</h3></div><div class="list">${ss.length?ss.map(s=>orderRow(s)).join(""):`<div class="empty">No sold orders.</div>`}</div>`);
 $("#edit-party").onclick=()=>{closeModal();partyModal(type,p)};
}
function orderRow(s){return `<div class="list-row order-row" data-order="${s.id}"><div class="row-main"><div><div class="row-title">${esc(s.orderNo||"Order #"+s.id)}</div><div class="row-sub">${fmtDate(s.date)} · ${s.items?.length||0} lure lines · ${due(s)?'<span class="badge red">Pending</span>':'<span class="badge green">Paid</span>'}</div></div><div class="price">${money(total(s))}</div></div><div class="order-detail" style="display:none"></div></div>`}
function fillOrderDetail(s,holder){
 holder.innerHTML=`<div class="detail-lines">${(s.items||[]).map(i=>`<div class="detail-line"><span>${esc(i.model)} ${i.weight}g × ${i.qty} @ ${money(i.unitPrice)}</span><b>${money(i.qty*i.unitPrice)}</b></div>`).join("")}</div>
 <div class="divider"></div><div class="detail-line"><span>Subtotal</span><b>${money(s.subtotal)}</b></div><div class="detail-line"><span>Shipping</span><b>${money(s.shipping)}</b></div><div class="detail-line"><span>Discount</span><b>- ${money(s.discount)}</b></div><div class="detail-line"><span>Free Jigs</span><b>${s.freeJigs||0}</b></div><div class="detail-line"><span>Final Total</span><b>${money(total(s))}</b></div><div class="detail-line"><span>Paid</span><b>${money(s.paid)}</b></div><div class="detail-line"><span>Balance Due</span><b>${money(due(s))}</b></div>
 <div class="actions"><button class="btn sm secondary" data-edit-order="${s.id}">✏️ Edit</button><button class="btn sm blue" data-payment="${s.id}">💳 Payment</button><button class="btn sm secondary" data-invoice="${s.id}">📄 Invoice</button><button class="btn sm danger" data-delete-sale="${s.id}">✕ Delete</button></div>`;
}
function partyModal(type,p){
 openModal(`Edit ${type}`,`<div class="form-grid"><div class="field"><label>Name</label><input id="party-name" value="${esc(p.name)}"></div><div class="field"><label>Phone</label><input id="party-phone" value="${esc(p.phone||"")}"></div><div class="field full"><label>Address / Location</label><textarea id="party-address">${esc(p.address||"")}</textarea></div></div><div class="actions"><button class="btn green" id="save-party">Save</button></div>`);
 $("#save-party").onclick=async()=>{const old=p.name;p.name=$("#party-name").value.trim();p.phone=$("#party-phone").value.trim();p.address=$("#party-address").value.trim();if(!p.name)return toast("Name required","error");await SigmaDB.saveItem(type==="Shop"?"shops":"customers",p);for(const s of state.sales.filter(s=>s.buyerType===type&&Number(s.buyerId)===Number(p.id))){s.buyerName=p.name;await SigmaDB.saveItem("sales",s)}closeModal();await refresh();toast(`${type} updated`,"success")}
}
function renderSales(){
 const arr=state.sales.filter(s=>!state.search||JSON.stringify(s).toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>new Date(b.date)-new Date(a.date));
 $("#sales-view").innerHTML=`<div class="section-head"><h2>All Sales & Orders</h2><button class="btn sm" data-nav="new-order-view">＋ New Order</button></div>${arr.length?`<div class="list">${arr.map(s=>`<div class="list-row order-row" data-order="${s.id}"><div class="row-main"><div><div class="row-title">${esc(s.orderNo||"Draft #"+s.id)} ${s.status==="Draft"?'<span class="badge">Draft</span>':''}</div><div class="row-sub">${esc(s.buyerName)} · ${fmtDate(s.date)} · ${s.tier}</div></div><div class="price">${money(total(s))}<div class="small ${due(s)?'':'muted'}">${due(s)?money(due(s))+" due":"Paid"}</div></div></div><div class="order-detail" style="display:none"></div></div>`).join("")}</div>`:`<div class="empty">No orders found.</div>`}
function renderPurchases(){
 $("#purchases-view").innerHTML=`<div class="section-head"><h2>Material Purchases</h2><button class="btn sm" id="new-purchase">＋ Add Purchase</button></div>${state.purchases.length?`<div class="list">${state.purchases.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=>`<div class="list-row"><div class="row-main"><div><div class="row-title">${esc(p.product)}</div><div class="row-sub">${fmtDate(p.date)} · ${esc(p.shop||"")} · Qty ${p.qty}</div></div><div class="price">${money(p.total)}<div class="small">${p.status==="Due"?'<span class="badge red">Due</span>':'<span class="badge green">Paid</span>'}</div></div></div></div>`).join("")}</div>`:`<div class="empty">No material purchases.</div>`}`;
}
function renderDues(){
 const rows=state.sales.filter(s=>due(s)>0).sort((a,b)=>due(b)-due(a));
 $("#dues-view").innerHTML=`<div class="section-head"><h2>Payments & Dues</h2></div>${rows.length?`<div class="list">${rows.map(s=>`<div class="list-row"><div class="row-main"><div><div class="row-title">${esc(s.buyerName)} · ${esc(s.orderNo||"Order")}</div><div class="row-sub">${fmtDate(s.date)} · Total ${money(total(s))} · Paid ${money(s.paid)}</div></div><div class="price">${money(due(s))} due</div></div><div class="actions"><button class="btn sm blue" data-payment="${s.id}">💳 Update Payment</button></div></div>`).join("")}</div>`:`<div class="empty">No pending customer dues.</div>`}`;
}
function renderPlanned(){
 $("#planned-view").innerHTML=`<div class="section-head"><h2>Planned Purchases</h2><button class="btn sm" id="new-planned">＋ Add Plan</button></div>${state.planned.length?`<div class="list">${state.planned.map(p=>`<div class="list-row"><div class="row-main"><div><div class="row-title">${esc(p.product)}</div><div class="row-sub">${esc(p.note||"")} · Qty ${p.qty||0}</div></div><span class="badge ${p.status==="Done"?"green":""}">${esc(p.status||"Planned")}</span></div></div>`).join("")}</div>`:`<div class="empty">No planned purchases.</div>`}`;
}
function renderCatalogue(){
 $("#catalogue-view").innerHTML=`<div class="section-head"><h2>Catalogue & Prices</h2></div><div class="card"><div class="table-wrap"><table class="catalog-table"><thead><tr><th>Model</th><th>Weight</th><th>Wholesale</th><th>Retail</th></tr></thead><tbody>${CATALOG.map(c=>`<tr><td>${c.model}</td><td>${c.weight}g</td><td>${money(c.wholesale)}</td><td>${money(c.retail)}</td></tr>`).join("")}</tbody></table></div><div class="muted small" style="margin-top:10px">Unit prices remain editable on every order.</div></div>`;
}
function renderReports(){
 const byMonth={};state.sales.filter(s=>s.status==="Sold").forEach(s=>{const d=new Date(s.date),k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");byMonth[k]??={sales:0,paid:0,orders:0};byMonth[k].sales+=total(s);byMonth[k].paid+=Number(s.paid||0);byMonth[k].orders++});
 const rows=Object.entries(byMonth).sort().reverse();
 $("#reports-view").innerHTML=`<div class="section-head"><h2>Monthly Reports</h2></div>${rows.length?`<div class="list">${rows.map(([m,v])=>`<div class="list-row"><div class="row-main"><div><div class="row-title">${m}</div><div class="row-sub">${v.orders} orders · Received ${money(v.paid)} · Pending ${money(v.sales-v.paid)}</div></div><div class="price">${money(v.sales)}</div></div></div>`).join("")}</div>`:`<div class="empty">No sold-order data yet.</div>`}`;
}
function renderBackup(){
 $("#backup-view").innerHTML=`<div class="section-head"><h2>Backup & Restore</h2></div><div class="card"><p class="muted">Export every Sigma Lures record to JSON. Restore is non-destructive by default; choose Replace only when you intentionally want the backup to become the complete database.</p><div class="actions"><button class="btn" id="export-backup">💾 Export Backup</button><label class="btn secondary" style="cursor:pointer">📥 Import Backup<input id="import-backup" type="file" accept=".json,application/json" hidden></label></div></div>`}
function openModal(title,html){
 const root=$("#modal-root");root.innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>${title}</h3><button class="close" id="modal-close">×</button></div>${html}</div></div>`;
 $("#modal-close").onclick=closeModal;$("#modal-backdrop").addEventListener("click",e=>{if(e.target.id==="modal-backdrop")closeModal()});
}
function closeModal(){$("#modal-root").innerHTML=""}
function paymentModal(s){
 openModal("Update Payment",`<div class="field"><label>Total</label><input value="${total(s)}" disabled></div><div class="field"><label>Total Paid</label><input id="payment-value" type="number" min="0" value="${Number(s.paid||0)}"></div><div class="actions"><button class="btn green" id="save-payment">Save Payment</button></div>`);
 $("#save-payment").onclick=async()=>{s.paid=Number($("#payment-value").value||0);await SigmaDB.saveItem("sales",s);closeModal();await refresh();toast("Payment updated","success")}
}
function purchaseModal(){
 openModal("Add Material Purchase",`<div class="form-grid"><div class="field"><label>Product</label><select id="p-product"><option>Hooks</option><option>Resin</option><option>Lead</option><option>Paints</option><option>Packaging</option><option>Other</option></select></div><div class="field"><label>Supplier / Shop</label><input id="p-shop"></div><div class="field"><label>Date</label><input id="p-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Quantity</label><input id="p-qty" type="number" min="0" value="1"></div><div class="field"><label>Unit Price</label><input id="p-unit" type="number" min="0" value="0"></div><div class="field"><label>Payment Status</label><select id="p-status"><option>Paid</option><option>Due</option></select></div></div><div class="actions"><button class="btn green" id="save-purchase">Save Purchase</button></div>`);
 $("#save-purchase").onclick=async()=>{const qty=Number($("#p-qty").value||0),unit=Number($("#p-unit").value||0);await SigmaDB.saveItem("purchases",{date:$("#p-date").value,product:$("#p-product").value,shop:$("#p-shop").value.trim(),qty,unitPrice:unit,total:qty*unit,paid:$("#p-status").value==="Paid"?qty*unit:0,status:$("#p-status").value});closeModal();await refresh();toast("Purchase saved","success")}
}
function plannedModal(){
 openModal("Plan Purchase",`<div class="form-grid"><div class="field"><label>Product</label><input id="pl-product"></div><div class="field"><label>Quantity</label><input id="pl-qty" type="number" value="1"></div><div class="field full"><label>Note</label><textarea id="pl-note"></textarea></div></div><div class="actions"><button class="btn green" id="save-planned">Save Plan</button></div>`);
 $("#save-planned").onclick=async()=>{await SigmaDB.saveItem("plannedPurchases",{product:$("#pl-product").value.trim(),qty:Number($("#pl-qty").value||0),note:$("#pl-note").value.trim(),status:"Planned"});closeModal();await refresh();toast("Plan saved","success")}
}
function editOrder(id){const s=state.sales.find(x=>Number(x.id)===Number(id));if(!s)return;state.editingId=s.id;setView("new-order-view")}
function invoice(id){
 const s=state.sales.find(x=>Number(x.id)===Number(id));if(!s)return;const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.orderNo)}</title><style>body{font-family:Arial;padding:30px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}.right{text-align:right}.head{display:flex;justify-content:space-between}</style></head><body><div class="head"><div><h1>SIGMA LURES</h1><div>Tax Memo / Invoice</div></div><div><b>${esc(s.orderNo||"")}</b><br>${fmtDate(s.date)}</div></div><hr><p><b>Buyer:</b> ${esc(s.buyerName)}<br><b>Type:</b> ${esc(s.buyerType)} · <b>Tier:</b> ${esc(s.tier)}</p><table><tr><th>Model</th><th>Weight</th><th>Qty</th><th>Unit</th><th>Total</th></tr>${s.items.map(i=>`<tr><td>${esc(i.model)}</td><td>${i.weight}g</td><td>${i.qty}</td><td>${money(i.unitPrice)}</td><td>${money(i.qty*i.unitPrice)}</td></tr>`).join("")}</table><p class="right">Subtotal: ${money(s.subtotal)}<br>Shipping: ${money(s.shipping)}<br>Discount: -${money(s.discount)}<br><b>Total: ${money(total(s))}</b><br>Paid: ${money(s.paid)}<br>Balance: ${money(due(s))}</p><p>Free Jigs: ${s.freeJigs||0}</p></body></html>`;
 const w=window.open("","_blank");if(!w)return toast("Popup blocked. Allow popups to print invoice","error");w.document.write(html);w.document.close();setTimeout(()=>w.print(),250)
}
async function deleteSale(id){if(!confirm("Delete this sale/order permanently? A backup is recommended first."))return;await SigmaDB.deleteItem("sales",id);await refresh();toast("Order deleted","success")}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-nav]");if(nav){state.editingId=null;setView(nav.dataset.nav);return}
 const party=e.target.closest("[data-party]");if(party){partyProfile(party.dataset.party,party.dataset.id);return}
 const row=e.target.closest(".order-row");if(row){const id=row.dataset.order,s=state.sales.find(x=>Number(x.id)===Number(id)),detail=row.querySelector(".order-detail");if(s){detail.style.display=detail.style.display==="none"?"block":"none";if(detail.style.display==="block")fillOrderDetail(s,detail)}return}
 const edit=e.target.closest("[data-edit-order]");if(edit){editOrder(edit.dataset.editOrder);return}
 const pay=e.target.closest("[data-payment]");if(pay){const s=state.sales.find(x=>Number(x.id)===Number(pay.dataset.payment));if(s)paymentModal(s);return}
 const inv=e.target.closest("[data-invoice]");if(inv){invoice(inv.dataset.invoice);return}
 const del=e.target.closest("[data-delete-sale]");if(del){deleteSale(del.dataset.deleteSale);return}
 const np=e.target.closest("[data-new-party]");if(np){partyModal(np.dataset.newParty,{id:uid(),name:"",phone:"",address:""});return}
 if(e.target.id==="new-purchase")purchaseModal();
 if(e.target.id==="new-planned")plannedModal();
 if(e.target.id==="export-backup")exportBackup();
});
document.addEventListener("input",e=>{if(e.target.id==="global-search"){state.search=e.target.value;render()}})
document.addEventListener("change",async e=>{if(e.target.id==="import-backup"){const f=e.target.files[0];if(!f)return;try{const text=await f.text();const replace=confirm("Restore backup by REPLACING existing records?\n\nCancel = merge without deleting current data.");await SigmaDB.importBackupJSON(text,{replace});await refresh();toast("Backup restored","success")}catch(err){console.error(err);toast("Invalid or failed backup","error")}}});
$("#global-header-back-btn").addEventListener("click",back);$("#header-home-btn").addEventListener("click",()=>{state.history=[];setView("dashboard-view",false)});
async function exportBackup(){try{const text=await SigmaDB.exportBackupJSON(),blob=new Blob([text],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sigma-lures-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);toast("Backup exported","success")}catch(e){console.error(e);toast("Backup failed","error")}}
window.addEventListener("error",e=>{console.error(e.error||e.message);toast("Unexpected app error. Check console.","error")});
(async()=>{try{await load();render();}catch(e){console.error(e);toast("Database failed to initialize","error")}})();
})();