import { igEntity } from './entity';
import { inject } from './util';

export const igEntityPool = {
  pools: {} as Record<string, igEntity[]>,

  mixin: {
    // TODO: figure out what this is
    staticInstantiate(
      this: typeof igEntity,
      x: number,
      y: number,
      settings: Record<string, any>
    ) {
      return igEntityPool.getFromPool(this.classId, x, y, settings);
    },

    erase(this: igEntity) {
      igEntityPool.putInPool(this);
    },
  },

  enableFor(Class: any) {
    inject(Class, this.mixin);
  },

  getFromPool(
    classId: string,
    x: number,
    y: number,
    settings: Record<string, any>
  ) {
    const pool = this.pools[classId];
    if (!pool || !pool.length) {
      return null;
    }

    const instance = pool.pop()!;
    instance.reset(x, y, settings);
    return instance;
  },

  putInPool(instance: igEntity) {
    const { classId } = instance.constructor.prototype;

    if (!this.pools[classId]) {
      this.pools[classId] = [instance];
    } else {
      this.pools[classId].push(instance);
    }
  },

  drainPool(classId: string) {
    delete this.pools[classId];
  },

  drainAllPools() {
    this.pools = {};
  },
};
