const nb=document.getElementById("notice");
try{ if(localStorage.getItem("noticeX")) nb.hidden=true; }catch(e){}
document.getElementById("noticeX").addEventListener("click",()=>{ nb.hidden=true; try{ localStorage.setItem("noticeX","1"); }catch(e){} });

const root=document.documentElement, tbtn=document.getElementById("theme");
function isDark(){
  const t=root.getAttribute("data-theme");
  return t ? t==="dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}
let saved=null; try{ saved=localStorage.getItem("theme"); }catch(e){}
if(saved) root.setAttribute("data-theme",saved);
else { const h=new Date().getHours(); root.setAttribute("data-theme",(h>=19||h<6)?"dark":"light"); }
tbtn.addEventListener("click",()=>{
  const next=isDark()?"light":"dark";
  root.setAttribute("data-theme",next);
  try{ localStorage.setItem("theme",next); }catch(e){}
  });

(function(){const lb=document.getElementById("lb"),im=lb.querySelector("img");let list=[],i=0;
function open(k){i=(k+list.length)%list.length;im.src=list[i].src;im.alt=list[i].alt;lb.classList.add("on");}
document.addEventListener("click",e=>{const f=e.target.closest(".gal figure");if(f){list=[...f.parentNode.querySelectorAll("img")];open([...f.parentNode.children].indexOf(f));return;}
if(!lb.classList.contains("on"))return;
if(e.target.closest(".p"))open(i+1);else if(e.target.closest(".n"))open(i-1);else lb.classList.remove("on");});
document.addEventListener("keydown",e=>{if(!lb.classList.contains("on"))return;if(e.key==="Escape")lb.classList.remove("on");if(e.key==="ArrowLeft")open(i+1);if(e.key==="ArrowRight")open(i-1);});})();

document.addEventListener("click",async e=>{const b=e.target.closest("#copy");if(!b)return;try{await navigator.clipboard.writeText(b.dataset.url||location.href);b.textContent="تم النسخ";setTimeout(()=>b.textContent="نسخ الرابط",1800);}catch(_){b.textContent="انسخه من شريط العنوان";}});
