export class igTimer {
  static _last = 0;
  static time = Number.MIN_VALUE;
  static timeScale = 1;
  static maxStep = 0.05;

  static step = function() {
    const current = Date.now();
    const delta = (current - igTimer._last) / 1000;
    igTimer.time += Math.min(delta, igTimer.maxStep) * igTimer.timeScale;
    igTimer._last = current;
  };

  target = 0;
  base = 0;
  last = 0;
  pausedAt = 0;

  constructor(seconds?: number) {
    this.base = igTimer.time;
    this.last = igTimer.time;

    this.target = seconds ?? 0;
  }

  set(seconds?: number) {
    this.target = seconds ?? 0;
    this.base = igTimer.time;
    this.pausedAt = 0;
  }

  reset() {
    this.base = igTimer.time;
    this.pausedAt = 0;
  }

  tick() {
    const delta = igTimer.time - this.last;
    this.last = igTimer.time;
    return this.pausedAt ? 0 : delta;
  }

  delta() {
    return (this.pausedAt || igTimer.time) - this.base - this.target;
  }

  pause() {
    if (!this.pausedAt) {
      this.pausedAt = igTimer.time;
    }
  }

  unpause() {
    if (this.pausedAt) {
      this.base += igTimer.time - this.pausedAt;
      this.pausedAt = 0;
    }
  }
}
