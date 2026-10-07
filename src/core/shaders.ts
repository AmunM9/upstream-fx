/**
 * The whole simulation runs in the vertex shaders. Every streak only stores
 * static attributes (seed, phase, speed multiplier); position, heading, length,
 * color and pointer repulsion are derived from `u_time` each frame, so the CPU
 * never touches vertex data after the initial upload.
 *
 * Coordinates are CSS pixels with y pointing down, converted to clip space at
 * the very end.
 */
const SHARED = /* glsl */ `
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
`

export const LINE_VERTEX = /* glsl */ `${SHARED}
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
`

export const LINE_FRAGMENT = /* glsl */ `
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
`

export const DOT_VERTEX = /* glsl */ `${SHARED}
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
`

export const DOT_FRAGMENT = /* glsl */ `
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
`
