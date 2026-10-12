// "2026-10-12" for the given time zone.
export function dayKey(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hourIn(timeZone, date = new Date()) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

// Midnight of "today" in the given time zone, as an ISO string in UTC.
export function startOfToday(timeZone, date = new Date()) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName").value; // "GMT+05:30" or "GMT"
  const offset = offsetName === "GMT" ? "Z" : offsetName.slice(3);
  return new Date(`${dayKey(timeZone, date)}T00:00:00${offset}`).toISOString();
}
