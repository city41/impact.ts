import { igImage } from './image';
import { igTimer } from './timer';
import { ig } from './impact';

export class igAnimationSheet {
  image: igImage;

  constructor(path: string, public width: number, public height: number) {
    this.image = new igImage(path);
  }
}

export class igAnimation {
  timer: igTimer;
  flip = { x: false, y: false };
  pivot: { x: number; y: number };
  tile: number;

  frame = 0;
  loopCount = 0;
  alpha = 1;
  angle = 0;

  constructor(
    private sheet: igAnimationSheet,
    public frameTime: number,
    private sequence: number[],
    private stop: boolean
  ) {
    this.pivot = { x: sheet.width / 2, y: sheet.height / 2 };
    this.timer = new igTimer();

    this.tile = this.sequence[0];
  }

  rewind() {
    this.timer.set();
    this.loopCount = 0;
    this.frame = 0;
    this.tile = this.sequence[0];
    return this;
  }

  gotoFrame(f: number) {
    // Offset the timer by one tenth of a millisecond to make sure we
    // jump to the correct frame and circumvent rounding errors
    this.timer.set(this.frameTime * -f - 0.0001);
    this.update();
  }

  gotoRandomFrame() {
    this.gotoFrame(Math.floor(Math.random() * this.sequence.length));
  }

  update() {
    const frameTotal = Math.floor(this.timer.delta() / this.frameTime);
    this.loopCount = Math.floor(frameTotal / this.sequence.length);
    if (this.stop && this.loopCount > 0) {
      this.frame = this.sequence.length - 1;
    } else {
      this.frame = frameTotal % this.sequence.length;
    }
    this.tile = this.sequence[this.frame];
  }

  draw(targetX: number, targetY: number) {
    const bbsize = Math.max(this.sheet.width, this.sheet.height);

    // On screen?
    if (
      targetX > ig.system.width ||
      targetY > ig.system.height ||
      targetX + bbsize < 0 ||
      targetY + bbsize < 0
    ) {
      return;
    }

    if (this.alpha !== 1) {
      ig.system.context.globalAlpha = this.alpha;
    }

    if (this.angle === 0) {
      this.sheet.image.drawTile(
        targetX,
        targetY,
        this.tile,
        this.sheet.width,
        this.sheet.height,
        this.flip.x,
        this.flip.y
      );
    } else {
      ig.system.context.save();
      ig.system.context.translate(
        ig.system.getDrawPos(targetX + this.pivot.x),
        ig.system.getDrawPos(targetY + this.pivot.y)
      );
      ig.system.context.rotate(this.angle);
      this.sheet.image.drawTile(
        -this.pivot.x,
        -this.pivot.y,
        this.tile,
        this.sheet.width,
        this.sheet.height,
        this.flip.x,
        this.flip.y
      );
      ig.system.context.restore();
    }

    if (this.alpha != 1) {
      ig.system.context.globalAlpha = 1;
    }
  }
}
