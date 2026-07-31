/* Telemed virtual background — Meet/Zoom-style person die-cut.
   Pipeline:
     soft mask (luma → alpha)
     → mild contrast
     → temporal blend (kills flicker / “แตก”)
     → edge blur (silky AA)
     → person source-in
     → bg under person
*/

const SELFIE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747';

let selfieCtorPromise = null;
const bgImageCache = new Map();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-mih-vb="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') resolve();
      else existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.mihVb = src;
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function loadSelfieSegmentationCtor() {
  if (typeof window === 'undefined') return null;
  if (window.SelfieSegmentation) return window.SelfieSegmentation;
  if (!selfieCtorPromise) {
    selfieCtorPromise = loadScript(`${SELFIE_CDN}/selfie_segmentation.js`)
      .then(() => window.SelfieSegmentation || null)
      .catch((err) => {
        selfieCtorPromise = null;
        throw err;
      });
  }
  return selfieCtorPromise;
}

export function loadBackgroundImage(src) {
  if (!src) return Promise.resolve(null);
  const cached = bgImageCache.get(src);
  if (cached) return cached;

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => {
      bgImageCache.delete(src);
      resolve(null);
    };
    img.src = src;
  });
  bgImageCache.set(src, promise);
  return promise;
}

/** Cover-fit draw (like CSS object-fit: cover). */
export function drawCover(ctx, image, width, height) {
  if (!image) return;
  const iw = image.videoWidth || image.naturalWidth || image.width || width;
  const ih = image.videoHeight || image.naturalHeight || image.height || height;
  if (!iw || !ih) {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function enableHighQuality(ctx) {
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
}

/* Reused offscreen canvases — avoid GC churn every frame. */
const scratch = {
  mask: null,
  blur: null,
  person: null,
  temporal: null,
};

function ensureCanvas(key, width, height) {
  let c = scratch[key];
  if (!c) {
    c = document.createElement('canvas');
    scratch[key] = c;
  }
  if (c.width !== width || c.height !== height) {
    c.width = width;
    c.height = height;
    if (key === 'temporal') c._hasPrev = false;
  }
  return c;
}

/**
 * Build person alpha mask:
 * - Person interior is ALWAYS fully opaque (alpha 255)
 * - Softness exists only on a thin outer rim for AA
 */
export function prepareSoftPersonMask(mask, width, height, {
  /* Mask confidence above this → person (starts solid). */
  solidThreshold = 0.32,
  /* Soft rim below solidThreshold only (narrow). */
  edgeFeather = 0.25,
  edgeBlurPx = 4,
  temporalStrength = 0.30,
  /* After blur/temporal: anything ≥ this → force alpha 255 (person body). */
  resoldifyAt = 0.78,
} = {}) {
  const maskCanvas = ensureCanvas('mask', width, height);
  const blurCanvas = ensureCanvas('blur', width, height);
  const temporalCanvas = ensureCanvas('temporal', width, height);

  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  enableHighQuality(mctx);
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.globalCompositeOperation = 'source-over';
  mctx.globalAlpha = 1;
  mctx.filter = 'none';
  mctx.clearRect(0, 0, width, height);
  mctx.drawImage(mask, 0, 0, width, height);

  const frame = mctx.getImageData(0, 0, width, height);
  const data = frame.data;
  const edgeLo = Math.max(0, solidThreshold - edgeFeather);
  const invFeather = 1 / Math.max(1e-6, solidThreshold - edgeLo);

  for (let i = 0; i < data.length; i += 4) {
    const raw = Math.max(data[i], data[i + 1], data[i + 2], data[i + 3]) / 255;
    let a;
    if (raw >= solidThreshold) {
      /* Person pixels — hard opaque. */
      a = 255;
    } else if (raw <= edgeLo) {
      a = 0;
    } else {
      /* Outer rim only. */
      const x = (raw - edgeLo) * invFeather;
      const t = x * x * (3 - 2 * x);
      a = (t * 255 + 0.5) | 0;
    }
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = a;
  }
  mctx.putImageData(frame, 0, 0);

  const bctx = blurCanvas.getContext('2d', { willReadFrequently: true });
  enableHighQuality(bctx);
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalCompositeOperation = 'source-over';
  bctx.filter = 'none';

  if (temporalCanvas._hasPrev && temporalStrength > 0) {
    bctx.clearRect(0, 0, width, height);
    bctx.globalAlpha = temporalStrength;
    bctx.drawImage(temporalCanvas, 0, 0);
    bctx.globalAlpha = 1 - temporalStrength;
    bctx.drawImage(maskCanvas, 0, 0);
    bctx.globalAlpha = 1;
    mctx.clearRect(0, 0, width, height);
    mctx.drawImage(blurCanvas, 0, 0);
  }

  bctx.clearRect(0, 0, width, height);
  bctx.filter = `blur(${Math.max(0.5, edgeBlurPx)}px)`;
  bctx.drawImage(maskCanvas, 0, 0);
  bctx.filter = 'none';

  /* Re-harden: person body must stay opacity 100% after blur/temporal. */
  const out = bctx.getImageData(0, 0, width, height);
  const od = out.data;
  const solidCut = (resoldifyAt * 255 + 0.5) | 0;
  for (let i = 0; i < od.length; i += 4) {
    const a = od[i + 3];
    if (a >= solidCut) od[i + 3] = 255;
    else if (a < 12) od[i + 3] = 0; /* kill noise fringe */
  }
  bctx.putImageData(out, 0, 0);

  const tctx = temporalCanvas.getContext('2d', { willReadFrequently: false });
  enableHighQuality(tctx);
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.globalCompositeOperation = 'source-over';
  tctx.filter = 'none';
  tctx.clearRect(0, 0, width, height);
  tctx.drawImage(blurCanvas, 0, 0);
  temporalCanvas._hasPrev = true;

  return blurCanvas;
}

/** Reset temporal mask state (call when FX turns off / stream changes). */
export function resetVirtualBackgroundTemporalState() {
  const temporal = scratch.temporal;
  if (temporal) temporal._hasPrev = false;
}

/**
 * Composite one MediaPipe result onto a canvas.
 * @param {'none'|'blur'|'image'} mode
 */
export function compositeVirtualBackground(ctx, results, {
  mode = 'none',
  backgroundImage = null,
  mirror = true,
  blurPx = 20,
  edgeBlurPx = 4,
  solidThreshold = 0.32,
  edgeFeather = 0.25,
  temporalStrength = 0.30,
  resoldifyAt = 0.78,
} = {}) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h || !results?.image) return;

  enableHighQuality(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.clearRect(0, 0, w, h);

  if (mode === 'none' || !results.segmentationMask) {
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    drawCover(ctx, results.image, w, h);
    ctx.restore();
    return;
  }

  const softMask = prepareSoftPersonMask(results.segmentationMask, w, h, {
    solidThreshold,
    edgeFeather,
    edgeBlurPx,
    temporalStrength,
    resoldifyAt,
  });

  /* Person layer: opaque body × camera frame (alpha only on rim). */
  const personCanvas = ensureCanvas('person', w, h);
  const personCtx = personCanvas.getContext('2d');
  enableHighQuality(personCtx);
  personCtx.setTransform(1, 0, 0, 1, 0, 0);
  personCtx.globalCompositeOperation = 'source-over';
  personCtx.globalAlpha = 1;
  personCtx.filter = 'none';
  personCtx.clearRect(0, 0, w, h);
  personCtx.drawImage(softMask, 0, 0, w, h);
  personCtx.globalCompositeOperation = 'source-in';
  personCtx.globalAlpha = 1;
  drawCover(personCtx, results.image, w, h);
  personCtx.globalCompositeOperation = 'source-over';
  personCtx.globalAlpha = 1;

  /* Final guarantee: person body pixels stay opacity 100%. */
  {
    const personData = personCtx.getImageData(0, 0, w, h);
    const pd = personData.data;
    const cut = (resoldifyAt * 255 + 0.5) | 0;
    for (let i = 0; i < pd.length; i += 4) {
      if (pd[i + 3] >= cut) pd[i + 3] = 255;
    }
    personCtx.putImageData(personData, 0, 0);
  }

  /* Background under, solid person on top. */
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  if (mode === 'blur') {
    ctx.filter = `blur(${blurPx}px)`;
    const pad = blurPx * 2;
    ctx.drawImage(results.image, -pad, -pad, w + pad * 2, h + pad * 2);
    ctx.filter = 'none';
  } else if (mode === 'image' && backgroundImage) {
    drawCover(ctx, backgroundImage, w, h);
  } else {
    ctx.fillStyle = '#131922';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(personCanvas, 0, 0, w, h);
  ctx.restore();
}

/**
 * Create a reusable MediaPipe Selfie Segmentation instance.
 * Caller must call `.close()` when done.
 */
export async function createSelfieSegmenter() {
  const SelfieSegmentation = await loadSelfieSegmentationCtor();
  if (!SelfieSegmentation) throw new Error('SelfieSegmentation unavailable');

  const segmenter = new SelfieSegmentation({
    locateFile: (file) => `${SELFIE_CDN}/${file}`,
  });
  /* modelSelection 1 = landscape / higher quality (desktop telemed). */
  segmenter.setOptions({ modelSelection: 1 });
  if (typeof segmenter.initialize === 'function') {
    await segmenter.initialize();
  }
  return segmenter;
}
