var Upstream=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/,n=String.raw`(\d+(?:\.\d+)?|\.\d+)`,r=new RegExp(String.raw`^rgba?\(\s*${n}\s*,\s*${n}\s*,\s*${n}\s*(?:,\s*${n}\s*)?\)$`),i=e=>Math.min(1,Math.max(0,e));function a(e){let t=e.length===3?[...e].map(e=>e+e).join(``):e,n=e=>parseInt(t.slice(e*2,e*2+2),16)/255;return[n(0),n(1),n(2),t.length===8?n(3):1]}function o(e){let n=e.trim().toLowerCase();if(n===`transparent`)return[0,0,0,0];let o=t.exec(n);if(o?.[1])return a(o[1]);let s=r.exec(n);if(s){let e=e=>i(Number(e)/255),t=s[4]===void 0?1:i(Number(s[4]));return[e(s[1]),e(s[2]),e(s[3]),t]}return null}var s=.5,c=1,l=[{name:`a_seed`,size:1},{name:`a_phase`,size:1},{name:`a_speed`,size:1}],u=[...l,{name:`a_corner`,size:2}],d=[[0,-1],[1,-1],[0,1],[0,1],[1,-1],[1,1]],f=Array.from({length:4},(e,t)=>d.map(([e,n])=>[(t+e)/4,n])).flat();function p(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function m(e,t){let n=Array.from({length:e},(e,n)=>Object.freeze({seed:n+t(),phase:t(),speed:s+t()*c}));return Object.freeze(n)}function h(e){let t=u.reduce((e,t)=>e+t.size,0),n=new Float32Array(e.length*24*t);return e.forEach(({seed:e,phase:r,speed:i},a)=>{f.forEach(([o,s],c)=>{n.set([e,r,i,o,s],(a*24+c)*t)})}),n}function g(e){return Float32Array.from(e.flatMap(({seed:e,phase:t,speed:n})=>[e,t,n]))}function _(e,t){let n=[e/2,t+50];return{origin:n,reach:Math.hypot(e/2,n[1])}}var v=Object.freeze({background:`#000000`,baseColor:`#03110d`,accentColor:`#25d39b`,count:900,speed:70,length:240,spread:42,coneRatio:.62,lineWidth:1.2,dotSize:2.6,repelRadius:70,repelSoftness:.6,intensity:.85,interactive:!0,paused:!1}),y={count:[1,4e3,!0],speed:[0,2e3,!1],length:[1,2e3,!1],spread:[0,90,!1],coneRatio:[0,1,!1],lineWidth:[.25,12,!1],dotSize:[0,24,!1],repelRadius:[0,1e3,!1],repelSoftness:[0,1,!1],intensity:[0,4,!1]},b=[`background`,`baseColor`,`accentColor`],x=[`interactive`,`paused`];function S(e,t,n){if(typeof t!=`number`||!Number.isFinite(t))return n;let[r,i,a]=y[e],o=Math.min(i,Math.max(r,t));return a?Math.round(o):o}function C(e={},t=v){let n=Object.fromEntries(Object.keys(y).map(n=>[n,S(n,e[n],t[n])])),r=Object.fromEntries(b.map(n=>{let r=e[n];return[n,typeof r==`string`&&o(r)?r:t[n]]})),i=Object.fromEntries(x.map(n=>{let r=e[n];return[n,typeof r==`boolean`?r:t[n]]}));return Object.freeze({...t,...n,...r,...i})}var w=new Set([``,`true`,`1`]),T=new Set([`false`,`0`]);function E(e,t){let n=v[e],r=t.trim();return typeof n==`number`?r===``?void 0:Number(r):typeof n==`boolean`?w.has(r)?!0:!T.has(r)&&void 0:t}function ee(e,t){return e.count!==t.count}function D(e,t){return Object.keys(e).every(n=>e[n]===t[n])}function O(e,t,n,r){return t+(e-t)*Math.exp(-n*r)}var k=8,A=5,te=.01;function ne(e){return(typeof e.composedPath==`function`?e.composedPath():[]).some(e=>e instanceof Element&&e.hasAttribute(`data-upstream-ignore`))}function re(e){let t={x:0,y:0,targetX:0,targetY:0,influence:0,inside:!1},n=null;function r(){if(!n)return;let r=e.getBoundingClientRect(),i=n.x-r.left,a=n.y-r.top,o=i>=0&&a>=0&&i<=r.width&&a<=r.height;t.targetX=i,t.targetY=a,o&&t.influence<te&&(t.x=i,t.y=a),t.inside=o}function i(e){ne(e)?(t.inside=!1,n=null):(n={x:e.clientX,y:e.clientY},r())}function a(e){let r=e.type===`pointerout`&&e.relatedTarget===null,i=e.type!==`pointerout`&&e.pointerType!==`mouse`;(r||i)&&(t.inside=!1,n=null)}let o=[[`pointermove`,i],[`pointerdown`,i],[`pointerout`,a],[`pointerup`,a],[`pointercancel`,a],[`scroll`,r]];return o.forEach(([e,t])=>window.addEventListener(e,t,{passive:!0,capture:!0})),{get x(){return t.x},get y(){return t.y},get influence(){return t.influence},step(e,n){t.x=O(t.x,t.targetX,k,e),t.y=O(t.y,t.targetY,k,e),t.influence=O(t.influence,n&&t.inside?1:0,A,e)},reset(){t.influence=0},dispose(){o.forEach(([e,t])=>window.removeEventListener(e,t,{capture:!0}))}}}function j(e,t,n){let r=e.createShader(t);if(!r)throw Error(`upstream-fx: could not allocate a WebGL shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)&&!e.isContextLost()){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`upstream-fx: shader compilation failed\n${t??``}`)}return r}function M(e,t,n){let r=j(e,e.VERTEX_SHADER,t),i;try{i=j(e,e.FRAGMENT_SHADER,n)}catch(t){throw e.deleteShader(r),t}let a=e.createProgram();if(!a)throw e.deleteShader(r),e.deleteShader(i),Error(`upstream-fx: could not allocate a WebGL program`);if(e.attachShader(a,r),e.attachShader(a,i),e.linkProgram(a),e.deleteShader(r),e.deleteShader(i),!e.getProgramParameter(a,e.LINK_STATUS)&&!e.isContextLost()){let t=e.getProgramInfoLog(a);throw e.deleteProgram(a),Error(`upstream-fx: program link failed\n${t??``}`)}let o=e.getProgramParameter(a,e.ACTIVE_UNIFORMS),s=new Map;for(let t=0;t<o;t++){let n=e.getActiveUniform(a,t),r=n&&e.getUniformLocation(a,n.name);n&&r&&s.set(n.name,r)}let c=e.getProgramParameter(a,e.ACTIVE_ATTRIBUTES),l=new Map;for(let t=0;t<c;t++){let n=e.getActiveAttrib(a,t);n&&l.set(n.name,e.getAttribLocation(a,n.name))}return{handle:a,uniforms:s,attributes:l}}function ie(e,t,n,r){let i=r.reduce((e,t)=>e+t.size,0)*Float32Array.BYTES_PER_ELEMENT;e.bindBuffer(e.ARRAY_BUFFER,n),r.reduce((n,r)=>{let a=t.attributes.get(r.name);return a!==void 0&&(e.enableVertexAttribArray(a),e.vertexAttribPointer(a,r.size,e.FLOAT,!1,i,n)),n+r.size*Float32Array.BYTES_PER_ELEMENT},0)}function ae(e,t){t.attributes.forEach(t=>e.disableVertexAttribArray(t))}function oe(e,t,n){for(let[r,i]of Object.entries(n)){let n=t.uniforms.get(r);n&&(typeof i==`number`?e.uniform1f(n,i):i.length===2?e.uniform2f(n,i[0],i[1]):e.uniform3f(n,i[0],i[1],i[2]))}}function N(e,t){let n=e.createBuffer();if(!n)throw Error(`upstream-fx: could not allocate a WebGL buffer`);return e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),n}var P=`
precision highp float;

attribute float a_seed;
attribute float a_phase;
attribute float a_speed;

uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_reach;
uniform float u_time;
uniform float u_speed;
uniform float u_maxLength;
uniform float u_spread;
uniform float u_coneRatio;
uniform vec2 u_pointer;
uniform float u_influence;
uniform float u_repelRadius;
uniform float u_repelSoftness;
uniform vec3 u_baseColor;
uniform vec3 u_accentColor;
uniform float u_intensity;

const float HALF_PI = 1.5707963;
const float LENGTH_GROWTH = 0.8;
const float MIN_BAND_RATIO = 0.5;
const float MAX_BAND_RATIO = 4.0;
const float AXIS_EPSILON = 0.5;
const float HEAD_WINDOW = 0.3;
const int BISECTION_STEPS = 16;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

// Resolves one streak for the current frame.
// out: unit heading, distance of the head from the origin, visible length,
// brightness, and a per-streak sideways vector used when the pointer sits
// exactly on the streak and "away" is undefined.
void streak(out vec2 dir, out float dist, out float len, out float glow, out vec2 side) {
  float cycle = u_reach + u_maxLength;
  float travel = a_phase * cycle + u_time * u_speed * a_speed;
  float lap = floor(travel / cycle);
  dist = travel - lap * cycle;

  // Each lap re-rolls the heading so the field never visibly repeats.
  float roll = hash(a_seed * 91.7 + lap * 13.13);
  float r1 = hash(a_seed * 47.3 + lap * 7.77);
  float r2 = hash(a_seed * 11.9 + lap * 3.31);
  float angle = roll < u_coneRatio
    ? (r1 + r2 - 1.0) * u_spread          // triangular: densest at vertical
    : (r1 * 2.0 - 1.0) * HALF_PI * 0.97;  // strays across the whole upper half

  dir = vec2(sin(angle), -cos(angle));
  len = min(u_maxLength, dist * LENGTH_GROWTH);
  glow = 0.35 + 0.65 * hash(a_seed * 3.7 + lap);
  side = vec2(-dir.y, dir.x) * (hash(a_seed * 5.3) > 0.5 ? 1.0 : -1.0);
}

// Pointer repulsion. Streaks never bend: each slides aside rigidly, by an
// amount set by the distance from the pointer to the part of the streak that
// "feels" it, measured from the head back. Mirrors tests/reference/flow-model.ts,
// where these properties are unit-tested.

// Distance a streak at distance d ends up at: solves l * S(l) = d, where S is 0
// inside the gap and eases to 1 across the band. Nothing stays in the gap,
// streaks never cross, and the band spreads them out instead of stacking them
// on the rim.
float gapProfile(float r, float radius, float band) {
  float t = clamp((r - radius) / band, 0.0, 1.0);
  return 1.0 - (1.0 - t) * (1.0 - t);
}

float pushedDistance(float d, float radius, float band) {
  float outer = radius + band;
  float target = max(d, AXIS_EPSILON); // a streak right on the pointer still needs a side
  if (target >= outer) return target;
  float lo = target;
  float hi = outer;
  for (int i = 0; i < BISECTION_STEPS; i++) {
    float mid = 0.5 * (lo + hi);
    if (mid * gapProfile(mid, radius, band) < target) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// Only the bright part near the head feels the pointer (tails fade to
// transparent). A streak returns to its place once its head has passed, so
// the gap stays rounded and closes right behind the cursor instead of opening
// a lane as long as the streaks.
vec2 repel(vec2 dir, float dist, float len, vec2 side) {
  // Influence grows the gap from nothing, so it fades in and out smoothly.
  float radius = u_repelRadius * u_influence;
  if (radius < 0.5) return vec2(0.0);
  float band = radius * mix(MIN_BAND_RATIO, MAX_BAND_RATIO, u_repelSoftness);
  float reach = len * HEAD_WINDOW;
  vec2 head = u_origin + dir * dist;
  float back = clamp(dot(head - u_pointer, dir), 0.0, reach);
  vec2 away = head - dir * back - u_pointer;
  float d = length(away);
  float push = max(pushedDistance(d, radius, band) - d, 0.0);
  return (d > 0.001 ? away / d : side) * push;
}

vec3 ramp(float t) {
  return mix(u_baseColor, u_accentColor, clamp(t, 0.0, 1.0));
}

vec4 toClip(vec2 px) {
  vec2 clip = px / u_resolution * 2.0 - 1.0;
  return vec4(clip.x, -clip.y, 0.0, 1.0);
}
`,se=`${P}
attribute vec2 a_corner; // x: 0 tail -> 1 head, y: -1 / +1 side

uniform float u_lineWidth;
uniform float u_pixelRatio;

varying vec3 v_color;
varying float v_alpha;
varying float v_side;      // device px from the centerline
varying float v_halfWidth; // device px

void main() {
  vec2 dir; float dist; float len; float glow; vec2 side;
  streak(dir, dist, len, glow, side);

  float along = a_corner.x;
  vec2 normal = vec2(-dir.y, dir.x);
  float halfWidth = mix(u_lineWidth * 0.15, u_lineWidth, along) * 0.5;
  float padding = 1.0 / u_pixelRatio; // room for the anti-aliased edge

  vec2 center = u_origin + dir * (dist - len * (1.0 - along));
  vec2 position = center + repel(dir, dist, len, side);
  position += normal * a_corner.y * (halfWidth + padding);

  v_color = ramp(dist / u_reach);
  v_alpha = pow(along, 1.6) * glow * u_intensity;
  // Passed in device pixels so the fragment shader needs no shared uniform
  // (vertex and fragment shaders declare different default precisions).
  v_side = a_corner.y * (halfWidth + padding) * u_pixelRatio;
  v_halfWidth = halfWidth * u_pixelRatio;
  gl_Position = toClip(position);
}
`,F=`
precision mediump float;

varying vec3 v_color;
varying float v_alpha;
varying float v_side;
varying float v_halfWidth;

void main() {
  float coverage = clamp(v_halfWidth - abs(v_side) + 0.5, 0.0, 1.0);
  float alpha = v_alpha * coverage;
  gl_FragColor = vec4(v_color * alpha, alpha);
}
`,I=`${P}
uniform float u_dotSize;
uniform float u_pixelRatio;

varying vec3 v_color;
varying float v_alpha;

const float HEAD_COLOR_SHIFT = 0.35;
const float GLOW_SCALE = 3.0;

void main() {
  vec2 dir; float dist; float len; float glow; vec2 side;
  streak(dir, dist, len, glow, side);

  vec2 head = u_origin + dir * dist;
  v_color = ramp(dist / u_reach + HEAD_COLOR_SHIFT);
  v_alpha = glow * u_intensity;
  gl_PointSize = u_dotSize * u_pixelRatio * GLOW_SCALE;
  gl_Position = toClip(head + repel(dir, dist, len, side));
}
`,L=`
precision mediump float;

varying vec3 v_color;
varying float v_alpha;

const float CORE_RADIUS = 1.0 / 3.0; // matches GLOW_SCALE in the vertex shader

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(CORE_RADIUS * 0.7, CORE_RADIUS, r);
  float halo = exp(-r * r * 9.0) * 0.35;
  float alpha = (core + halo) * v_alpha;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(v_color * alpha, alpha);
}
`,R=24301,z=3;function B(e,t){let n=m(t,p(R)),r=N(e,h(n));try{return{line:r,dot:N(e,g(n)),count:n.length}}catch(t){throw e.deleteBuffer(r),t}}function V(e){let t=M(e,se,F);try{return[t,M(e,I,L)]}catch(n){throw e.deleteProgram(t.handle),n}}function H(e,t,n,r){e.useProgram(t.handle),oe(e,t,r.uniforms),ie(e,t,n,r.layout),e.drawArrays(r.mode,0,r.vertices),ae(e,t)}function U(e,t){let[n,r]=V(e),i;try{i=B(e,t)}catch(t){throw e.deleteProgram(n.handle),e.deleteProgram(r.handle),t}let a=e.getParameter(e.ALIASED_POINT_SIZE_RANGE)?.[1]??1/0;return{setStreakCount(t){if(t===i.count)return;let n=B(e,t);e.deleteBuffer(i.line),e.deleteBuffer(i.dot),i=n},draw(t,o,s){let[c,d,f,p]=t;e.clearColor(c*p,d*p,f*p,p),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);let m=i.count*24;if(H(e,n,i.line,{layout:u,mode:e.TRIANGLES,vertices:m,uniforms:o}),s<=0)return;let h=typeof o.u_pixelRatio==`number`?o.u_pixelRatio:1,g=Math.min(s,a/(h*z));H(e,r,i.dot,{layout:l,mode:e.POINTS,vertices:i.count,uniforms:{...o,u_dotSize:g}})},dispose(){e.deleteProgram(n.handle),e.deleteProgram(r.handle),e.deleteBuffer(i.line),e.deleteBuffer(i.dot)}}}var W=2,G=1/20,ce=Math.PI/180,le=[0,0,0,1],K=Object.freeze({supported:!1,setOptions:()=>void 0,destroy:()=>void 0});function ue(e){try{return e.getContext(`webgl`,{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:`low-power`})}catch{return null}}function q(e){console.warn(`upstream-fx: WebGL setup failed, showing the background color only.`,e)}function J(e,t){try{return U(e,t)}catch(t){return e.isContextLost()||q(t),null}}function Y(e){let t=e=>o(e)??le;return{background:t(e.background),base:t(e.baseColor),accent:t(e.accentColor)}}var X=e=>[e[0],e[1],e[2]];function de(e){if(typeof matchMedia!=`function`)return()=>void 0;let t=matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`),n=()=>{t.removeEventListener(`change`,n),t=matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`),t.addEventListener(`change`,n),e()};return t.addEventListener(`change`,n),()=>t.removeEventListener(`change`,n)}function Z(e,t={}){let n=ue(e);if(!n)return K;let r=C(t),i=J(n,r.count);if(!i)return K;let a=n,o=re(e),s=typeof matchMedia==`function`?matchMedia(`(prefers-reduced-motion: reduce)`):null,c=[()=>o.dispose()],l=Y(r),u={width:1,height:1,pixelRatio:1},d=0,f=0,p=0,m=!1,h=!0,g=document.visibilityState!==`hidden`;function v(e,t,n,r){e.addEventListener(t,n,r),c.push(()=>e.removeEventListener(t,n,r))}function y(){let{origin:e,reach:t}=_(u.width,u.height);return{u_resolution:[u.width,u.height],u_origin:e,u_reach:t,u_time:d,u_speed:r.speed,u_maxLength:r.length,u_spread:r.spread*ce,u_coneRatio:r.coneRatio,u_pointer:[o.x,o.y],u_influence:o.influence,u_repelRadius:r.repelRadius,u_repelSoftness:r.repelSoftness,u_baseColor:X(l.base),u_accentColor:X(l.accent),u_intensity:r.intensity,u_pixelRatio:u.pixelRatio,u_lineWidth:r.lineWidth}}function b(){i?.draw(l.background,y(),r.dotSize)}function x(e){let t=p===0?0:Math.min((e-p)/1e3,G);p=e,r.paused||(d+=t),o.step(t,r.interactive),b(),f=requestAnimationFrame(x)}function S(){return s?.matches??!1}function w(){let e=!r.paused||r.interactive;return!m&&i!==null&&h&&g&&!S()&&e}function T(){w()?f===0&&(p=0,f=requestAnimationFrame(x)):(f!==0&&cancelAnimationFrame(f),f=0,(!r.interactive||S())&&o.reset(),m||b())}function E(){let t=Math.min(window.devicePixelRatio||1,W),n=Math.max(1,e.clientWidth),r=Math.max(1,e.clientHeight);u={width:n,height:r,pixelRatio:t},e.width=Math.round(n*t),e.height=Math.round(r*t),a.viewport(0,0,e.width,e.height),b()}function O(e){e.preventDefault(),i=null,T()}function k(){i=J(a,r.count),E(),T()}if(typeof ResizeObserver==`function`){let t=new ResizeObserver(E);t.observe(e),c.push(()=>t.disconnect())}else v(window,`resize`,E);if(typeof IntersectionObserver==`function`){let t=new IntersectionObserver(e=>{h=e.at(-1)?.isIntersecting??!0,T()});t.observe(e),c.push(()=>t.disconnect())}return c.push(de(E)),v(document,`visibilitychange`,()=>{g=document.visibilityState!==`hidden`,T()}),s&&v(s,`change`,T),v(e,`webglcontextlost`,O),v(e,`webglcontextrestored`,k),E(),T(),{supported:!0,setOptions(e){if(m)return;let t=C(e,r);if(!D(r,t)){if(ee(r,t))try{i?.setStreakCount(t.count)}catch(e){q(e)}r=t,l=Y(t),T()}},destroy(){m||(m=!0,f!==0&&cancelAnimationFrame(f),f=0,c.forEach(e=>e()),i?.dispose(),i=null)}}}var fe=`upstream-fx`,Q={background:`background`,"base-color":`baseColor`,"accent-color":`accentColor`,count:`count`,speed:`speed`,length:`length`,spread:`spread`,"cone-ratio":`coneRatio`,"line-width":`lineWidth`,"dot-size":`dotSize`,"repel-radius":`repelRadius`,"repel-softness":`repelSoftness`,intensity:`intensity`,interactive:`interactive`,paused:`paused`};function pe(e){let t=Object.entries(Q).flatMap(([t,n])=>{let r=e.getAttribute(t),i=r===null?void 0:E(n,r);return i===void 0?[]:[[n,i]]});return Object.fromEntries(t)}var me=`
  :host { display: block; position: relative; overflow: hidden; isolation: isolate; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: -1; pointer-events: none; }
`;function he(){return class extends HTMLElement{static get observedAttributes(){return Object.keys(Q)}instance=null;canvas;hostStyle;constructor(){super();let e=this.attachShadow({mode:`open`}),t=document.createElement(`style`);t.textContent=me,this.hostStyle=document.createElement(`style`),this.canvas=document.createElement(`canvas`),this.canvas.setAttribute(`aria-hidden`,`true`),e.append(t,this.hostStyle,this.canvas,document.createElement(`slot`))}connectedCallback(){let e=this.currentOptions();this.instance??=Z(this.canvas,e)}disconnectedCallback(){this.instance?.destroy(),this.instance=null}attributeChangedCallback(){let e=this.currentOptions();this.instance?.setOptions(e)}currentOptions(){let e=C(pe(this));return this.hostStyle.textContent=`:host { background: ${e.background}; }`,e}}}function $(e=fe){typeof window<`u`&&`customElements`in window&&(customElements.get(e)||customElements.define(e,he()))}return $(),e.DEFAULT_OPTIONS=v,e.createUpstream=Z,e.defineUpstreamElement=$,e})({});