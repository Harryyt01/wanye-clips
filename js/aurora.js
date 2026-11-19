/* Wayne.clips v5 — Aurora GLSL background.
   Raw WebGL full-screen quad: 2-octave value-noise FBM, domain warp, Inigo Quilez
   cosine palette in the amber/coral identity, pointer swirl on a lagging spring.
   30 fps cap, half-resolution buffer on mobile, CSS gradient fallback underneath.
   Fully guarded: any failure hides the canvas and the page reads fine. */
(function () {
  'use strict';
  try {
    var canvas = document.getElementById('aurora');
    if (!canvas) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { canvas.style.display = 'none'; return; }

    var vsrc = 'attribute vec2 a_p; void main(){ gl_Position = vec4(a_p, 0.0, 1.0); }';
    var fsrc = [
      'precision highp float;',
      'uniform vec2 u_res; uniform float u_time; uniform vec2 u_ptr;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float noise(vec2 p){',
      '  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),',
      '             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);',
      '}',
      'float fbm(vec2 p){ return noise(p) * 0.65 + noise(p * 2.13) * 0.35; }', // 2 octaves only
      'vec3 palette(float t){',
      '  return 0.5 + 0.5 * cos(6.28318 * (t * vec3(0.85, 0.45, 0.25) + vec3(0.0, 0.08, 0.18)));',
      '}',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / u_res;',
      '  vec2 p = (uv - 0.5); p.x *= u_res.x / u_res.y;',
      '  vec2 swirl = u_ptr * 0.35;',
      '  float q = fbm(p * 1.6 + swirl + vec2(0.0, u_time * 0.03));',
      '  float r = fbm(p * 1.6 + vec2(q * 1.4, q * 1.2) + swirl * 0.6 - vec2(0.0, u_time * 0.02));',
      '  vec3 col = palette(r * 0.9 + q * 0.25);',
      '  float vign = smoothstep(1.15, 0.15, length(p));',
      '  float glow = smoothstep(0.55, 0.0, length(p - swirl * 0.4)) * 0.25;',
      '  col = mix(vec3(0.043, 0.043, 0.059), col, vign * 0.55 + glow);',
      '  float dith = (hash(gl_FragCoord.xy + u_time) - 0.5) / 255.0;',
      '  gl_FragColor = vec4(col + dith, 1.0);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader compile failed');
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('shader link failed');
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uPtr = gl.getUniformLocation(prog, 'u_ptr');

    var px = 0, py = 0, tx = 0, ty = 0; // pointer spring (target + lagging value)
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function resize() {
      var scale = isMobile ? 0.5 : 0.75;
      var w = Math.max(2, Math.floor(window.innerWidth * scale));
      var h = Math.max(2, Math.floor(window.innerHeight * scale));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    window.addEventListener('resize', resize); resize();

    var t0 = performance.now();
    var last = 0;
    function draw(now) {
      var t = (now - t0) / 1000;
      t = t % 3600; // wrap so the time uniform never jumps
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPtr, px, py);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      window.__v5AuroraReady = true;
    }
    if (reduced) { draw(performance.now()); return; }
    var visible = true;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      if (now - last < 33) return; // ~30 fps cap
      last = now;
      draw(now);
    }
    requestAnimationFrame(loop);
  } catch (err) {
    var c = document.getElementById('aurora');
    if (c) c.style.display = 'none';
  }
})();
