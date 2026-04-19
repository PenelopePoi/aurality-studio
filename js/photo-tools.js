/**
 * Aurality Studio — Photo Tools
 * Comprehensive photo editing, background removal, steganography, filters & effects.
 * Pure vanilla JS, Canvas API, Web Crypto API. No frameworks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

class PhotoUtils {
  /** Clamp value between min and max */
  static clamp(v, min = 0, max = 255) {
    return v < min ? min : v > max ? max : v;
  }

  /** Linear interpolation */
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Convert RGB to HSL */
  static rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s, l];
  }

  /** Convert HSL to RGB */
  static hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /** Convert RGB to LAB for perceptual color distance */
  static rgbToLab(r, g, b) {
    // sRGB to linear
    let rl = r / 255, gl = g / 255, bl = b / 255;
    rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
    gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
    bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;
    // linear RGB to XYZ (D65)
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750);
    let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
    const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
    x = f(x); y = f(y); z = f(z);
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
  }

  /** Euclidean distance in LAB space */
  static colorDistanceLab(r1, g1, b1, r2, g2, b2) {
    const [l1, a1, b1l] = PhotoUtils.rgbToLab(r1, g1, b1);
    const [l2, a2, b2l] = PhotoUtils.rgbToLab(r2, g2, b2);
    return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1l - b2l) ** 2);
  }

  /** Create a canvas from an image element or existing canvas */
  static canvasFromImage(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { canvas: c, ctx };
  }

  /** Load an image from a File or Blob and return ImageData */
  static loadImageData(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = PhotoUtils.canvasFromImage(img);
        URL.revokeObjectURL(url);
        resolve({ imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  /** Clone ImageData */
  static cloneImageData(imageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  /** Generate a Gaussian kernel */
  static gaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size * size);
    const sigma = radius / 3;
    const s2 = 2 * sigma * sigma;
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const val = Math.exp(-(x * x + y * y) / s2);
        kernel[(y + radius) * size + (x + radius)] = val;
        sum += val;
      }
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
    return { kernel, size };
  }

  /** Fast box blur (separable, two-pass) */
  static boxBlur(imageData, radius) {
    const { width, height, data } = imageData;
    const out = new Uint8ClampedArray(data.length);
    const temp = new Uint8ClampedArray(data.length);
    const div = radius * 2 + 1;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let x = -radius; x <= radius; x++) {
          const sx = PhotoUtils.clamp(x, 0, width - 1);
          sum += data[(y * width + sx) * 4 + c];
        }
        for (let x = 0; x < width; x++) {
          temp[(y * width + x) * 4 + c] = sum / div;
          const nx = Math.min(x + radius + 1, width - 1);
          const px = Math.max(x - radius, 0);
          sum += data[(y * width + nx) * 4 + c] - data[(y * width + px) * 4 + c];
        }
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) {
          const sy = PhotoUtils.clamp(y, 0, height - 1);
          sum += temp[(sy * width + x) * 4 + c];
        }
        for (let y = 0; y < height; y++) {
          out[(y * width + x) * 4 + c] = sum / div;
          const ny = Math.min(y + radius + 1, height - 1);
          const py = Math.max(y - radius, 0);
          sum += temp[(ny * width + x) * 4 + c] - temp[(py * width + x) * 4 + c];
        }
      }
    }
    return new ImageData(out, width, height);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: BACKGROUND REMOVAL
// ─────────────────────────────────────────────────────────────────────────────

class BackgroundRemover {
  constructor() {
    this.K = 5;           // Number of clusters for k-means
    this.maxIter = 15;    // K-means iterations
    this.edgeThreshold = 30;
    this.mask = null;     // Uint8Array: 0 = bg, 255 = fg
  }

  /**
   * K-means color clustering
   * Returns cluster assignments and centroids
   */
  _kMeans(imageData) {
    const { data, width, height } = imageData;
    const n = width * height;
    const K = this.K;

    // Initialize centroids randomly from image pixels
    const centroids = [];
    const used = new Set();
    for (let i = 0; i < K; i++) {
      let idx;
      do { idx = Math.floor(Math.random() * n); } while (used.has(idx));
      used.add(idx);
      const off = idx * 4;
      centroids.push([data[off], data[off + 1], data[off + 2]]);
    }

    const assignments = new Uint8Array(n);
    const counts = new Uint32Array(K);
    const sums = new Float64Array(K * 3);

    for (let iter = 0; iter < this.maxIter; iter++) {
      // Assign each pixel to nearest centroid
      counts.fill(0);
      sums.fill(0);
      for (let i = 0; i < n; i++) {
        const off = i * 4;
        const r = data[off], g = data[off + 1], b = data[off + 2];
        let bestDist = Infinity, bestK = 0;
        for (let k = 0; k < K; k++) {
          const dr = r - centroids[k][0];
          const dg = g - centroids[k][1];
          const db = b - centroids[k][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) { bestDist = dist; bestK = k; }
        }
        assignments[i] = bestK;
        counts[bestK]++;
        sums[bestK * 3] += r;
        sums[bestK * 3 + 1] += g;
        sums[bestK * 3 + 2] += b;
      }
      // Update centroids
      for (let k = 0; k < K; k++) {
        if (counts[k] > 0) {
          centroids[k][0] = sums[k * 3] / counts[k];
          centroids[k][1] = sums[k * 3 + 1] / counts[k];
          centroids[k][2] = sums[k * 3 + 2] / counts[k];
        }
      }
    }
    return { assignments, centroids, counts };
  }

  /**
   * Sobel edge detection — returns edge magnitude map
   */
  _sobelEdges(imageData) {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const off = i * 4;
      gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
    }

    const edges = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = (
          -gray[(y-1)*width+(x-1)] + gray[(y-1)*width+(x+1)]
          -2*gray[y*width+(x-1)] + 2*gray[y*width+(x+1)]
          -gray[(y+1)*width+(x-1)] + gray[(y+1)*width+(x+1)]
        );
        const gy = (
          -gray[(y-1)*width+(x-1)] - 2*gray[(y-1)*width+x] - gray[(y-1)*width+(x+1)]
          +gray[(y+1)*width+(x-1)] + 2*gray[(y+1)*width+x] + gray[(y+1)*width+(x+1)]
        );
        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return edges;
  }

  /**
   * GrabCut-inspired background removal using color clustering + edge detection
   * Assumes border pixels are background (like GrabCut's rectangle initialization)
   */
  removeBg(imageData) {
    const { width, height } = imageData;
    const n = width * height;

    // Step 1: K-means clustering
    const { assignments, centroids, counts } = this._kMeans(imageData);

    // Step 2: Edge detection
    const edges = this._sobelEdges(imageData);

    // Step 3: Determine which clusters are likely background
    // Sample border pixels (top/bottom 10%, left/right 10%)
    const borderClusterCounts = new Uint32Array(this.K);
    let borderTotal = 0;
    const bw = Math.max(1, Math.floor(width * 0.08));
    const bh = Math.max(1, Math.floor(height * 0.08));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x < bw || x >= width - bw || y < bh || y >= height - bh) {
          borderClusterCounts[assignments[y * width + x]]++;
          borderTotal++;
        }
      }
    }

    // A cluster is "background" if > 15% of border pixels belong to it
    const bgClusters = new Set();
    for (let k = 0; k < this.K; k++) {
      if (borderClusterCounts[k] / borderTotal > 0.15) {
        bgClusters.add(k);
      }
    }

    // Step 4: Build initial mask
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      mask[i] = bgClusters.has(assignments[i]) ? 0 : 255;
    }

    // Step 5: Refine mask near edges — if a pixel is near an edge and is foreground,
    // check its color distance to bg centroids
    const bgCentroidList = [...bgClusters].map(k => centroids[k]);
    for (let i = 0; i < n; i++) {
      if (edges[i] > this.edgeThreshold && mask[i] === 255) {
        const off = i * 4;
        const r = imageData.data[off], g = imageData.data[off + 1], b = imageData.data[off + 2];
        for (const c of bgCentroidList) {
          const dist = Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2);
          if (dist < 40) { mask[i] = 0; break; }
        }
      }
    }

    // Step 6: Morphological cleanup — close small holes, remove small islands
    this._morphClose(mask, width, height, 2);
    this._removeSmallRegions(mask, width, height, 500, 0);   // remove small fg blobs
    this._removeSmallRegions(mask, width, height, 500, 255); // fill small bg holes

    // Step 7: Feather the edges for smooth cutout
    this._featherMask(mask, width, height, 2);

    this.mask = mask;
    return mask;
  }

  /** Morphological close (dilate then erode) */
  _morphClose(mask, w, h, r) {
    const temp = new Uint8Array(mask.length);
    // Dilate
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (mask[ny * w + nx] === 255) { val = 255; break; }
            }
          }
          if (val) break;
        }
        temp[y * w + x] = val;
      }
    }
    // Erode
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 255;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (temp[ny * w + nx] === 0) { val = 0; break; }
            }
          }
          if (val === 0) break;
        }
        mask[y * w + x] = val;
      }
    }
  }

  /** Flood fill to remove small connected regions */
  _removeSmallRegions(mask, w, h, minSize, targetVal) {
    const visited = new Uint8Array(w * h);
    const stack = [];
    for (let i = 0; i < mask.length; i++) {
      if (visited[i] || mask[i] !== targetVal) continue;
      // BFS/DFS to find region
      const region = [];
      stack.push(i);
      visited[i] = 1;
      while (stack.length > 0) {
        const idx = stack.pop();
        region.push(idx);
        const x = idx % w, y = (idx / w) | 0;
        const neighbors = [
          y > 0 ? idx - w : -1,
          y < h - 1 ? idx + w : -1,
          x > 0 ? idx - 1 : -1,
          x < w - 1 ? idx + 1 : -1
        ];
        for (const ni of neighbors) {
          if (ni >= 0 && !visited[ni] && mask[ni] === targetVal) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }
      if (region.length < minSize) {
        const replaceVal = targetVal === 255 ? 0 : 255;
        for (const idx of region) mask[idx] = replaceVal;
      }
    }
  }

  /** Feather mask edges with Gaussian-like falloff */
  _featherMask(mask, w, h, radius) {
    const temp = new Uint8Array(mask.length);
    temp.set(mask);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (mask[i] === 0 || mask[i] === 255) {
          // Check if near an edge
          let nearEdge = false;
          for (let dy = -radius; dy <= radius && !nearEdge; dy++) {
            for (let dx = -radius; dx <= radius && !nearEdge; dx++) {
              const ny = y + dy, nx = x + dx;
              if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                if (mask[ny * w + nx] !== mask[i]) nearEdge = true;
              }
            }
          }
          if (nearEdge) {
            // Average neighboring mask values
            let sum = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                  sum += mask[ny * w + nx];
                  count++;
                }
              }
            }
            temp[i] = Math.round(sum / count);
          }
        }
      }
    }
    for (let i = 0; i < mask.length; i++) mask[i] = temp[i];
  }

  /**
   * Apply mask to imageData, setting alpha channel
   */
  applyMask(imageData, mask) {
    const out = PhotoUtils.cloneImageData(imageData);
    for (let i = 0; i < mask.length; i++) {
      out.data[i * 4 + 3] = mask[i];
    }
    return out;
  }

  /**
   * Manual touch-up: paint foreground or background on mask
   * @param {number} cx - center X
   * @param {number} cy - center Y
   * @param {number} radius - brush radius
   * @param {boolean} isForeground - true=fg, false=bg
   */
  touchUp(cx, cy, radius, isForeground, width, height) {
    if (!this.mask) return;
    const val = isForeground ? 255 : 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          this.mask[y * width + x] = val;
        }
      }
    }
  }

  /**
   * Batch background removal for multiple images
   * @param {ImageData[]} images
   * @returns {ImageData[]}
   */
  batchRemove(images) {
    return images.map(img => {
      const mask = this.removeBg(img);
      return this.applyMask(img, mask);
    });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: STEGANOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

class Steganography {
  constructor() {
    this.MAGIC = 0xAE57; // Magic number to identify encoded images
    this.HEADER_BITS = 64; // 16 magic + 32 length + 16 flags
  }

  /**
   * Derive AES-256 key from password using PBKDF2
   */
  async _deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async _encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this._deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    // Prepend salt + iv to ciphertext
    const result = new Uint8Array(16 + 12 + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, 16);
    result.set(new Uint8Array(encrypted), 28);
    return result;
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async _decrypt(data, password) {
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const ciphertext = data.slice(28);
    const key = await this._deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new Uint8Array(decrypted);
  }

  /**
   * Calculate how many bytes can be hidden in an image
   * Uses 2 LSBs per color channel (RGB only, skip alpha)
   */
  capacity(imageData) {
    const totalPixels = imageData.width * imageData.height;
    const usableBits = totalPixels * 3 * 2; // 3 channels, 2 bits each
    const usableBytes = Math.floor(usableBits / 8);
    return usableBytes - Math.ceil(this.HEADER_BITS / 8); // subtract header
  }

  /**
   * Encode bits into image using 2-bit LSB embedding
   */
  _embedBits(data, bits, imageData) {
    let bitIdx = 0;
    const d = data;
    const totalBits = bits.length;
    for (let i = 0; i < d.length && bitIdx < totalBits; i++) {
      if (i % 4 === 3) continue; // skip alpha channel
      // Clear bottom 2 bits, set new value
      const bit1 = bitIdx < totalBits ? bits[bitIdx++] : 0;
      const bit2 = bitIdx < totalBits ? bits[bitIdx++] : 0;
      d[i] = (d[i] & 0xFC) | (bit1 << 1) | bit2;
    }
  }

  /**
   * Extract bits from image
   */
  _extractBits(data, numBits) {
    const bits = [];
    let bitIdx = 0;
    for (let i = 0; i < data.length && bitIdx < numBits; i++) {
      if (i % 4 === 3) continue; // skip alpha
      bits.push((data[i] >> 1) & 1);
      bitIdx++;
      if (bitIdx < numBits) {
        bits.push(data[i] & 1);
        bitIdx++;
      }
    }
    return bits;
  }

  /**
   * Convert bytes to bit array
   */
  _bytesToBits(bytes) {
    const bits = [];
    for (let i = 0; i < bytes.length; i++) {
      for (let b = 7; b >= 0; b--) {
        bits.push((bytes[i] >> b) & 1);
      }
    }
    return bits;
  }

  /**
   * Convert bit array to bytes
   */
  _bitsToBytes(bits) {
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i++) {
      bytes[i >> 3] |= bits[i] << (7 - (i % 8));
    }
    return bytes;
  }

  /**
   * Build header: magic(16) + payloadLength(32) + flags(16)
   * flags: bit0 = encrypted, bit1 = is file (vs text)
   */
  _buildHeader(payloadLength, encrypted, isFile) {
    const header = new Uint8Array(8);
    // Magic
    header[0] = (this.MAGIC >> 8) & 0xFF;
    header[1] = this.MAGIC & 0xFF;
    // Payload length (32-bit)
    header[2] = (payloadLength >> 24) & 0xFF;
    header[3] = (payloadLength >> 16) & 0xFF;
    header[4] = (payloadLength >> 8) & 0xFF;
    header[5] = payloadLength & 0xFF;
    // Flags
    let flags = 0;
    if (encrypted) flags |= 1;
    if (isFile) flags |= 2;
    header[6] = (flags >> 8) & 0xFF;
    header[7] = flags & 0xFF;
    return header;
  }

  /**
   * Parse header from bits
   */
  _parseHeader(bits) {
    const headerBytes = this._bitsToBytes(bits.slice(0, this.HEADER_BITS));
    const magic = (headerBytes[0] << 8) | headerBytes[1];
    if (magic !== this.MAGIC) return null;
    const length = (headerBytes[2] << 24) | (headerBytes[3] << 16) | (headerBytes[4] << 8) | headerBytes[5];
    const flags = (headerBytes[6] << 8) | headerBytes[7];
    return {
      length,
      encrypted: !!(flags & 1),
      isFile: !!(flags & 2)
    };
  }

  /**
   * Encode a text message into an image
   * @param {ImageData} imageData - source image (will be cloned)
   * @param {string} message - text to hide
   * @param {string} [password] - optional encryption password
   * @returns {ImageData} - image with hidden message
   */
  async encodeMessage(imageData, message, password = null) {
    const enc = new TextEncoder();
    let payload = enc.encode(message);
    const encrypted = !!password;

    if (encrypted) {
      payload = await this._encrypt(payload, password);
    }

    const cap = this.capacity(imageData);
    if (payload.length > cap) {
      throw new Error(`Message too large: ${payload.length} bytes, capacity: ${cap} bytes`);
    }

    const header = this._buildHeader(payload.length, encrypted, false);
    const fullPayload = new Uint8Array(header.length + payload.length);
    fullPayload.set(header);
    fullPayload.set(payload, header.length);

    const result = PhotoUtils.cloneImageData(imageData);
    const bits = this._bytesToBits(fullPayload);
    this._embedBits(result.data, bits, result);
    return result;
  }

  /**
   * Decode a hidden message from an image
   * @param {ImageData} imageData
   * @param {string} [password]
   * @returns {string} decoded message
   */
  async decodeMessage(imageData, password = null) {
    // First extract header
    const headerBits = this._extractBits(imageData.data, this.HEADER_BITS);
    const header = this._parseHeader(headerBits);
    if (!header) throw new Error('No hidden message found in this image');

    // Extract payload
    const totalBits = this.HEADER_BITS + header.length * 8;
    const allBits = this._extractBits(imageData.data, totalBits);
    const payloadBits = allBits.slice(this.HEADER_BITS);
    let payload = this._bitsToBytes(payloadBits).slice(0, header.length);

    if (header.encrypted) {
      if (!password) throw new Error('This message is encrypted. Please provide a password.');
      try {
        payload = await this._decrypt(payload, password);
      } catch (e) {
        throw new Error('Decryption failed. Wrong password?');
      }
    }

    if (header.isFile) {
      return payload; // Return raw bytes for file data
    }

    const dec = new TextDecoder();
    return dec.decode(payload);
  }

  /**
   * Encode a file into an image
   * @param {ImageData} imageData
   * @param {Uint8Array} fileData
   * @param {string} [password]
   * @returns {ImageData}
   */
  async encodeFile(imageData, fileData, password = null) {
    const encrypted = !!password;
    let payload = fileData;

    if (encrypted) {
      payload = await this._encrypt(payload, password);
    }

    const cap = this.capacity(imageData);
    if (payload.length > cap) {
      throw new Error(`File too large: ${payload.length} bytes, capacity: ${cap} bytes`);
    }

    const header = this._buildHeader(payload.length, encrypted, true);
    const fullPayload = new Uint8Array(header.length + payload.length);
    fullPayload.set(header);
    fullPayload.set(payload, header.length);

    const result = PhotoUtils.cloneImageData(imageData);
    this._embedBits(result.data, this._bytesToBits(fullPayload), result);
    return result;
  }

  /**
   * Decode a hidden file from an image
   * @param {ImageData} imageData
   * @param {string} [password]
   * @returns {Uint8Array}
   */
  async decodeFile(imageData, password = null) {
    const headerBits = this._extractBits(imageData.data, this.HEADER_BITS);
    const header = this._parseHeader(headerBits);
    if (!header) throw new Error('No hidden data found');
    if (!header.isFile) throw new Error('Hidden data is text, not a file. Use decodeMessage().');

    const totalBits = this.HEADER_BITS + header.length * 8;
    const allBits = this._extractBits(imageData.data, totalBits);
    let payload = this._bitsToBytes(allBits.slice(this.HEADER_BITS)).slice(0, header.length);

    if (header.encrypted) {
      if (!password) throw new Error('Encrypted. Provide a password.');
      payload = await this._decrypt(payload, password);
    }
    return payload;
  }

  /**
   * Visual diff: show which pixels changed between original and stego image
   * Returns ImageData highlighting modifications
   */
  visualDiff(original, stego) {
    const diff = new ImageData(original.width, original.height);
    for (let i = 0; i < original.data.length; i += 4) {
      const changed = (
        original.data[i] !== stego.data[i] ||
        original.data[i + 1] !== stego.data[i + 1] ||
        original.data[i + 2] !== stego.data[i + 2]
      );
      if (changed) {
        // Amplify differences for visibility
        diff.data[i] = Math.min(255, Math.abs(original.data[i] - stego.data[i]) * 50);
        diff.data[i + 1] = Math.min(255, Math.abs(original.data[i + 1] - stego.data[i + 1]) * 50);
        diff.data[i + 2] = Math.min(255, Math.abs(original.data[i + 2] - stego.data[i + 2]) * 50);
        diff.data[i + 3] = 255;
      } else {
        diff.data[i] = diff.data[i + 1] = diff.data[i + 2] = 0;
        diff.data[i + 3] = 50; // Dim unchanged pixels
      }
    }
    return diff;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: HISTOGRAM
// ─────────────────────────────────────────────────────────────────────────────

class Histogram {
  constructor() {
    this.bins = { r: null, g: null, b: null, lum: null };
  }

  /**
   * Compute histogram from ImageData
   */
  compute(imageData) {
    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const lum = new Uint32Array(256);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      r[d[i]]++;
      g[d[i + 1]]++;
      b[d[i + 2]]++;
      const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      lum[l]++;
    }
    this.bins = { r, g, b, lum };
    return this.bins;
  }

  /**
   * Render histogram to a canvas
   * @param {HTMLCanvasElement} canvas
   * @param {string} channel - 'r','g','b','lum','all'
   */
  render(canvas, channel = 'all') {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const channels = channel === 'all'
      ? [{ data: this.bins.r, color: 'rgba(255,80,80,0.6)' },
         { data: this.bins.g, color: 'rgba(80,255,80,0.6)' },
         { data: this.bins.b, color: 'rgba(80,80,255,0.6)' }]
      : channel === 'lum'
        ? [{ data: this.bins.lum, color: 'rgba(200,200,200,0.8)' }]
        : [{ data: this.bins[channel], color: channel === 'r' ? 'rgba(255,80,80,0.8)' : channel === 'g' ? 'rgba(80,255,80,0.8)' : 'rgba(80,80,255,0.8)' }];

    for (const ch of channels) {
      if (!ch.data) continue;
      const max = Math.max(...ch.data);
      if (max === 0) continue;
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const barH = (ch.data[i] / max) * h;
        ctx.lineTo(x, h - barH);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: PHOTO EDITING ENGINE (Non-destructive filter stack)
// ─────────────────────────────────────────────────────────────────────────────

class PhotoEditEngine {
  constructor() {
    this.original = null;       // Original ImageData (never modified)
    this.current = null;        // Current rendered ImageData
    this.width = 0;
    this.height = 0;
    this.filterStack = [];      // Array of { type, params }
    this.undoStack = [];        // Array of filterStack snapshots
    this.redoStack = [];
    this.maxUndo = 50;
    this.cropRect = null;       // { x, y, w, h }
    this.rotation = 0;          // degrees
    this.flipH = false;
    this.flipV = false;
  }

  /**
   * Load image as the editing source
   */
  loadImage(imageData) {
    this.original = PhotoUtils.cloneImageData(imageData);
    this.current = PhotoUtils.cloneImageData(imageData);
    this.width = imageData.width;
    this.height = imageData.height;
    this.filterStack = [];
    this.undoStack = [];
    this.redoStack = [];
    this.cropRect = null;
    this.rotation = 0;
    this.flipH = false;
    this.flipV = false;
  }

  /** Save current filter stack state for undo */
  _saveState() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.filterStack)));
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Undo last filter change */
  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.parse(JSON.stringify(this.filterStack)));
    this.filterStack = this.undoStack.pop();
    this.render();
    return true;
  }

  /** Redo last undone change */
  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.parse(JSON.stringify(this.filterStack)));
    this.filterStack = this.redoStack.pop();
    this.render();
    return true;
  }

  /**
   * Add a filter to the stack
   * @param {string} type
   * @param {object} params
   */
  addFilter(type, params) {
    this._saveState();
    this.filterStack.push({ type, params });
    this.render();
  }

  /**
   * Update the last filter of a given type, or add if not present
   */
  setFilter(type, params) {
    this._saveState();
    const existing = this.filterStack.findIndex(f => f.type === type);
    if (existing >= 0) {
      this.filterStack[existing].params = params;
    } else {
      this.filterStack.push({ type, params });
    }
    this.render();
  }

  /**
   * Remove a filter by type
   */
  removeFilter(type) {
    this._saveState();
    this.filterStack = this.filterStack.filter(f => f.type !== type);
    this.render();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this._saveState();
    this.filterStack = [];
    this.render();
  }

  /**
   * Render the full filter pipeline onto current
   */
  render() {
    if (!this.original) return;
    let img = PhotoUtils.cloneImageData(this.original);

    for (const filter of this.filterStack) {
      img = this._applyFilter(img, filter.type, filter.params);
    }

    this.current = img;
    return img;
  }

  /**
   * Apply a single filter to ImageData
   */
  _applyFilter(imageData, type, params) {
    switch (type) {
      case 'brightness': return this._brightness(imageData, params.value);
      case 'contrast': return this._contrast(imageData, params.value);
      case 'saturation': return this._saturation(imageData, params.value);
      case 'hue': return this._hueRotate(imageData, params.value);
      case 'temperature': return this._temperature(imageData, params.value);
      case 'curves': return this._curves(imageData, params);
      case 'levels': return this._levels(imageData, params);
      case 'sharpen': return this._sharpen(imageData, params.amount);
      case 'blur': return PhotoUtils.boxBlur(imageData, params.radius);
      case 'noiseReduction': return this._noiseReduction(imageData, params.strength);
      case 'vignette': return this._vignette(imageData, params);
      case 'grain': return this._grain(imageData, params.amount);
      case 'chromaticAberration': return this._chromaticAberration(imageData, params.offset);
      case 'duotone': return this._duotone(imageData, params.dark, params.light);
      case 'gradientMap': return this._gradientMap(imageData, params.stops);
      case 'glitch': return this._glitch(imageData, params);
      case 'asciiArt': return this._asciiArt(imageData, params);
      case 'pixelSort': return this._pixelSort(imageData, params);
      case 'deepFry': return this._deepFry(imageData, params);
      case 'preset': return this._applyPreset(imageData, params.name);
      default: return imageData;
    }
  }

  // ── Basic Adjustments ──────────────────────────────────────────────────

  _brightness(imageData, value) {
    // value: -100 to 100
    const d = imageData.data;
    const factor = value * 2.55;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = PhotoUtils.clamp(d[i] + factor);
      d[i + 1] = PhotoUtils.clamp(d[i + 1] + factor);
      d[i + 2] = PhotoUtils.clamp(d[i + 2] + factor);
    }
    return imageData;
  }

  _contrast(imageData, value) {
    // value: -100 to 100
    const d = imageData.data;
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = PhotoUtils.clamp(factor * (d[i] - 128) + 128);
      d[i + 1] = PhotoUtils.clamp(factor * (d[i + 1] - 128) + 128);
      d[i + 2] = PhotoUtils.clamp(factor * (d[i + 2] - 128) + 128);
    }
    return imageData;
  }

  _saturation(imageData, value) {
    // value: -100 to 100 (0 = no change)
    const d = imageData.data;
    const factor = 1 + value / 100;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = PhotoUtils.clamp(gray + factor * (d[i] - gray));
      d[i + 1] = PhotoUtils.clamp(gray + factor * (d[i + 1] - gray));
      d[i + 2] = PhotoUtils.clamp(gray + factor * (d[i + 2] - gray));
    }
    return imageData;
  }

  _hueRotate(imageData, degrees) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      let [h, s, l] = PhotoUtils.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      h = (h + degrees) % 360;
      if (h < 0) h += 360;
      const [r, g, b] = PhotoUtils.hslToRgb(h, s, l);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    return imageData;
  }

  _temperature(imageData, value) {
    // value: -100 (cool/blue) to 100 (warm/orange)
    const d = imageData.data;
    const rShift = value * 0.8;
    const bShift = -value * 0.8;
    const gShift = value * 0.2;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = PhotoUtils.clamp(d[i] + rShift);
      d[i + 1] = PhotoUtils.clamp(d[i + 1] + gShift);
      d[i + 2] = PhotoUtils.clamp(d[i + 2] + bShift);
    }
    return imageData;
  }

  // ── Curves ─────────────────────────────────────────────────────────────

  /**
   * Curves adjustment
   * @param {object} params - { rgb: [[x,y],...], r: [...], g: [...], b: [...] }
   * Each channel has control points, interpolated via cubic spline
   */
  _curves(imageData, params) {
    const d = imageData.data;
    const rgbLut = params.rgb ? this._buildCurveLut(params.rgb) : null;
    const rLut = params.r ? this._buildCurveLut(params.r) : null;
    const gLut = params.g ? this._buildCurveLut(params.g) : null;
    const bLut = params.b ? this._buildCurveLut(params.b) : null;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (rgbLut) { r = rgbLut[r]; g = rgbLut[g]; b = rgbLut[b]; }
      if (rLut) r = rLut[r];
      if (gLut) g = gLut[g];
      if (bLut) b = bLut[b];
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    return imageData;
  }

  /**
   * Build a 256-entry lookup table from curve control points using monotone cubic interpolation
   */
  _buildCurveLut(points) {
    if (!points || points.length < 2) {
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }
    // Sort by x
    const sorted = [...points].sort((a, b) => a[0] - b[0]);

    // Ensure we cover 0 and 255
    if (sorted[0][0] > 0) sorted.unshift([0, sorted[0][1]]);
    if (sorted[sorted.length - 1][0] < 255) sorted.push([255, sorted[sorted.length - 1][1]]);

    const n = sorted.length;
    const xs = sorted.map(p => p[0]);
    const ys = sorted.map(p => p[1]);

    // Monotone cubic interpolation (Fritsch-Carlson)
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(xs[i + 1] - xs[i]);
      dy.push(ys[i + 1] - ys[i]);
      m.push(dy[i] / dx[i]);
    }

    const alpha = [0], beta = [0];
    for (let i = 0; i < m.length - 1; i++) {
      if (m[i] * m[i + 1] <= 0) {
        alpha.push(0); beta.push(0);
      } else {
        const a = alpha.length > 0 ? 1 : 0;
        alpha.push(a);
        beta.push(0);
      }
    }

    // Simple linear interp fallback with cubic Hermite for smoothness
    const tangents = new Float64Array(n);
    tangents[0] = m[0];
    tangents[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) {
        tangents[i] = 0;
      } else {
        tangents[i] = (m[i - 1] + m[i]) / 2;
      }
    }

    const lut = new Uint8Array(256);
    let seg = 0;
    for (let x = 0; x < 256; x++) {
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const x0 = xs[seg], x1 = xs[seg + 1];
      const y0 = ys[seg], y1 = ys[seg + 1];
      const h = x1 - x0;
      if (h === 0) { lut[x] = PhotoUtils.clamp(y0); continue; }
      const t = (x - x0) / h;
      const t2 = t * t, t3 = t2 * t;
      // Cubic Hermite
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      const val = h00 * y0 + h10 * h * tangents[seg] + h01 * y1 + h11 * h * tangents[seg + 1];
      lut[x] = PhotoUtils.clamp(Math.round(val));
    }
    return lut;
  }

  // ── Levels ─────────────────────────────────────────────────────────────

  /**
   * Levels adjustment
   * @param {object} params - { inBlack, inWhite, gamma, outBlack, outWhite }
   * All values 0-255 except gamma (0.1 - 10.0)
   */
  _levels(imageData, params) {
    const { inBlack = 0, inWhite = 255, gamma = 1.0, outBlack = 0, outWhite = 255 } = params;
    const d = imageData.data;
    const lut = new Uint8Array(256);
    const inRange = inWhite - inBlack || 1;
    const outRange = outWhite - outBlack;

    for (let i = 0; i < 256; i++) {
      let val = (i - inBlack) / inRange;
      val = PhotoUtils.clamp(val, 0, 1);
      val = Math.pow(val, 1 / gamma);
      lut[i] = PhotoUtils.clamp(Math.round(outBlack + val * outRange));
    }

    for (let i = 0; i < d.length; i += 4) {
      d[i] = lut[d[i]];
      d[i + 1] = lut[d[i + 1]];
      d[i + 2] = lut[d[i + 2]];
    }
    return imageData;
  }

  // ── Sharpen ────────────────────────────────────────────────────────────

  _sharpen(imageData, amount = 1) {
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data.length);
    // Unsharp mask: original + amount * (original - blurred)
    const blurred = PhotoUtils.boxBlur(imageData, 1);
    for (let i = 0; i < data.length; i += 4) {
      out[i] = PhotoUtils.clamp(data[i] + amount * (data[i] - blurred.data[i]));
      out[i + 1] = PhotoUtils.clamp(data[i + 1] + amount * (data[i + 1] - blurred.data[i + 1]));
      out[i + 2] = PhotoUtils.clamp(data[i + 2] + amount * (data[i + 2] - blurred.data[i + 2]));
      out[i + 3] = data[i + 3];
    }
    return new ImageData(out, width, height);
  }

  // ── Noise Reduction ────────────────────────────────────────────────────

  _noiseReduction(imageData, strength = 5) {
    // Bilateral-inspired filter: spatial + range weighting
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data.length);
    const radius = Math.ceil(strength / 2);
    const sigmaSpace = radius;
    const sigmaColor = strength * 5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = PhotoUtils.clamp(y + dy, 0, height - 1);
            const nx = PhotoUtils.clamp(x + dx, 0, width - 1);
            const nIdx = (ny * width + nx) * 4;

            const spatialDist = dx * dx + dy * dy;
            const colorDist = (data[idx] - data[nIdx]) ** 2 +
                              (data[idx + 1] - data[nIdx + 1]) ** 2 +
                              (data[idx + 2] - data[nIdx + 2]) ** 2;

            const w = Math.exp(-spatialDist / (2 * sigmaSpace * sigmaSpace) -
                               colorDist / (2 * sigmaColor * sigmaColor));
            sumR += data[nIdx] * w;
            sumG += data[nIdx + 1] * w;
            sumB += data[nIdx + 2] * w;
            sumW += w;
          }
        }
        out[idx] = PhotoUtils.clamp(Math.round(sumR / sumW));
        out[idx + 1] = PhotoUtils.clamp(Math.round(sumG / sumW));
        out[idx + 2] = PhotoUtils.clamp(Math.round(sumB / sumW));
        out[idx + 3] = data[idx + 3];
      }
    }
    return new ImageData(out, width, height);
  }

  // ── Crop, Rotate, Flip ─────────────────────────────────────────────────

  /**
   * Set crop region
   */
  setCrop(x, y, w, h) {
    this.cropRect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }

  /**
   * Apply crop to the original image (destructive to original)
   */
  applyCrop() {
    if (!this.cropRect || !this.original) return;
    const { x, y, w, h } = this.cropRect;
    const canvas = document.createElement('canvas');
    canvas.width = this.original.width;
    canvas.height = this.original.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(this.original, 0, 0);

    const cropped = ctx.getImageData(x, y, w, h);
    this.original = cropped;
    this.width = w;
    this.height = h;
    this.cropRect = null;
    this.render();
  }

  /**
   * Rotate image by degrees (applies to original, destructive)
   */
  applyRotation(degrees) {
    if (!this.original) return;
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const newW = Math.ceil(this.width * cos + this.height * sin);
    const newH = Math.ceil(this.width * sin + this.height * cos);

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = this.width;
    srcCanvas.height = this.height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.putImageData(this.original, 0, 0);

    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = newW;
    dstCanvas.height = newH;
    const dstCtx = dstCanvas.getContext('2d');
    dstCtx.translate(newW / 2, newH / 2);
    dstCtx.rotate(radians);
    dstCtx.drawImage(srcCanvas, -this.width / 2, -this.height / 2);

    this.original = dstCtx.getImageData(0, 0, newW, newH);
    this.width = newW;
    this.height = newH;
    this.render();
  }

  /**
   * Flip image horizontally or vertically (applies to original)
   */
  applyFlip(horizontal) {
    if (!this.original) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = this.width;
    srcCanvas.height = this.height;
    srcCanvas.getContext('2d').putImageData(this.original, 0, 0);

    if (horizontal) {
      ctx.translate(this.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, this.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(srcCanvas, 0, 0);
    this.original = ctx.getImageData(0, 0, this.width, this.height);
    this.render();
  }

  // ── Color Picker ───────────────────────────────────────────────────────

  /**
   * Get color at pixel coordinates
   * @returns {{ r, g, b, a, hex, hsl }}
   */
  colorAt(x, y) {
    if (!this.current) return null;
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const idx = (y * this.width + x) * 4;
    const r = this.current.data[idx];
    const g = this.current.data[idx + 1];
    const b = this.current.data[idx + 2];
    const a = this.current.data[idx + 3];
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    const hsl = PhotoUtils.rgbToHsl(r, g, b);
    return { r, g, b, a, hex, hsl: { h: hsl[0], s: hsl[1], l: hsl[2] } };
  }

  // ── Export ─────────────────────────────────────────────────────────────

  /**
   * Export current image as a data URL or Blob
   * @param {string} format - 'png','jpeg','webp'
   * @param {number} quality - 0-1 for jpeg/webp
   * @returns {Promise<Blob>}
   */
  async exportBlob(format = 'png', quality = 0.92) {
    if (!this.current) throw new Error('No image loaded');
    const canvas = document.createElement('canvas');
    canvas.width = this.current.width;
    canvas.height = this.current.height;
    canvas.getContext('2d').putImageData(this.current, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      }, `image/${format}`, quality);
    });
  }

  /**
   * Export as data URL
   */
  exportDataURL(format = 'png', quality = 0.92) {
    if (!this.current) throw new Error('No image loaded');
    const canvas = document.createElement('canvas');
    canvas.width = this.current.width;
    canvas.height = this.current.height;
    canvas.getContext('2d').putImageData(this.current, 0, 0);
    return canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Trigger browser download
   */
  async download(filename = 'photo', format = 'png', quality = 0.92) {
    const blob = await this.exportBlob(format, quality);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  // ─────────────────────────────────────────────────────────────────────
  // SECTION 6: FILTERS & EFFECTS
  // ─────────────────────────────────────────────────────────────────────

  // ── Vignette ───────────────────────────────────────────────────────────

  _vignette(imageData, params) {
    const { amount = 50, midpoint = 50, roundness = 0, feather = 50 } = params;
    const { data, width, height } = imageData;
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const mid = midpoint / 100;
    const feat = Math.max(feather / 100, 0.01);
    const amt = amount / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normalized = dist / Math.SQRT2;
        const vig = 1 - PhotoUtils.clamp((normalized - mid) / feat, 0, 1) * amt;
        const idx = (y * width + x) * 4;
        data[idx] = PhotoUtils.clamp(Math.round(data[idx] * vig));
        data[idx + 1] = PhotoUtils.clamp(Math.round(data[idx + 1] * vig));
        data[idx + 2] = PhotoUtils.clamp(Math.round(data[idx + 2] * vig));
      }
    }
    return imageData;
  }

  // ── Film Grain ─────────────────────────────────────────────────────────

  _grain(imageData, amount = 30) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount;
      d[i] = PhotoUtils.clamp(d[i] + noise);
      d[i + 1] = PhotoUtils.clamp(d[i + 1] + noise);
      d[i + 2] = PhotoUtils.clamp(d[i + 2] + noise);
    }
    return imageData;
  }

  // ── Chromatic Aberration ───────────────────────────────────────────────

  _chromaticAberration(imageData, offset = 3) {
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data.length);
    out.set(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Shift red channel left, blue right
        const rxSrc = PhotoUtils.clamp(x - offset, 0, width - 1);
        const bxSrc = PhotoUtils.clamp(x + offset, 0, width - 1);
        out[idx] = data[(y * width + rxSrc) * 4];
        out[idx + 2] = data[(y * width + bxSrc) * 4 + 2];
      }
    }
    return new ImageData(out, width, height);
  }

  // ── Duotone ────────────────────────────────────────────────────────────

  _duotone(imageData, dark, light) {
    // dark/light: [r,g,b] arrays
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      d[i] = PhotoUtils.clamp(Math.round(PhotoUtils.lerp(dark[0], light[0], lum)));
      d[i + 1] = PhotoUtils.clamp(Math.round(PhotoUtils.lerp(dark[1], light[1], lum)));
      d[i + 2] = PhotoUtils.clamp(Math.round(PhotoUtils.lerp(dark[2], light[2], lum)));
    }
    return imageData;
  }

  // ── Gradient Map ───────────────────────────────────────────────────────

  _gradientMap(imageData, stops) {
    // stops: [ { pos: 0-1, color: [r,g,b] }, ... ] sorted by pos
    if (!stops || stops.length < 2) return imageData;
    stops.sort((a, b) => a.pos - b.pos);

    // Build 256-entry LUT from gradient
    const lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let s0 = stops[0], s1 = stops[stops.length - 1];
      for (let j = 0; j < stops.length - 1; j++) {
        if (t >= stops[j].pos && t <= stops[j + 1].pos) {
          s0 = stops[j]; s1 = stops[j + 1]; break;
        }
      }
      const range = s1.pos - s0.pos || 1;
      const lt = (t - s0.pos) / range;
      lut[i * 3] = PhotoUtils.lerp(s0.color[0], s1.color[0], lt);
      lut[i * 3 + 1] = PhotoUtils.lerp(s0.color[1], s1.color[1], lt);
      lut[i * 3 + 2] = PhotoUtils.lerp(s0.color[2], s1.color[2], lt);
    }

    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = lut[lum * 3];
      d[i + 1] = lut[lum * 3 + 1];
      d[i + 2] = lut[lum * 3 + 2];
    }
    return imageData;
  }

  // ── Glitch Effect ──────────────────────────────────────────────────────

  _glitch(imageData, params) {
    const { intensity = 50, slices = 20, channelShift = true } = params;
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data.length);
    out.set(data);

    // Random horizontal slices with offset
    const numSlices = Math.round(slices * intensity / 100);
    for (let s = 0; s < numSlices; s++) {
      const sliceY = Math.floor(Math.random() * height);
      const sliceH = Math.floor(Math.random() * (height / 10)) + 1;
      const offset = Math.floor((Math.random() - 0.5) * intensity);

      for (let y = sliceY; y < Math.min(sliceY + sliceH, height); y++) {
        for (let x = 0; x < width; x++) {
          const srcX = PhotoUtils.clamp(x + offset, 0, width - 1);
          const dstIdx = (y * width + x) * 4;
          const srcIdx = (y * width + srcX) * 4;
          out[dstIdx] = data[srcIdx];
          out[dstIdx + 1] = data[srcIdx + 1];
          out[dstIdx + 2] = data[srcIdx + 2];
          out[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }

    // Channel shift: offset R and B channels
    if (channelShift) {
      const shiftAmt = Math.floor(intensity / 5);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const rSrc = PhotoUtils.clamp(x + shiftAmt, 0, width - 1);
          const bSrc = PhotoUtils.clamp(x - shiftAmt, 0, width - 1);
          out[idx] = data[(y * width + rSrc) * 4]; // R from shifted position
          out[idx + 2] = data[(y * width + bSrc) * 4 + 2]; // B from shifted position
        }
      }
    }

    // Random color blocks
    const numBlocks = Math.floor(intensity / 10);
    for (let b = 0; b < numBlocks; b++) {
      const bx = Math.floor(Math.random() * width);
      const by = Math.floor(Math.random() * height);
      const bw = Math.floor(Math.random() * 60) + 10;
      const bh = Math.floor(Math.random() * 10) + 2;
      const color = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
      for (let y = by; y < Math.min(by + bh, height); y++) {
        for (let x = bx; x < Math.min(bx + bw, width); x++) {
          const idx = (y * width + x) * 4;
          out[idx] = PhotoUtils.clamp(out[idx] * 0.3 + color[0] * 0.7);
          out[idx + 1] = PhotoUtils.clamp(out[idx + 1] * 0.3 + color[1] * 0.7);
          out[idx + 2] = PhotoUtils.clamp(out[idx + 2] * 0.3 + color[2] * 0.7);
        }
      }
    }

    return new ImageData(out, width, height);
  }

  // ── ASCII Art ──────────────────────────────────────────────────────────

  _asciiArt(imageData, params) {
    const { cellSize = 8, charset = ' .:-=+*#%@', colored = false } = params;
    const { data, width, height } = imageData;
    const out = new ImageData(width, height);
    const outData = out.data;

    // Fill background black
    for (let i = 0; i < outData.length; i += 4) {
      outData[i] = outData[i + 1] = outData[i + 2] = 0;
      outData[i + 3] = 255;
    }

    // Use an offscreen canvas to render text characters back to pixels
    const charCanvas = document.createElement('canvas');
    charCanvas.width = cellSize;
    charCanvas.height = cellSize;
    const charCtx = charCanvas.getContext('2d');
    charCtx.font = `${cellSize}px monospace`;
    charCtx.textBaseline = 'top';

    for (let cy = 0; cy < height; cy += cellSize) {
      for (let cx = 0; cx < width; cx += cellSize) {
        // Average luminance in cell
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let dy = 0; dy < cellSize && cy + dy < height; dy++) {
          for (let dx = 0; dx < cellSize && cx + dx < width; dx++) {
            const idx = ((cy + dy) * width + (cx + dx)) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
        const avgR = sumR / count, avgG = sumG / count, avgB = sumB / count;
        const lum = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;
        const charIdx = Math.min(Math.floor(lum * charset.length), charset.length - 1);
        const ch = charset[charIdx];

        // Render character to cell
        charCtx.clearRect(0, 0, cellSize, cellSize);
        charCtx.fillStyle = colored
          ? `rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`
          : `rgb(${Math.round(lum * 255)},${Math.round(lum * 255)},${Math.round(lum * 255)})`;
        charCtx.fillText(ch, 0, 0);

        const charData = charCtx.getImageData(0, 0, cellSize, cellSize);
        for (let dy = 0; dy < cellSize && cy + dy < height; dy++) {
          for (let dx = 0; dx < cellSize && cx + dx < width; dx++) {
            const srcIdx = (dy * cellSize + dx) * 4;
            const dstIdx = ((cy + dy) * width + (cx + dx)) * 4;
            if (charData.data[srcIdx + 3] > 30) {
              outData[dstIdx] = charData.data[srcIdx];
              outData[dstIdx + 1] = charData.data[srcIdx + 1];
              outData[dstIdx + 2] = charData.data[srcIdx + 2];
            }
            outData[dstIdx + 3] = 255;
          }
        }
      }
    }
    return out;
  }

  /**
   * Get ASCII art as a string (for text export)
   */
  asciiArtString(imageData, cols = 80, charset = ' .:-=+*#%@') {
    const { data, width, height } = imageData;
    const cellW = Math.floor(width / cols);
    const cellH = cellW * 2; // Aspect ratio correction
    const rows = Math.floor(height / cellH);
    let result = '';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < cellH; dy++) {
          for (let dx = 0; dx < cellW; dx++) {
            const y = row * cellH + dy;
            const x = col * cellW + dx;
            if (y < height && x < width) {
              const idx = (y * width + x) * 4;
              sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              count++;
            }
          }
        }
        const lum = count > 0 ? sum / count / 255 : 0;
        const charIdx = Math.min(Math.floor(lum * charset.length), charset.length - 1);
        result += charset[charIdx];
      }
      result += '\n';
    }
    return result;
  }

  // ── Pixel Sort ─────────────────────────────────────────────────────────

  _pixelSort(imageData, params) {
    const { threshold = 80, direction = 'horizontal', mode = 'brightness' } = params;
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data.length);
    out.set(data);

    const getValue = (idx) => {
      switch (mode) {
        case 'brightness': return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        case 'hue': return PhotoUtils.rgbToHsl(data[idx], data[idx + 1], data[idx + 2])[0];
        case 'saturation': return PhotoUtils.rgbToHsl(data[idx], data[idx + 1], data[idx + 2])[1] * 255;
        default: return data[idx];
      }
    };

    if (direction === 'horizontal') {
      for (let y = 0; y < height; y++) {
        let start = -1;
        const spans = [];
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const val = getValue(idx);
          if (val > threshold) {
            if (start === -1) start = x;
          } else {
            if (start !== -1) { spans.push([start, x - 1]); start = -1; }
          }
        }
        if (start !== -1) spans.push([start, width - 1]);

        for (const [s, e] of spans) {
          const pixels = [];
          for (let x = s; x <= e; x++) {
            const idx = (y * width + x) * 4;
            pixels.push({
              r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3],
              val: getValue(idx)
            });
          }
          pixels.sort((a, b) => a.val - b.val);
          for (let i = 0; i < pixels.length; i++) {
            const idx = (y * width + (s + i)) * 4;
            out[idx] = pixels[i].r;
            out[idx + 1] = pixels[i].g;
            out[idx + 2] = pixels[i].b;
            out[idx + 3] = pixels[i].a;
          }
        }
      }
    } else {
      // Vertical sort
      for (let x = 0; x < width; x++) {
        let start = -1;
        const spans = [];
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const val = getValue(idx);
          if (val > threshold) {
            if (start === -1) start = y;
          } else {
            if (start !== -1) { spans.push([start, y - 1]); start = -1; }
          }
        }
        if (start !== -1) spans.push([start, height - 1]);

        for (const [s, e] of spans) {
          const pixels = [];
          for (let y = s; y <= e; y++) {
            const idx = (y * width + x) * 4;
            pixels.push({
              r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3],
              val: getValue(idx)
            });
          }
          pixels.sort((a, b) => a.val - b.val);
          for (let i = 0; i < pixels.length; i++) {
            const idx = ((s + i) * width + x) * 4;
            out[idx] = pixels[i].r;
            out[idx + 1] = pixels[i].g;
            out[idx + 2] = pixels[i].b;
            out[idx + 3] = pixels[i].a;
          }
        }
      }
    }
    return new ImageData(out, width, height);
  }

  // ── Deep Fry ───────────────────────────────────────────────────────────

  _deepFry(imageData, params) {
    const { intensity = 80 } = params;
    let img = imageData;

    // Step 1: Extreme contrast
    img = this._contrast(img, 60 + intensity * 0.4);

    // Step 2: Oversaturation
    img = this._saturation(img, 80 + intensity * 0.2);

    // Step 3: Heavy sharpen
    img = this._sharpen(img, 3 + intensity / 20);

    // Step 4: Add noise
    img = this._grain(img, 20 + intensity * 0.5);

    // Step 5: JPEG-like artifact simulation: heavy blur then sharpen
    if (intensity > 50) {
      img = PhotoUtils.boxBlur(img, 1);
      img = this._sharpen(img, 4);
    }

    // Step 6: Red/yellow tint
    const d = img.data;
    const tint = intensity / 200;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = PhotoUtils.clamp(d[i] + 30 * tint);     // More red
      d[i + 1] = PhotoUtils.clamp(d[i + 1] + 10 * tint); // Slight green
      d[i + 2] = PhotoUtils.clamp(d[i + 2] - 20 * tint); // Less blue
    }

    return img;
  }


  // ─────────────────────────────────────────────────────────────────────
  // SECTION 7: INSTAGRAM-STYLE PRESETS (20+)
  // ─────────────────────────────────────────────────────────────────────

  static PRESETS = {
    clarendon:   { brightness: 8, contrast: 15, saturation: 20, temperature: 5, vignette: { amount: 15 } },
    gingham:     { brightness: 5, contrast: -10, saturation: -15, hue: 0, temperature: -10 },
    moon:        { brightness: 10, contrast: 5, saturation: -100, temperature: 0 },
    lark:        { brightness: 10, contrast: 5, saturation: 10, temperature: 10, levels: { gamma: 1.1 } },
    reyes:       { brightness: 15, contrast: -5, saturation: -20, temperature: 10, vignette: { amount: 10 } },
    juno:        { brightness: 5, contrast: 15, saturation: 30, temperature: 10 },
    slumber:     { brightness: -5, contrast: -10, saturation: -30, temperature: -5, vignette: { amount: 20 } },
    crema:       { brightness: 5, contrast: -5, saturation: -15, temperature: 15 },
    ludwig:      { brightness: 0, contrast: 10, saturation: -10, temperature: 5, vignette: { amount: 10 } },
    aden:        { brightness: 10, contrast: -10, saturation: 15, temperature: 15, vignette: { amount: 10 } },
    perpetua:    { brightness: 5, contrast: 0, saturation: 15, temperature: -5 },
    amaro:       { brightness: 15, contrast: 5, saturation: 10, temperature: 0, vignette: { amount: 20 } },
    mayfair:     { brightness: 5, contrast: 10, saturation: 15, temperature: 10, vignette: { amount: 30 } },
    rise:        { brightness: 10, contrast: 5, saturation: 10, temperature: 20 },
    hudson:      { brightness: 15, contrast: 10, saturation: -5, temperature: -15, vignette: { amount: 25 } },
    valencia:    { brightness: 5, contrast: 5, saturation: 10, temperature: 20 },
    xpro2:       { brightness: 0, contrast: 20, saturation: 20, temperature: -10, vignette: { amount: 40 } },
    sierra:      { brightness: 5, contrast: -5, saturation: -10, temperature: 5, vignette: { amount: 15 } },
    willow:      { brightness: 10, contrast: 5, saturation: -100, temperature: 10 },
    lofi:        { brightness: 0, contrast: 20, saturation: 20, temperature: 0, vignette: { amount: 30 } },
    inkwell:     { brightness: 5, contrast: 15, saturation: -100, temperature: 0 },
    nashville:   { brightness: 10, contrast: 10, saturation: 15, temperature: 25, vignette: { amount: 15 } },
    earlybird:   { brightness: 10, contrast: 10, saturation: 10, temperature: 30, vignette: { amount: 30 } },
    brannan:     { brightness: 5, contrast: 20, saturation: -10, temperature: 15, vignette: { amount: 20 } },
    // Aurality Studio custom presets
    neonNights:  { brightness: -5, contrast: 25, saturation: 50, hue: 180, temperature: -30 },
    vinylWarm:   { brightness: 5, contrast: 10, saturation: -10, temperature: 25, grain: 20, vignette: { amount: 25 } },
    studioGlow:  { brightness: 15, contrast: 5, saturation: 15, temperature: 10 },
    bassBoost:   { brightness: -10, contrast: 30, saturation: 40, temperature: -20, vignette: { amount: 40 } },
    retroWave:   { brightness: 5, contrast: 15, saturation: 30, temperature: -15, chromaticAberration: 4 }
  };

  /**
   * Apply a named preset
   */
  _applyPreset(imageData, name) {
    const preset = PhotoEditEngine.PRESETS[name];
    if (!preset) return imageData;

    let img = imageData;
    if (preset.brightness) img = this._brightness(img, preset.brightness);
    if (preset.contrast) img = this._contrast(img, preset.contrast);
    if (preset.saturation !== undefined) img = this._saturation(img, preset.saturation);
    if (preset.hue) img = this._hueRotate(img, preset.hue);
    if (preset.temperature) img = this._temperature(img, preset.temperature);
    if (preset.levels) img = this._levels(img, preset.levels);
    if (preset.vignette) img = this._vignette(img, preset.vignette);
    if (preset.grain) img = this._grain(img, preset.grain);
    if (preset.chromaticAberration) img = this._chromaticAberration(img, preset.chromaticAberration);
    return img;
  }

  /**
   * List all available preset names
   */
  static listPresets() {
    return Object.keys(PhotoEditEngine.PRESETS);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: MAIN PHOTO TOOLS CLASS
// ─────────────────────────────────────────────────────────────────────────────

class PhotoTools {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.editor = new PhotoEditEngine();
    this.bgRemover = new BackgroundRemover();
    this.stego = new Steganography();
    this.histogram = new Histogram();
    this._workerPool = [];
    this._maxWorkers = navigator.hardwareConcurrency || 4;
  }

  // ── Canvas Management ──────────────────────────────────────────────────

  /**
   * Bind to an existing canvas element
   */
  bindCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Create a new canvas and append to container
   */
  createCanvas(container, width = 800, height = 600) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.background = '#1a1a2e';
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (container) container.appendChild(this.canvas);
    return this.canvas;
  }

  /**
   * Display ImageData on the bound canvas
   */
  display(imageData) {
    if (!this.canvas || !this.ctx) throw new Error('No canvas bound. Call bindCanvas() or createCanvas() first.');
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.ctx.putImageData(imageData, 0, 0);
  }

  // ── Image Loading ──────────────────────────────────────────────────────

  /**
   * Load image from File input or Blob
   */
  async loadFile(file) {
    const { imageData, width, height } = await PhotoUtils.loadImageData(file);
    this.editor.loadImage(imageData);
    this.display(imageData);
    this.histogram.compute(imageData);
    return { width, height, imageData };
  }

  /**
   * Load image from URL
   */
  async loadURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const { canvas, ctx } = PhotoUtils.canvasFromImage(img);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.editor.loadImage(imageData);
        this.display(imageData);
        this.histogram.compute(imageData);
        resolve({ width: canvas.width, height: canvas.height, imageData });
      };
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = url;
    });
  }

  /**
   * Load from an existing Image element
   */
  loadImageElement(img) {
    const { canvas, ctx } = PhotoUtils.canvasFromImage(img);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.editor.loadImage(imageData);
    this.display(imageData);
    this.histogram.compute(imageData);
    return { width: canvas.width, height: canvas.height, imageData };
  }

  // ── Editing Convenience Methods ────────────────────────────────────────

  /** Set brightness (-100 to 100) */
  setBrightness(value) {
    this.editor.setFilter('brightness', { value });
    this._refresh();
  }

  /** Set contrast (-100 to 100) */
  setContrast(value) {
    this.editor.setFilter('contrast', { value });
    this._refresh();
  }

  /** Set saturation (-100 to 100) */
  setSaturation(value) {
    this.editor.setFilter('saturation', { value });
    this._refresh();
  }

  /** Set hue rotation (degrees) */
  setHue(value) {
    this.editor.setFilter('hue', { value });
    this._refresh();
  }

  /** Set temperature (-100 to 100) */
  setTemperature(value) {
    this.editor.setFilter('temperature', { value });
    this._refresh();
  }

  /**
   * Set curves
   * @param {object} params - { rgb: [[x,y],...], r: [...], g: [...], b: [...] }
   */
  setCurves(params) {
    this.editor.setFilter('curves', params);
    this._refresh();
  }

  /**
   * Set levels
   * @param {object} params - { inBlack, inWhite, gamma, outBlack, outWhite }
   */
  setLevels(params) {
    this.editor.setFilter('levels', params);
    this._refresh();
  }

  /** Sharpen (amount: 0.5-5) */
  sharpen(amount = 1) {
    this.editor.addFilter('sharpen', { amount });
    this._refresh();
  }

  /** Blur (radius: 1-20) */
  blur(radius = 3) {
    this.editor.addFilter('blur', { radius });
    this._refresh();
  }

  /** Noise reduction (strength: 1-10) */
  reduceNoise(strength = 5) {
    this.editor.addFilter('noiseReduction', { strength });
    this._refresh();
  }

  /** Crop */
  crop(x, y, w, h) {
    this.editor.setCrop(x, y, w, h);
    this.editor.applyCrop();
    this._refresh();
  }

  /** Rotate (degrees) */
  rotate(degrees) {
    this.editor.applyRotation(degrees);
    this._refresh();
  }

  /** Flip horizontal */
  flipH() {
    this.editor.applyFlip(true);
    this._refresh();
  }

  /** Flip vertical */
  flipV() {
    this.editor.applyFlip(false);
    this._refresh();
  }

  /** Color at point */
  eyedropper(x, y) {
    return this.editor.colorAt(x, y);
  }

  /** Undo */
  undo() {
    const ok = this.editor.undo();
    if (ok) this._refresh();
    return ok;
  }

  /** Redo */
  redo() {
    const ok = this.editor.redo();
    if (ok) this._refresh();
    return ok;
  }

  /** Clear all edits */
  reset() {
    this.editor.clearFilters();
    this._refresh();
  }

  // ── Filters & Effects ──────────────────────────────────────────────────

  /** Apply vignette */
  addVignette(amount = 50, midpoint = 50, feather = 50) {
    this.editor.addFilter('vignette', { amount, midpoint, feather });
    this._refresh();
  }

  /** Add film grain */
  addGrain(amount = 30) {
    this.editor.addFilter('grain', { amount });
    this._refresh();
  }

  /** Chromatic aberration */
  addChromaticAberration(offset = 3) {
    this.editor.addFilter('chromaticAberration', { offset });
    this._refresh();
  }

  /** Duotone effect */
  addDuotone(darkColor, lightColor) {
    this.editor.addFilter('duotone', { dark: darkColor, light: lightColor });
    this._refresh();
  }

  /** Gradient map */
  addGradientMap(stops) {
    this.editor.addFilter('gradientMap', { stops });
    this._refresh();
  }

  /** Glitch effect */
  addGlitch(intensity = 50, slices = 20) {
    this.editor.addFilter('glitch', { intensity, slices, channelShift: true });
    this._refresh();
  }

  /** ASCII art effect */
  addAsciiArt(cellSize = 8, colored = false) {
    this.editor.addFilter('asciiArt', { cellSize, colored });
    this._refresh();
  }

  /** Get ASCII art as text */
  getAsciiText(cols = 80) {
    if (!this.editor.current) return '';
    return this.editor.asciiArtString(this.editor.current, cols);
  }

  /** Pixel sort */
  addPixelSort(threshold = 80, direction = 'horizontal', mode = 'brightness') {
    this.editor.addFilter('pixelSort', { threshold, direction, mode });
    this._refresh();
  }

  /** Deep fry */
  addDeepFry(intensity = 80) {
    this.editor.addFilter('deepFry', { intensity });
    this._refresh();
  }

  /** Apply preset by name */
  applyPreset(name) {
    this.editor.addFilter('preset', { name });
    this._refresh();
  }

  /** List all available presets */
  listPresets() {
    return PhotoEditEngine.listPresets();
  }

  // ── Background Removal ─────────────────────────────────────────────────

  /**
   * Remove background from current image
   * @returns {ImageData} image with transparent background
   */
  removeBackground() {
    if (!this.editor.current) throw new Error('No image loaded');
    const mask = this.bgRemover.removeBg(this.editor.current);
    const result = this.bgRemover.applyMask(this.editor.current, mask);
    this.display(result);
    return result;
  }

  /**
   * Touch up the background mask
   * @param {number} x - center X
   * @param {number} y - center Y
   * @param {number} radius - brush radius
   * @param {boolean} isForeground - true to mark as foreground
   */
  touchUpMask(x, y, radius, isForeground) {
    if (!this.editor.current || !this.bgRemover.mask) return;
    this.bgRemover.touchUp(x, y, radius, isForeground, this.editor.current.width, this.editor.current.height);
    const result = this.bgRemover.applyMask(this.editor.current, this.bgRemover.mask);
    this.display(result);
    return result;
  }

  /**
   * Batch remove backgrounds from multiple File objects
   * @param {File[]} files
   * @returns {Promise<ImageData[]>}
   */
  async batchRemoveBackground(files) {
    const results = [];
    for (const file of files) {
      const { imageData } = await PhotoUtils.loadImageData(file);
      const mask = this.bgRemover.removeBg(imageData);
      results.push(this.bgRemover.applyMask(imageData, mask));
    }
    return results;
  }

  // ── Steganography ──────────────────────────────────────────────────────

  /**
   * Hide a text message in the current image
   * @param {string} message
   * @param {string} [password] - optional AES-256 encryption
   * @returns {ImageData}
   */
  async hideMessage(message, password = null) {
    if (!this.editor.current) throw new Error('No image loaded');
    const result = await this.stego.encodeMessage(this.editor.current, message, password);
    this.display(result);
    return result;
  }

  /**
   * Extract hidden message from current image
   * @param {string} [password]
   * @returns {string}
   */
  async revealMessage(password = null) {
    if (!this.editor.current) throw new Error('No image loaded');
    return this.stego.decodeMessage(this.editor.current, password);
  }

  /**
   * Hide a file in the current image
   * @param {File} file
   * @param {string} [password]
   * @returns {ImageData}
   */
  async hideFile(file, password = null) {
    if (!this.editor.current) throw new Error('No image loaded');
    const buffer = await file.arrayBuffer();
    const result = await this.stego.encodeFile(this.editor.current, new Uint8Array(buffer), password);
    this.display(result);
    return result;
  }

  /**
   * Extract hidden file from current image
   * @param {string} [password]
   * @returns {Uint8Array}
   */
  async revealFile(password = null) {
    if (!this.editor.current) throw new Error('No image loaded');
    return this.stego.decodeFile(this.editor.current, password);
  }

  /**
   * Get steganographic capacity of current image in bytes
   */
  stegoCapacity() {
    if (!this.editor.current) return 0;
    return this.stego.capacity(this.editor.current);
  }

  /**
   * Show visual diff between original and stego-encoded image
   * @param {ImageData} stegoImage
   * @returns {ImageData}
   */
  stegoVisualDiff(stegoImage) {
    if (!this.editor.current) throw new Error('No image loaded');
    return this.stego.visualDiff(this.editor.current, stegoImage);
  }

  // ── Histogram ──────────────────────────────────────────────────────────

  /**
   * Render histogram of current image to a canvas
   * @param {HTMLCanvasElement} canvas
   * @param {string} channel - 'r','g','b','lum','all'
   */
  renderHistogram(canvas, channel = 'all') {
    if (!this.editor.current) return;
    this.histogram.compute(this.editor.current);
    this.histogram.render(canvas, channel);
  }

  /**
   * Get raw histogram data
   */
  getHistogramData() {
    if (!this.editor.current) return null;
    return this.histogram.compute(this.editor.current);
  }

  // ── Export ──────────────────────────────────────────────────────────────

  /**
   * Export current image
   * @param {string} format - 'png','jpeg','webp'
   * @param {number} quality - 0-1
   * @returns {Promise<Blob>}
   */
  async exportBlob(format = 'png', quality = 0.92) {
    return this.editor.exportBlob(format, quality);
  }

  /** Export as data URL */
  exportDataURL(format = 'png', quality = 0.92) {
    return this.editor.exportDataURL(format, quality);
  }

  /** Trigger download */
  async download(filename = 'aurality-photo', format = 'png', quality = 0.92) {
    return this.editor.download(filename, format, quality);
  }

  /**
   * Export background-removed image as PNG blob
   */
  async exportTransparentPNG() {
    if (!this.bgRemover.mask || !this.editor.current) throw new Error('No background removal result');
    const result = this.bgRemover.applyMask(this.editor.current, this.bgRemover.mask);
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    canvas.getContext('2d').putImageData(result, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png');
    });
  }

  // ── OffscreenCanvas Worker Support ─────────────────────────────────────

  /**
   * Process a heavy filter in a Web Worker using OffscreenCanvas
   * Falls back to main thread if Workers/OffscreenCanvas unavailable
   */
  async processInWorker(filterType, params) {
    if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') {
      // Fallback: process on main thread
      this.editor.addFilter(filterType, params);
      this._refresh();
      return;
    }

    const imageData = this.editor.current || this.editor.original;
    if (!imageData) throw new Error('No image loaded');

    return new Promise((resolve, reject) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { type, params, imageData, width, height } = e.data;
          const data = new Uint8ClampedArray(imageData);

          // Inline filter implementations for worker context
          const clamp = (v, min, max) => v < min ? min : v > max ? max : v;

          switch (type) {
            case 'brightness': {
              const factor = params.value * 2.55;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = clamp(data[i] + factor, 0, 255);
                data[i+1] = clamp(data[i+1] + factor, 0, 255);
                data[i+2] = clamp(data[i+2] + factor, 0, 255);
              }
              break;
            }
            case 'contrast': {
              const f = (259 * (params.value + 255)) / (255 * (259 - params.value));
              for (let i = 0; i < data.length; i += 4) {
                data[i] = clamp(f * (data[i] - 128) + 128, 0, 255);
                data[i+1] = clamp(f * (data[i+1] - 128) + 128, 0, 255);
                data[i+2] = clamp(f * (data[i+2] - 128) + 128, 0, 255);
              }
              break;
            }
            case 'saturation': {
              const f = 1 + params.value / 100;
              for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
                data[i] = clamp(gray + f*(data[i]-gray), 0, 255);
                data[i+1] = clamp(gray + f*(data[i+1]-gray), 0, 255);
                data[i+2] = clamp(gray + f*(data[i+2]-gray), 0, 255);
              }
              break;
            }
            case 'grain': {
              for (let i = 0; i < data.length; i += 4) {
                const n = (Math.random()-0.5) * params.amount;
                data[i] = clamp(data[i]+n, 0, 255);
                data[i+1] = clamp(data[i+1]+n, 0, 255);
                data[i+2] = clamp(data[i+2]+n, 0, 255);
              }
              break;
            }
          }

          self.postMessage({ data: data.buffer, width, height }, [data.buffer]);
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        const { data: buffer, width, height } = e.data;
        const result = new ImageData(new Uint8ClampedArray(buffer), width, height);
        this.editor.current = result;
        this.display(result);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        resolve(result);
      };

      worker.onerror = (err) => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        // Fallback to main thread
        this.editor.addFilter(filterType, params);
        this._refresh();
        resolve(this.editor.current);
      };

      const transferBuffer = new Uint8ClampedArray(imageData.data).buffer;
      worker.postMessage({
        type: filterType,
        params,
        imageData: transferBuffer,
        width: imageData.width,
        height: imageData.height
      }, [transferBuffer]);
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────

  /** Refresh display and histogram after edit */
  _refresh() {
    if (this.editor.current) {
      this.display(this.editor.current);
      this.histogram.compute(this.editor.current);
    }
  }

  /**
   * Get current ImageData
   */
  getImageData() {
    return this.editor.current;
  }

  /**
   * Get original (unedited) ImageData
   */
  getOriginalImageData() {
    return this.editor.original;
  }

  /**
   * Get the current filter stack
   */
  getFilterStack() {
    return [...this.editor.filterStack];
  }

  /**
   * Import a filter stack (for loading saved edits)
   */
  importFilterStack(stack) {
    this.editor.filterStack = JSON.parse(JSON.stringify(stack));
    this.editor.render();
    this._refresh();
  }

  /**
   * Serialize current editing state to JSON
   */
  serializeState() {
    return JSON.stringify({
      filterStack: this.editor.filterStack,
      cropRect: this.editor.cropRect,
      rotation: this.editor.rotation,
      flipH: this.editor.flipH,
      flipV: this.editor.flipV
    });
  }

  /**
   * Restore editing state from JSON
   */
  deserializeState(json) {
    const state = JSON.parse(json);
    this.editor.filterStack = state.filterStack || [];
    this.editor.cropRect = state.cropRect || null;
    this.editor.rotation = state.rotation || 0;
    this.editor.flipH = state.flipH || false;
    this.editor.flipV = state.flipV || false;
    this.editor.render();
    this._refresh();
  }

  /**
   * Compare original and edited side-by-side on a canvas
   */
  compareSideBySide(targetCanvas) {
    if (!this.editor.original || !this.editor.current) return;
    const orig = this.editor.original;
    const curr = this.editor.current;
    const w = orig.width + curr.width + 4; // 4px gap
    const h = Math.max(orig.height, curr.height);
    targetCanvas.width = w;
    targetCanvas.height = h;
    const ctx = targetCanvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Original
    const c1 = document.createElement('canvas');
    c1.width = orig.width; c1.height = orig.height;
    c1.getContext('2d').putImageData(orig, 0, 0);
    ctx.drawImage(c1, 0, 0);

    // Separator
    ctx.fillStyle = '#333';
    ctx.fillRect(orig.width, 0, 4, h);

    // Current
    const c2 = document.createElement('canvas');
    c2.width = curr.width; c2.height = curr.height;
    c2.getContext('2d').putImageData(curr, 0, 0);
    ctx.drawImage(c2, orig.width + 4, 0);

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px monospace';
    ctx.fillText('Original', 10, 20);
    ctx.fillText('Edited', orig.width + 14, 20);
  }

  /**
   * Cleanup and release resources
   */
  destroy() {
    this.editor.original = null;
    this.editor.current = null;
    this.editor.filterStack = [];
    this.editor.undoStack = [];
    this.editor.redoStack = [];
    this.bgRemover.mask = null;
    this.canvas = null;
    this.ctx = null;
    for (const w of this._workerPool) w.terminate();
    this._workerPool = [];
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: WINDOW GLOBAL (matches Aurality Studio pattern)
// ─────────────────────────────────────────────────────────────────────────────

window.PhotoTools = PhotoTools;
window.PhotoEditEngine = PhotoEditEngine;
window.BackgroundRemover = BackgroundRemover;
window.Steganography = Steganography;
window.Histogram = Histogram;
window.PhotoUtils = PhotoUtils;
