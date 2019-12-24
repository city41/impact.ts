import { ig } from './impact';
import { igAnimation, igAnimationSheet } from './animation';
import { TraceResult } from './collision-map';
import { limit, toRad } from './util';

// Entity Types - used for checks

export enum igEntityType {
  NONE = 0,
  A,
  B,
  BOTH,
}

// Collision Types - Determine if and how entities collide with each other

// In ACTIVE vs. LITE or FIXED vs. ANY collisions, only the "weak" entity moves,
// while the other one stays fixed. In ACTIVE vs. ACTIVE and ACTIVE vs. PASSIVE
// collisions, both entities are moved. LITE or PASSIVE entities don't collide
// with other LITE or PASSIVE entities at all. The behaiviour for FIXED vs.
// FIXED collisions is undefined.

export enum igEntityCollides {
  NEVER = 0,
  LITE = 1,
  PASSIVE = 2,
  ACTIVE = 4,
  FIXED = 8,
}

export class igEntity {
  // Last used entity id; incremented with each spawned entity

  static classId = 'igEntity';
  static _lastId = 0;

  static checkPair = function(a: igEntity, b: igEntity) {
    // Do these entities want checks?
    if (a.checkAgainst & b.type) {
      a.check(b);
    }

    if (b.checkAgainst & a.type) {
      b.check(a);
    }

    // If this pair allows collision, solve it! At least one entity must
    // collide ACTIVE or FIXED, while the other one must not collide NEVER.
    if (
      a.collides &&
      b.collides &&
      a.collides + b.collides > igEntityCollides.ACTIVE
    ) {
      igEntity.solveCollision(a, b);
    }
  };

  static solveCollision = function(a: igEntity, b: igEntity) {
    // If one entity is FIXED, or the other entity is LITE, the weak
    // (FIXED/NON-LITE) entity won't move in collision response
    let weak = null;
    if (
      a.collides == igEntityCollides.LITE ||
      b.collides == igEntityCollides.FIXED
    ) {
      weak = a;
    } else if (
      b.collides == igEntityCollides.LITE ||
      a.collides == igEntityCollides.FIXED
    ) {
      weak = b;
    }

    // Did they already overlap on the X-axis in the last frame? If so,
    // this must be a vertical collision!
    if (a.last.x + a.size.x > b.last.x && a.last.x < b.last.x + b.size.x) {
      // Which one is on top?
      if (a.last.y < b.last.y) {
        igEntity.seperateOnYAxis(a, b, weak);
      } else {
        igEntity.seperateOnYAxis(b, a, weak);
      }
      a.collideWith(b, 'y');
      b.collideWith(a, 'y');
    }

    // Horizontal collision
    else if (a.last.y + a.size.y > b.last.y && a.last.y < b.last.y + b.size.y) {
      // Which one is on the left?
      if (a.last.x < b.last.x) {
        igEntity.seperateOnXAxis(a, b, weak);
      } else {
        igEntity.seperateOnXAxis(b, a, weak);
      }
      a.collideWith(b, 'x');
      b.collideWith(a, 'x');
    }
  };

  // FIXME: This is a mess. Instead of doing all the movements here, the entities
  // should get notified of the collision (with all details) and resolve it
  // themselfs.

  static seperateOnXAxis = function(
    left: igEntity,
    right: igEntity,
    weak?: igEntity | null
  ) {
    const nudge = left.pos.x + left.size.x - right.pos.x;

    // We have a weak entity, so just move this one
    if (weak) {
      const strong = left === weak ? right : left;
      weak.vel.x = -weak.vel.x * weak.bounciness + strong.vel.x;

      const resWeak = ig.game.collisionMap.trace(
        weak.pos.x,
        weak.pos.y,
        weak == left ? -nudge : nudge,
        0,
        weak.size.x,
        weak.size.y
      );
      weak.pos.x = resWeak.pos.x;
    }

    // Normal collision - both move
    else {
      const v2 = (left.vel.x - right.vel.x) / 2;
      left.vel.x = -v2;
      right.vel.x = v2;

      const resLeft = ig.game.collisionMap.trace(
        left.pos.x,
        left.pos.y,
        -nudge / 2,
        0,
        left.size.x,
        left.size.y
      );
      left.pos.x = Math.floor(resLeft.pos.x);

      const resRight = ig.game.collisionMap.trace(
        right.pos.x,
        right.pos.y,
        nudge / 2,
        0,
        right.size.x,
        right.size.y
      );
      right.pos.x = Math.ceil(resRight.pos.x);
    }
  };

  static seperateOnYAxis = function(
    top: igEntity,
    bottom: igEntity,
    weak?: igEntity | null
  ) {
    const nudge = top.pos.y + top.size.y - bottom.pos.y;

    // We have a weak entity, so just move this one
    if (weak) {
      const strong = top === weak ? bottom : top;
      weak.vel.y = -weak.vel.y * weak.bounciness + strong.vel.y;

      // Riding on a platform?
      let nudgeX = 0;
      if (
        weak == top &&
        Math.abs(weak.vel.y - strong.vel.y) < weak.minBounceVelocity
      ) {
        weak.standing = true;
        nudgeX = strong.vel.x * ig.system.tick;
      }

      const resWeak = ig.game.collisionMap.trace(
        weak.pos.x,
        weak.pos.y,
        nudgeX,
        weak == top ? -nudge : nudge,
        weak.size.x,
        weak.size.y
      );
      weak.pos.y = resWeak.pos.y;
      weak.pos.x = resWeak.pos.x;
    }

    // Bottom entity is standing - just bounce the top one
    else if (ig.game.gravity && (bottom.standing || top.vel.y > 0)) {
      const resTop = ig.game.collisionMap.trace(
        top.pos.x,
        top.pos.y,
        0,
        -(top.pos.y + top.size.y - bottom.pos.y),
        top.size.x,
        top.size.y
      );
      top.pos.y = resTop.pos.y;

      if (top.bounciness > 0 && top.vel.y > top.minBounceVelocity) {
        top.vel.y *= -top.bounciness;
      } else {
        top.standing = true;
        top.vel.y = 0;
      }
    }

    // Normal collision - both move
    else {
      const v2 = (top.vel.y - bottom.vel.y) / 2;
      top.vel.y = -v2;
      bottom.vel.y = v2;

      const nudgeX = bottom.vel.x * ig.system.tick;
      const resTop = ig.game.collisionMap.trace(
        top.pos.x,
        top.pos.y,
        nudgeX,
        -nudge / 2,
        top.size.x,
        top.size.y
      );
      top.pos.y = resTop.pos.y;

      const resBottom = ig.game.collisionMap.trace(
        bottom.pos.x,
        bottom.pos.y,
        0,
        nudge / 2,
        bottom.size.x,
        bottom.size.y
      );
      bottom.pos.y = resBottom.pos.y;
    }
  };

  name?: string;
  id: number;
  settings = {};

  size = { x: 16, y: 16 };
  offset = { x: 0, y: 0 };

  pos = { x: 0, y: 0 };
  last = { x: 0, y: 0 };
  vel = { x: 0, y: 0 };
  accel = { x: 0, y: 0 };
  friction = { x: 0, y: 0 };
  maxVel = { x: 100, y: 100 };
  zIndex = 0;
  gravityFactor = 1;
  standing = false;
  bounciness = 0;
  minBounceVelocity = 40;

  anims: Record<string, igAnimation> = {};
  animSheet: igAnimationSheet | null = null;
  currentAnim: igAnimation | null = null;
  health = 10;

  type = igEntityType.NONE;
  checkAgainst = igEntityType.NONE;
  collides = igEntityCollides.NEVER;

  _killed = false;

  slopeStanding = { min: toRad(44), max: toRad(136) };

  constructor(x: number, y: number, settings: Record<string, any>) {
    this.id = ++igEntity._lastId;
    this.pos.x = this.last.x = x;
    this.pos.y = this.last.y = y;

    ig.merge(this, settings);
  }

  reset(x: number, y: number, settings: Record<string, any>) {
    const proto = this.constructor.prototype;
    this.pos.x = x;
    this.pos.y = y;
    this.last.x = x;
    this.last.y = y;
    this.vel.x = proto.vel.x;
    this.vel.y = proto.vel.y;
    this.accel.x = proto.accel.x;
    this.accel.y = proto.accel.y;
    this.health = proto.health;
    this._killed = proto._killed;
    this.standing = proto.standing;

    this.type = proto.type;
    this.checkAgainst = proto.checkAgainst;
    this.collides = proto.collides;

    ig.merge(this, settings);
  }

  addAnim(name: string, frameTime: number, sequence: number[], stop = false) {
    if (!this.animSheet) {
      throw 'No animSheet to add the animation ' + name + ' to.';
    }
    const a = new igAnimation(this.animSheet, frameTime, sequence, stop);
    this.anims[name] = a;
    if (!this.currentAnim) {
      this.currentAnim = a;
    }

    return a;
  }

  update() {
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.vel.y += ig.game.gravity * ig.system.tick * this.gravityFactor;

    this.vel.x = this.getNewVelocity(
      this.vel.x,
      this.accel.x,
      this.friction.x,
      this.maxVel.x
    );
    this.vel.y = this.getNewVelocity(
      this.vel.y,
      this.accel.y,
      this.friction.y,
      this.maxVel.y
    );

    // movement & collision
    const mx = this.vel.x * ig.system.tick;
    const my = this.vel.y * ig.system.tick;
    const res = ig.game.collisionMap.trace(
      this.pos.x,
      this.pos.y,
      mx,
      my,
      this.size.x,
      this.size.y
    );
    this.handleMovementTrace(res);

    this.currentAnim?.update();
  }

  getNewVelocity(vel: number, accel: number, friction: number, max: number) {
    if (accel) {
      return limit(vel + accel * ig.system.tick, -max, max);
    } else if (friction) {
      const delta = friction * ig.system.tick;

      if (vel - delta > 0) {
        return vel - delta;
      } else if (vel + delta < 0) {
        return vel + delta;
      } else {
        return 0;
      }
    }
    return limit(vel, -max, max);
  }

  handleMovementTrace(res: TraceResult) {
    this.standing = false;

    if (res.collision.y) {
      if (
        this.bounciness > 0 &&
        Math.abs(this.vel.y) > this.minBounceVelocity
      ) {
        this.vel.y *= -this.bounciness;
      } else {
        if (this.vel.y > 0) {
          this.standing = true;
        }
        this.vel.y = 0;
      }
    }
    if (res.collision.x) {
      if (
        this.bounciness > 0 &&
        Math.abs(this.vel.x) > this.minBounceVelocity
      ) {
        this.vel.x *= -this.bounciness;
      } else {
        this.vel.x = 0;
      }
    }
    if (res.collision.slope) {
      const s = res.collision.slope;

      if (this.bounciness > 0) {
        const proj = this.vel.x * s.nx + this.vel.y * s.ny;

        this.vel.x = (this.vel.x - s.nx * proj * 2) * this.bounciness;
        this.vel.y = (this.vel.y - s.ny * proj * 2) * this.bounciness;
      } else {
        const lengthSquared = s.x * s.x + s.y * s.y;
        const dot = (this.vel.x * s.x + this.vel.y * s.y) / lengthSquared;

        this.vel.x = s.x * dot;
        this.vel.y = s.y * dot;

        const angle = Math.atan2(s.x, s.y);
        if (angle > this.slopeStanding.min && angle < this.slopeStanding.max) {
          this.standing = true;
        }
      }
    }

    this.pos = res.pos;
  }

  draw() {
    if (this.currentAnim) {
      this.currentAnim.draw(
        this.pos.x - this.offset.x - ig.game._rscreen.x,
        this.pos.y - this.offset.y - ig.game._rscreen.y
      );
    }
  }

  kill() {
    ig.game.removeEntity(this);
  }

  receiveDamage(amount: number, _from: igEntity) {
    this.health -= amount;
    if (this.health <= 0) {
      this.kill();
    }
  }

  touches(other: igEntity) {
    return !(
      this.pos.x >= other.pos.x + other.size.x ||
      this.pos.x + this.size.x <= other.pos.x ||
      this.pos.y >= other.pos.y + other.size.y ||
      this.pos.y + this.size.y <= other.pos.y
    );
  }

  distanceTo(other: igEntity) {
    const xd = this.pos.x + this.size.x / 2 - (other.pos.x + other.size.x / 2);
    const yd = this.pos.y + this.size.y / 2 - (other.pos.y + other.size.y / 2);
    return Math.sqrt(xd * xd + yd * yd);
  }

  angleTo(other: igEntity) {
    return Math.atan2(
      other.pos.y + other.size.y / 2 - (this.pos.y + this.size.y / 2),
      other.pos.x + other.size.x / 2 - (this.pos.x + this.size.x / 2)
    );
  }

  check(_other: igEntity) {}
  collideWith(_other: igEntity, _axis: any) {}
  ready() {}
  erase() {}
}
