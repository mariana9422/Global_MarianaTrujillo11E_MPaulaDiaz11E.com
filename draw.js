/* draw.js — Normal curve rendering on Canvas */

/**
 * Draw a hypothesis test result on a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {number} z        - observed test statistic
 * @param {number} pvalue   - computed p-value
 * @param {number} alpha    - significance level
 * @param {string} direction - 'left' | 'right' | 'two'
 */
function drawNormalCurve(canvas, z, pvalue, alpha, direction) {
  const ctx    = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;
  const PAD    = { top: 30, bottom: 50, left: 50, right: 50 };
  const plotW  = W - PAD.left - PAD.right;
  const plotH  = H - PAD.top  - PAD.bottom;

  // ── clear
  ctx.clearRect(0, 0, W, H);

  // ── background
  ctx.fillStyle = '#1d2029';
  ctx.fillRect(0, 0, W, H);

  // ── domain
  const xMin = -4;
  const xMax =  4;
  const yMax =  normalPDF(0) * 1.12;

  function toCanvasX(x) { return PAD.left + ((x - xMin) / (xMax - xMin)) * plotW; }
  function toCanvasY(y) { return PAD.top  + (1 - y / yMax) * plotH; }

  // ── generate curve points
  const steps = 400;
  const dx    = (xMax - xMin) / steps;
  const pts   = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    pts.push({ x: toCanvasX(x), y: toCanvasY(normalPDF(x)), raw: x });
  }

  // Helper: shade region between raw x values
  function shadeRegion(x0raw, x1raw, color) {
    const cx0 = Math.max(PAD.left,      toCanvasX(Math.max(x0raw, xMin)));
    const cx1 = Math.min(PAD.left + plotW, toCanvasX(Math.min(x1raw, xMax)));
    if (cx1 <= cx0) return;

    ctx.beginPath();
    ctx.moveTo(cx0, toCanvasY(0));
    const substeps = 200;
    const sdx = (x1raw - x0raw) / substeps;
    for (let i = 0; i <= substeps; i++) {
      const sx = x0raw + i * sdx;
      if (sx < xMin || sx > xMax) continue;
      ctx.lineTo(toCanvasX(sx), toCanvasY(normalPDF(sx)));
    }
    ctx.lineTo(cx1, toCanvasY(0));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── shade p-value region (red-ish)
  const pColor = 'rgba(232, 126, 126, 0.45)';
  if (direction === 'left') {
    shadeRegion(xMin, z, pColor);
  } else if (direction === 'right') {
    shadeRegion(z, xMax, pColor);
  } else {
    const absZ = Math.abs(z);
    shadeRegion(xMin, -absZ, pColor);
    shadeRegion(absZ, xMax, pColor);
  }

  // ── shade critical region (yellow, lighter)
  const crits = criticalValues(alpha, direction);
  const cColor = 'rgba(232, 201, 126, 0.15)';
  if (direction === 'left') {
    shadeRegion(xMin, crits[0], cColor);
  } else if (direction === 'right') {
    shadeRegion(crits[0], xMax, cColor);
  } else {
    shadeRegion(xMin, crits[0], cColor);
    shadeRegion(crits[1], xMax, cColor);
  }

  // ── draw curve
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = '#e8e6df';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // ── baseline
  ctx.beginPath();
  ctx.moveTo(PAD.left, toCanvasY(0));
  ctx.lineTo(PAD.left + plotW, toCanvasY(0));
  ctx.strokeStyle = '#2a2d3a';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ── critical value lines
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  crits.forEach(cv => {
    if (cv < xMin || cv > xMax) return;
    const cx = toCanvasX(cv);
    ctx.beginPath();
    ctx.moveTo(cx, PAD.top);
    ctx.lineTo(cx, toCanvasY(0));
    ctx.strokeStyle = '#e8c97e';
    ctx.stroke();
    ctx.fillStyle   = '#e8c97e';
    ctx.font        = '10px DM Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(`z_c=${cv.toFixed(2)}`, cx, PAD.top + 10);
  });
  ctx.setLineDash([]);

  // ── observed z line
  const zClamped = Math.max(xMin + 0.1, Math.min(xMax - 0.1, z));
  const zCx = toCanvasX(zClamped);
  ctx.beginPath();
  ctx.moveTo(zCx, PAD.top);
  ctx.lineTo(zCx, toCanvasY(0));
  ctx.strokeStyle = '#7eb8e8';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // label observed z
  const labelAbove = z > 0;
  ctx.fillStyle = '#7eb8e8';
  ctx.font      = '11px DM Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`z=${z.toFixed(3)}`, zCx, PAD.top + 22);

  // ── axis tick labels
  ctx.fillStyle   = '#7a7d8c';
  ctx.font        = '10px DM Mono, monospace';
  ctx.textAlign   = 'center';
  [-3,-2,-1,0,1,2,3].forEach(t => {
    const tx = toCanvasX(t);
    ctx.fillText(t, tx, PAD.top + plotH + 16);
    ctx.beginPath();
    ctx.moveTo(tx, toCanvasY(0));
    ctx.lineTo(tx, toCanvasY(0) + 4);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth   = 1;
    ctx.stroke();
  });

  // ── p-value label bottom right
  ctx.fillStyle = 'rgba(232,126,126,0.9)';
  ctx.font      = '11px DM Mono, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`p = ${pvalue.toFixed(5)}`, PAD.left + plotW, PAD.top + plotH + 36);
}
