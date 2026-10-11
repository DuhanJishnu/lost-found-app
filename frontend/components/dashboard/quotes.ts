export const DASHBOARD_QUOTES = [
  "Lost socks remain the universe's greatest unsolved mystery. Your keys don't have to be.",
  "A wallet's favorite hobby is hide-and-seek. Ours is ruining its game.",
  "You didn't lose it. It's just on an unplanned adventure.",
  "Keys travel in packs and vanish solo. Report early, reunite faster.",
  "Your umbrella isn't gone — it's auditioning for a new owner. Intervene.",
  "Every lost item is just a found item that hasn't met its match yet.",
  "The couch cushion dimension called. It wants your remote back.",
  "Retrace your steps. Then let the radar retrace the city.",
  "A backpack left behind is a story paused. Let's press play.",
  "Phones fall silent in the strangest places. Ours listens everywhere.",
] as const;

/** Deterministic pick that rotates daily. */
export function quoteForDate(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return DASHBOARD_QUOTES[day % DASHBOARD_QUOTES.length];
}
