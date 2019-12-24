import { ig } from './impact';
import { igTimer } from './timer';

type Delegate = { run: () => void };

function isDelegate(obj: unknown): obj is Delegate {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return typeof (obj as any)['run'] === 'function';
}

export class igSystem {
  static DRAW = {
    AUTHENTIC(this: igSystem, p: number) {
      return Math.round(p) * this.scale;
    },
    SMOOTH(this: igSystem, p: number) {
      return Math.round(p * this.scale);
    },
    SUBPIXEL(this: igSystem, p: number) {
      return p * this.scale;
    },
  };

  static drawMode = igSystem.DRAW.SMOOTH;

  static SCALE = {
    CRISP(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
      ig.setVendorAttribute(context, 'imageSmoothingEnabled', false);
      canvas.style.imageRendering = '-moz-crisp-edges';
      canvas.style.imageRendering = '-o-crisp-edges';
      canvas.style.imageRendering = '-webkit-optimize-contrast';
      canvas.style.imageRendering = 'crisp-edges';

      // @ts-ignore this is probably no longer needed
      canvas.style.msInterpolationMode = 'nearest-neighbor'; // No effect on Canvas :/
    },
    SMOOTH(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
      ig.setVendorAttribute(context, 'imageSmoothingEnabled', true);
      canvas.style.imageRendering = '';

      // @ts-ignore this is probably no longer needed
      canvas.style.msInterpolationMode = '';
    },
  };

  static scaleMode = igSystem.SCALE.SMOOTH;

  fps: number;
  width = 320;
  height = 240;
  realWidth = 320;
  realHeight = 240;
  scale = 1;

  tick = 0;
  animationId = 0;
  newGameClass = null;
  running = false;

  delegate: Delegate | null = null;
  clock: igTimer;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  getDrawPos: (p: number) => number;

  constructor(
    canvasId: string,
    fps: number,
    width: number,
    height: number,
    scale: number
  ) {
    this.fps = fps;

    this.clock = new igTimer();
    this.canvas = document.querySelector(canvasId) as HTMLCanvasElement;

    if (!this.canvas) {
      throw new Error(`Failed to find canvas with id: ${canvasId}`);
    }

    this.resize(width, height, scale);
    this.context = this.canvas.getContext('2d')!;

    this.getDrawPos = igSystem.drawMode;

    // Automatically switch to crisp scaling when using a scale
    // other than 1
    if (this.scale != 1) {
      igSystem.scaleMode = igSystem.SCALE.CRISP;
    }
    igSystem.scaleMode(this.canvas, this.context);
  }

  resize(width: number, height: number, scale: number) {
    this.width = width;
    this.height = height;
    this.scale = scale || this.scale;

    this.realWidth = this.width * this.scale;
    this.realHeight = this.height * this.scale;
    this.canvas.width = this.realWidth;
    this.canvas.height = this.realHeight;
  }

  setGame(gameClass: any) {
    if (this.running) {
      this.newGameClass = gameClass;
    } else {
      this.setGameNow(gameClass);
    }
  }

  setGameNow(gameClass: any) {
    ig.game = new gameClass();
    ig.system.setDelegate(ig.game);
  }

  setDelegate(object: unknown) {
    if (isDelegate(object)) {
      this.delegate = object;
      this.startRunLoop();
    } else {
      throw 'System.setDelegate: No run() function in object';
    }
  }

  stopRunLoop() {
    ig.clearAnimation(this.animationId);
    this.running = false;
  }

  startRunLoop() {
    this.stopRunLoop();
    this.animationId = ig.setAnimation(this.run.bind(this));
    this.running = true;
  }

  clear(color: string | CanvasGradient | CanvasPattern) {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.realWidth, this.realHeight);
  }

  run() {
    igTimer.step();

    if (this.clock) {
      this.tick = this.clock.tick();
    }

    this.delegate?.run();
    ig.input.clearPressed();

    if (this.newGameClass) {
      this.setGameNow(this.newGameClass);
      this.newGameClass = null;
    }
  }
}
