/* Wayne.clips v5 — Clip Orbit hero scene (Three.js 0.160.0, ES module).
   Four floating 9:16 glass frames textured with the REAL sample thumbnails orbit
   a glowing core; ~1,200 CPU particles (spring-home + pointer-repel + click-burst)
   drift around them. The render loop owns ALL output: it reads a plain scroll
   proxy (window.__v5Journey.progress, set by ScrollTrigger) and pointer state —
   nothing is tweened directly. Fully guarded: any failure leaves the page intact. */
import * as THREE from 'three';

(function () {
  try {
    var canvas = document.getElementById('orbit3d');
    if (!canvas || !window.WebGLRenderingContext) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0b0f, 0.045);
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    // Mobile portrait has a narrow horizontal FOV: pull the camera back and
    // shrink/lower the orbit so the frames stay out of the copy column.
    var baseZ = isMobile ? 10.2 : 7.6;
    camera.position.set(0, 0.1, baseZ);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(4, 6, 6); scene.add(dir);
    var warm = new THREE.PointLight(0xffb020, 55, 30); warm.position.set(-4, -1, 3); scene.add(warm);
    var cool = new THREE.PointLight(0xff5c39, 40, 30); cool.position.set(5, 2, 2); scene.add(cool);

    /* ---------- helpers ---------- */
    function gradientTexture(lines, bg1, bg2) {
      // lines: [{text, size, color, y}] drawn on a 540x960 canvas (9:16)
      var c = document.createElement('canvas'); c.width = 540; c.height = 960;
      var g = c.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 540, 960);
      grad.addColorStop(0, bg1); grad.addColorStop(1, bg2);
      g.fillStyle = grad; g.fillRect(0, 0, 540, 960);
      g.fillStyle = 'rgba(255,176,32,0.16)';
      g.beginPath(); g.arc(270, 330, 190, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffb020'; g.font = '700 26px monospace';
      g.fillText('WAYNE.CLIPS', 36, 60);
      lines.forEach(function (l) {
        g.fillStyle = l.color || '#f5f4f0';
        g.font = (l.weight || '700') + ' ' + l.size + 'px "Space Grotesk", sans-serif';
        var words = l.text.split('\n');
        words.forEach(function (w, i) { g.fillText(w, 36, l.y + i * (l.size + 10)); });
      });
      var tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    /* ---------- Clip Orbit: 4 frames ---------- */
    var orbit = new THREE.Group();
    if (isMobile) { orbit.scale.setScalar(0.72); orbit.position.y = -0.6; }
    scene.add(orbit);

    // Glowing core
    var core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.25 })
    );
    orbit.add(core);
    var coreLight = new THREE.PointLight(0xffb020, 30, 12); orbit.add(coreLight);
    // Orbit ring
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.012, 8, 120),
      new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.3 })
    );
    ring.rotation.x = Math.PI / 2.35;
    orbit.add(ring);

    var loader = new THREE.TextureLoader();
    var frameDefs = [
      { src: 'samples/miami-crime-rp-thumb.jpg', label: 'MIAMI CRIME RP', angle: -0.95, y: 0.55 },
      { src: 'samples/make-fun-thumb.jpg', label: 'MAKE.FUN', angle: -0.32, y: -0.55 },
      { src: 'samples/forgegui-thumb.jpg', label: 'FORGEGUI', angle: 0.32, y: 0.55 },
      { src: null, label: 'TRILLIONAIRE', angle: 0.95, y: -0.55 } // gradient + title, no invented thumbnail
    ];
    var frames = [];
    var FW = 1.35, FH = 2.4; // 9:16
    frameDefs.forEach(function (def, i) {
      var group = new THREE.Group();
      var radius = 2.9;
      group.position.set(Math.sin(def.angle) * radius, def.y, Math.cos(def.angle) * radius - 2.4);
      group.rotation.y = -def.angle * 0.55;
      group.userData = { baseY: def.y, phase: i * 1.7, angle: def.angle };

      // Glass backing, slightly larger than the frame
      var backing = new THREE.Mesh(
        new THREE.PlaneGeometry(FW + 0.14, FH + 0.14),
        new THREE.MeshPhysicalMaterial({ color: 0x1a1a26, metalness: 0.4, roughness: 0.25, transparent: true, opacity: 0.92, clearcoat: 0.6 })
      );
      backing.position.z = -0.03;
      group.add(backing);

      var mat;
      if (def.src) {
        mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        loader.load(def.src,
          function (tex) { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; },
          undefined,
          function () { // thumbnail failed: honest gradient fallback with the real title
            mat.map = gradientTexture([{ text: def.label, size: 44, y: 480 }], '#23233a', '#101018');
            mat.needsUpdate = true;
          });
      } else {
        // Trillionaire: generated gradient + title treatment, never an invented thumbnail
        mat = new THREE.MeshBasicMaterial({
          map: gradientTexture([
            { text: 'SHE CHEATED…', size: 40, y: 430 },
            { text: 'SO HE BECAME A', size: 40, y: 490 },
            { text: 'TRILLIONAIRE', size: 58, color: '#ffb020', y: 570 },
            { text: '@zunixaura · 60s', size: 26, color: '#a9a8b3', weight: '400', y: 640 },
            { text: 'GTA 6 STORY SHORT', size: 22, color: '#a9a8b3', weight: '400', y: 690 }
          ], '#1d1607', '#241105')
        });
      }
      var frame = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), mat);
      group.add(frame);

      // Amber edge outline
      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(FW + 0.14, FH + 0.14)),
        new THREE.LineBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.55 })
      );
      edges.position.z = 0.01;
      group.add(edges);

      orbit.add(group);
      frames.push(group);
    });

    /* ---------- CPU particles: ~1,200, spring-home + pointer-repel + click-burst ---------- */
    /* Mobile render budget (19 Nov 2026 — scroll fix): the orbit is a decorative
       background, so on phones it runs cheap — fewer particles, no MSAA, DPR 1 —
       so the main thread stays free and touch scrolling stays instant. */
    var COUNT = isMobile ? 300 : 1200;
    var pos = new Float32Array(COUNT * 3);
    var home = new Float32Array(COUNT * 3);
    var vel = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      // Home positions: shell around the orbit
      var a = Math.random() * Math.PI * 2;
      var r = 2.2 + Math.random() * 2.6;
      home[i * 3] = Math.cos(a) * r;
      home[i * 3 + 1] = (Math.random() - 0.5) * 5.2;
      home[i * 3 + 2] = Math.sin(a) * r * 0.6 - 1.2;
      pos[i * 3] = home[i * 3]; pos[i * 3 + 1] = home[i * 3 + 1]; pos[i * 3 + 2] = home[i * 3 + 2];
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // Soft round sprite texture (canvas radial gradient)
    var spriteCanvas = document.createElement('canvas'); spriteCanvas.width = spriteCanvas.height = 64;
    var sg = spriteCanvas.getContext('2d');
    var radial = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    radial.addColorStop(0, 'rgba(255,255,255,1)');
    radial.addColorStop(0.4, 'rgba(255,198,92,0.8)');
    radial.addColorStop(1, 'rgba(255,198,92,0)');
    sg.fillStyle = radial; sg.fillRect(0, 0, 64, 64);
    var spriteTex = new THREE.CanvasTexture(spriteCanvas);
    var pMat = new THREE.PointsMaterial({
      size: 0.09, map: spriteTex, color: 0xffc65c, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    /* Pointer: unified Pointer Events, raycast onto the z=0 plane */
    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2(999, 999); // off-screen until first move
    var pointer3 = new THREE.Vector3(0, 0, 0);
    var pointerActive = false;
    var burst = 0;
    function updatePointer(e) {
      ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointerActive = true;
    }
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', function (e) { updatePointer(e); burst = 1; }, { passive: true });
    var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    function updatePointer3() {
      if (!pointerActive) return;
      raycaster.setFromCamera(ndc, camera);
      var hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) pointer3.copy(hit);
    }

    /* ---------- resize / visibility ---------- */
    function resize() {
      var w = canvas.parentElement.clientWidth || window.innerWidth;
      var h = canvas.parentElement.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    var visible = true;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);

    /* ---------- render loop: reads scroll proxy + pointer, draws ---------- */
    var clock = new THREE.Clock();
    var px = 0, py = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      var t = clock.getElapsedTime();
      var journey = (window.__v5Journey && typeof window.__v5Journey.progress === 'number')
        ? window.__v5Journey.progress
        : (window.__v5Scroll || 0);
      journey = Math.min(1, Math.max(0, journey));

      // Core pulse + orbit drift
      core.rotation.y = t * 0.4; core.rotation.x = t * 0.23;
      var pulse = 1 + Math.sin(t * 1.6) * 0.08;
      core.scale.setScalar(pulse);
      coreLight.intensity = 30 * pulse;
      orbit.rotation.y = t * 0.05 + journey * 1.1;
      ring.rotation.z = t * 0.1;

      // Frames: gentle float + tilt toward pointer
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      frames.forEach(function (f) {
        f.position.y = f.userData.baseY + Math.sin(t * 0.8 + f.userData.phase) * 0.14;
        f.rotation.y = -f.userData.angle * 0.55 + px * 0.35;
        f.rotation.x = -py * 0.2;
      });

      // Particles: spring home, pointer repel, click burst, wave drift
      updatePointer3();
      burst *= 0.94;
      for (var i = 0; i < COUNT; i++) {
        var ix = i * 3, iy = ix + 1, iz = ix + 2;
        // spring toward home
        vel[ix] += (home[ix] - pos[ix]) * 0.012;
        vel[iy] += (home[iy] - pos[iy]) * 0.012;
        vel[iz] += (home[iz] - pos[iz]) * 0.012;
        // gentle wave drift
        vel[iy] += Math.sin(t * 0.9 + i * 0.35) * 0.0006;
        // pointer repel
        if (pointerActive) {
          var dx = pos[ix] - pointer3.x, dy = pos[iy] - pointer3.y, dz = pos[iz] - pointer3.z;
          var d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1.44 && d2 > 0.0001) {
            var d = Math.sqrt(d2);
            var force = (1.2 - d) * 0.09;
            vel[ix] += (dx / d) * force; vel[iy] += (dy / d) * force; vel[iz] += (dz / d) * force;
          }
        }
        // click burst: radial push from the pointer
        if (burst > 0.02 && pointerActive) {
          var bx = pos[ix] - pointer3.x, by = pos[iy] - pointer3.y, bz = pos[iz] - pointer3.z;
          var bd = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
          if (bd < 3.2) {
            var bf = burst * 0.06 * (1 - bd / 3.2);
            vel[ix] += (bx / bd) * bf; vel[iy] += (by / bd) * bf; vel[iz] += (bz / bd) * bf;
          }
        }
        // damping + integrate
        vel[ix] *= 0.92; vel[iy] *= 0.92; vel[iz] *= 0.92;
        pos[ix] += vel[ix]; pos[iy] += vel[iy]; pos[iz] += vel[iz];
      }
      pGeo.attributes.position.needsUpdate = true;
      points.rotation.y = t * 0.02 + journey * 0.6;

      // Camera: pointer parallax + scroll dolly through the orbit
      camera.position.x = px * 0.7;
      camera.position.y = 0.1 - py * 0.45 + journey * 0.5;
      camera.position.z = baseZ - journey * 2.4;
      camera.lookAt(0, journey * 0.3, -1);
      renderer.render(scene, camera);
      window.__v5OrbitReady = true;
    }

    if (reduced) {
      // One static frame; no loop.
      orbit.rotation.y = 0.4;
      renderer.render(scene, camera);
      window.__v5OrbitReady = true;
    } else {
      frame();
    }
  } catch (err) {
    /* 3D is enhancement only — the page works without it. */
    if (window.console && console.warn) console.warn('[wayne v5] 3D disabled:', err && err.message);
  }
})();
