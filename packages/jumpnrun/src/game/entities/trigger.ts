import {
  igEntity,
  igEntityType,
  igEntityCollides,
} from '@city41/impact.ts/dist/entity';
import {igTimer} from '@city41/impact.ts/dist/timer';
import {ig} from '@city41/impact.ts/dist/impact';

/*
This entity calls the triggeredBy( entity, trigger ) method of each of its
targets. #entity# is the entity that triggered this trigger and #trigger# 
is the trigger entity itself.


Keys for Weltmeister:

checks
	Specifies which type of entity can trigger this trigger. A, B or BOTH 
	Default: A

wait
	Time in seconds before this trigger can be triggered again. Set to -1
	to specify "never" - e.g. the trigger can only be triggered once.
	Default: -1
	
target.1, target.2 ... target.n
	Names of the entities whose triggeredBy() method will be called.
*/

export class EntityTrigger extends igEntity {
  size = {x: 32, y: 32};

  target: Record<string, igEntity> | null;
  wait = -1;
  canFire = true;

  type = igEntityType.NONE;
  checkAgainst = igEntityType.A;
  collides = igEntityCollides.NEVER;

  waitTimer: igTimer;

  constructor(x: number, y: number, settings: Record<string, any>) {
    super(x, y, settings);
    this.target = settings.target;

    if (settings.checks) {
      // @ts-ignore need to figure out dynamic enum lookups
      this.checkAgainst =
        igEntityType[settings.checks.toUpperCase()] || igEntityType.A;
      delete settings.check;
    }

    this.waitTimer = new igTimer();
  }

  check(other: igEntity) {
    if (this.canFire && this.waitTimer.delta() >= 0) {
      if (typeof this.target == 'object') {
        for (let t in this.target) {
          console.log('check t', t, this.target[t]);
          const ent = ig.game.getEntityByName(this.target[t]);
          console.log('check ent', ent);
          if (ent && typeof ent.triggeredBy == 'function') {
            ent.triggeredBy(other, this);
          }
        }
      }

      if (this.wait == -1) {
        this.canFire = false;
      } else {
        this.waitTimer.set(this.wait);
      }
    }
  }

  update() {}
}
