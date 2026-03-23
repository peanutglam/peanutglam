let API ="https://script.google.com/macros/s/AKfycbybi0uJQF1NyMHnJ4H72QUz6rHqs1KDRgs4Oaj157jmGfsz_qYBHPAs4OpAmNnbHvr4/exec";

let products = [];
let headers = [];
let cart = [];
let suppliers = [];
let currentViewProducts = [];
let currentKeyword = "";
let currentSupplier = "";

let ordersData = [];
let orderKeyword = "";

const PRODUCT_LIMIT = 999999;
const ORDER_LIMIT = 999999;

let visibleColumns = [
"STT",
"Sản phẩm",
"Nhà cung cấp",
"Số lượng",
"Xuất",
"Tồn",
"Đơn giá VNĐ/ SP"
];

function fixProductText(text){
  if(!text) return "";

  return String(text)
    .replace(/\r?\n/g, " ")     // bỏ xuống dòng
    .replace(/\s+/g, " ")       // gom space
    .replace(/ ,/g, ",")        // fix lỗi dấu phẩy
    .trim();
}
function updatePreview(){
  let owner = document.getElementById("orderOwner")?.value || "";
  let name = document.getElementById("customerName")?.value || "";
  let phone = document.getElementById("customerPhone")?.value || "";

  // ===== LẤY ĐỊA CHỈ ĐÚNG CODE CỦA BẠN =====
  const provinceSelect=document.getElementById("province");
  const districtSelect=document.getElementById("district");
  
  const street=document.getElementById("street")?.value || "";

  const provinceText =
    provinceSelect && provinceSelect.value
    ? provinceSelect.options[provinceSelect.selectedIndex].text.trim()
    : "";

  const districtText =
    districtSelect && districtSelect.value
    ? districtSelect.options[districtSelect.selectedIndex].text.trim()
    : "";

  const address = [street,districtText,provinceText]
    .filter(v=>v && v.trim()!=="")
    .join(", ");

  // ===== GÁN PREVIEW =====
  document.getElementById("pvOwner").innerText = owner;
  document.getElementById("pvName").innerText = name;
  document.getElementById("pvPhone").innerText = phone;
  document.getElementById("pvAddress").innerText = address;

  let html = "";
  let total = 0;

  cart.forEach(item=>{

    let pname = item.product["Sản phẩm"] || "";
    let qty = Number(item.qty) || 0;
    let price = Number(item.price) || 0;

    let sum = qty * price;
    total += sum;

    html += `
      <tr>
        <td>${pname}</td>
        <td>${qty}</td>
        <td>${sum.toLocaleString("vi-VN")}đ</td>
      </tr>
    `;
  });

  document.getElementById("pvItems").innerHTML = html;
  document.getElementById("pvTotal").innerText = total.toLocaleString("vi-VN");
}
function renderInvoiceItems(){

let html="";
let total=0;

cart.forEach((item,index)=>{

let name=item.product["Sản phẩm"];
let qty=Number(item.qty);
let price=item.price;

let sum=qty*price;

total+=sum;

html+=`
<tr>
<td>${index+1}</td>
<td>${name}</td>
<td>${qty}</td>
<td>${price.toLocaleString("vi-VN")}</td>
<td>${sum.toLocaleString("vi-VN")}</td>
</tr>
`;

});

document.getElementById("invoiceItems").innerHTML=html;

document.getElementById("invoiceTotal").innerText=
total.toLocaleString("vi-VN")+" đ";

}
function parseDecimal(v){
  if(v===null||v===undefined) return "";
  let s=String(v).trim();

  // đổi 93,5 -> 93.5
  s=s.replace(",", ".");

  let n=parseFloat(s);

  if(isNaN(n)) return v;

  return n;
}

async function confirmSave(printInvoice){

const result = await Swal.fire({
title:"Xác nhận lưu đơn",
text:"Bạn có chắc muốn tạo đơn hàng này?",
icon:"question",
showCancelButton:true,
confirmButtonText:"Lưu đơn",
cancelButtonText:"Hủy",
confirmButtonColor:"#28a745",
cancelButtonColor:"#d33"
});

if(result.isConfirmed){
saveOrder(printInvoice);
}

}
function buildInvoice(order){

document.getElementById("invoiceCustomer").innerText = order.name || "";
document.getElementById("invoicePhone").innerText = order.phone || "";
document.getElementById("invoiceAddress").innerText = order.address || "";
document.getElementById("invoiceOwner").innerText = order.owner || "";
document.getElementById("invoiceDate").innerText = order.date || "";

let html="";
let total=0;

(order.items || []).forEach((item,index)=>{

let name=item.product["Sản phẩm"]||"";
let qty=Number(item.qty)||0;
let price=Number(item.price)||0;

let sum=qty*price;

total+=sum;

html+=`
<tr>
<td>${index+1}</td>
<td>${name}</td>
<td>${qty}</td>
<td>${price.toLocaleString("vi-VN")}</td>
<td>${sum.toLocaleString("vi-VN")}</td>
</tr>
`;

});

document.getElementById("invoiceItems").innerHTML=html;

document.getElementById("invoiceTotal").innerText=
total.toLocaleString("vi-VN")+" đ";

}

/* HELPERS */

function escapeHTML(str){
return String(str ?? "")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");
}

function cellText(value,className="text-1"){
const text=String(value ?? "");
return `<div class="${className}" title="${escapeHTML(text)}">${escapeHTML(text)}</div>`;
}

function formatDateDisplay(value){
if(!value) return "";

let s=String(value).trim();

if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
return s;
}

let d=new Date(s);
if(!isNaN(d.getTime())){
return d.toLocaleDateString("vi-VN");
}

return s;
}

/* LOAD PRODUCTS */

async function load(){

try{

let res=await fetch(API+"?sheet=products");
let data=await res.json();

if(!Array.isArray(data)){
console.error("Dữ liệu products không hợp lệ",data);
return;
}

products=data.filter(row=>{

let name=String(row["Sản phẩm"]||"").trim();
if(!name) return false;

let ton=Number(row["Tồn"]||0);

return ton>0;

});

if(products.length===0){
document.getElementById("thead").innerHTML="";
document.getElementById("table").innerHTML="";
return;
}

headers=Object.keys(products[0]);

renderHeader();
loadSuppliers();
applyFilters();

}catch(err){
console.error(err);
}

}

/* HEADER */

function renderHeader(){

let html="<tr>";

headers.forEach(h=>{
if(!visibleColumns.includes(h)) return;
html+=`<th>${escapeHTML(h)}</th>`;
});

html+="<th>Thêm</th></tr>";

document.getElementById("thead").innerHTML=html;

}

/* RENDER PRODUCTS */

function render(data){

currentViewProducts=data.slice(0,PRODUCT_LIMIT);

let html="";

currentViewProducts.forEach((p,index)=>{

html+="<tr>";

headers.forEach(h=>{

if(!visibleColumns.includes(h)) return;

let value=p[h]||"";   // <-- THIẾU DÒNG NÀY TRONG CODE CỦA BẠN

let cls="text-1";

if(h==="STT") cls="text-1 w-stt";
if(h==="Sản phẩm") cls="text-2 w-product";
if(h==="Nhà cung cấp") cls="text-1 w-supplier";

if(h==="Số lượng"||h==="Xuất"||h==="Tồn"){

cls="text-1 w-small";

/* xử lý số thập phân từ Google Sheet */

let num=parseDecimal(value);

if(num!==""){
value=Number(num).toLocaleString("vi-VN",{maximumFractionDigits:2});
}

}

if(h==="Đơn giá VNĐ/ SP") cls="text-1 w-price";

html+=`<td>${cellText(value,cls)}</td>`;

});

html+=`
<td class="text-center">
<button class="btn btn-success btn-sm" onclick="addToCartByIndex(${index})">
Thêm
</button>
</td>
`;

html+="</tr>";

});

document.getElementById("table").innerHTML=html;

}

function applyFilters(){

let keyword=currentKeyword.toLowerCase().trim();

let filtered=products.filter(p=>{

let matchKeyword=keyword===""||
JSON.stringify(p).toLowerCase().includes(keyword);

let matchSupplier=currentSupplier===""||
String(p["Nhà cung cấp"]||"")===currentSupplier;

return matchKeyword&&matchSupplier;

});

render(filtered);

}

/* SEARCH */

function search(k){
currentKeyword=k||"";
applyFilters();
}

/* SUPPLIERS */

function loadSuppliers(){

let set=new Set();

products.forEach(p=>{
if(p["Nhà cung cấp"]){
set.add(p["Nhà cung cấp"]);
}
});

suppliers=[...set];

let html="<option value=''>Tất cả nhà cung cấp</option>";

suppliers.forEach(s=>{
html+=`<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`;
});

document.getElementById("supplierFilter").innerHTML=html;

}

function filterSupplier(name){
currentSupplier=name||"";
applyFilters();
}

/* CART */

function addToCartByIndex(index){

const p=currentViewProducts[index];
if(!p) return;

let qty=window.prompt("Nhập số lượng ");

if(qty===null) return;

qty=parseFloat(qty);

if(isNaN(qty)||qty<=0){
alert("Số lượng không hợp lệ");
return;
}



let price=parseFloat(
(p["Đơn giá VNĐ/ SP"]||0)
.toString()
.replace(/[^\d]/g,"")
);

cart.push({
product:p,
qty:qty,
price:price
});


renderCart();
updatePreview();
}

function renderCart(){

let html="";

cart.forEach((c,i)=>{

html+=`
<tr>
<td>${cellText(c.product["Sản phẩm"],"text-2 w-product")}</td>
<td>${cellText(c.qty,"text-1 w-small")}</td>
<td>${cellText(c.price.toLocaleString("vi-VN")+" đ","text-1 w-price")}</td>
<td class="text-center">
<button class="btn btn-danger btn-sm" onclick="removeCart(${i})">X</button>
</td>
</tr>
`;

});

document.getElementById("cart").innerHTML=html;
updatePreview();
}

function removeCart(i){
cart.splice(i,1);
renderCart();
updatePreview(); // thêm
}
/* LOAD PROVINCES */

async function loadProvinces(){

const provinceEl=document.getElementById("province");
const districtEl=document.getElementById("district");

if(!provinceEl) return;

provinceEl.innerHTML="<option value=''>Đang tải tỉnh / thành...</option>";

try{

const res=await fetch("https://provinces.open-api.vn/api/?depth=1");
const data=await res.json();

let html="<option value=''>Chọn tỉnh / thành</option>";

data.forEach(p=>{
html+=`<option value="${p.code}">${p.name}</option>`;
});

provinceEl.innerHTML=html;

}catch(err){

console.error("Lỗi loadProvinces",err);
provinceEl.innerHTML="<option value=''>Không tải được tỉnh</option>";

}

}

/* LOAD DISTRICTS */

async function loadDistricts(code){

const districtEl=document.getElementById("district");

if(!districtEl) return;

if(!code){
districtEl.innerHTML="<option value=''>Chọn quận / huyện</option>";
districtEl.disabled=true;
return;
}

districtEl.innerHTML="<option>Đang tải...</option>";

try{

const res=await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
const data=await res.json();

let html="<option value=''>Chọn quận / huyện</option>";

data.districts.forEach(d=>{
html+=`<option value="${d.name}">${d.name}</option>`;
});

districtEl.innerHTML=html;
districtEl.disabled=false;

}catch(err){

console.error("Lỗi loadDistricts",err);
districtEl.innerHTML="<option>Không tải được quận</option>";

}

}
/* LOAD ORDERS */

async function loadOrders(){

try{

let res=await fetch(API+"?sheet=orders");
let data=await res.json();

if(!Array.isArray(data)){
console.error("Dữ liệu orders không hợp lệ",data);
return;
}

ordersData=data;

renderOrders(data);

}catch(err){
console.error(err);
}

}

/* RENDER ORDERS */

function renderOrders(data){

data=data
.filter(o=>{
let stt=String(o["STT"]||"").trim();
let name=String(o["Tên + IG"]||"").trim();
return stt!==""&&name!=="";
})
.reverse()
.slice(0,ORDER_LIMIT);

let html="";

data.forEach(o=>{

let stt=o["STT"]||"";
let name=o["Tên + IG"]||"";
let owner=o["TK nhận đơn"]||"";
let raw = fixProductText(o["SP"] || "");
// tách sản phẩm chuẩn hơn
let sp = raw
  .split(/,|\|/)                // tách theo , hoặc |
  .map(s => s.trim())
  .filter(s => s !== "")
  .join("<br>");
let date=formatDateDisplay(o["Ngày"]||"");
let phone=o["SĐT"]||"";
let qty=o["Số lượng"]||"";
let address=o["Địa chỉ"]||"";
let bill=o["Bill"]||"";

let billValue=Number(
String(bill||0).replace(/[^\d]/g,"")
);

if(isNaN(billValue)) billValue=0;

let billText=billValue.toLocaleString("vi-VN")+" đ";

html+=`
<tr>

<td class="text-center">
<input type="checkbox" class="orderCheck" value="${stt}">
</td>

<td>${cellText(stt,"text-1 w-stt")}</td>
<td>${cellText(name,"text-2 w-name")}</td>
<td>${cellText(owner,"text-1 w-supplier")}</td>
<td><div class="text-2 w-sp">${sp}</div></td>
<td>${cellText(date,"text-1")}</td>
<td>${cellText(phone,"text-1 w-phone")}</td>
<td>${cellText(qty,"text-1 w-small")}</td>
<td>${cellText(address,"text-2 w-address")}</td>
<td>${cellText(billText,"text-1 w-price")}</td>

</tr>
`;

});

document.getElementById("orders").innerHTML=html;

}

/* SEARCH ORDERS */

function searchOrders(keyword){

orderKeyword=(keyword||"").toLowerCase().trim();

if(!Array.isArray(ordersData)) return;

let filtered=ordersData.filter(o=>{

let name=String(o["Tên + IG"]||"").toLowerCase();

return orderKeyword===""||name.includes(orderKeyword);

});

renderOrders(filtered);

}

/* CHECKOUT */

async function saveOrder(printInvoice){
const saveBtn = document.getElementById("saveBtn");
const printBtn = document.getElementById("printBtn");

if(saveBtn) saveBtn.innerHTML="⏳ Đang xử lý...";
if(printBtn) printBtn.innerHTML="⏳ Đang xử lý...";

if(saveBtn) saveBtn.disabled=true;
if(printBtn) printBtn.disabled=true;
if(!Array.isArray(cart)||cart.length===0){
alert("Chưa có sản phẩm trong giỏ hàng");
return;
}

const name=document.getElementById("customerName").value.trim();
const phone=document.getElementById("customerPhone").value.trim();
const owner=document.getElementById("orderOwner").value.trim();

const provinceSelect=document.getElementById("province");
const districtSelect=document.getElementById("district");
const street=document.getElementById("street").value.trim();

const provinceText=
provinceSelect&&provinceSelect.value
?provinceSelect.options[provinceSelect.selectedIndex].text.trim()
:"";

const districtText=
districtSelect&&districtSelect.value
?districtSelect.options[districtSelect.selectedIndex].text.trim()
:"";

if(!name||!phone){
alert("Vui lòng nhập tên khách và số điện thoại");
return;
}

const address=[street,districtText,provinceText]
.filter(v=>v&&v.trim()!=="")
.join(", ");

if(!address){
alert("Vui lòng nhập địa chỉ");
return;
}


const items=cart.map(i=>({
product:i.product,
qty:parseFloat(i.qty)||0,
price:Number(i.price)||0
}));


const order={
customer:name,
owner:owner,
phone:phone,
address:address,
items:items
};

try{

const res=await fetch(API,{
method:"POST",
headers:{
"Content-Type":"application/x-www-form-urlencoded"
},
body:"data="+encodeURIComponent(JSON.stringify(order))
});

await res.text();

Swal.fire({
title:"Lưu đơn thành công",
text:"Đơn hàng đã được tạo và lưu vào hệ thống",
icon:"success",
confirmButtonText:"OK",
confirmButtonColor:"#28a745"
});

buildInvoice({
name:name,
phone:phone,
owner:owner,
address:address,
date:new Date().toLocaleString("vi-VN"),
items:items
});

/* HIỂN THỊ HÓA ĐƠN */

let invoice=document.getElementById("printInvoice");
if(invoice){
invoice.style.display="block";
}

if(printInvoice){
setTimeout(()=>{
window.print();
},300);
}

cart=[];
renderCart();

document.getElementById("customerName").value="";
document.getElementById("customerPhone").value="";
document.getElementById("street").value="";
if(saveBtn) {
saveBtn.innerHTML="Lưu đơn hàng";
saveBtn.disabled=false;
}

if(printBtn) {
printBtn.innerHTML="Lưu & In hóa đơn";
printBtn.disabled=false;
}
await loadOrders();
await load();

}catch(err){

console.error(err);
alert("Lỗi khi lưu đơn");

}

}
/* =========================
   CHỌN TẤT CẢ ĐƠN
========================= */

function toggleAllOrders(master){

document
.querySelectorAll(".orderCheck")
.forEach(cb=>{
cb.checked = master.checked;
});

}

/* =========================
   XÓA NHIỀU ĐƠN
========================= */

async function deleteSelectedOrders(){

let checked = [
...document.querySelectorAll(".orderCheck:checked")
];

if(checked.length===0){
Swal.fire({
icon:"warning",
title:"Chưa chọn đơn nào"
});
return;
}

let ids = checked.map(c=>c.value);

const confirm = await Swal.fire({
title:"Xóa đơn hàng?",
text:"Bạn chắc chắn muốn xóa các đơn đã chọn?",
icon:"warning",
showCancelButton:true,
confirmButtonText:"Xóa",
cancelButtonText:"Hủy",
confirmButtonColor:"#d33"
});

if(!confirm.isConfirmed) return;

try{

await fetch(API,{
method:"POST",
headers:{
"Content-Type":"application/x-www-form-urlencoded"
},
body:"deleteOrders="+encodeURIComponent(JSON.stringify(ids))
});

Swal.fire({
icon:"success",
title:"Đã xóa đơn"
});

loadOrders();

}catch(err){

console.error(err);

Swal.fire({
icon:"error",
title:"Lỗi khi xóa đơn"
});

}

}
/* INIT */

window.addEventListener("DOMContentLoaded",()=>{
load();
loadOrders();
loadProvinces();
});