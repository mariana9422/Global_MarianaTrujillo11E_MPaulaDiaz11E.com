/* stats.js — Statistical functions for hypothesis testing */

/**
 * Standard normal PDF
 */
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF using Hart approximation (accurate to ~7 decimal places)
 */
function normalCDF(z) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * Inverse normal CDF (percent-point function) via Beasley-Springer-Moro approximation
 */
function invNormalCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return  Infinity;
  const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [0, -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [0,  7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00];
  const pLow  = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
           ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q /
           (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
             ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  }
}

/**
 * Compute p-value given z and direction
 */
function computePValue(z, direction) {
  if (direction === 'left')  return normalCDF(z);
  if (direction === 'right') return 1 - normalCDF(z);
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * Critical value(s) given alpha and direction
 */
function criticalValues(alpha, direction) {
  if (direction === 'left')  return [invNormalCDF(alpha)];
  if (direction === 'right') return [invNormalCDF(1 - alpha)];
  return [invNormalCDF(alpha / 2), invNormalCDF(1 - alpha / 2)];
}

/**
 * z-statistic for means
 */
function zMean(mu0, xbar, sigma, n) {
  return (xbar - mu0) / (sigma / Math.sqrt(n));
}

/**
 * z-statistic for proportions
 */
function zProportion(p0, phat, n) {
  return (phat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
}

/**
 * Parse CSV text → array of objects
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i]; });
    return obj;
  });
  return { headers, rows };
}

/**
 * Summary statistics for an array of numbers
 */
function summaryStats(arr) {
  const n = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return { n, mean, std: Math.sqrt(variance) };
}

/**
 * Detect if a column of values is binary (0/1) → proportion mode
 */
function isBinary(arr) {
  return arr.every(v => v === 0 || v === 1);
}

/**
 * Two-sample z-test (large samples)
 * benchmark group = reference, test group = measured
 */
function twoGroupZTest(benchArr, testArr, direction) {
  const bStats = summaryStats(benchArr);
  const tStats = summaryStats(testArr);

  let z, type;

  if (isBinary(benchArr) && isBinary(testArr)) {
    // Proportion test
    const p0 = bStats.mean;
    const phat = tStats.mean;
    const n = tStats.n;
    z = zProportion(p0, phat, n);
    type = 'proportion';
  } else {
    // Mean test: use benchmark as mu0
    const mu0 = bStats.mean;
    const xbar = tStats.mean;
    const sigma = bStats.std || tStats.std;
    const n = tStats.n;
    z = zMean(mu0, xbar, sigma, n);
    type = 'mean';
  }

  return { z, type, bStats, tStats };
}
