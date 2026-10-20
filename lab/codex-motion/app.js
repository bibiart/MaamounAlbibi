// Keep header and footer inside the visible viewport as tablet browser chrome changes.
function syncVisibleViewport(){
 const viewport=window.visualViewport;
 if(viewport && Math.abs(viewport.scale-1)>.01)return;
 const fullscreen=!!document.fullscreenElement;
 const height=fullscreen?window.innerHeight:(viewport?.height||window.innerHeight);
 const top=fullscreen?0:(viewport?.offsetTop||0);
 document.documentElement.style.setProperty('--viewport-height',height+'px');
 document.documentElement.style.setProperty('--viewport-top',top+'px');
}
syncVisibleViewport();
window.addEventListener('resize',syncVisibleViewport);
window.addEventListener('pageshow',syncVisibleViewport);
document.addEventListener('fullscreenchange',syncVisibleViewport);
window.visualViewport?.addEventListener('resize',syncVisibleViewport);
window.visualViewport?.addEventListener('scroll',syncVisibleViewport);

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
 const elements=[...document.querySelectorAll('.reveal,header,.hero h1,.hero p,.hero .cta,.hero .letter,.side span,.go-original,.foot,.sound-toggle,.particles,.dots,.ambient-equalizer')];
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

// Browser B follows the music palette while retaining the gentle white pulse.
const brandFavicon=document.getElementById('brand-favicon');
const faviconTemplate="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg id=\"Layer_2\" data-name=\"Layer 2\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 241.65 243.01\">\n  <g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path fill=\"#c01e75\" d=\"M227.08,143.57c30.98,36.62,9.57,87.9-35.97,97.1-8.19,1.84-16.34,2.43-24.59,2.33-13.52.02-35.87-.14-57.42-.15-30.7-.01-59.52-.32-89.98-.23-11.76.25-18.14-4.77-18.68-16.44-.88-51.03-.03-143.04-.37-189.58C.22,26.82-.53,14.75.87,6.06,1.38,2.07,4.21-.29,8.36.03c25.68.11,121.45.19,168.1.33,15.1-.72,29.66,4.19,41.85,13.18,25.34,18.59,30.63,59.51,10.02,84.34-6.87,9.04-16.93,13.53-26,19.54-8,6.44,6.8,10.9,11.96,14.92,4.71,3.09,8.98,6.79,12.66,11.07l.13.15Z\"/>\n  </g>\n</svg>";
let faviconTimer=0,faviconWhite=false,faviconColor='rgb(192,30,117)',faviconKey='',faviconUpdated=0;
function renderFavicon(force=false){
 const color=faviconWhite?'#ffffff':faviconColor;
 if(color===faviconKey||(!force&&performance.now()-faviconUpdated<180))return;
 faviconKey=color;faviconUpdated=performance.now();
 brandFavicon.href='data:image/svg+xml,'+encodeURIComponent(faviconTemplate.replace('#c01e75',color));
}
function updateFavicon(){
 clearInterval(faviconTimer);faviconTimer=0;
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){faviconWhite=false;renderFavicon(true);return}
 renderFavicon(true);
 faviconTimer=setInterval(()=>{faviconWhite=!faviconWhite;renderFavicon(true)},1800);
}
document.addEventListener('visibilitychange',updateFavicon);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',updateFavicon);
updateFavicon();

// Divide the soundtrack into equal pink, green and orange chapters.
const musicPalettes=[
 {rgb:[192,30,117],matrix:[1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0]},
 {rgb:[104,184,43],matrix:[0,0,1,0,0, 1,0,0,0,0, 0,1,0,0,0, 0,0,0,1,0]},
 {rgb:[240,132,40],matrix:[1,0,0,0,0, 0,0,1,0,0, 0,1,0,0,0, 0,0,0,1,0]}
];
function paletteAt(time,duration){
 if(!Number.isFinite(duration)||duration<=0)return {from:0,to:0,mix:0};
 const fade=Math.min(3,duration/12);
 for(let i=1;i<3;i++){
  const boundary=duration*i/3;
  if(time<boundary-fade/2)return {from:i-1,to:i-1,mix:0};
  if(time<boundary+fade/2){const t=(time-boundary+fade/2)/fade;return {from:i-1,to:i,mix:t*t*(3-2*t)}}
 }
 return {from:2,to:2,mix:0};
}
let paletteFrame=0;
function updateMusicPalette(){
 const {from,to,mix}=paletteAt(soundtrack.currentTime,soundtrack.duration);
 const a=musicPalettes[from],b=musicPalettes[to];
 const lerp=(x,y)=>x+(y-x)*mix;
 const rgb=a.rgb.map((v,i)=>Math.round(lerp(v,b.rgb[i])));
 document.documentElement.style.setProperty('--accent-rgb',rgb.join(' '));
 faviconColor='rgb('+rgb.join(',')+')';renderFavicon();
 document.getElementById('music-color-matrix').setAttribute('values',a.matrix.map((v,i)=>lerp(v,b.matrix[i]).toFixed(5)).join(' '));
 document.getElementById('music-saturation').setAttribute('values',(1-.04*(from===0?mix:1)).toFixed(4));
}
function animateMusicPalette(){paletteFrame=0;updateMusicPalette();if(!soundtrack.paused&&!document.hidden)paletteFrame=requestAnimationFrame(animateMusicPalette)}
soundtrack.addEventListener('play',()=>{if(!paletteFrame)animateMusicPalette()});
soundtrack.addEventListener('pause',()=>{cancelAnimationFrame(paletteFrame);paletteFrame=0;updateMusicPalette()});
for(const event of ['loadedmetadata','durationchange','seeked','timeupdate','ended'])soundtrack.addEventListener(event,updateMusicPalette);
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(paletteFrame);paletteFrame=0;if(!document.hidden)animateMusicPalette()});
updateMusicPalette();


// v27: smooth local liquid distortion, plus independent expanding click waves.
function waterVector(dx,dy,radius,phase,strength,dragX,dragY){
 const distance=Math.hypot(dx,dy),r=distance/radius;
 if(r>=1||strength<=0)return [0,0];
 const falloff=(1-r*r)**2;
 const wave=Math.sin(r*8-phase)*.38*falloff*strength;
 return [(distance?dx/distance:0)*wave+dragX*.10*falloff*strength,
         (distance?dy/distance:0)*wave+dragY*.10*falloff*strength];
}
function clickWaveVector(dx,dy,age){
 const duration=1800,t=age/duration;
 if(t<0||t>=1)return [0,0];
 const distance=Math.hypot(dx,dy),radius=12+360*t,width=30+18*t,q=(distance-radius)/width;
 if(Math.abs(q)>3||distance<.01)return [0,0];
 const wave=q*Math.exp(-q*q)*.78*(1-t)**1.3;
 return [dx/distance*wave,dy/distance*wave];
}
(()=>{
 const art=document.querySelector('.art'),map=document.getElementById('water-map'),filter=document.getElementById('pointer-water');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(any-pointer: fine)');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!art||!map||!filter||!ctx)return;
 let raf=0,lastFrame=0,lastMove=0,lastPointer=0,lastX=0,lastY=0,tx=0,ty=0,cx=0,cy=0,strength=0,energy=0;
 let dragX=0,dragY=0,targetDragX=0,targetDragY=0,phase=0,ready=false,box,pixels,fieldX,fieldY;
 const ripples=[];
 const enabled=()=>fine.matches&&!reduced.matches&&!document.hidden;
 function stop(){cancelAnimationFrame(raf);raf=0;strength=energy=0;ready=false;dragX=dragY=targetDragX=targetDragY=0;ripples.length=0;art.classList.remove('water-active')}
 function configure(){
  box=stage.getBoundingClientRect();if(!box.width||!box.height)return false;
  canvas.width=320;canvas.height=Math.max(64,Math.min(400,Math.round(320*box.height/box.width)));
  pixels=ctx.createImageData(canvas.width,canvas.height);fieldX=new Float32Array(canvas.width*canvas.height);fieldY=new Float32Array(fieldX.length);
  filter.setAttribute('width',box.width);filter.setAttribute('height',box.height);
  map.setAttribute('width',box.width);map.setAttribute('height',box.height);return true;
 }
 function start(){if(!raf&&enabled()&&configure()){lastFrame=performance.now();raf=requestAnimationFrame(draw)}}
 function addField(x,y,radius,vector){
  const sx=box.width/canvas.width,sy=box.height/canvas.height;
  const x0=Math.max(0,Math.floor((x-radius)/sx)),x1=Math.min(canvas.width-1,Math.ceil((x+radius)/sx));
  const y0=Math.max(0,Math.floor((y-radius)/sy)),y1=Math.min(canvas.height-1,Math.ceil((y+radius)/sy));
  for(let py=y0;py<=y1;py++)for(let px=x0;px<=x1;px++){
   const v=vector((px+.5)*sx-x,(py+.5)*sy-y),i=py*canvas.width+px;
   fieldX[i]+=v[0];fieldY[i]+=v[1];
  }
 }
 function draw(now){
  raf=0;if(!enabled()){stop();return}
  const dt=Math.min(.05,Math.max(.001,(now-lastFrame)/1000));lastFrame=now;phase+=dt*.8;
  const smoothing=1-Math.exp(-dt*9),directionSmoothing=1-Math.exp(-dt*5);
  cx+=(tx-cx)*smoothing;cy+=(ty-cy)*smoothing;
  dragX+=(targetDragX-dragX)*directionSmoothing;dragY+=(targetDragY-dragY)*directionSmoothing;
  energy*=Math.exp(-dt*1.8);strength+=(energy-strength)*(1-Math.exp(-dt*7));
  while(ripples.length&&now-ripples[0].start>=1800)ripples.shift();
  if(now-lastMove>2800&&strength<.006&&!ripples.length){stop();return}
  fieldX.fill(0);fieldY.fill(0);
  const radius=Math.min(285,Math.max(180,box.width*.15));
  if(strength>.001)addField(cx,cy,radius,(dx,dy)=>waterVector(dx,dy,radius,phase,strength,dragX,dragY));
  for(const ripple of ripples){const age=now-ripple.start;addField(ripple.x,ripple.y,12+360*age/1800+150,(dx,dy)=>clickWaveVector(dx,dy,age))}
  const data=pixels.data;
  for(let i=0;i<fieldX.length;i++){
   const k=i*4;data[k]=Math.round(127.5+Math.max(-.48,Math.min(.48,fieldX[i]))*255);
   data[k+1]=Math.round(127.5+Math.max(-.48,Math.min(.48,fieldY[i]))*255);data[k+2]=128;data[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);map.setAttribute('href',canvas.toDataURL('image/png'));art.classList.add('water-active');
  raf=requestAnimationFrame(draw);
 }
 stage.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||!enabled())return;
  const bounds=stage.getBoundingClientRect(),now=performance.now();tx=event.clientX-bounds.left;ty=event.clientY-bounds.top;
  if(!ready){cx=tx;cy=ty;lastX=tx;lastY=ty;lastPointer=now;ready=true}
  const dx=tx-lastX,dy=ty-lastY,distance=Math.hypot(dx,dy),length=Math.max(1,distance);
  const speed=distance/Math.max(8,now-lastPointer)*16.67;
  if(distance>.4){targetDragX=dx/length;targetDragY=dy/length}
  energy=Math.max(energy,Math.min(1,.35+speed*.07));
  lastX=tx;lastY=ty;lastPointer=now;lastMove=now;start();
 },{passive:true});
 stage.addEventListener('click',event=>{
  if(!enabled()||event.detail===0||event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents)return;
  const bounds=stage.getBoundingClientRect(),now=performance.now();
  ripples.push({x:event.clientX-bounds.left,y:event.clientY-bounds.top,start:now});
  if(ripples.length>4)ripples.shift();lastMove=now;start();
 },{passive:true});
 stage.addEventListener('pointerleave',()=>{energy=0;targetDragX=targetDragY=0});
 window.addEventListener('blur',stop);window.addEventListener('resize',stop);
 document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);fine.addEventListener('change',stop);
})();
