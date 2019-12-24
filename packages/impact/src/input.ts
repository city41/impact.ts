import { ig } from './impact';

export enum KEY {
  MOUSE1 = -1,
  MOUSE2 = -3,
  MWHEEL_UP = -4,
  MWHEEL_DOWN = -5,

  BACKSPACE = 8,
  TAB = 9,
  ENTER = 13,
  PAUSE = 19,
  CAPS = 20,
  ESC = 27,
  SPACE = 32,
  PAGE_UP = 33,
  PAGE_DOWN = 34,
  END = 35,
  HOME = 36,
  LEFT_ARROW = 37,
  UP_ARROW = 38,
  RIGHT_ARROW = 39,
  DOWN_ARROW = 40,
  INSERT = 45,
  DELETE = 46,
  _0 = 48,
  _1 = 49,
  _2 = 50,
  _3 = 51,
  _4 = 52,
  _5 = 53,
  _6 = 54,
  _7 = 55,
  _8 = 56,
  _9 = 57,
  A = 65,
  B = 66,
  C = 67,
  D = 68,
  E = 69,
  F = 70,
  G = 71,
  H = 72,
  I = 73,
  J = 74,
  K = 75,
  L = 76,
  M = 77,
  N = 78,
  O = 79,
  P = 80,
  Q = 81,
  R = 82,
  S = 83,
  T = 84,
  U = 85,
  V = 86,
  W = 87,
  X = 88,
  Y = 89,
  Z = 90,
  NUMPAD_0 = 96,
  NUMPAD_1 = 97,
  NUMPAD_2 = 98,
  NUMPAD_3 = 99,
  NUMPAD_4 = 100,
  NUMPAD_5 = 101,
  NUMPAD_6 = 102,
  NUMPAD_7 = 103,
  NUMPAD_8 = 104,
  NUMPAD_9 = 105,
  MULTIPLY = 106,
  ADD = 107,
  SUBSTRACT = 109,
  DECIMAL = 110,
  DIVIDE = 111,
  F1 = 112,
  F2 = 113,
  F3 = 114,
  F4 = 115,
  F5 = 116,
  F6 = 117,
  F7 = 118,
  F8 = 119,
  F9 = 120,
  F10 = 121,
  F11 = 122,
  F12 = 123,
  SHIFT = 16,
  CTRL = 17,
  ALT = 18,
  PLUS = 187,
  COMMA = 188,
  MINUS = 189,
  PERIOD = 19,
}

// TODO: type actions properly
type Action = any;

export class igInput {
  bindings: Record<string, Action | null> = {};
  actions: Record<string, boolean> = {};
  presses: Record<string, boolean> = {};
  locks: Record<string, boolean> = {};
  delayedKeyup: Record<string, boolean> = {};

  isUsingMouse = false;
  isUsingKeyboard = false;
  isUsingAccelerometer = false;
  mouse = { x: 0, y: 0 };
  accel: DeviceMotionEventAcceleration = { x: 0, y: 0, z: 0 };

  initMouse() {
    if (this.isUsingMouse) {
      return;
    }
    this.isUsingMouse = true;

    ig.system.canvas.addEventListener('mousewheel', this.mousewheel, false);
    ig.system.canvas.addEventListener('DOMMouseScroll', this.mousewheel, false);

    ig.system.canvas.addEventListener('contextmenu', this.contextmenu, false);
    ig.system.canvas.addEventListener('mousedown', this.keydown, false);
    ig.system.canvas.addEventListener('mouseup', this.keyup.bind(this), false);
    ig.system.canvas.addEventListener('mousemove', this.mousemove, false);

    if (ig.ua.touchDevice) {
      // Standard
      ig.system.canvas.addEventListener('touchstart', this.keydown, false);
      ig.system.canvas.addEventListener('touchend', this.keyup, false);
      ig.system.canvas.addEventListener('touchcancel', this.keyup, false);
      ig.system.canvas.addEventListener('touchmove', this.mousemove, false);

      // MS
      ig.system.canvas.addEventListener('MSPointerDown', this.keydown, false);
      ig.system.canvas.addEventListener('MSPointerUp', this.keyup, false);
      ig.system.canvas.addEventListener('MSPointerMove', this.mousemove, false);
      ig.system.canvas.style.msTouchAction = 'none';
    }
  }

  initKeyboard() {
    if (this.isUsingKeyboard) {
      return;
    }
    this.isUsingKeyboard = true;
    window.addEventListener('keydown', this.keydown, false);
    window.addEventListener('keyup', this.keyup, false);
  }

  initAccelerometer() {
    if (this.isUsingAccelerometer) {
      return;
    }
    this.isUsingAccelerometer = true;
    window.addEventListener(
      'devicemotion',
      this.devicemotion.bind(this),
      false
    );
  }

  mousewheel = (event: MouseWheelEvent) => {
    // @ts-ignore TS doesn't know about wheelDelta
    const delta = event.wheelDelta ? event.wheelDelta : event.detail * -1;
    const code = delta > 0 ? ig.KEY.MWHEEL_UP : ig.KEY.MWHEEL_DOWN;
    const action = this.bindings[code];
    if (action) {
      this.actions[action] = true;
      this.presses[action] = true;
      this.delayedKeyup[action] = true;
      event.stopPropagation();
      event.preventDefault();
    }
  };

  mousemove = (event: any) => {
    const internalWidth = ig.system.canvas.offsetWidth || ig.system.realWidth;
    const scale = ig.system.scale * (internalWidth / ig.system.realWidth);

    let pos = { left: 0, top: 0 };
    if (ig.system.canvas.getBoundingClientRect) {
      pos = ig.system.canvas.getBoundingClientRect();
    }

    // @ts-ignore TODO: figure this out, is this a TouchEvent?
    const ev = event.touches ? event.touches[0] : event;
    this.mouse.x = (ev.clientX - pos.left) / scale;
    this.mouse.y = (ev.clientY - pos.top) / scale;
  };

  contextmenu = (event: Event) => {
    if (this.bindings[ig.KEY.MOUSE2]) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  keydown = (event: KeyboardEvent | TouchEvent) => {
    // @ts-ignore tagName doesn't exist on target?
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag == 'TEXTAREA') {
      return;
    }

    const code =
      event.type === 'keydown'
        ? (event as KeyboardEvent).keyCode
        : // prettier-ignore
        // @ts-ignore not sure here
        event.button === 2
        ? ig.KEY.MOUSE2
        : ig.KEY.MOUSE1;

    // Focus window element for mouse clicks. Prevents issues when
    // running the game in an iframe.
    if (code < 0 && !ig.ua.mobile) {
      window.focus();
    }

    if (event.type === 'touchstart' || event.type === 'mousedown') {
      this.mousemove(event);
    }

    const action = this.bindings[code];
    if (action) {
      this.actions[action] = true;
      if (!this.locks[action]) {
        this.presses[action] = true;
        this.locks[action] = true;
      }
      event.preventDefault();
    }
  };

  keyup = (event: KeyboardEvent | TouchEvent) => {
    // @ts-ignore no tagName on target?
    const tag = event.target.tagName;
    if (tag == 'INPUT' || tag == 'TEXTAREA') {
      return;
    }

    const code =
      event.type == 'keyup'
        ? (event as KeyboardEvent).keyCode
        : // prettier-ignore
        // @ts-ignore
        event.button == 2
        ? ig.KEY.MOUSE2
        : ig.KEY.MOUSE1;

    const action = this.bindings[code];
    if (action) {
      this.delayedKeyup[action] = true;
      event.preventDefault();
    }
  };

  devicemotion = (event: DeviceMotionEvent) => {
    if (event.accelerationIncludingGravity) {
      this.accel = event.accelerationIncludingGravity;
    }
  };

  bind(key: KEY, action: Action) {
    if (key < 0) {
      this.initMouse();
    } else if (key > 0) {
      this.initKeyboard();
    }
    this.bindings[key] = action;
  }

  bindTouch(selector: string, action: string) {
    const element = document.querySelector(selector);

    if (element) {
      element.addEventListener(
        'touchstart',
        (ev: any) => {
          this.touchStart(ev, action);
        },
        false
      );
      element.addEventListener(
        'touchend',
        (ev: any) => {
          this.touchEnd(ev, action);
        },
        false
      );
      element.addEventListener(
        'MSPointerDown',
        (ev: any) => {
          this.touchStart(ev, action);
        },
        false
      );
      element.addEventListener(
        'MSPointerUp',
        (ev: any) => {
          this.touchEnd(ev, action);
        },
        false
      );
    } else {
      console.error('Failed to find element with selector:', selector);
    }
  }

  unbind(key: KEY) {
    const action = this.bindings[key];
    this.delayedKeyup[action] = true;

    this.bindings[key] = null;
  }

  unbindAll() {
    this.bindings = {};
    this.actions = {};
    this.presses = {};
    this.locks = {};
    this.delayedKeyup = {};
  }

  state(action: string) {
    return this.actions[action];
  }

  pressed(action: string) {
    return this.presses[action];
  }

  released(action: string) {
    return !!this.delayedKeyup[action];
  }

  clearPressed() {
    for (let action in this.delayedKeyup) {
      this.actions[action] = false;
      this.locks[action] = false;
    }
    this.delayedKeyup = {};
    this.presses = {};
  }

  touchStart = (event: TouchEvent, action: string) => {
    this.actions[action] = true;
    this.presses[action] = true;

    event.stopPropagation();
    event.preventDefault();
    return false;
  };

  touchEnd = (event: TouchEvent, action: string) => {
    this.delayedKeyup[action] = true;
    event.stopPropagation();
    event.preventDefault();
    return false;
  };
}
