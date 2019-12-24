import { ig } from './impact';
import { LoadCallback } from './types';

export class igImage {
  static drawCount = 0;
  static cache: Record<string, igImage> = {};
  static reloadCache = function() {
    for (const path in igImage.cache) {
      igImage.cache[path].reload();
    }
  };

  data: HTMLImageElement | HTMLCanvasElement | null = null;
  width = 0;
  height = 0;
  loaded = false;
  failed = false;
  loadCallback: LoadCallback | null = null;

  staticInstantiate(path: string) {
    return igImage.cache[path] || null;
  }

  constructor(public path: string) {
    this.load();
  }

  load(loadCallback?: LoadCallback) {
    if (this.loaded) {
      if (loadCallback) {
        loadCallback(this.path, true);
      }
      return;
    } else if (!this.loaded && ig.ready) {
      this.loadCallback = loadCallback || null;

      this.data = new Image();
      this.data.onload = this.onload.bind(this);
      this.data.onerror = this.onerror.bind(this);
      this.data.src = this.path + ig.nocache;
    } else {
      ig.addResource(this);
    }

    igImage.cache[this.path] = this;
  }

  reload() {
    this.loaded = false;
    this.data = new Image();
    this.data.onload = this.onload.bind(this);
    this.data.src = this.path + '?' + Date.now();
  }

  onload() {
    this.width = this.data!.width;
    this.height = this.data!.height;
    this.loaded = true;

    if (ig.system?.scale != 1) {
      this.resize(ig.system?.scale);
    }

    if (this.loadCallback) {
      this.loadCallback(this.path, true);
    }
  }

  onerror() {
    this.failed = true;

    if (this.loadCallback) {
      this.loadCallback(this.path, false);
    }
  }

  resize(scale: number) {
    // Nearest-Neighbor scaling

    // The original image is drawn into an offscreen canvas of the same size
    // and copied into another offscreen canvas with the new size.
    // The scaled offscreen canvas becomes the image (data) of this object.

    const origPixels = ig.getImagePixels(
      this.data,
      0,
      0,
      this.width,
      this.height
    );

    const widthScaled = this.width * scale;
    const heightScaled = this.height * scale;

    const scaled = document.createElement('canvas');
    scaled.width = widthScaled;
    scaled.height = heightScaled;
    const scaledCtx = scaled.getContext('2d')!;
    const scaledPixels = scaledCtx.getImageData(
      0,
      0,
      widthScaled,
      heightScaled
    );

    for (let y = 0; y < heightScaled; y++) {
      for (let x = 0; x < widthScaled; x++) {
        const index =
          (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4;
        const indexScaled = (y * widthScaled + x) * 4;
        scaledPixels.data[indexScaled] = origPixels.data[index];
        scaledPixels.data[indexScaled + 1] = origPixels.data[index + 1];
        scaledPixels.data[indexScaled + 2] = origPixels.data[index + 2];
        scaledPixels.data[indexScaled + 3] = origPixels.data[index + 3];
      }
    }
    scaledCtx.putImageData(scaledPixels, 0, 0);
    this.data = scaled;
  }

  draw(
    targetX: number,
    targetY: number,
    sourceX?: number,
    sourceY?: number,
    width?: number,
    height?: number
  ) {
    if (!this.loaded) {
      return;
    }

    const scale = ig.system.scale;
    sourceX = sourceX ? sourceX * scale : 0;
    sourceY = sourceY ? sourceY * scale : 0;
    width = (width ? width : this.width) * scale;
    height = (height ? height : this.height) * scale;

    ig.system.context.drawImage(
      this.data,
      sourceX,
      sourceY,
      width,
      height,
      ig.system.getDrawPos(targetX),
      ig.system.getDrawPos(targetY),
      width,
      height
    );

    igImage.drawCount++;
  }

  drawTile(
    targetX: number,
    targetY: number,
    tile: number,
    tileWidth: number,
    tileHeight?: number,
    flipX?: boolean,
    flipY?: boolean
  ) {
    tileHeight = tileHeight ? tileHeight : tileWidth;

    if (!this.loaded || tileWidth > this.width || tileHeight > this.height) {
      return;
    }

    const scale = ig.system.scale;
    const tileWidthScaled = Math.floor(tileWidth * scale);
    const tileHeightScaled = Math.floor(tileHeight * scale);

    const scaleX = flipX ? -1 : 1;
    const scaleY = flipY ? -1 : 1;

    if (flipX || flipY) {
      ig.system.context.save();
      ig.system.context.scale(scaleX, scaleY);
    }
    ig.system.context.drawImage(
      this.data,
      (Math.floor(tile * tileWidth) % this.width) * scale,
      Math.floor((tile * tileWidth) / this.width) * tileHeight * scale,
      tileWidthScaled,
      tileHeightScaled,
      ig.system.getDrawPos(targetX) * scaleX - (flipX ? tileWidthScaled : 0),
      ig.system.getDrawPos(targetY) * scaleY - (flipY ? tileHeightScaled : 0),
      tileWidthScaled,
      tileHeightScaled
    );
    if (flipX || flipY) {
      ig.system.context.restore();
    }

    igImage.drawCount++;
  }
}
