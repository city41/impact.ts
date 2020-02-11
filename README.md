# impact.ts

This is [Impact](https://github.com/phoboslab/Impact), a JavaScript game engine, ported to TypeScript.

# Status: Dormant

After porting Impact to TS, I ended up forking it into my (currently closed source) game and making a lot of changes that only make sense for my game. So due to that, I am not actively working on the port found in this repo. 

# Changes

Here is what is different between impact.ts and standard Impact:

* No longer using a proprietary class system, uses ES6 classes instead
* No longer using a proprietary module system, uses ES6 modules instead
* `ig` is no longer a global object placed on window, it must be imported instead
    * ie `import { ig } from '@city41/impact.ts/dist/impact'`
* `ig.global` has been removed
* strongly and statically typed
* the dummy `game/main.js` has been removed
* everything related to Weltmeister has been removed
* no longer comes with any kind of bundling solution, see "bundling" below

Also...

## game#spawnEntity

spawnEntity no longer accepts a string for the `type` parameter. You must pass in an entity class instead. This is due to no longer having `ig.global`.

## game#loadLevel

loadLevel requires you pass in an `entityMap` parameter, due to the above `spawnEntity` change.

## built in prototypes no longer augmented

Number and Array no longer get additional methods added to their prototype. These methods instead live in `util`.

For example, instead of:

```typescript
const a = 123;
const b = a.limit(10, 200);
```

do

```typescript
import { limit } from '@city41/impact.ts/dist/util';

const a = 123;
const b = limit(a, 10, 200);
```

## All classes prefixed with "ig"
All impact.ts classes start with `ig`, ie `igTimer`, `igEntity`, etc. This was done because without the prefix, `igImage` would clash with the built in `Image` type in browsers.

I'm not sure I like this. I will probably remove the prefix from all classes except `igImage`.

## bundling

Since impact.ts is a standard TypeScript library, there is no need for any kind of bundling solution such as impact's `bake.php`. Just use whatever standard bundler you prefer, ie webpack, rollup, parcel, etc.

# Jump 'n' Run demo game

`packages/jumpnrun` is the standard Impact [jumpnrun](https://impactjs.com/demos/jumpnrun/) demo. It is built with impact.ts and written in TypeScript. It is a good example of how to make games using impact.ts.

## building and playing the demo

1. clone this repo
2. `yarn` from the root of the repo
3. `yarn play`

The game will be built, then available at http://localhost:8080



# License

Just like standard Impact, impact.ts is licensed under the MIT license. See `LICENSE` file
