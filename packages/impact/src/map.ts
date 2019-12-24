export class igMap {
  width: number;
  height: number;
  pxWidth: number;
  pxHeight: number;

  constructor(protected tilesize: number, protected data: number[][]) {
    this.height = this.data.length;
    this.width = this.data[0].length;

    this.pxWidth = this.width * this.tilesize;
    this.pxHeight = this.height * this.tilesize;
  }

  getTile(x: number, y: number) {
    const tx = Math.floor(x / this.tilesize);
    const ty = Math.floor(y / this.tilesize);

    return this.data?.[ty]?.[tx] ?? 0;
  }

  setTile(x: number, y: number, tile: number) {
    const tx = Math.floor(x / this.tilesize);
    const ty = Math.floor(y / this.tilesize);

    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      this.data[ty][tx] = tile;
    }
  }
}
