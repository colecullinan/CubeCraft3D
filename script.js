import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const palette = ['#e58a69','#809b83','#d8b45e','#718ba2','#bb8eaa','#8b9b9a','#d08168','#8295b4'];
const difficultyInfo = {
  easy: { label: 'Easy', groups: n => Math.max(2, Math.ceil(n ** 3 / 8)), hint: 'Fewer, larger color groups make a gentler challenge.' },
  balanced: { label: 'Balanced', groups: n => Math.max(3, Math.round(n ** 3 / 4.5)), hint: 'A balanced mix of piece shapes to explore.' },
  hard: { label: 'Hard', groups: n => Math.max(4, Math.round(n ** 3 / 2.4)), hint: 'More, smaller groups create a trickier visual challenge.' }
};
const $ = id => document.getElementById(id);
const sizeInput = $('gridSize'), pieceInput = $('pieceSize');
const wrap = $('canvasWrap');
const themeMoon = $('themeMoon'), themeSun = $('themeSun');
const initialTheme = localStorage.getItem('cubecraft-theme') === 'dark' ? 'dark' : 'light';
document.documentElement.dataset.theme = initialTheme;
function updateThemeButtons(theme) {
  const dark = theme === 'dark';
  themeMoon.setAttribute('aria-pressed', String(dark));
  themeSun.setAttribute('aria-pressed', String(!dark));
}
updateThemeButtons(initialTheme);
const scene = new THREE.Scene();
scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
const camera = new THREE.PerspectiveCamera(34, 1, .1, 2000); camera.position.set(100, 100, 130);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .07; controls.target.set(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9b9a8c, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2); keyLight.position.set(80, 120, 100); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffe0c5, .8); fillLight.position.set(-80, 30, -60); scene.add(fillLight);
const puzzleRoot = new THREE.Group(); scene.add(puzzleRoot);
let pieceGroups = [], currentDifficulty = 'balanced', currentGrid = 3, currentPiece = 15;
let seed = 12291;
function random(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

function makeAssignments(n, count) {
  const cells = []; for(let x=0;x<n;x++) for(let y=0;y<n;y++) for(let z=0;z<n;z++) cells.push({x,y,z});
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  const labels = new Map(); let remaining = cells.slice(), group=0;
  while(remaining.length && group<count){
    const target = Math.ceil(remaining.length/(count-group));
    let frontier=[remaining.splice(Math.floor(random()*remaining.length),1)[0]], selected=[];
    while(frontier.length && selected.length<target){
      const cell=frontier.pop(); const key=`${cell.x},${cell.y},${cell.z}`; if(labels.has(key)) continue;
      labels.set(key,group); selected.push(cell);
      const neighbors=[];
      for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
        const nx=cell.x+dx,ny=cell.y+dy,nz=cell.z+dz;
        const ix=remaining.findIndex(c=>c.x===nx&&c.y===ny&&c.z===nz); if(ix>=0) neighbors.push(remaining.splice(ix,1)[0]);
      }
      for(let i=neighbors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[neighbors[i],neighbors[j]]=[neighbors[j],neighbors[i]];} frontier.push(...neighbors);
    }
    group++;
  }
  remaining.forEach(c=>labels.set(`${c.x},${c.y},${c.z}`,group-1)); return labels;
}

function makePieceGeometry(cells, labels, pieceIndex, n, unit, clearance=0.3) {
  const positions=[];
  const faces=[
    {d:[1,0,0],c:[[0,-1,-1],[0,1,-1],[0,1,1],[0,-1,1]]},
    {d:[-1,0,0],c:[[0,-1,1],[0,1,1],[0,1,-1],[0,-1,-1]]},
    {d:[0,1,0],c:[[-1,0,1],[1,0,1],[1,0,-1],[-1,0,-1]]},
    {d:[0,-1,0],c:[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]]},
    {d:[0,0,1],c:[[1,-1,0],[1,1,0],[-1,1,0],[-1,-1,0]]},
    {d:[0,0,-1],c:[[-1,-1,0],[-1,1,0],[1,1,0],[1,-1,0]]}
  ];
  const inside=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n;
  const addTri=(a,b,c)=>positions.push(...a,...b,...c);
  for(const [x,y,z] of cells){
    const center=[(x-(n-1)/2)*unit,(y-(n-1)/2)*unit,(z-(n-1)/2)*unit];
    for(const face of faces){
      const [dx,dy,dz]=face.d,nx=x+dx,ny=y+dy,nz=z+dz;
      if(inside(nx,ny,nz)&&labels.get(`${nx},${ny},${nz}`)===pieceIndex) continue;
      const isInternalFace=inside(nx,ny,nz),axis=dx?0:dy?1:2;
      const plane=center[axis]+face.d[axis]*(unit/2-(isInternalFace?clearance/2:0));
      const pts=face.c.map(c=>{const p=[center[0]+c[0]*unit/2,center[1]+c[1]*unit/2,center[2]+c[2]*unit/2];p[axis]=plane;return p;});
      addTri(pts[0],pts[1],pts[2]);addTri(pts[0],pts[2],pts[3]);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
function rebuild(){
  currentGrid=Number(sizeInput.value); currentPiece=Number(pieceInput.value); const total=currentGrid**3;
  const groupCount=Math.min(total,difficultyInfo[currentDifficulty].groups(currentGrid)); seed=(Date.now() ^ (currentGrid*7919) ^ (groupCount*131))>>>0;
  while(puzzleRoot.children.length){const obj=puzzleRoot.children[0]; puzzleRoot.remove(obj); obj.geometry?.dispose(); if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material?.dispose();}
  const assignments=makeAssignments(currentGrid,groupCount), unit=currentPiece, gap=unit*.035, block=unit-gap, start=-(currentGrid-1)*unit/2;
  const geometry=new THREE.BoxGeometry(block,block,block);
  // One instanced mesh per group keeps the preview responsive at larger sizes.
  const cellsByGroup=Array.from({length:groupCount},()=>[]);
  assignments.forEach((label,key)=>{const [x,y,z]=key.split(',').map(Number);cellsByGroup[label].push([x,y,z]);});
  pieceGroups=cellsByGroup.map((cells,i)=>{
    const group=new THREE.Group();group.name=`piece-${i+1}`;group.userData.cells=cells;
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:palette[i%palette.length],roughness:.53,metalness:0}),cells.length);
    const dummy=new THREE.Object3D(); cells.forEach(([x,y,z],index)=>{dummy.position.set(start+x*unit,start+y*unit,start+z*unit);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;group.add(mesh);puzzleRoot.add(group);return group;
  });
  const extent=currentGrid*unit; camera.position.set(extent*1.75,extent*1.55,extent*2.15);camera.near=.1;camera.far=extent*20;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();
  $('sizeValue').textContent=`${currentGrid} × ${currentGrid} × ${currentGrid}`; $('pieceValue').textContent=currentPiece;
  $('summaryTitle').textContent=`${currentGrid} × ${currentGrid} × ${currentGrid} puzzle`; $('summaryText').textContent=`${total} blocks · ${groupCount} color groups · ${extent} mm across`;
  $('dimensions').textContent=`${extent} × ${extent} × ${extent} mm`; $('previewCount').innerHTML=`${String(groupCount).padStart(2,'0')} <span>PIECES</span>`;
  $('legend').innerHTML=pieceGroups.map((_,i)=>`<span class="legend-item"><i class="legend-swatch" style="background:${palette[i%palette.length]}"></i>Piece ${i+1}</span>`).join('');
  const sliderFill=((currentGrid-2)/3)*100; sizeInput.style.background=`linear-gradient(90deg,var(--green) 0 ${sliderFill}%,var(--slider-track) ${sliderFill}% 100%)`;
  const sizeFill=((currentPiece-8)/22)*100; pieceInput.style.background=`linear-gradient(90deg,var(--green) 0 ${sizeFill}%,var(--slider-track) ${sizeFill}% 100%)`;
}

function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(wrap); resize(); rebuild(); $('loading').remove();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);} animate();
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('cubecraft-theme', theme);
  scene.background.set(getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1c1e1b' : '#f7f6f1';
  updateThemeButtons(theme);
}
themeMoon.addEventListener('click',()=>setTheme('dark'));
themeSun.addEventListener('click',()=>setTheme('light'));
sizeInput.addEventListener('input',rebuild); pieceInput.addEventListener('input',rebuild);
document.querySelectorAll('[data-difficulty]').forEach(button=>button.addEventListener('click',()=>{currentDifficulty=button.dataset.difficulty;document.querySelectorAll('[data-difficulty]').forEach(b=>b.classList.toggle('selected',b===button));$('difficultyValue').textContent=difficultyInfo[currentDifficulty].label;$('difficultyHint').textContent=difficultyInfo[currentDifficulty].hint;rebuild();}));
$('generateButton').addEventListener('click',()=>{rebuild();$('downloadButton').click();$('generateButton').animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{duration:180});});
$('resetView').addEventListener('click',()=>{const extent=currentGrid*currentPiece;camera.position.set(extent*1.75,extent*1.55,extent*2.15);controls.target.set(0,0,0);controls.update();});

function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function zipStore(files){
  const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
  const crcTable=zipStore.crc||(zipStore.crc=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})());
  const crc32=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  for(const file of files){const name=encoder.encode(file.name),data=encoder.encode(file.content),crc=crc32(data),local=new Uint8Array(30+name.length+data.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);local.set(data,30+name.length);parts.push(local);
    const dir=new Uint8Array(46+name.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);dir.set(name,46);central.push(dir);offset+=local.length;}
  const centralSize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
$('downloadButton').addEventListener('click',()=>{
  const exporter=new STLExporter(),labels=new Map();
  pieceGroups.forEach((group,i)=>group.userData.cells.forEach(([x,y,z])=>labels.set(`${x},${y},${z}`,i)));
  const files=pieceGroups.map((group,i)=>{
    const geometry=makePieceGeometry(group.userData.cells,labels,i,currentGrid,currentPiece);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
    mesh.updateMatrixWorld(true);
    const content=exporter.parse(mesh,{binary:false});
    geometry.dispose();mesh.material.dispose();
    return {name:`cubecraft_piece_${String(i+1).padStart(2,'0')}.stl`,content};
  });
  files.push({name:'README.txt',content:'CubeCraft 3D Puzzle Prototype\n\nThese STL files represent colored voxel groups from a generated cube. This is experimental prototype geometry. Mechanical interlocking, fit tolerances, strength, and printability have not been validated. Inspect and test each part before use.\n'});
  downloadBlob(zipStore(files),`cubecraft-${currentGrid}x${currentGrid}x${currentGrid}-pieces.zip`);
});



