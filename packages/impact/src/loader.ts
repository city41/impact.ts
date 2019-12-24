import { ig } from './impact';
import { LoadCallback } from './types';
import { erase } from './util';

type Resource = { path: string; load: (cb: LoadCallback) => void };

export class igLoader {
  resources: Resource[];

  gameClass: any;
  status = 0;
  done = false;

  _unloaded: string[] = [];
  _drawStatus = 0;
  _intervalId: number = 0;

  constructor(gameClass: any, resources: Resource[]) {
    this.gameClass = gameClass;
    this.resources = resources;

    for (let i = 0; i < this.resources.length; i++) {
      this._unloaded.push(this.resources[i].path);
    }
  }

  load() {
    ig.system.clear('#000');

    if (!this.resources.length) {
      this.end();
      return;
    }

    for (let i = 0; i < this.resources.length; i++) {
      this.loadResource(this.resources[i]);
    }

    this._intervalId = setInterval(this.draw.bind(this), 16) as any;
  }

  loadResource(res: Resource) {
    res.load(this._loadCallback);
  }

  end() {
    if (this.done) {
      return;
    }

    this.done = true;
    clearInterval(this._intervalId);
    ig.system.setGame(this.gameClass);
  }

  draw() {
    this._drawStatus += (this.status - this._drawStatus) / 5;
    const s = ig.system.scale;
    const w = ig.system.width * 0.6;
    const h = ig.system.height * 0.1;
    const x = ig.system.width * 0.5 - w / 2;
    const y = ig.system.height * 0.5 - h / 2;

    ig.system.context.fillStyle = '#000';
    ig.system.context.fillRect(0, 0, 480, 320);

    ig.system.context.fillStyle = '#fff';
    ig.system.context.fillRect(x * s, y * s, w * s, h * s);

    ig.system.context.fillStyle = '#000';
    ig.system.context.fillRect(
      x * s + s,
      y * s + s,
      w * s - s - s,
      h * s - s - s
    );

    ig.system.context.fillStyle = '#fff';
    ig.system.context.fillRect(x * s, y * s, w * s * this._drawStatus, h * s);
  }

  _loadCallback = (path: string, status: boolean) => {
    if (status) {
      erase(this._unloaded, path);
    } else {
      throw 'Failed to load resource: ' + path;
    }

    this.status = 1 - this._unloaded.length / this.resources.length;
    if (this._unloaded.length === 0) {
      // all done?
      setTimeout(this.end.bind(this), 250);
    }
  };
}
