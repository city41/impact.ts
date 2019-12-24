import { igInput } from './input';
import { igLoader } from './loader';
import { igMusic } from './sound';
import { igSoundManager } from './sound';
import { igSystem } from './system';

// -----------------------------------------------------------------------------
// ig Namespace

type Ig = {
  system: null | igSystem;
  resources: any[];
} & any;

export const ig: Ig = {
  // game: null,
  debug: null,
  system: null,
  version: '1.0.0',
  impactJsVersion: '1.24',
  modules: {},
  resources: [],
  ready: false,
  baked: false,
  nocache: '',
  ua: {} as any,
  lib: 'lib/',

  _current: null,
  _loadQueue: [],
  _waitForOnload: 0,

  copy: function<T = unknown>(object: T) {
    if (
      !object ||
      typeof object !== 'object' ||
      object instanceof HTMLElement
    ) {
      return object;
    } else if (Array.isArray(object)) {
      const c = [];
      for (let i = 0, l = object.length; i < l; i++) {
        c[i] = ig.copy(object[i]);
      }

      return c;
    } else {
      const c = {} as Partial<T>;
      for (let i in object) {
        c[i] = ig.copy(object[i]);
      }

      return c as T;
    }
  },

  merge: function(original: any, extended: any) {
    for (let key in extended) {
      const ext = extended[key];

      if (
        typeof ext !== 'object' ||
        ext instanceof HTMLElement ||
        ext === null
      ) {
        original[key] = ext;
      } else {
        if (!original[key] || typeof original[key] != 'object') {
          original[key] = ext instanceof Array ? [] : {};
        }
        ig.merge(original[key], ext);
      }
    }

    return original;
  },

  ksort: function(obj: unknown): any[] {
    if (typeof obj !== 'object') {
      return [];
    }

    if (!obj) {
      return [];
    }

    const keys = Object.keys(obj);
    keys.sort();

    const values: any[] = keys.map(k => (obj as any)[k]);

    return values;
  },

  // Ah, yes. I love vendor prefixes. So much fun!
  setVendorAttribute: function(el: any, attr: string, val: any) {
    const uc = attr.charAt(0).toUpperCase() + attr.substr(1);
    el[attr] = el['ms' + uc] = el['moz' + uc] = el['webkit' + uc] = el[
      'o' + uc
    ] = val;
  },

  getVendorAttribute: function(el: any, attr: string) {
    const uc = attr.charAt(0).toUpperCase() + attr.substr(1);
    return (
      el[attr] ||
      el['ms' + uc] ||
      el['moz' + uc] ||
      el['webkit' + uc] ||
      el['o' + uc]
    );
  },

  normalizeVendorAttribute: function(el: any, attr: string) {
    const prefixedVal = ig.getVendorAttribute(el, attr);
    if (!el[attr] && prefixedVal) {
      el[attr] = prefixedVal;
    }
  },

  // This function normalizes getImageData to extract the real, actual
  // pixels from an image. The naive method recently failed on retina
  // devices with a backgingStoreRatio != 1
  getImagePixels: function(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;

    // Try to draw pixels as accurately as possible
    igSystem.SCALE.CRISP(canvas, ctx);

    const ratio = ig.getVendorAttribute(ctx, 'backingStorePixelRatio') || 1;
    ig.normalizeVendorAttribute(ctx, 'getImageDataHD');

    const realWidth = image.width / ratio,
      realHeight = image.height / ratio;

    canvas.width = Math.ceil(realWidth);
    canvas.height = Math.ceil(realHeight);

    ctx.drawImage(image, 0, 0, realWidth, realHeight);

    return ratio === 1
      ? ctx.getImageData(x, y, width, height)
      : // prettier-ignore
        // @ts-ignore this is webkitGetImageDataHD, present on retina Apple devices
        ctx.getImageDataHD(x, y, width, height);
  },

  addResource: function(resource: any) {
    ig.resources.push(resource);
  },

  setNocache: function(set: boolean) {
    ig.nocache = set ? '?' + Date.now() : '';
  },

  // Stubs for ig.Debug
  log: function() {},
  assert: function(_condition: boolean, _msg: string) {},
  show: function(_name: string, _number: number) {},
  mark: function(_msg: string, _color: string) {},

  _DOMReady: function() {
    if (!ig.modules['dom.ready'].loaded) {
      if (!document.body) {
        return setTimeout(ig._DOMReady, 13);
      }
      ig.modules['dom.ready'].loaded = true;
      ig._waitForOnload--;
      ig._execModules();
    }
    return 0;
  },

  _boot: function() {
    if (document.location.href.match(/\?nocache/)) {
      ig.setNocache(true);
    }

    // Probe user agent string
    ig.ua.pixelRatio = window.devicePixelRatio || 1;
    ig.ua.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    ig.ua.screen = {
      width: window.screen.availWidth * ig.ua.pixelRatio,
      height: window.screen.availHeight * ig.ua.pixelRatio,
    };

    ig.ua.iPhone = /iPhone|iPod/i.test(navigator.userAgent);
    ig.ua.iPhone4 = ig.ua.iPhone && ig.ua.pixelRatio == 2;
    ig.ua.iPad = /iPad/i.test(navigator.userAgent);
    ig.ua.android = /android/i.test(navigator.userAgent);
    ig.ua.winPhone = /Windows Phone/i.test(navigator.userAgent);
    ig.ua.iOS = ig.ua.iPhone || ig.ua.iPad;
    ig.ua.mobile =
      ig.ua.iOS ||
      ig.ua.android ||
      ig.ua.winPhone ||
      /mobile/i.test(navigator.userAgent);
    ig.ua.touchDevice =
      'ontouchstart' in window || window.navigator.msMaxTouchPoints;
  },

  _initDOMReady: function() {
    if (ig.modules['dom.ready']) {
      ig._execModules();
      return;
    }

    ig._boot();

    ig.modules['dom.ready'] = { requires: [], loaded: false, body: null };
    ig._waitForOnload++;
    if (document.readyState === 'complete') {
      ig._DOMReady();
    } else {
      document.addEventListener('DOMContentLoaded', ig._DOMReady, false);
      window.addEventListener('load', ig._DOMReady, false);
    }
  },
};

ig.normalizeVendorAttribute(window, 'requestAnimationFrame');
if (window.requestAnimationFrame) {
  let next = 1;
  const anims: Record<number, boolean> = {};

  ig.setAnimation = function(callback: Function) {
    var current = next++;
    anims[current] = true;

    var animate = function() {
      if (!anims[current]) {
        return;
      } // deleted?
      window.requestAnimationFrame(animate);
      callback();
    };
    window.requestAnimationFrame(animate);
    return current;
  };

  ig.clearAnimation = function(id: number) {
    delete anims[id];
  };
}

// [set/clear]Interval fallback
else {
  ig.setAnimation = function(callback: Function) {
    return window.setInterval(callback, 1000 / 60);
  };
  ig.clearAnimation = function(id: number) {
    window.clearInterval(id);
  };
}

// -----------------------------------------------------------------------------
// The main() function creates the system, input, sound and game objects,
// creates a preloader and starts the run loop

export function main(
  canvasId: string,
  gameClass: any,
  fps: number,
  width: number,
  height: number,
  scale: number,
  loaderClass: any
) {
  ig.system = new igSystem(canvasId, fps, width, height, scale || 1);
  ig.input = new igInput();
  ig.soundManager = new igSoundManager();
  ig.music = new igMusic();
  ig.ready = true;

  const loader = new (loaderClass || igLoader)(gameClass, ig.resources);
  loader.load();
}
