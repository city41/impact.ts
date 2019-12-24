import {igEntity} from '@city41/impact.ts/dist/entity';
import {ig} from '@city41/impact.ts/dist/impact';

import {LevelSnowhills} from '../levels/snowhills';
import {LevelGrasslands} from '../levels/grasslands';

import {entityMap} from '../main';

const levelMap = {
  LevelSnowhills,
  LevelGrasslands,
};

/*
This entity calls ig.game.loadLevel() when its triggeredBy() method is called -
usually through an EntityTrigger entity.


Keys for Weltmeister:

level
	Name of the level to load. E.g. "LevelTest1" or just "test1" will load the 
	'LevelTest1' level.
*/

export class EntityLevelChange extends igEntity {
  size = {x: 32, y: 32};
  level: string | null;

  constructor(x: number, y: number, settings: Record<string, any>) {
    super(x, y, settings);
    this.level = settings.level;
  }

  triggeredBy(_entity: igEntity, _trigger: unknown) {
    if (this.level) {
      var levelName = this.level.replace(/^(Level)?(\w)(\w*)/, function(
        _m: any,
        _l: any,
        a: string,
        b: string,
      ) {
        return a.toUpperCase() + b;
      });

      const key = `Level${levelName}` as keyof typeof levelMap;
      ig.game.loadLevelDeferred(levelMap[key], entityMap);
    }
  }

  update() {}
}
