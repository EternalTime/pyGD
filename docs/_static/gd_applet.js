/* Graph dynamics — interactive applet for the pyGD documentation.
 *
 * The dynamics are a direct port of the library: envStep mirrors
 * dynamics.Kuramoto.evolve (and, in coarse-grained mode,
 * dynamics.KuramotoCG.evolve, degree-modulated frequencies, Wiener
 * fluctuation and all), yokaiStep mirrors agents.Yokai.evolve
 * sub-step for sub-step. The order parameter and the per-node local
 * field are the same quantities update_order_parameter computes.
 * No dependencies, no build step.
 */
(function () {
    'use strict';

    /* ── Geometry and palette ───────────────────────────────────────────── */
    const N = 500;                  // oscillators
    const MEANDEG = 8;              // ER mean degree; p = MEANDEG/(N-1)
    const DT = 0.0625;              // timestep, matching the library default
    const STEPS = 2;                // environment steps per frame
    const TRACE = 900;              // r(t) history length
    const BINS = 360;               // phase histogram bins (1 degree each)

    /* Palette from custom.css: Crimson #8B0037, LightGray #E6E6E6, Black.
     * The slate blue is the one off-palette hue: a cyclic phase map needs a
     * second color or +pi/2 and -pi/2 become indistinguishable. */
    const GRAY = [230, 230, 230];   // #E6E6E6 — theta = 0
    const CRIMSON = [139, 0, 55];   // #8B0037 — theta = +pi/2
    const DUSK = [32, 30, 38];      // near-black — theta = pi (never invisible)
    const SLATE = [0, 84, 139];     // #00548B — theta = -pi/2
    const ROSE = '#C25E7E';         // lightened crimson for accents on black

    /* Twilight-style cyclic map: 256 colors around the wheel through the
     * four anchors. u = 0 is theta = 0, u = 0.25 is +pi/2, and so on. */
    const ANCHORS = [GRAY, CRIMSON, DUSK, SLATE];
    const LUT = new Array(256);
    for (let n = 0; n < 256; n++) {
        const t = 4 * n / 256, s = Math.floor(t), f = t - s;
        const a = ANCHORS[s], b = ANCHORS[(s + 1) % 4];
        LUT[n] = 'rgb(' + Math.round(a[0] + f * (b[0] - a[0])) + ','
                        + Math.round(a[1] + f * (b[1] - a[1])) + ','
                        + Math.round(a[2] + f * (b[2] - a[2])) + ')';
    }

    /* theta in (-pi, pi] -> position on the color wheel in [0, 1). */
    function hue(theta) {
        return (theta / (2 * Math.PI) + 1) % 1;
    }

    /* ── Random numbers ─────────────────────────────────────────────────── */

    /* Box-Muller standard normal, one spare cached (KuramotoCG's
     * rng.standard_normal and the omegas). */
    let gaussSpare = null;
    function gauss() {
        if (gaussSpare !== null) {
            const g = gaussSpare; gaussSpare = null; return g;
        }
        let u, v, s;
        do {
            u = 2 * Math.random() - 1;
            v = 2 * Math.random() - 1;
            s = u * u + v * v;
        } while (s >= 1 || s === 0);
        const m = Math.sqrt(-2 * Math.log(s) / s);
        gaussSpare = v * m;
        return u * m;
    }

    /* ── The graph (ports the networkx handoff) ─────────────────────────── */

    /* Erdos-Renyi G(N, p) as adjacency lists; the one graph the applet
     * runs on, built once at boot. */
    function erdosRenyi(n, p) {
        const adj = Array.from({ length: n }, () => []);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.random() < p) { adj[i].push(j); adj[j].push(i); }
            }
        }
        return adj.map(a => Int32Array.from(a));
    }

    /* Fruchterman-Reingold spring layout, computed once at boot and then
     * frozen — the JS analogue of plot_phases' spring_layout. Returns
     * positions normalized to the unit square at equal scale. */
    function springLayout(adj, iters) {
        const n = adj.length;
        const px = new Float64Array(n), py = new Float64Array(n);
        for (let i = 0; i < n; i++) { px[i] = Math.random(); py[i] = Math.random(); }
        const k = Math.sqrt(1 / n);
        const dx = new Float64Array(n), dy = new Float64Array(n);
        let temp = 0.1;
        const cool = temp / iters;
        for (let it = 0; it < iters; it++) {
            dx.fill(0); dy.fill(0);
            for (let i = 0; i < n; i++) {           // repulsion, all pairs
                for (let j = i + 1; j < n; j++) {
                    const vx = px[i] - px[j], vy = py[i] - py[j];
                    const d2 = vx * vx + vy * vy + 1e-9;
                    const f = k * k / d2;
                    dx[i] += vx * f; dy[i] += vy * f;
                    dx[j] -= vx * f; dy[j] -= vy * f;
                }
            }
            for (let i = 0; i < n; i++) {           // attraction, edges
                const nb = adj[i];
                for (let m = 0; m < nb.length; m++) {
                    const j = nb[m];
                    if (j <= i) continue;
                    const vx = px[i] - px[j], vy = py[i] - py[j];
                    const d = Math.sqrt(vx * vx + vy * vy) + 1e-9;
                    const f = d / k;
                    dx[i] -= vx / d * f; dy[i] -= vy / d * f;
                    dx[j] += vx / d * f; dy[j] += vy / d * f;
                }
            }
            for (let i = 0; i < n; i++) {           // capped move
                const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 1e-9;
                const cap = Math.min(len, temp) / len;
                px[i] += dx[i] * cap;
                py[i] += dy[i] * cap;
            }
            temp -= cool;
        }
        // Normalize to the unit square at equal scale in x and y.
        let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
        for (let i = 0; i < n; i++) {
            if (px[i] < xmin) xmin = px[i]; if (px[i] > xmax) xmax = px[i];
            if (py[i] < ymin) ymin = py[i]; if (py[i] > ymax) ymax = py[i];
        }
        const s = 1 / Math.max(xmax - xmin, ymax - ymin);
        const ox = (1 - (xmax - xmin) * s) / 2, oy = (1 - (ymax - ymin) * s) / 2;
        for (let i = 0; i < n; i++) {
            px[i] = ox + (px[i] - xmin) * s;
            py[i] = oy + (py[i] - ymin) * s;
        }
        return { px, py };
    }

    /* ── Parameters and state ───────────────────────────────────────────── */
    const P = {
        mode: 'bare',       // bare | yokai | cg
        sigma: 0.5,         // coupling
        alpha: 0.5,         // Yokai kick strength
        beta: 0.16,         // Yokai hop speed; speed = ceil(beta * N)
        eta: 0.0,           // Yokai sensor noise
        ab: 0.08            // KuramotoCG alpha*beta
    };

    let adj = null, deg = null, meandeg = 0;
    let layout = null;
    let thetas = null;          // Float64Array(N), wrapped to (-pi, pi]
    let omegas0 = null;         // base natural frequencies, fixed at boot
    let omegas = null;          // effective frequencies (CG-modulated)
    let fluc = null;            // CG per-node fluctuation amplitude
    let imKr = null;            // imag part of the local field
    let yokLoc = 0, yokSpeed = 1;
    let rNow = 0, phiNow = 0;
    let running = true;

    const traceR = [];
    const hist = new Float64Array(BINS);
    const histS = new Float64Array(BINS);

    /* Circular Gaussian kernel for smoothing the histogram over angle.
     * The width is fixed in angle (sigma = 0.2 rad), independent of the
     * bin size; with 1-degree bins the rendered silhouette is smooth. */
    const KSIG = 0.2 / (2 * Math.PI / BINS);    // sigma in bins
    const KHW = Math.ceil(3 * KSIG);
    const KERN = new Float64Array(2 * KHW + 1);
    {
        let ksum = 0;
        for (let k = -KHW; k <= KHW; k++) {
            KERN[k + KHW] = Math.exp(-k * k / (2 * KSIG * KSIG));
            ksum += KERN[k + KHW];
        }
        for (let k = 0; k < KERN.length; k++) KERN[k] /= ksum;
    }

    function wrap(t) {
        return ((t + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    }

    /* Effective frequencies and fluctuations for the current mode. In CG
     * mode this is the KuramotoCG constructor: omegas shifted by
     * ab*sign(omega)*deg/meandeg then centered, fluc =
     * sqrt(dt*ab*deg/meandeg). The Yokai's speed is sized here too. */
    function setupMode() {
        if (P.mode === 'cg') {
            omegas = new Float64Array(N);
            fluc = new Float64Array(N);
            let mean = 0;
            for (let i = 0; i < N; i++) {
                omegas[i] = omegas0[i] + P.ab * Math.sign(omegas0[i]) * deg[i] / meandeg;
                mean += omegas[i];
                fluc[i] = Math.sqrt(DT * P.ab * deg[i] / meandeg);
            }
            mean /= N;
            for (let i = 0; i < N; i++) omegas[i] -= mean;
        } else {
            omegas = omegas0;
            fluc = null;
        }
        yokSpeed = Math.max(1, Math.ceil(P.beta * N));
    }

    /* Random phases (r0 = 0), fresh traces, a fresh Yokai. The graph and
     * its layout are never rebuilt: one ER graph, preconstructed. */
    function seed() {
        thetas = new Float64Array(N);
        for (let i = 0; i < N; i++) thetas[i] = (2 * Math.random() - 1) * Math.PI;
        yokLoc = Math.floor(Math.random() * N);
        traceR.length = 0;
        setupMode();
    }

    /* ── Dynamics (port dynamics.py) ────────────────────────────────────── */

    /* imag(krexp) = sum_j sin(theta_j - theta_i): the sparse mat-vec
     * (A @ exp(i*theta)) * conj(exp(i*theta)) done neighbor by neighbor. */
    function computeIm() {
        for (let i = 0; i < N; i++) {
            const th = thetas[i], nb = adj[i];
            let s = 0;
            for (let m = 0; m < nb.length; m++) s += Math.sin(thetas[nb[m]] - th);
            imKr[i] = s;
        }
    }

    /* Kuramoto.evolve (Euler) or KuramotoCG.evolve (Euler-Maruyama):
     * two-pass, so the update is synchronous like the vectorized one. */
    function envStep() {
        computeIm();
        if (P.mode === 'cg') {
            for (let i = 0; i < N; i++) {
                thetas[i] = wrap(thetas[i]
                    + DT * (omegas[i] + P.sigma * imKr[i])
                    + fluc[i] * gauss());
            }
        } else {
            for (let i = 0; i < N; i++) {
                thetas[i] = wrap(thetas[i] + DT * (omegas[i] + P.sigma * imKr[i]));
            }
        }
    }

    /* Yokai.evolve: `speed` measure-kick-hop sub-steps, mutating the
     * phases in place, sequentially — exactly the Python loop. */
    function yokaiStep() {
        for (let s = 0; s < yokSpeed; s++) {
            const nb = adj[yokLoc];
            let phiEst = 0;
            if (nb.length > 0) {
                let re = 0, im = 0;
                for (let m = 0; m < nb.length; m++) {
                    re += Math.cos(thetas[nb[m]]);
                    im += Math.sin(thetas[nb[m]]);
                }
                phiEst = Math.atan2(im, re);
            }
            if (P.eta > 0) {
                phiEst += P.eta * (2 * Math.random() - 1) * Math.PI;
            }
            const dphi = Math.sign(Math.sin(thetas[yokLoc] - phiEst));
            thetas[yokLoc] = wrap(thetas[yokLoc] + P.alpha * dphi);
            if (nb.length > 1) {
                yokLoc = nb[Math.floor(Math.random() * nb.length)];
            } else if (nb.length === 1) {
                yokLoc = nb[0];
            } else {
                yokLoc = Math.floor(Math.random() * N);
            }
        }
    }

    /* Z = mean(exp(i*theta)); r and phi feed the meters. */
    function orderParameter() {
        let re = 0, im = 0;
        for (let i = 0; i < N; i++) {
            re += Math.cos(thetas[i]);
            im += Math.sin(thetas[i]);
        }
        re /= N; im /= N;
        rNow = Math.sqrt(re * re + im * im);
        phiNow = Math.atan2(im, re);
    }

    /* Agent first, then environment — the order of the library's own
     * driving loop (yok.evolve(env); env.evolve()). */
    function step() {
        if (P.mode === 'yokai') yokaiStep();
        envStep();
        orderParameter();
        traceR.push(rNow);
        if (traceR.length > TRACE) traceR.shift();
    }

    /* ── Rendering ──────────────────────────────────────────────────────── */
    let canvas, ctx, edgeCv, traceCv, roseCv;
    let X = null, Y = null;     // node pixel coordinates

    /* Map the frozen layout into the canvas at equal scale, and bake the
     * (static) edges into an offscreen layer: one stroke per resize, not
     * per frame. */
    function fitLayout() {
        const W = canvas.width, H = canvas.height, m = 16;
        const s = Math.min(W, H) - 2 * m;
        const ox = (W - s) / 2, oy = (H - s) / 2;
        for (let i = 0; i < N; i++) {
            X[i] = ox + layout.px[i] * s;
            Y[i] = oy + layout.py[i] * s;
        }
        edgeCv.width = W; edgeCv.height = H;
        const c = edgeCv.getContext('2d');
        c.clearRect(0, 0, W, H);
        c.strokeStyle = 'rgba(230, 230, 230, 0.25)';
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < N; i++) {
            const nb = adj[i];
            for (let m2 = 0; m2 < nb.length; m2++) {
                const j = nb[m2];
                if (j > i) { c.moveTo(X[i], Y[i]); c.lineTo(X[j], Y[j]); }
            }
        }
        c.stroke();
    }

    function draw() {
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(edgeCv, 0, 0);
        ctx.strokeStyle = 'rgba(230, 230, 230, 0.28)';
        ctx.lineWidth = 0.75;
        for (let i = 0; i < N; i++) {
            ctx.fillStyle = LUT[(hue(thetas[i]) * 256) & 255];
            ctx.beginPath();
            ctx.arc(X[i], Y[i], 3, 0, 6.283);
            ctx.fill();
            ctx.stroke();
        }
        if (P.mode === 'yokai') {       // the agent, ringed in light gray
            ctx.strokeStyle = '#E6E6E6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(X[yokLoc], Y[yokLoc], 7, 0, 6.283);
            ctx.stroke();
        }
    }

    /* r(t) on [0, 1] against the trace window. */
    function drawTrace(cv) {
        const c = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        c.clearRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        c.lineWidth = 1;
        c.strokeRect(0.5, 0.5, W - 1, H - 1);
        const n = traceR.length;
        if (!n) return;
        c.strokeStyle = ROSE;
        c.lineWidth = 1.4;
        c.beginPath();
        for (let i = 0; i < n; i++) {
            const x = 2 + (i / (TRACE - 1)) * (W - 4);
            const y = H - 2 - traceR[i] * (H - 4);
            i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
    }

    /* Rose plot: the phase histogram as wedges on the unit circle, each
     * filled with its bin's wheel color — the plot doubles as the colormap
     * legend — with the order parameter Z drawn as an arrow of length r. */
    function drawRose(cv) {
        const c = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 4;
        c.clearRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(cx, cy, R, 0, 6.283);
        c.stroke();
        hist.fill(0);
        for (let i = 0; i < N; i++) {
            hist[Math.min(BINS - 1, (hue(thetas[i]) * BINS) | 0)]++;
        }
        for (let b = 0; b < BINS; b++) {          // smooth over angle, wrapping
            let s = 0;
            for (let k = -KHW; k <= KHW; k++) {
                s += KERN[k + KHW] * hist[(b + k + BINS) % BINS];
            }
            histS[b] = s;
        }
        let max = 1e-12;
        for (let b = 0; b < BINS; b++) if (histS[b] > max) max = histS[b];
        for (let b = 0; b < BINS; b++) {
            if (!histS[b]) continue;
            const rr = R * histS[b] / max;
            const a0 = (b / BINS) * 2 * Math.PI;
            const a1 = ((b + 1) / BINS) * 2 * Math.PI;
            c.fillStyle = LUT[(((b + 0.5) / BINS) * 256) & 255];
            c.beginPath();
            c.moveTo(cx, cy);
            c.arc(cx, cy, rr, -a1, -a0);    // canvas y is down: negate angles
            c.closePath();
            c.fill();
        }
        // Z: length r, angle phi.
        const ax = cx + Math.cos(phiNow) * rNow * R;
        const ay = cy - Math.sin(phiNow) * rNow * R;
        c.strokeStyle = '#E6E6E6';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(ax, ay); c.stroke();
        c.fillStyle = '#E6E6E6';
        c.beginPath(); c.arc(ax, ay, 3, 0, 6.283); c.fill();
    }

    /* ── Loop ───────────────────────────────────────────────────────────── */
    function frame() {
        if (running) {
            for (let s = 0; s < STEPS; s++) step();
        }
        // Painted even when paused, so a window resize cannot blank the card.
        draw();
        drawTrace(traceCv);
        drawRose(roseCv);
        requestAnimationFrame(frame);
    }

    /* ── UI ─────────────────────────────────────────────────────────────── */
    const UI = `
      <div id="gd-head">
        <span class="gd-title">pyGD</span>
        <select id="gd-mode">
          <option value="bare">Kuramoto — bare environment</option>
          <option value="yokai">Kuramoto + Yokai</option>
          <option value="cg">KuramotoCG — coarse-grained</option>
        </select>
        <button class="gd-hbtn" id="gd-reset">Reset</button>
        <button class="gd-hbtn" id="gd-pause">Pause</button>
      </div>
      <div id="gd-stage">
        <canvas id="gd-canvas" width="640" height="420"></canvas>
        <div id="gd-controls" class="gd-ov">
          <div class="gd-ctl" data-kinds="bare yokai cg">
            <label for="gd-sigma"><span>coupling \\(\\sigma\\)</span> <span class="val" id="gd-sigma-val">0.50</span></label>
            <input type="range" id="gd-sigma" min="0" max="1" step="0.005" value="0.5">
          </div>
          <div class="gd-ctl" data-kinds="yokai">
            <label for="gd-alpha"><span>kick strength \\(\\alpha\\)</span> <span class="val" id="gd-alpha-val">0.50</span></label>
            <input type="range" id="gd-alpha" min="0" max="2" step="0.01" value="0.5">
          </div>
          <div class="gd-ctl" data-kinds="yokai">
            <label for="gd-beta"><span>hop speed \\(\\beta\\)</span> <span class="val" id="gd-beta-val">0.16</span></label>
            <input type="range" id="gd-beta" min="0" max="0.5" step="0.002" value="0.16">
          </div>
          <div class="gd-ctl" data-kinds="yokai">
            <label for="gd-eta"><span>sensor noise \\(\\eta\\)</span> <span class="val" id="gd-eta-val">0.00</span></label>
            <input type="range" id="gd-eta" min="0" max="1" step="0.01" value="0">
          </div>
          <div class="gd-ctl" data-kinds="cg">
            <label for="gd-ab"><span>drive \\(\\alpha\\beta\\)</span> <span class="val" id="gd-ab-val">0.080</span></label>
            <input type="range" id="gd-ab" min="0" max="0.4" step="0.002" value="0.08">
          </div>
        </div>
        <div id="gd-meters" class="gd-ov">
          <canvas id="gd-trace" width="160" height="72"></canvas>
          <div class="gd-cap">order parameter \\(r(t)\\)</div>
          <canvas id="gd-rose" width="160" height="160"></canvas>
          <div class="gd-cap">phase histogram, \\(Z\\)</div>
        </div>
      </div>
    `;

    /* The docs load MathJax (sphinx.ext.mathjax), but it has already swept
     * the page by the time we inject this markup, so typeset by hand. */
    function typesetMath(el) {
        const M = window.MathJax;
        if (!M) return;
        if (M.startup && M.startup.promise) {
            M.startup.promise.then(() => M.typesetPromise([el])).catch(() => {});
        } else if (M.typesetPromise) {
            M.typesetPromise([el]).catch(() => {});
        }
    }

    function showControls() {
        document.querySelectorAll('#gd-controls .gd-ctl').forEach(el => {
            const kinds = el.getAttribute('data-kinds').split(' ');
            el.style.display = kinds.indexOf(P.mode) >= 0 ? '' : 'none';
        });
    }

    function on(id, event, fn) {
        document.getElementById(id).addEventListener(event, fn);
    }

    function boot() {
        const root = document.getElementById('gd-app');
        if (!root) return;
        root.innerHTML = UI;
        typesetMath(root);

        canvas = document.getElementById('gd-canvas');
        ctx = canvas.getContext('2d');
        traceCv = document.getElementById('gd-trace');
        roseCv = document.getElementById('gd-rose');
        edgeCv = document.createElement('canvas');

        // The one graph, its frequencies, and its frozen layout.
        adj = erdosRenyi(N, MEANDEG / (N - 1));
        deg = new Float64Array(N);
        for (let i = 0; i < N; i++) { deg[i] = adj[i].length; meandeg += deg[i]; }
        meandeg /= N;
        omegas0 = new Float64Array(N);
        for (let i = 0; i < N; i++) omegas0[i] = gauss();
        layout = springLayout(adj, 200);
        imKr = new Float64Array(N);
        X = new Float64Array(N);
        Y = new Float64Array(N);

        function resizeCanvas() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w && h && (canvas.width !== w || canvas.height !== h)) {
                canvas.width = w;
                canvas.height = h;
                fitLayout();
            }
        }
        resizeCanvas();
        fitLayout();
        window.addEventListener('resize', resizeCanvas);

        seed();
        showControls();

        on('gd-mode', 'change', function () {
            P.mode = this.value;
            showControls();
            seed();
        });
        on('gd-sigma', 'input', function () {
            P.sigma = parseFloat(this.value);
            document.getElementById('gd-sigma-val').textContent = P.sigma.toFixed(2);
        });
        on('gd-alpha', 'input', function () {
            P.alpha = parseFloat(this.value);
            document.getElementById('gd-alpha-val').textContent = P.alpha.toFixed(2);
        });
        on('gd-beta', 'input', function () {
            P.beta = parseFloat(this.value);
            yokSpeed = Math.max(1, Math.ceil(P.beta * N));
            document.getElementById('gd-beta-val').textContent = P.beta.toFixed(2);
        });
        on('gd-eta', 'input', function () {
            P.eta = parseFloat(this.value);
            document.getElementById('gd-eta-val').textContent = P.eta.toFixed(2);
        });
        on('gd-ab', 'input', function () {
            P.ab = parseFloat(this.value);
            document.getElementById('gd-ab-val').textContent = P.ab.toFixed(3);
            if (P.mode === 'cg') setupMode();   // re-derive omegas and fluc
        });
        on('gd-reset', 'click', seed);
        on('gd-pause', 'click', function () {
            running = !running;
            this.textContent = running ? 'Pause' : 'Resume';
        });

        requestAnimationFrame(frame);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
