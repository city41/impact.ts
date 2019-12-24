export function toInt(n: number): number {
  return n | 0;
}

export function toRad(n: number): number {
  return (n / 180) * Math.PI;
}

export function limit(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function erase<T>(arr: T[], item: T): T[] {
  for (let i = arr.length; i--; ) {
    if (arr[i] === item) {
      arr.splice(i, 1);
    }
  }
  return arr;
}

export function rangeMap(
  n: number,
  istart: number,
  istop: number,
  ostart: number,
  ostop: number
) {
  return ostart + (ostop - ostart) * ((n - istart) / (istop - istart));
}

export function inject(Class: any, mixin: Record<string, any>) {
  Object.assign(Class.prototype, mixin);
}
