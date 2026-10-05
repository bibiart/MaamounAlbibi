const stage=document.querySelector('.stage'),gallery=document.querySelector('#gallery');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,x=0,y=0,tx=0,ty=0,dustX=0,dustY=0,frame=0,pointerInside=false;
const pinkObjects=[...document.querySelectorAll(".object.pink")].map((node,i)=>({node,angle:0,direction:i===0?1:-1}));
function rotatePink(){
 const px=(tx/2+.5)*innerWidth,py=(ty/2+.5)*innerHeight;
 for(const item of pinkObjects){
  const r=item.node.getBoundingClientRect(),cx=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,cy=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2;
  const radius=Math.max(220,Math.min(innerWidth,innerHeight)*.4);
  const proximity=pointerInside?Math.max(0,1-Math.hypot(px-cx,py-cy)/radius):0;
  const target=item.direction*12*proximity;item.angle+=(target-item.angle)*.045;
  item.node.style.setProperty("--near-rotation",item.angle+"deg");
 }
}
function update(){document.body.classList.toggle('paused',paused);if(!paused&&!frame)frame=requestAnimationFrame(tick)}
function tick(){frame=0;if(paused)return;x+=(tx-x)*.06;y+=(ty-y)*.06;stage.style.setProperty('--mx',x);stage.style.setProperty('--my',y);dustX+=(tx-dustX)*.018;dustY+=(ty-dustY)*.024;stage.style.setProperty('--dust-x',dustX);stage.style.setProperty('--dust-y',dustY);rotatePink();frame=requestAnimationFrame(tick)}
stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointerInside=true;tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2});stage.addEventListener('pointerleave',()=>{pointerInside=false;tx=ty=0});document.querySelector('#demo').onclick=replayIntro;
gallery.querySelector('.close').onclick=()=>gallery.close();gallery.addEventListener('click',e=>{if(e.target===gallery){const b=gallery.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)gallery.close()}});
const fs=document.querySelector('#fullscreen');if(!document.fullscreenEnabled)fs.hidden=true;fs.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{fs.textContent='Full screen unavailable'}};document.addEventListener('fullscreenchange',()=>{fs.innerHTML=document.fullscreenElement?'Exit screen <span>↙</span>':'Full screen <span>↗</span>'});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else if(!paused&&!frame)frame=requestAnimationFrame(tick)});update();

document.addEventListener('dragstart',e=>{if(e.target.closest('.stage,.grid'))e.preventDefault()});

function replayIntro(){
 tx=ty=x=y=0;stage.style.setProperty('--mx',0);stage.style.setProperty('--my',0);
 const elements=[...document.querySelectorAll('.reveal,header,.hero h1,.hero p,.hero .cta,.hero .letter,.side,.go-original,.foot,.sound-toggle,.particles,.dots,.ambient-equalizer')];
 for(const el of elements)el.style.animation='none';
 void stage.offsetWidth;
 for(const el of elements)el.style.animation='';
 restartMeteor();
}
const dust=document.querySelector('.particles');
for(let i=0;i<64;i++){
 const node=document.createElement('span');node.className='particle-node';
 const p=document.createElement('span');p.className='particle';
 const sizes=[1.5,2,2.5,3,4,5];const size=sizes[i%6];
 const values={'--px':((i*37.31+11)%100)+'%','--py':((i*53.17+7)%100)+'%','--size':size+'px','--alpha':String(.48+(i%5)*.07),'--duration':(16+i%7*3)+'s','--delay':(-i*2)+'s','--pd':String(12+size*8),'--orbit-radius':(28+(i%8)*9)+'px','--orbit-time':(45+(i%9)*5)+'s','--orbit-direction':i%2?'reverse':'normal'};
 const angle=(i*137.5)*Math.PI/180,depth=16+(i%11)*5;values['--ax']=Math.cos(angle)*depth;values['--bx']=-Math.sin(angle)*depth;values['--ay']=Math.sin(angle)*depth;values['--by']=Math.cos(angle)*depth;
 for(const [key,value] of Object.entries(values))node.style.setProperty(key,value);
 const orbit=document.createElement('span');orbit.className='space-orbit';orbit.append(p);node.append(orbit);dust.append(node);
}
const soundButton=document.querySelector('#sound'),equalizer=document.querySelector('.ambient-equalizer');
const eqBars=Array.from({length:90},(_,i)=>{const bar=document.createElement('span');bar.className='eq-bar';bar.style.setProperty('--eq-duration',(1.2+(i*7%11)/10)+'s');bar.style.setProperty('--eq-delay',(-i*.21)+'s');equalizer.append(bar);return bar});




const soundtrack=new Audio('assets/soundtrack.mp3');soundtrack.loop=true;soundtrack.preload='none';soundtrack.volume=.55;
let audioContext,analyser,audioSource,soundOn=false,soundBusy=false,audioFrame=0;
const barLevels=new Float32Array(eqBars.length);let spectrum;
function updateSoundUI(){
 stage.classList.toggle('sound-playing',soundOn);soundButton.setAttribute('aria-pressed',String(soundOn));soundButton.setAttribute('aria-label',soundOn?'Pause soundtrack':'Play soundtrack');soundButton.querySelector('.sound-label').textContent=soundOn?'SOUND ON':'PLAY MUSIC';
}
function spectrumHeight(strength){
 const energy=Math.max(0,Math.min(1,(strength-.18)/.62));
 return .015+Math.pow(energy,2.2)*.985;
}
const musicStars=[...document.querySelectorAll('.particle-node')];
let starsReacting=false;
function resetMusicStars(){
 if(!starsReacting)return;starsReacting=false;dust.classList.remove('music-reacting');
 musicStars.forEach(node=>{node.style.setProperty('--star-beat',0);node.style.setProperty('--beat-x','0px');node.style.setProperty('--beat-y','0px')});
}
function updateMusicStars(){
 const duration=soundtrack.duration;
 if(!Number.isFinite(duration)||paused){resetMusicStars();return}
 const start=31,windowDuration=17,elapsed=soundtrack.currentTime-start;
 if(elapsed<0||elapsed>=windowDuration){resetMusicStars();return}
 starsReacting=true;dust.classList.add('music-reacting');
 const envelope=Math.min(1,elapsed/.5,(windowDuration-elapsed)/.5);
 musicStars.forEach((node,i)=>{
  const frequency=65*Math.pow(12,(i%13)/12),bin=Math.max(1,Math.round(frequency/audioContext.sampleRate*analyser.fftSize));
  const strength=(spectrum[bin]+spectrum[bin+1]+spectrum[bin+2])/765;
  const beat=spectrumHeight(strength)*envelope,angle=i*137.5*Math.PI/180;
  node.style.setProperty('--star-beat',beat);
  node.style.setProperty('--beat-x',(Math.cos(angle)*beat*(14+i%5*5))+'px');
  node.style.setProperty('--beat-y',(Math.sin(angle)*beat*(14+i%5*5))+'px');
 });
}
function drawSpectrum(){
 audioFrame=0;if(!soundOn||document.hidden)return;
 analyser.getByteFrequencyData(spectrum);updateMusicStars();
 eqBars.forEach((bar,i)=>{
  const frequency=55*Math.pow(140,i/(eqBars.length-1));const bin=Math.min(spectrum.length-4,Math.max(1,Math.round(frequency/audioContext.sampleRate*analyser.fftSize)));
  const strength=(spectrum[bin]+spectrum[bin+1]+spectrum[bin+2])/765;
  const target=spectrumHeight(strength);barLevels[i]+=(target-barLevels[i])*(target>barLevels[i]?.65:.32);bar.style.transform=`scaleY(${barLevels[i]})`;
 });
 audioFrame=requestAnimationFrame(drawSpectrum);
}
soundButton.onclick=async()=>{
 if(soundBusy)return;soundBusy=true;
 try{
  if(soundOn){soundtrack.pause();resetMusicStars();soundOn=false;cancelAnimationFrame(audioFrame);audioFrame=0;eqBars.forEach(bar=>bar.style.transform='')}
  else{
   const AudioEngine=window.AudioContext||window.webkitAudioContext;
   if(!audioContext&&AudioEngine){audioContext=new AudioEngine();analyser=audioContext.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=.2;audioSource=audioContext.createMediaElementSource(soundtrack);audioSource.connect(analyser);analyser.connect(audioContext.destination);spectrum=new Uint8Array(analyser.frequencyBinCount)}
   if(audioContext)await audioContext.resume();await soundtrack.play();soundOn=true;if(analyser)drawSpectrum();
  }
  updateSoundUI();
 }catch{soundOn=false;updateSoundUI();soundButton.querySelector('.sound-label').textContent='TRY MUSIC AGAIN'}finally{soundBusy=false}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(audioFrame);audioFrame=0}else if(soundOn&&analyser&&!audioFrame)drawSpectrum()});

(async()=>{
 const images=[...document.querySelectorAll('.art img')];
 const ready=Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
 await Promise.race([ready,new Promise(resolve=>setTimeout(resolve,4000))]);
 requestAnimationFrame(()=>requestAnimationFrame(()=>stage.classList.add('intro-ready')));
})();

const meteorElement=document.querySelector('.meteor');
const repelNodes=[...document.querySelectorAll('.particle-node')].map(node=>({node,dot:node.querySelector('.particle'),x:0,y:0}));
let meteorTimer=0,meteorFrame=0,meteorFlight=null,meteorCount=0;
function restartMeteor(){
 clearTimeout(meteorTimer);meteorFlight=null;meteorElement.style.opacity=0;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)meteorTimer=setTimeout(fireMeteor,3200);
}
function fireMeteor(){
 meteorTimer=setTimeout(fireMeteor,4000+Math.random()*1000);
 if(document.hidden)return;
 const size=meteorCount++%3,large=size===0,giant=size===2;
 meteorElement.classList.toggle('meteor-large',large);meteorElement.classList.toggle('meteor-small',size===1);meteorElement.classList.toggle('meteor-giant',giant);
 const w=stage.clientWidth,h=stage.clientHeight,left=Math.random()>.5;
 const startX=left?-100:w+100,endX=left?w+150:-150,startY=h*(.12+Math.random()*.35),endY=Math.min(h*.8,startY+h*(.18+Math.random()*.25));
 meteorFlight={start:performance.now(),radius:giant?280:large?190:100,force:giant?110:large?78:35,duration:750+Math.random()*180,startX,endX,startY,endY,angle:Math.atan2(endY-startY,endX-startX)*180/Math.PI};
 if(!meteorFrame)meteorFrame=requestAnimationFrame(animateMeteor);
}
function animateMeteor(now){
 meteorFrame=0;let mx=0,my=0,active=false;
 if(meteorFlight){
  const t=(now-meteorFlight.start)/meteorFlight.duration;
  if(t>=1){meteorFlight=null;meteorElement.style.opacity=0}
  else{active=true;mx=meteorFlight.startX+(meteorFlight.endX-meteorFlight.startX)*t;my=meteorFlight.startY+(meteorFlight.endY-meteorFlight.startY)*t;meteorElement.style.transform=`translate3d(${mx}px,${my}px,0) rotate(${meteorFlight.angle}deg)`;meteorElement.style.opacity=String(Math.min(1,t*8,(1-t)*8)*.8)}
 }
 let settling=false;const bounds=active?stage.getBoundingClientRect():null;
 for(const p of repelNodes){
  let targetX=0,targetY=0;
  if(active){const r=p.dot.getBoundingClientRect();const dx=r.left+r.width/2-bounds.left-p.x-mx,dy=r.top+r.height/2-bounds.top-p.y-my,d=Math.hypot(dx,dy);if(d<meteorFlight.radius){const force=meteorFlight.force*(1-d/meteorFlight.radius)**2;targetX=dx/Math.max(d,1)*force;targetY=dy/Math.max(d,1)*force}}
  p.x+=(targetX-p.x)*(active?.24:.06);p.y+=(targetY-p.y)*(active?.24:.06);
  if(Math.abs(p.x)+Math.abs(p.y)>.06)settling=true;else{p.x=0;p.y=0}
  p.node.style.setProperty('--repel-x',p.x+'px');p.node.style.setProperty('--repel-y',p.y+'px');
 }
 if(active||settling)meteorFrame=requestAnimationFrame(animateMeteor);
}
if(stage.classList.contains('intro-ready'))restartMeteor();else{const observer=new MutationObserver(()=>{if(stage.classList.contains('intro-ready')){observer.disconnect();restartMeteor()}});observer.observe(stage,{attributes:true,attributeFilter:['class']})}

const workDetails=document.getElementById('work-details');
for(const id of ['works','more','live-badge','go-live'])document.getElementById(id).onclick=()=>workDetails.showModal();
workDetails.querySelector('.close').onclick=()=>workDetails.close();
workDetails.addEventListener('click',e=>{if(e.target===workDetails){const b=workDetails.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)workDetails.close()}});

const linkDetails=document.getElementById('link-details');
document.getElementById('links').onclick=()=>linkDetails.showModal();
linkDetails.querySelector('.close').onclick=()=>linkDetails.close();
linkDetails.addEventListener('click',e=>{if(e.target===linkDetails){const b=linkDetails.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)linkDetails.close()}});

// Alternate the browser icon without changing the on-page artwork.
const brandFavicon=document.getElementById('brand-favicon');
let faviconTimer=0,faviconWhite=false;
function updateFavicon(){
 clearInterval(faviconTimer);faviconTimer=0;
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){brandFavicon.href='assets/b-icon-pink.svg';faviconWhite=false;return}
 faviconTimer=setInterval(()=>{faviconWhite=!faviconWhite;brandFavicon.href=faviconWhite?'assets/b-icon-white.svg':'assets/b-icon-pink.svg'},1800);
}
document.addEventListener('visibilitychange',updateFavicon);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',updateFavicon);
updateFavicon();
