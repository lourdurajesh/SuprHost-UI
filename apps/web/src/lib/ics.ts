// A one-event iCalendar file for a confirmed stay (RFC 5545). Times are written in UTC, converted
// from the site's timezone, so every calendar app agrees without a VTIMEZONE block.

/** Minutes east of UTC for `timeZone` on `isoDate` (e.g. 330 for Asia/Kolkata). */
function offsetMinutes(timeZone: string, isoDate: string): number {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${isoDate}T12:00:00Z`))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  } catch {
    return 0;
  }
}

/** "2027-03-03" + "13:00" in `timeZone` → "20270303T073000Z". */
function utcStamp(isoDate: string, time: string, timeZone: string): string {
  const [h, min] = /^\d{1,2}:\d{2}$/.test(time) ? time.split(":").map(Number) : [12, 0];
  const local = Date.UTC(Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)) - 1, Number(isoDate.slice(8, 10)), h, min);
  return new Date(local - offsetMinutes(timeZone, isoDate) * 60_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes TEXT values (backslash, semicolon, comma, newline) and folds lines to 75 octets. */
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (out.length ? 74 : 75)) {
      out.push(current);
      current = ch;
    } else current += ch;
  }
  out.push(current);
  return out.join("\r\n ");
}

interface StayEvent {
  uid: string;
  title: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  timeZone: string;
  location?: string | null;
  description: string;
  url?: string | null;
}

export function stayCalendar(e: StayEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SuprHost//Direct booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${utcStamp(e.checkIn, e.checkInTime, e.timeZone)}`,
    `DTEND:${utcStamp(e.checkOut, e.checkOutTime, e.timeZone)}`,
    `SUMMARY:${text(e.title)}`,
    ...(e.location ? [`LOCATION:${text(e.location)}`] : []),
    `DESCRIPTION:${text(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
