export type LoadCallback = (
  path: string,
  success: boolean,
  e?: Error | Event | null
) => void;
