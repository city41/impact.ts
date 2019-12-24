import {igEntity} from '@city41/impact.ts/dist/entity';

/*
This entity gives damage (through ig.Entity's receiveDamage() method) to
the entity that is passed as the first argument to the triggeredBy() method.

I.e. you can connect an EntityTrigger to an EntityHurt to give damage to the
entity that activated the trigger.


Keys for Weltmeister:

damage
	Damage to give to the entity that triggered this entity.
	Default: 10
*/

export class EntityHurt extends igEntity {
  size = {x: 32, y: 32};
  damage = 10;

  triggeredBy(entity: igEntity, _trigger: unknown) {
    entity.receiveDamage(this.damage, this);
  }

  update() {}
}
