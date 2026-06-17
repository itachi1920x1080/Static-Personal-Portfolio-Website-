/* ============================================
   MINECRAFT WORLD ENGINE
   Procedural terrain, biomes, animals, mobs
   Overworld / Nether / The End
   ============================================ */
(function () {
'use strict';

const canvas = document.getElementById('planet-canvas');
if (!canvas) return;
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

/* ── NOISE ─────────────────────────────────── */
function hash(x, y, s) {
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 43758.5) * 43758.5453;
    return n - Math.floor(n);
}
function smooth(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix,iy,s), b = hash(ix+1,iy,s);
    const c = hash(ix,iy+1,s), d = hash(ix+1,iy+1,s);
    return a + (b-a)*ux + (c-a)*uy + (d-a+a-b-c+b+c)*ux*uy;
}
function fractal(x, y, oct, s) {
    let v=0, a=0.5, f=1, m=0;
    for (let i=0; i<oct; i++) { v += smooth(x*f, y*f, s+i)*a; m+=a; a*=0.5; f*=2; }
    return v / m;
}

/* ── TIME & STATE ───────────────────────────── */
let T = 0;                   // frame counter
let dayT = 0.3;              // 0=midnight, 0.5=noon
const DAY_SPD = 0.00007;

let worldX = 0;              // world scroll x
let scrollY = 0;
window.addEventListener('scroll', () => { scrollY = window.scrollY; });

function getDim() {
    const nb = document.getElementById('dimension-nether');
    const eb = document.getElementById('dimension-end');
    if (eb && scrollY >= eb.offsetTop - H * 0.45) return 'end';
    if (nb && scrollY >= nb.offsetTop - H * 0.45) return 'nether';
    return 'overworld';
}

/* ── BIOME & TERRAIN ────────────────────────── */
const BIOME_S = 42;
function biome(wx) {
    const t = fractal(wx * 0.0022, 0.5, 3, BIOME_S);
    if (t < 0.20) return 'snow';
    if (t < 0.37) return 'mountains';
    if (t < 0.54) return 'forest';
    if (t < 0.74) return 'plains';
    return 'desert';
}
function terrainH(wx) {
    const b = biome(wx);
    const base = fractal(wx*0.0038, 0, 4, 1);
    let h;
    if      (b==='mountains') h = 0.40 + base*0.50 + fractal(wx*0.009,0.2,3,2)*0.15;
    else if (b==='desert')    h = 0.58 + base*0.12;
    else if (b==='snow')      h = 0.43 + base*0.30;
    else if (b==='forest')    h = 0.56 + base*0.18;
    else                      h = 0.61 + base*0.11;
    return Math.min(0.88, Math.max(0.30, h));
}
const BK = 14; // block size px

/* ── LERP COLOR ─────────────────────────────── */
function lc(a, b, t) {
    const p = v => parseInt(v,16);
    const rA=[p(a.slice(1,3)),p(a.slice(3,5)),p(a.slice(5,7))];
    const rB=[p(b.slice(1,3)),p(b.slice(3,5)),p(b.slice(5,7))];
    return '#'+rA.map((v,i)=>Math.round(v+(rB[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
function skyColors(dt, dim) {
    if (dim==='nether') return {t:'#1a0000', b:'#3d0000'};
    if (dim==='end')    return {t:'#050010', b:'#0d001f'};
    const ni={t:'#020510',b:'#0a1030'}, da={t:'#180828',b:'#ff5020'}, dy={t:'#1a8fe3',b:'#87ceeb'};
    function lo(A,B,f){return{t:lc(A.t,B.t,f),b:lc(A.b,B.b,f)};}
    if (dt<0.13) return lo(ni,da,dt/0.13);
    if (dt<0.23) return lo(da,dy,(dt-0.13)/0.10);
    if (dt<0.72) return dy;
    if (dt<0.82) return lo(dy,da,(dt-0.72)/0.10);
    if (dt<0.92) return lo(da,ni,(dt-0.82)/0.10);
    return ni;
}

/* ── STATIC DATA ────────────────────────────── */
const STARS = Array.from({length:200},()=>({
    x:Math.random(), y:Math.random()*0.58,
    r:Math.random()*1.4+0.4, ph:Math.random()*Math.PI*2
}));
const CLOUDS = Array.from({length:11},()=>({
    x:Math.random()*3200-600, y:0.06+Math.random()*0.17,
    w:75+Math.random()*130, segs:3+Math.floor(Math.random()*4),
    spd:0.16+Math.random()*0.18
}));
const FF = Array.from({length:26},()=>({   // fireflies
    x:Math.random()*3000, y:0.52+Math.random()*0.33, ph:Math.random()*Math.PI*2
}));
const NP = Array.from({length:55},()=>({   // nether particles
    x:Math.random(), y:Math.random(),
    vx:(Math.random()-0.5)*0.2, vy:-Math.random()*0.7,
    life:Math.random(), ember:Math.random()<0.6
}));
const EP = Array.from({length:65},()=>({   // end particles
    x:Math.random(), y:Math.random(),
    vx:(Math.random()-0.5)*0.25, vy:-Math.random()*0.5, life:Math.random()
}));

/* Animals */
const AT = ['sheep','cow','chicken','horse','wolf'];
const ANIMALS = Array.from({length:32},(v,i)=>({
    tp:AT[i%5], wx:80+i*120, dir:Math.random()<0.5?1:-1,
    spd:0.3+Math.random()*0.45, fr:Math.random()*Math.PI*2, fspd:0.06+Math.random()*0.04
}));
const BEES = Array.from({length:7},()=>({
    wx:550+Math.random()*700, wy:0.28+Math.random()*0.22,
    dir:Math.random()<0.5?1:-1, fr:Math.random()*Math.PI*2
}));
const MOBS = Array.from({length:7},(v,i)=>({  // night mobs
    wx:200+i*300, tp:Math.random()<0.5?'zombie':'skeleton',
    dir:Math.random()<0.5?1:-1, fr:Math.random()*Math.PI*2, spd:0.18+Math.random()*0.14
}));
const ENDERS = Array.from({length:4},()=>({wx:350+Math.random()*2000}));
const DRAGON = {x:1.08, y:0.21, vx:-0.0008, phase:0, wing:0};

/* ── DRAW HELPERS ───────────────────────────── */
function scx(wx) { return wx - worldX; }
function blk(x, y, col, sh=true) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, BK, BK);
    if (sh) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x+BK-2, y, 2, BK);
        ctx.fillRect(x, y+BK-2, BK, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(x, y, BK, 2);
        ctx.fillRect(x, y, 2, BK);
    }
}
function f(v, lf) { return Math.floor(v * lf); }

/* ── SKY / STARS / MOON / SUN / CLOUDS ─────── */
function drawSky(dim, dt) {
    const sk = skyColors(dt, dim);
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, sk.t); g.addColorStop(1, sk.b);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
}

function drawStars(dt, dim) {
    const base = dim!=='overworld' ? 1 : (dt<0.13 ? 1 : dt>0.92 ? 1-(dt-0.92)/0.08 : dt<0.23 ? (0.23-dt)/0.10 : 0);
    if (base <= 0) return;
    ctx.save();
    for (const s of STARS) {
        const tw = 0.5 + 0.5*Math.sin(T*0.04+s.ph);
        ctx.globalAlpha = base * (0.45 + 0.55*tw);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r*tw, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawMoon(dt) {
    if (dt > 0.13 && dt < 0.87) return;
    ctx.save();
    ctx.fillStyle = '#e8e8c2';
    ctx.beginPath(); ctx.arc(W*0.76, H*0.13, 21, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c8c89e';
    ctx.beginPath(); ctx.arc(W*0.76+5, H*0.13-5, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawSun(dt) {
    if (dt < 0.13 || dt > 0.87) return;
    const p = (dt-0.13)/0.74;
    const sx = W*0.25 + p*W*0.5;
    const sy = H*0.12 + Math.sin(p*Math.PI)*(-H*0.07);
    ctx.save();
    ctx.fillStyle = '#ffff99';
    ctx.fillRect(sx-16, sy-16, 32, 32);
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(sx-12, sy-12, 24, 24);
    ctx.restore();
}

function drawClouds(dt, dim) {
    if (dim !== 'overworld') return;
    const a = dt>0.10&&dt<0.90 ? 0.90 : 0.42;
    ctx.save(); ctx.globalAlpha = a;
    const col = dt>0.20&&dt<0.80 ? '#ffffff' : '#99aabb';
    for (const c of CLOUDS) {
        c.x += c.spd;
        if (c.x > W+600) c.x = -500;
        const sy = c.y * H;
        ctx.fillStyle = col;
        for (let i=0; i<c.segs; i++) {
            const bx = c.x + i*(c.w/c.segs);
            const by = sy + (i%2===0 ? 0 : -7);
            ctx.fillRect(Math.floor(bx/BK)*BK, Math.floor(by/BK)*BK, BK*2, BK);
        }
    }
    ctx.restore();
}

/* ── OVERWORLD TERRAIN ──────────────────────── */
function drawOverworld(dt) {
    const isDay = dt>0.20&&dt<0.80;
    const lf = isDay ? 1.0 : 0.42;
    const WL = Math.floor(H * 0.73);     // water level
    const startWX = Math.floor(worldX / BK) * BK;
    const cols = Math.ceil(W/BK) + 8;

    // build terrain strip
    const strip = [];
    for (let i=-4; i<=cols+4; i++) {
        const wx = startWX + i*BK;
        strip.push({ wx, sy: Math.floor(terrainH(wx)*H), b: biome(wx) });
    }

    /* water / lava */
    const t2 = T*0.022;
    for (const {wx,sy,b} of strip) {
        const sx = scx(wx);
        if (sx+BK<-BK || sx>W+BK) continue;
        if (sy > WL+BK) {
            const wv = Math.sin(t2 + wx*0.035)*3;
            const isLava = b==='mountains' && hash(wx*0.022, 0.3, 77)>0.83;
            if (isLava) {
                ctx.fillStyle = `rgba(220,${f(40+35*Math.sin(t2+sx*0.05),1)},0,0.88)`;
                ctx.fillRect(sx, WL+wv, BK, BK);
            } else {
                ctx.fillStyle = isDay ? 'rgba(38,118,220,0.72)' : 'rgba(18,58,140,0.72)';
                ctx.fillRect(sx, WL+wv, BK, BK);
                ctx.fillStyle = isDay ? 'rgba(100,160,255,0.28)' : 'rgba(55,95,190,0.28)';
                ctx.fillRect(sx, WL-2+wv, BK, 4);
            }
        }
    }

    /* terrain blocks */
    for (const {wx,sy,b} of strip) {
        const sx = scx(wx);
        if (sx+BK<-BK || sx>W+BK) continue;
        let gc, dc;
        if (b==='snow') {
            gc=`rgb(${f(215,lf)},${f(228,lf)},${f(240,lf)})`;
            dc=`rgb(${f(158,lf)},${f(98,lf)},${f(58,lf)})`;
        } else if (b==='desert') {
            gc=`rgb(${f(210,lf)},${f(178,lf)},${f(96,lf)})`;
            dc=`rgb(${f(194,lf)},${f(161,lf)},${f(80,lf)})`;
        } else if (b==='mountains') {
            gc = sy<H*0.46
                ? `rgb(${f(196,lf)},${f(196,lf)},${f(196,lf)})`
                : `rgb(${f(74,lf)},${f(116,lf)},${f(56,lf)})`;
            dc=`rgb(${f(128,lf)},${f(83,lf)},${f(40,lf)})`;
        } else {
            gc=`rgb(${f(76,lf)},${f(136,lf)},${f(56,lf)})`;
            dc=`rgb(${f(128,lf)},${f(83,lf)},${f(40,lf)})`;
        }
        const sc=`rgb(${f(112,lf)},${f(112,lf)},${f(112,lf)})`;
        blk(sx, sy, gc);
        for (let dy=BK; dy<BK*3 && sy+dy<H; dy+=BK) blk(sx, sy+dy, dc);
        for (let dy=BK*3; sy+dy<H; dy+=BK)           blk(sx, sy+dy, sc);
        // cave opening
        if (hash(wx*0.06,0.9,99)>0.88 && sy+BK*5<H) {
            ctx.fillStyle = `rgba(0,0,0,${lf<0.6?0.65:0.90})`;
            ctx.fillRect(sx, sy+BK*2, BK, BK*2);
        }
    }

    /* features */
    for (let i=2; i<strip.length-2; i++) {
        const {wx, sy, b} = strip[i];
        const sx = scx(wx);
        if (sx<-70 || sx>W+70) continue;
        const fn2 = hash(wx*0.088, 0.1, 5);
        const ft  = hash(wx*0.130, 0.5, 7);
        if      (b==='snow')      { if(fn2>0.87)drawSpruce(sx,sy,lf); }
        else if (b==='forest')    {
            if(fn2>0.83) ft>0.55?drawBirch(sx,sy,lf):drawOak(sx,sy,lf);
            if(fn2>0.73&&fn2<0.77)drawFlower(sx,sy,lf,wx);
            if(fn2>0.61&&fn2<0.65)drawGrass(sx,sy,lf);
        } else if (b==='plains') {
            if(fn2>0.92)drawOak(sx,sy,lf);
            if(fn2>0.76&&fn2<0.79)drawFlower(sx,sy,lf,wx);
            if(fn2>0.68&&fn2<0.72)drawGrass(sx,sy,lf);
            if(fn2>0.93&&i%38===0)drawHouse(sx,sy,lf);
        } else if (b==='mountains') {
            if(sy<H*0.56&&fn2>0.91)drawSpruce(sx,sy,lf);
            if(fn2>0.87&&fn2<0.89) drawLavaFall(sx,sy,lf);
        } else if (b==='desert') {
            if(fn2>0.90)drawCactus(sx,sy,lf);
        }
        // floating islands
        if(hash(wx*0.007,0.7,11)>0.917&&sx>50&&sx<W-50)drawFloatIsland(sx,sy,lf,wx);
    }

    drawAnimals(lf, isDay);
    drawFireflies(dt);
    if (dt<0.12||dt>0.88) drawNightMobs(lf);
}

/* ── TREES ──────────────────────────────────── */
function drawOak(sx,sy,lf){
    const t=`rgb(${f(98,lf)},${f(65,lf)},${f(32,lf)})`;
    const l=`rgb(${f(48,lf)},${f(118,lf)},${f(38,lf)})`;
    blk(sx,sy-BK,t);blk(sx,sy-BK*2,t);blk(sx,sy-BK*3,t);
    for(let dy=-5;dy<=-2;dy++)for(let dx=-1;dx<=2;dx++){
        if(Math.abs(dx)+Math.abs(dy+3)<4){ctx.fillStyle=l;ctx.fillRect(sx+dx*BK,sy+dy*BK,BK,BK);}
    }
}
function drawBirch(sx,sy,lf){
    const t=`rgb(${f(195,lf)},${f(195,lf)},${f(190,lf)})`;
    const l=`rgb(${f(64,lf)},${f(132,lf)},${f(53,lf)})`;
    for(let i=1;i<=4;i++)blk(sx,sy-BK*i,t);
    for(let dy=-6;dy<=-3;dy++)for(let dx=-1;dx<=1;dx++){ctx.fillStyle=l;ctx.fillRect(sx+dx*BK,sy+dy*BK,BK,BK);}
}
function drawSpruce(sx,sy,lf){
    const t=`rgb(${f(78,lf)},${f(48,lf)},${f(24,lf)})`;
    const l=`rgb(${f(28,lf)},${f(76,lf)},${f(46,lf)})`;
    const s=`rgb(${f(215,lf)},${f(228,lf)},${f(238,lf)})`;
    blk(sx,sy-BK,t);blk(sx,sy-BK*2,t);
    for(let tier=0;tier<4;tier++){
        const w=(3-tier)*BK, ty=sy-BK*(3+tier*1.5);
        ctx.fillStyle=l;ctx.fillRect(sx-w/2+BK/2,ty,w,BK);
        ctx.fillStyle=s;ctx.fillRect(sx-w/2+BK/2,ty,w,3);
    }
}

/* ── FEATURES ───────────────────────────────── */
function drawFlower(sx,sy,lf,wx){
    const cs=[`rgb(${f(215,lf)},${f(45,lf)},${f(45,lf)})`,
              `rgb(${f(215,lf)},${f(175,lf)},0)`,
              `rgb(${f(195,lf)},${f(90,lf)},${f(195,lf)})`];
    ctx.fillStyle=`rgb(${f(58,lf)},${f(138,lf)},${f(38,lf)})`;
    ctx.fillRect(sx+6,sy-10,3,10);
    ctx.fillStyle=cs[Math.floor(hash(wx,0.9,3)*3)];
    ctx.beginPath();ctx.arc(sx+7,sy-12,5,0,Math.PI*2);ctx.fill();
}
function drawGrass(sx,sy,lf){
    ctx.fillStyle=`rgb(${f(76,lf)},${f(145,lf)},${f(46,lf)})`;
    ctx.fillRect(sx+4,sy-13,3,13);
    ctx.fillRect(sx+9,sy-9,3,9);
}
function drawCactus(sx,sy,lf){
    const c=`rgb(${f(46,lf)},${f(116,lf)},${f(46,lf)})`;
    blk(sx,sy-BK,c);blk(sx,sy-BK*2,c);blk(sx,sy-BK*3,c);
    ctx.fillStyle=c;
    ctx.fillRect(sx-BK,sy-BK*2,BK,BK/2);
    ctx.fillRect(sx+BK,sy-BK*2,BK,BK/2);
}
function drawLavaFall(sx,sy,lf){
    for(let i=0;i<3;i++){
        const a=0.5+0.5*Math.sin(T*0.1+i);
        ctx.fillStyle=`rgba(215,52,0,${a})`;
        ctx.fillRect(sx,sy+i*BK,BK/2,BK);
    }
}
function drawHouse(sx,sy,lf){
    if(hash(sx*0.01,sy*0.01,22)<0.5)return; // 50% spawn chance
    const w=BK*4, h=BK*3;
    ctx.fillStyle=`rgb(${f(153,lf)},${f(96,lf)},${f(46,lf)})`;
    ctx.fillRect(sx,sy-h,w,h);
    ctx.fillStyle=`rgb(${f(112,lf)},${f(56,lf)},${f(26,lf)})`;
    ctx.beginPath();ctx.moveTo(sx,sy-h);ctx.lineTo(sx+w/2,sy-h-BK*2);ctx.lineTo(sx+w,sy-h);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.fillRect(sx+w/2-6,sy-BK*2,12,BK*2);
    // villager
    ctx.fillStyle=`rgb(${f(238,lf)},${f(195,lf)},${f(145,lf)})`;
    ctx.fillRect(sx+w+3,sy-BK*2,BK,BK);
    ctx.fillStyle=`rgb(${f(78,lf)},${f(78,lf)},${f(155,lf)})`;
    ctx.fillRect(sx+w+3,sy-BK,BK,BK);
}
function drawFloatIsland(sx,sy,lf,wx){
    const iy=H*0.17+hash(wx*0.003,0.4,13)*H*0.14;
    const iw=4*BK;
    ctx.fillStyle=`rgb(${f(76,lf)},${f(136,lf)},${f(56,lf)})`;
    ctx.fillRect(sx-iw/2,iy,iw,BK);
    ctx.fillStyle=`rgb(${f(126,lf)},${f(80,lf)},${f(40,lf)})`;
    ctx.fillRect(sx-iw/2+4,iy+BK,iw-8,BK);
    ctx.fillStyle=`rgb(${f(96,lf)},${f(96,lf)},${f(96,lf)})`;
    ctx.beginPath();
    ctx.moveTo(sx-iw/2+4,iy+BK*2);
    ctx.lineTo(sx,iy+BK*4);
    ctx.lineTo(sx+iw/2-4,iy+BK*2);
    ctx.fill();
    drawOak(sx-BK/2,iy,lf);
}

/* ── ANIMALS ────────────────────────────────── */
function drawAnimals(lf, isDay) {
    for (const a of ANIMALS) {
        a.fr += a.fspd;
        a.wx += a.dir * a.spd;
        if (a.wx<0) a.dir=1;
        if (a.wx>3500) a.dir=-1;
        if (hash(a.wx*0.012, T*0.001, 99)>0.97) a.dir*=-1;
        const sx = scx(a.wx);
        if (sx<-50||sx>W+50) continue;
        const sy = Math.floor(terrainH(a.wx)*H);
        const ls = Math.sin(a.fr)*4;
        ctx.save();
        ctx.scale(a.dir>0?1:-1, 1);
        const rx = a.dir>0 ? sx : -sx;
        switch(a.tp) {
            case 'sheep':
                ctx.fillStyle=`rgb(${f(228,lf)},${f(228,lf)},${f(228,lf)})`;
                ctx.fillRect(rx-8,sy-20,16,12);
                ctx.fillStyle=`rgb(${f(56,lf)},${f(36,lf)},${f(16,lf)})`;
                ctx.fillRect(rx-6,sy-28,10,10);
                ctx.fillStyle=`rgb(${f(46,lf)},${f(46,lf)},${f(46,lf)})`;
                ctx.fillRect(rx-6,sy-8,4,8+ls);ctx.fillRect(rx+2,sy-8,4,8-ls);
                break;
            case 'cow':
                ctx.fillStyle=`rgb(${f(186,lf)},${f(136,lf)},${f(96,lf)})`;
                ctx.fillRect(rx-10,sy-22,20,14);ctx.fillRect(rx-8,sy-32,12,12);
                ctx.fillStyle=`rgb(${f(56,lf)},${f(36,lf)},${f(16,lf)})`;
                ctx.fillRect(rx-8,sy-8,5,8+ls);ctx.fillRect(rx+3,sy-8,5,8-ls);
                break;
            case 'chicken':
                ctx.fillStyle=`rgb(${f(236,lf)},${f(232,lf)},${f(215,lf)})`;
                ctx.fillRect(rx-6,sy-16,12,10);ctx.fillRect(rx-4,sy-24,8,8);
                ctx.fillStyle=`rgb(${f(226,lf)},${f(96,lf)},${f(6,lf)})`;
                ctx.fillRect(rx-2,sy-18,5,3);
                ctx.fillStyle=`rgb(${f(46,lf)},${f(46,lf)},${f(46,lf)})`;
                ctx.fillRect(rx-4,sy-6,3,6+ls);ctx.fillRect(rx+1,sy-6,3,6-ls);
                break;
            case 'horse':
                ctx.fillStyle=`rgb(${f(153,lf)},${f(96,lf)},${f(46,lf)})`;
                ctx.fillRect(rx-12,sy-28,24,18);ctx.fillRect(rx-10,sy-40,12,14);
                ctx.fillStyle=`rgb(${f(123,lf)},${f(76,lf)},${f(36,lf)})`;
                ctx.fillRect(rx-12,sy-10,6,10+ls);ctx.fillRect(rx+6,sy-10,6,10-ls);
                break;
            case 'wolf':
                ctx.fillStyle=`rgb(${f(116,lf)},${f(116,lf)},${f(116,lf)})`;
                ctx.fillRect(rx-8,sy-20,16,12);ctx.fillRect(rx-6,sy-30,10,10);
                ctx.fillStyle=`rgb(${f(196,lf)},${f(196,lf)},${f(196,lf)})`;
                ctx.fillRect(rx-4,sy-8,3,8+ls);ctx.fillRect(rx+1,sy-8,3,8-ls);
                break;
        }
        ctx.restore();
    }
    // bees
    for (const b of BEES) {
        b.fr += 0.14;
        b.wx += b.dir*0.85;
        if (hash(b.wx*0.025,T*0.001,200)>0.97) b.dir*=-1;
        const sx=scx(b.wx), sy=b.wy*H+Math.sin(b.fr*2)*8;
        if (sx<-20||sx>W+20) continue;
        ctx.save(); ctx.translate(sx,sy);
        ctx.fillStyle=`rgb(${f(215,lf)},${f(152,lf)},0)`;
        ctx.fillRect(-8,-4,16,8);
        ctx.fillStyle='#111';
        ctx.fillRect(-5,-4,3,8);ctx.fillRect(1,-4,3,8);
        ctx.fillStyle='rgba(195,215,255,0.55)';
        const wy=Math.sin(b.fr*6)*3;
        ctx.fillRect(-5,-8+wy,10,5);
        ctx.restore();
    }
}

/* ── FIREFLIES ──────────────────────────────── */
function drawFireflies(dt) {
    if (dt>0.15&&dt<0.85) return;
    const al = dt<0.15 ? 1 : (dt>0.85 ? (dt-0.85)/0.15 : 0);
    ctx.save();
    for (const f2 of FF) {
        f2.ph += 0.022;
        const sx=((f2.x*3000-worldX*0.55)%W+W)%W;
        const sy=f2.y*H+Math.sin(f2.ph*0.5)*14;
        const g=0.5+0.5*Math.sin(f2.ph*3);
        ctx.globalAlpha=al*g*0.8;
        ctx.fillStyle='#aafF44';
        ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=al*g*0.14;
        ctx.fillStyle='#88ff22';
        ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
}

/* ── NIGHT MOBS ─────────────────────────────── */
function drawNightMobs(lf) {
    ctx.save(); ctx.globalAlpha=0.68;
    for (const m of MOBS) {
        m.fr+=m.spd*0.7;
        m.wx+=m.dir*m.spd;
        if(m.wx<0)m.dir=1;if(m.wx>3500)m.dir=-1;
        const sx=scx(m.wx);
        if(sx<-40||sx>W+40)continue;
        const sy=Math.floor(terrainH(m.wx)*H);
        const ls=Math.sin(m.fr)*4;
        ctx.save();ctx.scale(m.dir>0?1:-1,1);
        const rx=m.dir>0?sx:-sx;
        if(m.tp==='zombie'){
            ctx.fillStyle='#336644';ctx.fillRect(rx-6,sy-28,12,12);
            ctx.fillRect(rx-7,sy-16,14,10);
            ctx.fillStyle='#225533';
            ctx.fillRect(rx-5,sy-6,4,6+ls);ctx.fillRect(rx+1,sy-6,4,6-ls);
            ctx.fillRect(rx-13,sy-14,6,8+ls);
        } else {
            ctx.fillStyle='#dccebb';ctx.fillRect(rx-5,sy-28,10,10);
            ctx.fillStyle='#887777';ctx.fillRect(rx-6,sy-18,12,10);
            ctx.fillStyle='#dccebb';
            ctx.fillRect(rx-4,sy-8,3,8+ls);ctx.fillRect(rx+1,sy-8,3,8-ls);
        }
        ctx.restore();
    }
    for(const e of ENDERS){
        const sx=scx(e.wx);
        if(sx<0||sx>W)continue;
        const sy=Math.floor(terrainH(e.wx)*H);
        ctx.fillStyle='#110022';ctx.fillRect(sx-3,sy-52,6,10);
        ctx.fillStyle='#220033';ctx.fillRect(sx-2,sy-42,5,22);
        ctx.fillStyle='#5500aa';
        ctx.fillRect(sx-1,sy-42,2,2);ctx.fillRect(sx+2,sy-42,2,2);
    }
    ctx.restore();
}

/* ── NETHER ─────────────────────────────────── */
function drawNether() {
    const LV = Math.floor(H*0.76);
    const tv = T*0.022;
    // lava ocean
    for(let sx=0; sx<W; sx+=BK){
        const wv=Math.sin(tv+sx*0.04)*3;
        ctx.fillStyle=`rgba(218,${Math.floor(36+28*Math.sin(tv*2+sx*0.07))},0,0.92)`;
        ctx.fillRect(sx,LV+wv,BK,H-LV);
        ctx.fillStyle='rgba(255,145,0,0.38)';
        ctx.fillRect(sx,LV-2+wv,BK,4);
    }
    // ceiling & floor
    for(let sx=-BK; sx<W+BK; sx+=BK){
        const wx=sx+worldX;
        const topH=Math.floor((0.06+fractal(wx*0.018,0.1,3,50))*H*0.14);
        const botH=Math.floor((0.65+fractal(wx*0.018,0.8,3,51))*H*0.09);
        const floor=LV-botH;
        ctx.fillStyle='#2e0000';ctx.fillRect(sx,0,BK,topH);
        const isCrim=fractal(wx*0.022,0.6,2,61)>0.5;
        ctx.fillStyle=isCrim?'#550022':'#001133';
        ctx.fillRect(sx,floor,BK,botH);
        // nether trees
        if(hash(wx*0.075,0.3,80)>0.87){
            const tc=isCrim?'#550022':'#001133';
            const lc2=isCrim?'#cc2244':'#003322';
            ctx.fillStyle=tc;
            for(let i=1;i<=4;i++)ctx.fillRect(sx,floor-i*BK,BK,BK);
            ctx.fillStyle=lc2;
            for(let dy=-6;dy<=-3;dy++)for(let dx=-1;dx<=2;dx++){ctx.fillRect(sx+dx*BK,floor+dy*BK,BK,BK);}
        }
        // glowstone
        if(hash(wx*0.11,0.65,88)>0.91){
            ctx.fillStyle='#ffff44';
            ctx.fillRect(sx,topH,BK,BK);
            ctx.fillRect(sx+3,topH+BK,BK-6,BK-6);
        }
    }
    // nether portals
    [{px:W*0.28,py:H*0.34},{px:W*0.66,py:H*0.40}].forEach(({px,py})=>{
        const pa=0.6+0.4*Math.sin(tv*3);
        ctx.fillStyle='rgba(46,0,76,0.82)';
        ctx.fillRect(px,py,BK*2,BK*4);
        ctx.strokeStyle='#551188';ctx.lineWidth=3;
        ctx.strokeRect(px,py,BK*2,BK*4);
        for(let i=0;i<3;i++){
            ctx.fillStyle=`rgba(${72+i*36},0,${115+i*36},${pa*0.3})`;
            ctx.fillRect(px+2,py+2+i*BK,BK*2-4,BK);
        }
    });
    // particles
    ctx.save();
    for(const p of NP){
        p.life+=0.01;
        if(p.life>1){p.life=0;p.x=Math.random();p.y=0.6+Math.random()*0.38;}
        p.x+=p.vx*0.01;p.y+=p.vy*0.01;
        ctx.globalAlpha=Math.min(1,(1-p.life)*0.8);
        if(p.ember){ctx.fillStyle=`rgb(255,${Math.floor(90*p.life)},0)`;}
        else{ctx.fillStyle='#888';}
        ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.ember?2:3,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
}

/* ── THE END ────────────────────────────────── */
function drawEnd() {
    // islands
    for(let i=0;i<5;i++){
        const ix=(i/5)*W+Math.sin(T*0.003+i)*18;
        const iy=H*(0.47+i*0.03)+Math.sin(T*0.005+i*0.5)*9;
        const r=52+i*14;
        ctx.fillStyle='#1a1133';
        ctx.beginPath();ctx.ellipse(ix,iy,r,r*0.38,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#221144';
        for(let j=0;j<4;j++)ctx.fillRect(ix-r*0.35+j*r*0.22,iy-6,11,7);
    }
    // end crystals
    for(let i=0;i<4;i++){
        const cx=W*(0.12+i*0.22), cy=H*0.43+Math.sin(T*0.05+i)*6;
        const gl=0.5+0.5*Math.sin(T*0.08+i);
        ctx.fillStyle=`rgba(172,0,212,${0.58+gl*0.42})`;
        ctx.beginPath();
        ctx.moveTo(cx,cy-27);ctx.lineTo(cx+9,cy);ctx.lineTo(cx,cy+9);ctx.lineTo(cx-9,cy);
        ctx.closePath();ctx.fill();
        ctx.fillStyle=`rgba(212,90,255,${0.34+gl*0.3})`;
        ctx.beginPath();
        ctx.moveTo(cx,cy+9);ctx.lineTo(cx+7,cy);ctx.lineTo(cx,cy+22);ctx.lineTo(cx-7,cy);
        ctx.closePath();ctx.fill();
        ctx.strokeStyle=`rgba(192,42,255,${0.26+gl*0.26})`;
        ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy-27);ctx.lineTo(cx,0);ctx.stroke();
    }
    // ender dragon
    DRAGON.phase+=0.009;
    DRAGON.x+=DRAGON.vx;
    DRAGON.y=0.20+Math.sin(DRAGON.phase)*0.07;
    DRAGON.wing=Math.sin(DRAGON.phase*3)*0.38;
    if(DRAGON.x<-0.18)DRAGON.x=1.06;
    const dx=DRAGON.x*W, dy=DRAGON.y*H;
    ctx.save();ctx.translate(dx,dy);
    ctx.scale(DRAGON.vx<0?1:-1,1);
    ctx.fillStyle='#111122';
    ctx.beginPath();ctx.ellipse(0,0,38,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(28,8,48,0.82)';
    ctx.save();ctx.rotate(-DRAGON.wing);
    ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-76,-47);ctx.lineTo(-46,9);ctx.closePath();ctx.fill();ctx.restore();
    ctx.save();ctx.rotate(DRAGON.wing);
    ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(76,-47);ctx.lineTo(46,9);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#100020';
    ctx.beginPath();ctx.ellipse(-42,-4,16,11,-0.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff0000';
    ctx.beginPath();ctx.arc(-52,-7,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // end particles
    ctx.save();
    for(const p of EP){
        p.life+=0.005;
        if(p.life>1){p.life=0;p.x=Math.random();p.y=0.55+Math.random()*0.45;}
        p.x+=p.vx*0.01;p.y+=p.vy*0.01;
        ctx.globalAlpha=Math.sin(p.life*Math.PI)*0.55;
        ctx.fillStyle=`hsl(${268+p.life*28},78%,58%)`;
        ctx.beginPath();ctx.arc(p.x*W,p.y*H,2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
}

/* ── MAIN LOOP ──────────────────────────────── */
function render() {
    T++;
    dayT = (dayT + DAY_SPD) % 1;
    worldX += 0.28;

    const dim = getDim();
    ctx.clearRect(0,0,W,H);

    drawSky(dim, dayT);
    drawStars(dayT, dim);
    drawMoon(dayT);
    drawSun(dayT);
    drawClouds(dayT, dim);

    if      (dim==='overworld') drawOverworld(dayT);
    else if (dim==='nether')    drawNether();
    else                        drawEnd();

    requestAnimationFrame(render);
}
render();

})();