import {igFont, igFontAlign} from '@city41/impact.ts/dist/font';
import {igGame} from '@city41/impact.ts/dist/game';
import {igImage} from '@city41/impact.ts/dist/image';
import {KEY} from '@city41/impact.ts/dist/input';
import {ig, main} from '@city41/impact.ts/dist/impact';
import {Camera} from '../plugins/camera';
import {ImpactSplashLoader} from '../plugins/impact-splash-loader';
import {LevelGrasslands} from './levels/grasslands';
import {LevelTitle} from './levels/title';

import {EntityBlob} from './entities/blob';
import {EntityCoin} from './entities/coin';
import {EntityFireball} from './entities/fireball';
import {EntityHurt} from './entities/hurt';
import {EntityLevelChange} from './entities/levelChange';
import {EntityPlayer} from './entities/player';
import {EntityTrigger} from './entities/trigger';

export const entityMap = {
  EntityBlob,
  EntityCoin,
  EntityFireball,
  EntityHurt,
  EntityLevelChange,
  EntityPlayer,
  EntityTrigger,
};

class MyGame extends igGame {
  player: EntityPlayer | null = null;
  currentLevel: any;
  camera: Camera | null = null;
  clearColor = '#d0f4f7';
  gravity = 800; // All entities are affected by this

  // Load a font
  font = new igFont('media/fredoka-one.font.png');

  // HUD icons
  heartFull = new igImage('media/heart-full.png');
  heartEmpty = new igImage('media/heart-empty.png');
  coinIcon = new igImage('media/coin.png');

  constructor() {
    super();

    // We want the font's chars to slightly touch each other,
    // so set the letter spacing to -2px.
    this.font.letterSpacing = -2;

    // Load the LevelGrasslands as required above ('game.level.grassland')
    this.currentLevel = LevelGrasslands;
    this.loadLevel(LevelGrasslands, entityMap);
  }

  loadLevel(data: any, entityMap: any) {
    this.currentLevel = data;

    super.loadLevel(data, entityMap);
    this.player = (this.getEntitiesByType(EntityPlayer)[0] ||
      null) as EntityPlayer | null;
    this.setupCamera();
  }

  setupCamera() {
    // Set up the camera. The camera's center is at a third of the screen
    // size, i.e. somewhat shift left and up. Damping is set to 3px.
    this.camera = new Camera(ig.system.width / 3, ig.system.height / 3, 3);

    // The camera's trap (the deadzone in which the player can move with the
    // camera staying fixed) is set to according to the screen size as well.
    this.camera.trap.size.x = ig.system.width / 10;
    this.camera.trap.size.y = ig.system.height / 3;

    // The lookahead always shifts the camera in walking position; you can
    // set it to 0 to disable.
    this.camera.lookAhead.x = ig.system.width / 6;

    // Set camera's screen bounds and reposition the trap on the player
    // @ts-ignore hmmm what is up with pxWidth and pxHeight?
    this.camera.max.x = this.collisionMap.pxWidth - ig.system.width;
    // @ts-ignore hmmm what is up with pxWidth and pxHeight?
    this.camera.max.y = this.collisionMap.pxHeight - ig.system.height;

    if (this.player) {
      this.camera.set(this.player);
    }
  }

  reloadLevel() {
    this.loadLevelDeferred(this.currentLevel, entityMap);
  }

  update() {
    // Update all entities and BackgroundMaps
    super.update();

    // Camera follows the player
    this.camera!.follow(this.player!);

    // Instead of using the camera plugin, we could also just center
    // the screen on the player directly, like this:
    // this.screen.x = this.player.pos.x - ig.system.width/2;
    // this.screen.y = this.player.pos.y - ig.system.height/2;
  }

  draw() {
    // Call the parent implementation to draw all Entities and BackgroundMaps
    super.draw();

    // Draw the heart and number of coins in the upper left corner.
    // 'this.player' is set by the player's init method
    if (this.player) {
      var x = 16,
        y = 16;

      for (var i = 0; i < this.player.maxHealth; i++) {
        // Full or empty heart?
        if (this.player.health > i) {
          this.heartFull.draw(x, y);
        } else {
          this.heartEmpty.draw(x, y);
        }

        x += this.heartEmpty.width + 8;
      }

      // We only want to draw the 0th tile of coin sprite-sheet
      x += 48;
      this.coinIcon.drawTile(x, y + 6, 0, 36);

      x += 42;
      this.font.draw('x ' + this.player.coins, x, y + 10);
    }
  }
}

// The title screen is simply a Game Class itself; it loads the LevelTitle
// runs it and draws the title image on top.

class MyTitle extends igGame {
  clearColor = '#d0f4f7';
  gravity = 800;
  maxY = 0;
  titleAlpha = 1;

  // The title image
  title = new igImage('media/title.png');

  // Load a font
  font = new igFont('media/fredoka-one.font.png');

  constructor() {
    super();

    // Bind keys
    ig.input.bind(KEY.LEFT_ARROW, 'left');
    ig.input.bind(KEY.RIGHT_ARROW, 'right');
    ig.input.bind(KEY.X, 'jump');
    ig.input.bind(KEY.C, 'shoot');

    // ig.input.bind(ig.GAMEPAD.PAD_LEFT, 'left');
    // ig.input.bind(ig.GAMEPAD.PAD_RIGHT, 'right');
    // ig.input.bind(ig.GAMEPAD.FACE_1, 'jump');
    // ig.input.bind(ig.GAMEPAD.FACE_2, 'shoot');
    // ig.input.bind(ig.GAMEPAD.FACE_3, 'shoot');

    // We want the font's chars to slightly touch each other,
    // so set the letter spacing to -2px.
    this.font.letterSpacing = -2;

    this.loadLevel(LevelTitle, entityMap);
    this.maxY = this.backgroundMaps[0].pxHeight - ig.system.height;
  }

  update() {
    // Check for buttons; start the game if pressed
    if (ig.input.pressed('jump') || ig.input.pressed('shoot')) {
      ig.system.setGame(MyGame);
      return;
    }

    super.update();

    // Scroll the screen down; apply some damping.
    var move = this.maxY - this.screen.y;
    if (move > 5) {
      this.screen.y += move * ig.system.tick;
      this.titleAlpha = this.screen.y / this.maxY;
    }
    this.screen.x = (this.backgroundMaps[0].pxWidth - ig.system.width) / 2;
  }

  draw() {
    super.draw();

    var cx = ig.system.width / 2;
    this.title.draw(cx - this.title.width / 2, 60);

    var startText = ig.ua.mobile
      ? 'Press Button to Play!'
      : 'Press X or C to Play!';

    this.font.draw(startText, cx, 420, igFontAlign.CENTER);
  }
}

// If our screen is smaller than 640px in width (that's CSS pixels), we scale the
// internal resolution of the canvas by 2. This gives us a larger viewport and
// also essentially enables retina resolution on the iPhone and other devices
// with small screens.
var scale = window.innerWidth < 640 ? 2 : 1;

// We want to run the game in "fullscreen", so let's use the window's size
// directly as the canvas' style size.
var canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.style.width = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';

// Listen to the window's 'resize' event and set the canvas' size each time
// it changes.
window.addEventListener(
  'resize',
  function() {
    // If the game hasn't started yet, there's nothing to do here
    if (!ig.system) {
      return;
    }

    // Resize the canvas style and tell Impact to resize the canvas itself;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ig.system.resize(window.innerWidth * scale, window.innerHeight * scale);

    // Re-center the camera - it's dependend on the screen size.
    if (ig.game && ig.game.setupCamera) {
      ig.game.setupCamera();
    }
  },
  false,
);

// Finally, start the game into MyTitle and use the ImpactSplashLoader plugin
// as our loading screen
var width = window.innerWidth * scale,
  height = window.innerHeight * scale;

main('#canvas', MyTitle, 60, width, height, 1, ImpactSplashLoader);
