import { igAnimation } from './animation';
import { igBackgroundMap } from './background-map';
import { igCollisionMap } from './collision-map';
import { igEntity, igEntityType, igEntityCollides } from './entity';
import { igEntityPool } from './entity-pool';
import { ig } from './impact';
import { erase } from './util';

type SortFunction = (a: igEntity, b: igEntity) => number;
type SORT = {
  Z_INDEX: SortFunction;
  POS_X: SortFunction;
  POS_Y: SortFunction;
};

export class igGame {
  static SORT: SORT = {
    Z_INDEX(a: igEntity, b: igEntity) {
      return a.zIndex - b.zIndex;
    },
    POS_X(a: igEntity, b: igEntity) {
      return a.pos.x + a.size.x - (b.pos.x + b.size.x);
    },
    POS_Y(a: igEntity, b: igEntity) {
      return a.pos.y + a.size.y - (b.pos.y + b.size.y);
    },
  };

  clearColor = '#000000';
  gravity = 0;
  screen = { x: 0, y: 0 };
  _rscreen = { x: 0, y: 0 };

  entities: igEntity[] = [];

  namedEntities: Record<string, igEntity> = {};
  collisionMap: { trace: Function } = igCollisionMap.staticNoCollision;
  backgroundMaps: igBackgroundMap[] = [];
  backgroundAnims: Record<string, igAnimation[]> = {};

  autoSort = false;
  sortBy = igGame.SORT.Z_INDEX;

  cellSize = 64;

  _deferredKill: igEntity[] = [];
  // TODO: this is data from weltmeister, need to type it
  // also see loadLevel and loadLevelDeferred
  _levelToLoad: any = null;
  _entityMapToLoad: any = null;
  _doSortEntities = false;

  staticInstantiate() {
    this.sortBy = this.sortBy || igGame.SORT.Z_INDEX;
    ig.game = this;
    return null;
  }

  // TODO: type data
  loadLevel(data: any, entityMap: Record<string, any>) {
    igEntityPool.drainAllPools();

    this.screen = { x: 0, y: 0 };

    // Entities
    this.entities = [];
    this.namedEntities = {};
    for (let i = 0; i < data.entities.length; i++) {
      const ent = data.entities[i];
      const EntityClass = entityMap[ent.type];
      // @ts-ignore
      this.spawnEntity(EntityClass, ent.x, ent.y, ent.settings);
    }
    this.sortEntities();

    // Map Layer
    this.collisionMap = igCollisionMap.staticNoCollision;
    this.backgroundMaps = [];
    for (let i = 0; i < data.layer.length; i++) {
      const ld = data.layer[i];
      if (ld.name == 'collision') {
        this.collisionMap = new igCollisionMap(ld.tilesize, ld.data);
      } else {
        const newMap = new igBackgroundMap(
          ld.tilesize,
          ld.data,
          ld.tilesetName
        );
        newMap.anims = this.backgroundAnims[ld.tilesetName] || {};
        newMap.repeat = ld.repeat;
        newMap.distance = ld.distance;
        newMap.foreground = !!ld.foreground;
        newMap.preRender = !!ld.preRender;
        newMap.name = ld.name;
        this.backgroundMaps.push(newMap);
      }
    }

    // Call post-init ready function on all entities
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].ready();
    }
  }

  // TODO: type data
  loadLevelDeferred(data: any, entityMap: any) {
    this._levelToLoad = data;
    this._entityMapToLoad = entityMap;
  }

  getMapByName(name: string) {
    if (name == 'collision') {
      return this.collisionMap;
    }

    for (let i = 0; i < this.backgroundMaps.length; i++) {
      if (this.backgroundMaps[i].name == name) {
        return this.backgroundMaps[i];
      }
    }

    return null;
  }

  getEntityByName(name: string) {
    return this.namedEntities[name];
  }

  getEntitiesByType(entityClass: any) {
    const a = [];
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (ent instanceof entityClass && !ent._killed) {
        a.push(ent);
      }
    }
    return a;
  }

  spawnEntity<E extends igEntity>(
    EntityClass: {
      new (x: number, y: number, settings: Record<string, any>): E;
    },
    x: number,
    y: number,
    settings: Record<string, any>
  ) {
    const ent = new EntityClass(x, y, settings || {});
    this.entities.push(ent);
    if (ent.name) {
      this.namedEntities[ent.name] = ent;
    }
    return ent;
  }

  sortEntities() {
    this.entities.sort(this.sortBy);
  }

  sortEntitiesDeferred() {
    this._doSortEntities = true;
  }

  removeEntity(ent: igEntity) {
    // Remove this entity from the named entities
    if (ent.name) {
      delete this.namedEntities[ent.name];
    }

    // We can not remove the entity from the entities[] array in the midst
    // of an update cycle, so remember all killed entities and remove
    // them later.
    // Also make sure this entity doesn't collide anymore and won't get
    // updated or checked
    ent._killed = true;
    ent.type = igEntityType.NONE;
    ent.checkAgainst = igEntityType.NONE;
    ent.collides = igEntityCollides.NEVER;
    this._deferredKill.push(ent);
  }

  run() {
    this.update();
    this.draw();
  }

  update() {
    // load new level?
    if (this._levelToLoad) {
      this.loadLevel(this._levelToLoad, this._entityMapToLoad);
      this._levelToLoad = null;
      this._entityMapToLoad = null;
    }

    // update entities
    this.updateEntities();
    this.checkEntities();

    // remove all killed entities
    for (let i = 0; i < this._deferredKill.length; i++) {
      this._deferredKill[i].erase();
      erase(this.entities, this._deferredKill[i]);
    }
    this._deferredKill = [];

    // sort entities?
    if (this._doSortEntities || this.autoSort) {
      this.sortEntities();
      this._doSortEntities = false;
    }

    // update background animations
    for (let tileset in this.backgroundAnims) {
      const anims = this.backgroundAnims[tileset];
      for (let a in anims) {
        anims[a].update();
      }
    }
  }

  updateEntities() {
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (!ent._killed) {
        ent.update();
      }
    }
  }

  draw() {
    if (this.clearColor) {
      ig.system.clear(this.clearColor);
    }

    // This is a bit of a circle jerk. Entities reference game._rscreen
    // instead of game.screen when drawing themselfs in order to be
    // "synchronized" to the rounded(?) screen position
    this._rscreen.x = ig.system.getDrawPos(this.screen.x) / ig.system.scale;
    this._rscreen.y = ig.system.getDrawPos(this.screen.y) / ig.system.scale;

    let mapIndex;
    for (mapIndex = 0; mapIndex < this.backgroundMaps.length; mapIndex++) {
      const map = this.backgroundMaps[mapIndex];
      if (map.foreground) {
        // All foreground layers are drawn after the entities
        break;
      }
      map.setScreenPos(this.screen.x, this.screen.y);
      map.draw();
    }

    this.drawEntities();

    for (mapIndex; mapIndex < this.backgroundMaps.length; mapIndex++) {
      const map = this.backgroundMaps[mapIndex];
      map.setScreenPos(this.screen.x, this.screen.y);
      map.draw();
    }
  }

  drawEntities() {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].draw();
    }
  }

  checkEntities() {
    // Insert all entities into a spatial hash and check them against any
    // other entity that already resides in the same cell. Entities that are
    // bigger than a single cell, are inserted into each one they intersect
    // with.

    // A list of entities, which the current one was already checked with,
    // is maintained for each entity.

    // TODO: type this
    const hash: any = {};
    for (let e = 0; e < this.entities.length; e++) {
      const entity = this.entities[e];

      // Skip entities that don't check, don't get checked and don't collide
      if (
        entity.type == igEntityType.NONE &&
        entity.checkAgainst == igEntityType.NONE &&
        entity.collides == igEntityCollides.NEVER
      ) {
        continue;
      }

      const checked: Record<number, boolean> = {},
        xmin = Math.floor(entity.pos.x / this.cellSize),
        ymin = Math.floor(entity.pos.y / this.cellSize),
        xmax = Math.floor((entity.pos.x + entity.size.x) / this.cellSize) + 1,
        ymax = Math.floor((entity.pos.y + entity.size.y) / this.cellSize) + 1;

      for (let x = xmin; x < xmax; x++) {
        for (let y = ymin; y < ymax; y++) {
          // Current cell is empty - create it and insert!
          if (!hash[x]) {
            hash[x] = {};
            hash[x][y] = [entity];
          } else if (!hash[x][y]) {
            hash[x][y] = [entity];
          }

          // Check against each entity in this cell, then insert
          else {
            const cell = hash[x][y];
            for (let c = 0; c < cell.length; c++) {
              // Intersects and wasn't already checkd?
              if (entity.touches(cell[c]) && !checked[cell[c].id]) {
                checked[cell[c].id] = true;
                igEntity.checkPair(entity, cell[c]);
              }
            }
            cell.push(entity);
          }
        } // end for y size
      } // end for x size
    } // end for entities
  }
}
