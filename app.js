const KEY="jintian-recipes-v1";
let recipes=JSON.parse(localStorage.getItem(KEY)||"[]");
let current=null;
const $=id=>document.getElementById(id);

function save(){localStorage.setItem(KEY,JSON.stringify(recipes));render()}
function render(){
 $("count").textContent=recipes.length;
 $("recent").textContent=recipes.filter(r=>r.lastPicked).length;
 const list=$("recipeList");
 if(!recipes.length){list.innerHTML='<div class="empty" style="grid-column:1/-1">还没有食谱<br>点击右上角「＋ 添加」开始吧</div>';return}
 list.innerHTML=recipes.map(r=>`<div class="card" data-id="${r.id}">
 ${r.image?`<img src="${r.image}">`:'<div class="placeholder">🍳</div>'}
 <div class="card-body"><h3>${esc(r.name)}</h3><p>${esc(r.category)} · ${r.minutes||"? "}分钟</p></div></div>`).join("");
 document.querySelectorAll(".card").forEach(c=>c.onclick=()=>showDetail(c.dataset.id));
}
function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function page(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
 document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===id));
}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>page(b.dataset.page));

$("drawBtn").onclick=draw;
$("againBtn").onclick=draw;
$("detailBtn").onclick=()=>current&&showDetail(current.id);
function draw(){
 if(!recipes.length){alert("请先添加至少一道食谱");page("recipes");return}
 $("dice").classList.add("rolling");$("drawBtn").disabled=true;
 const pool=recipes.length>2?recipes.filter(r=>!r.lastPicked):recipes;
 const chosen=pool[Math.floor(Math.random()*pool.length)]||recipes[0];
 setTimeout(()=>{
   recipes.forEach(r=>r.lastPicked=false);chosen.lastPicked=true;current=chosen;
   localStorage.setItem(KEY,JSON.stringify(recipes));
   $("dice").classList.remove("rolling");$("drawBtn").disabled=false;
   $("result").innerHTML=`<span>${esc(chosen.name)}</span>`;
   $("againBtn").classList.remove("hidden");$("detailBtn").classList.remove("hidden");
   render();
 },900);
}
function showDetail(id){
 current=recipes.find(r=>r.id===id); if(!current)return;
 const r=current;
 const ing=esc(r.ingredients||"").split("\n").filter(Boolean).map(x=>`<li>${x}</li>`).join("");
 const steps=esc(r.steps||"").split("\n").filter(Boolean).map(x=>`<li>${x.replace(/^\d+[.、]\s*/,"")}</li>`).join("");
 $("detailContent").innerHTML=`<div class="detail-card">
 ${r.image?`<img src="${r.image}">`:'<div class="placeholder" style="height:220px">🍳</div>'}
 <div class="detail-body"><h2>${esc(r.name)}</h2><span class="tag">${esc(r.category)} · ${r.minutes||"? "}分钟</span>
 <h3>食材</h3><ul>${ing||"<li>暂无</li>"}</ul>
 <h3>做法</h3><ol>${steps||"<li>暂无</li>"}</ol>
 <button class="secondary" id="deleteBtn" style="margin-top:15px">删除这道食谱</button></div></div>`;
 $("deleteBtn").onclick=()=>{if(confirm("确定删除这道食谱吗？")){recipes=recipes.filter(x=>x.id!==r.id);save();page("recipes")}};
 page("detail");
}
$("addBtn").onclick=()=>$("modal").classList.remove("hidden");
$("closeModal").onclick=()=>$("modal").classList.add("hidden");
$("saveBtn").onclick=()=>{
 const name=$("name").value.trim(); if(!name){alert("请填写菜名");return}
 const file=$("image").files[0];
 const finish=image=>{
  recipes.unshift({id:Date.now().toString(),name,category:$("category").value,minutes:$("minutes").value,ingredients:$("ingredients").value,steps:$("steps").value,image});
  save();$("modal").classList.add("hidden");
  ["name","minutes","ingredients","steps","image"].forEach(id=>$(id).value="");
 };
 if(file){const rd=new FileReader();rd.onload=e=>finish(e.target.result);rd.readAsDataURL(file)}else finish("");
};
render();
