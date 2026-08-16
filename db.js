(function(){
"use strict";
const DB_NAME="SigmaLuresDB", DB_VERSION=1;
const stores=["shops","customers","sales","purchases","plannedPurchases","catalogue"];
function reqToPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
async function initDB(){
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=e=>{
    const db=e.target.result;
    if(!db.objectStoreNames.contains("shops")){const s=db.createObjectStore("shops",{keyPath:"id",autoIncrement:true});s.createIndex("name","name",{unique:false})}
    if(!db.objectStoreNames.contains("customers")){const s=db.createObjectStore("customers",{keyPath:"id",autoIncrement:true});s.createIndex("name","name",{unique:false})}
    if(!db.objectStoreNames.contains("sales")){const s=db.createObjectStore("sales",{keyPath:"id",autoIncrement:true});s.createIndex("buyerId","buyerId");s.createIndex("buyerType","buyerType");s.createIndex("date","date")}
    if(!db.objectStoreNames.contains("purchases")){const s=db.createObjectStore("purchases",{keyPath:"id",autoIncrement:true});s.createIndex("date","date")}
    if(!db.objectStoreNames.contains("plannedPurchases")){const s=db.createObjectStore("plannedPurchases",{keyPath:"id",autoIncrement:true});s.createIndex("status","status")}
    if(!db.objectStoreNames.contains("catalogue")){const s=db.createObjectStore("catalogue",{keyPath:"id",autoIncrement:true});s.createIndex("model","model")}
  };
  const db=await reqToPromise(req); return db;
}
async function getAll(store){const db=await initDB();return reqToPromise(db.transaction(store,"readonly").objectStore(store).getAll())}
async function getItem(store,id){const db=await initDB();return reqToPromise(db.transaction(store,"readonly").objectStore(store).get(Number(id)))}
async function saveItem(store,item){const db=await initDB();const tx=db.transaction(store,"readwrite");const id=await reqToPromise(tx.objectStore(store).put(item));await txDone(tx);return id}
async function deleteItem(store,id){const db=await initDB();const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(Number(id));await txDone(tx)}
async function clearStore(store){const db=await initDB();const tx=db.transaction(store,"readwrite");tx.objectStore(store).clear();await txDone(tx)}
async function exportBackupJSON(){
  const data={version:DB_VERSION,exportedAt:new Date().toISOString(),stores:{}};
  for(const s of stores)data.stores[s]=await getAll(s);
  return JSON.stringify(data,null,2);
}
async function importBackupJSON(json,{replace=false}={}){
  const data=typeof json==="string"?JSON.parse(json):json;
  if(!data||!data.stores)throw new Error("Invalid Sigma Lures backup");
  if(replace)for(const s of stores)await clearStore(s);
  for(const s of stores)if(Array.isArray(data.stores[s]))for(const item of data.stores[s])await saveItem(s,item);
  return true;
}
window.SigmaDB={initDB,getAll,saveItem,getItem,deleteItem,exportBackupJSON,importBackupJSON,stores};
})();