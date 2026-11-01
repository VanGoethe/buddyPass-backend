export function queuedStart(
  now: Date,
  queuedAhead: number,
  activeActivatedAt: Date | null,
  estimateSeconds: number
): { position: number; estimatedStartAt: Date } {
  const elapsed = activeActivatedAt
    ? Math.max(0, Math.floor((now.getTime() - activeActivatedAt.getTime()) / 1000))
    : 0;
  const currentRemainder = activeActivatedAt
    ? Math.max(0, estimateSeconds - elapsed)
    : 0;
  const startsInSeconds = currentRemainder + queuedAhead * estimateSeconds;
  return {
    position: queuedAhead + (activeActivatedAt ? 1 : 0),
    estimatedStartAt: new Date(now.getTime() + startsInSeconds * 1000),
  };
}
