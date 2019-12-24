import { ig } from './impact';
import { igImage } from './image';

export enum igFontAlign {
  LEFT = 0,
  RIGHT,
  CENTER,
}

export class igFont extends igImage {
  widthMap: number[] = [];
  indices: number[] = [];
  firstChar = 32;
  alpha = 1;
  letterSpacing = 1;
  lineSpacing = 0;

  onload() {
    this._loadMetrics(this.data!);
    super.onload();
    this.height -= 2; // last 2 lines contain no visual data
  }

  widthForString(text: string) {
    // Multiline?
    if (text.indexOf('\n') !== -1) {
      const lines = text.split('\n');
      let width = 0;
      for (let i = 0; i < lines.length; i++) {
        width = Math.max(width, this._widthForLine(lines[i]));
      }
      return width;
    } else {
      return this._widthForLine(text);
    }
  }

  _widthForLine(text: string) {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      width += this.widthMap[text.charCodeAt(i) - this.firstChar];
    }
    if (text.length > 0) {
      width += this.letterSpacing * (text.length - 1);
    }
    return width;
  }

  heightForString(text: string) {
    return text.split('\n').length * (this.height + this.lineSpacing);
  }

  draw(text: any, x: number, y: number, align: igFontAlign = igFontAlign.LEFT) {
    if (typeof text !== 'string') {
      text = text.toString();
    }

    // Multiline?
    if (text.indexOf('\n') !== -1) {
      const lines = text.split('\n');
      const lineHeight = this.height + this.lineSpacing;
      for (let i = 0; i < lines.length; i++) {
        this.draw(lines[i], x, y + i * lineHeight, align);
      }
      return;
    }

    if (align === igFontAlign.RIGHT || align == igFontAlign.CENTER) {
      const width = this._widthForLine(text);
      x -= align == igFontAlign.CENTER ? width / 2 : width;
    }

    if (this.alpha !== 1) {
      ig.system.context.globalAlpha = this.alpha;
    }

    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      x += this._drawChar(c - this.firstChar, x, y);
    }

    if (this.alpha !== 1) {
      ig.system.context.globalAlpha = 1;
    }
    igImage.drawCount += text.length;
  }

  _drawChar(c: number, targetX: number, targetY: number) {
    if (!this.loaded || c < 0 || c >= this.indices.length) {
      return 0;
    }

    const scale = ig.system.scale;

    const charX = this.indices[c] * scale;
    const charY = 0;
    const charWidth = this.widthMap[c] * scale;
    const charHeight = this.height * scale;

    ig.system.context.drawImage(
      this.data,
      charX,
      charY,
      charWidth,
      charHeight,
      ig.system.getDrawPos(targetX),
      ig.system.getDrawPos(targetY),
      charWidth,
      charHeight
    );

    return this.widthMap[c] + this.letterSpacing;
  }

  _loadMetrics(image: HTMLImageElement | HTMLCanvasElement) {
    // Draw the bottommost line of this font image into an offscreen canvas
    // and analyze it pixel by pixel.
    // A run of non-transparent pixels represents a character and its width

    this.widthMap = [];
    this.indices = [];

    const px = ig.getImagePixels(image, 0, image.height - 1, image.width, 1);

    let currentWidth = 0;
    let x = 0;

    for (; x < image.width; x++) {
      const index = x * 4 + 3; // alpha component of this pixel
      if (px.data[index] > 127) {
        currentWidth++;
      } else if (px.data[index] < 128 && currentWidth) {
        this.widthMap.push(currentWidth);
        this.indices.push(x - currentWidth);
        currentWidth = 0;
      }
    }
    this.widthMap.push(currentWidth);
    this.indices.push(x - currentWidth);
  }
}
