import { igMap } from './map';

export type TraceResult = {
  collision: {
    x: boolean;
    y: boolean;
    slope?: { x: number; y: number; nx: number; ny: number };
  };
  pos: {
    x: number;
    y: number;
  };
  tile: {
    x: number;
    y: number;
  };
};

// TODO: get rid of the any
type TileDef = Record<number, any>;

// Defining 'half', 'one third' and 'two thirds' as vars  makes it a bit
// easier to read... I hope.
const H = 1 / 2;
const N = 1 / 3;
const M = 2 / 3;
const SOLID = true;
const NON_SOLID = false;

export class igCollisionMap extends igMap {
  // Default Slope Tile definition. Each tile is defined by an array of 5 vars:
  // - 4 for the line in tile coordinates (0 -- 1)
  // - 1 specifing whether the tile is 'filled' behind the line or not
  // [ x1, y1, x2, y2, solid ]

  static defaultTileDef: TileDef = {
    /* 15 NE */ 5: [0, 1, 1, M, SOLID],
    6: [0, M, 1, N, SOLID],
    7: [0, N, 1, 0, SOLID],
    /* 22 NE */ 3: [0, 1, 1, H, SOLID],
    4: [0, H, 1, 0, SOLID],
    /* 45 NE */ 2: [0, 1, 1, 0, SOLID],
    /* 67 NE */ 10: [H, 1, 1, 0, SOLID],
    21: [0, 1, H, 0, SOLID],
    /* 75 NE */ 32: [M, 1, 1, 0, SOLID],
    43: [N, 1, M, 0, SOLID],
    54: [0, 1, N, 0, SOLID],

    /* 15 SE */ 27: [0, 0, 1, N, SOLID],
    28: [0, N, 1, M, SOLID],
    29: [0, M, 1, 1, SOLID],
    /* 22 SE */ 25: [0, 0, 1, H, SOLID],
    26: [0, H, 1, 1, SOLID],
    /* 45 SE */ 24: [0, 0, 1, 1, SOLID],
    /* 67 SE */ 11: [0, 0, H, 1, SOLID],
    22: [H, 0, 1, 1, SOLID],
    /* 75 SE */ 33: [0, 0, N, 1, SOLID],
    44: [N, 0, M, 1, SOLID],
    55: [M, 0, 1, 1, SOLID],

    /* 15 NW */ 16: [1, N, 0, 0, SOLID],
    17: [1, M, 0, N, SOLID],
    18: [1, 1, 0, M, SOLID],
    /* 22 NW */ 14: [1, H, 0, 0, SOLID],
    15: [1, 1, 0, H, SOLID],
    /* 45 NW */ 13: [1, 1, 0, 0, SOLID],
    /* 67 NW */ 8: [H, 1, 0, 0, SOLID],
    19: [1, 1, H, 0, SOLID],
    /* 75 NW */ 30: [N, 1, 0, 0, SOLID],
    41: [M, 1, N, 0, SOLID],
    52: [1, 1, M, 0, SOLID],

    /* 15 SW */ 38: [1, M, 0, 1, SOLID],
    39: [1, N, 0, M, SOLID],
    40: [1, 0, 0, N, SOLID],
    /* 22 SW */ 36: [1, H, 0, 1, SOLID],
    37: [1, 0, 0, H, SOLID],
    /* 45 SW */ 35: [1, 0, 0, 1, SOLID],
    /* 67 SW */ 9: [1, 0, H, 1, SOLID],
    20: [H, 0, 0, 1, SOLID],
    /* 75 SW */ 31: [1, 0, M, 1, SOLID],
    42: [M, 0, N, 1, SOLID],
    53: [N, 0, 0, 1, SOLID],

    /* Go N  */ 12: [0, 0, 1, 0, NON_SOLID],
    /* Go S  */ 23: [1, 1, 0, 1, NON_SOLID],
    /* Go E  */ 34: [1, 0, 1, 1, NON_SOLID],
    /* Go W  */ 45: [0, 1, 0, 0, NON_SOLID],

    // Now that was fun!
  };

  // Static Dummy CollisionMap; never collides
  static staticNoCollision = {
    trace(x: number, y: number, vx: number, vy: number) {
      return {
        collision: { x: false, y: false, slope: false },
        pos: { x: x + vx, y: y + vy },
        tile: { x: 0, y: 0 },
      };
    },
  };

  lastSlope = 1;

  tiledef: TileDef;

  constructor(tilesize: number, data: number[][], tiledef?: TileDef | null) {
    super(tilesize, data);
    this.tiledef = tiledef || igCollisionMap.defaultTileDef;

    for (let t in this.tiledef) {
      const nt = Number(t);
      if (nt > this.lastSlope) {
        this.lastSlope = nt;
      }
    }
  }

  trace(
    x: number,
    y: number,
    vx: number,
    vy: number,
    objectWidth: number,
    objectHeight: number
  ): TraceResult {
    // Set up the trace-result
    const res: TraceResult = {
      collision: { x: false, y: false },
      pos: { x: x, y: y },
      tile: { x: 0, y: 0 },
    };

    // Break the trace down into smaller steps if necessary.
    // We add a little extra movement (0.1 px) when calculating the number of steps required,
    // to force an additional trace step whenever vx or vy is a factor of tilesize. This
    // prevents the trace step from skipping through the very first tile.
    const steps = Math.ceil(
      (Math.max(Math.abs(vx), Math.abs(vy)) + 0.1) / this.tilesize
    );
    if (steps > 1) {
      let sx = vx / steps;
      let sy = vy / steps;

      for (let i = 0; i < steps && (sx || sy); i++) {
        this._traceStep(
          res,
          x,
          y,
          sx,
          sy,
          objectWidth,
          objectHeight,
          vx,
          vy,
          i
        );

        x = res.pos.x;
        y = res.pos.y;
        if (res.collision.x) {
          sx = 0;
          vx = 0;
        }
        if (res.collision.y) {
          sy = 0;
          vy = 0;
        }
        if (res.collision.slope) {
          break;
        }
      }
    }

    // Just one step
    else {
      this._traceStep(res, x, y, vx, vy, objectWidth, objectHeight, vx, vy, 0);
    }

    return res;
  }

  private _traceStep(
    res: TraceResult,
    x: number,
    y: number,
    vx: number,
    vy: number,
    width: number,
    height: number,
    rvx: number,
    rvy: number,
    step: number
  ) {
    res.pos.x += vx;
    res.pos.y += vy;

    let t = 0;

    // Horizontal collision (walls)
    if (vx) {
      const pxOffsetX = vx > 0 ? width : 0;
      const tileOffsetX = vx < 0 ? this.tilesize : 0;

      const firstTileY = Math.max(Math.floor(y / this.tilesize), 0);
      const lastTileY = Math.min(
        Math.ceil((y + height) / this.tilesize),
        this.height
      );
      const tileX = Math.floor((res.pos.x + pxOffsetX) / this.tilesize);

      // We need to test the new tile position as well as the current one, as we
      // could still collide with the current tile if it's a line def.
      // We can skip this test if this is not the first step or the new tile position
      // is the same as the current one.
      let prevTileX = Math.floor((x + pxOffsetX) / this.tilesize);
      if (
        step > 0 ||
        tileX == prevTileX ||
        prevTileX < 0 ||
        prevTileX >= this.width
      ) {
        prevTileX = -1;
      }

      // Still inside this collision map?
      if (tileX >= 0 && tileX < this.width) {
        for (let tileY = firstTileY; tileY < lastTileY; tileY++) {
          if (prevTileX != -1) {
            t = this.data[tileY][prevTileX];
            if (
              t > 1 &&
              t <= this.lastSlope &&
              this._checkTileDef(
                res,
                t,
                x,
                y,
                rvx,
                rvy,
                width,
                height,
                prevTileX,
                tileY
              )
            ) {
              break;
            }
          }

          t = this.data[tileY][tileX];
          if (
            t === 1 ||
            t > this.lastSlope || // fully solid tile?
            (t > 1 &&
              this._checkTileDef(
                res,
                t,
                x,
                y,
                rvx,
                rvy,
                width,
                height,
                tileX,
                tileY
              )) // slope?
          ) {
            if (t > 1 && t <= this.lastSlope && res.collision.slope) {
              break;
            }

            // full tile collision!
            res.collision.x = true;
            res.tile.x = t;
            x = res.pos.x = tileX * this.tilesize - pxOffsetX + tileOffsetX;
            rvx = 0;
            break;
          }
        }
      }
    }

    // Vertical collision (floor, ceiling)
    if (vy) {
      const pxOffsetY = vy > 0 ? height : 0;
      const tileOffsetY = vy < 0 ? this.tilesize : 0;

      const firstTileX = Math.max(Math.floor(res.pos.x / this.tilesize), 0);
      const lastTileX = Math.min(
        Math.ceil((res.pos.x + width) / this.tilesize),
        this.width
      );
      const tileY = Math.floor((res.pos.y + pxOffsetY) / this.tilesize);

      let prevTileY = Math.floor((y + pxOffsetY) / this.tilesize);
      if (
        step > 0 ||
        tileY == prevTileY ||
        prevTileY < 0 ||
        prevTileY >= this.height
      ) {
        prevTileY = -1;
      }

      // Still inside this collision map?
      if (tileY >= 0 && tileY < this.height) {
        for (let tileX = firstTileX; tileX < lastTileX; tileX++) {
          if (prevTileY != -1) {
            t = this.data[prevTileY][tileX];
            if (
              t > 1 &&
              t <= this.lastSlope &&
              this._checkTileDef(
                res,
                t,
                x,
                y,
                rvx,
                rvy,
                width,
                height,
                tileX,
                prevTileY
              )
            ) {
              break;
            }
          }

          t = this.data[tileY][tileX];
          if (
            t == 1 ||
            t > this.lastSlope || // fully solid tile?
            (t > 1 &&
              this._checkTileDef(
                res,
                t,
                x,
                y,
                rvx,
                rvy,
                width,
                height,
                tileX,
                tileY
              )) // slope?
          ) {
            if (t > 1 && t <= this.lastSlope && res.collision.slope) {
              break;
            }

            // full tile collision!
            res.collision.y = true;
            res.tile.y = t;
            res.pos.y = tileY * this.tilesize - pxOffsetY + tileOffsetY;
            break;
          }
        }
      }
    }

    // res is changed in place, nothing to return
  }

  private _checkTileDef(
    res: TraceResult,
    // TODO: remove t's any
    t: any,
    x: number,
    y: number,
    vx: number,
    vy: number,
    width: number,
    height: number,
    tileX: number,
    tileY: number
  ): boolean {
    const def = this.tiledef[t];
    if (!def) {
      return false;
    }

    const lx = (tileX + def[0]) * this.tilesize,
      ly = (tileY + def[1]) * this.tilesize,
      lvx = (def[2] - def[0]) * this.tilesize,
      lvy = (def[3] - def[1]) * this.tilesize,
      solid = def[4];

    // Find the box corner to test, relative to the line
    const tx = x + vx + (lvy < 0 ? width : 0) - lx,
      ty = y + vy + (lvx > 0 ? height : 0) - ly;

    // Is the box corner behind the line?
    if (lvx * ty - lvy * tx > 0) {
      // Lines are only solid from one side - find the dot product of
      // line normal and movement vector and dismiss if wrong side
      if (vx * -lvy + vy * lvx < 0) {
        return solid;
      }

      // Find the line normal
      const length = Math.sqrt(lvx * lvx + lvy * lvy);
      const nx = lvy / length,
        ny = -lvx / length;

      // Project out of the line
      const proj = tx * nx + ty * ny;
      const px = nx * proj,
        py = ny * proj;

      // If we project further out than we moved in, then this is a full
      // tile collision for solid tiles.
      // For non-solid tiles, make sure we were in front of the line.
      if (px * px + py * py >= vx * vx + vy * vy) {
        return solid || lvx * (ty - vy) - lvy * (tx - vx) < 0.5;
      }

      res.pos.x = x + vx - px;
      res.pos.y = y + vy - py;
      res.collision.slope = { x: lvx, y: lvy, nx: nx, ny: ny };
      return true;
    }

    return false;
  }
}
