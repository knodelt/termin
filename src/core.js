// Reine Terminlogik. Kein WhatsApp-Zugang, keine Kundendaten an externe Dienste.
export const TIMEZONE = 'Europe/Berlin';
export const DEFAULT_SERVICES = [
  { id: 'damen', name: 'Damenhaarschnitt', short: 'Schnitt Damen', duration: 45, price: 42, color: 'peach' },
  { id: 'herren', name: 'Herrenhaarschnitt', short: 'Schnitt Herren', duration: 30, price: 28, color: 'blue' },
  { id: 'farbe', name: 'Coloration', short: 'Coloration', duration: 90, price: 85, color: 'purple' },
  { id: 'styling', name: 'Waschen & Styling', short: 'Styling', duration: 30, price: 30, color: 'mint' }
];
export const STAFF = [
  { id: 'mara', name: 'Mara', initials: 'MA', color: 'coral' },
  { id: 'leonie', name: 'Leonie', initials: 'LE', color: 'lilac' }
];
export const HOURS = {
  0: null,
  1: [9 * 60, 18 * 60],
  2: [9 * 60, 18 * 60],
  3: [9 * 60, 18 * 60],
  4: [9 * 60, 18 * 60],
  5: [9 * 60, 18 * 60],
  6: [9 * 60, 15 * 60]
};
export function todayISO(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function isoDate(year, month, day) {
  const value = new Date(Date.UTC(year, month - 1, day, 12));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function addDays(iso, count) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0,10);
}
export function dayOfWeek(iso) { return new Date(`${iso}T12:00:00Z`).getUTCDay(); }
export function mondayOf(iso) { return addDays(iso, -(dayOfWeek(iso) + 6) % 7); }
export function nextWeekday(iso, target) {
  return addDays(iso, (target - dayOfWeek(iso) + 7) % 7);
}
export function displayDate(iso, options = { day:'numeric', month:'long' }) {
  return new Intl.DateTimeFormat('de-DE', {timeZone:'UTC', ...options}).format(new Date(`${iso}T12:00:00Z`));
}
export function minutes(time) {
  if (!/^\d{1,2}:\d{2}$/.test(time || '')) return NaN;
  const [h,m] = time.split(':').map(Number);
  return h < 24 && m < 60 ? h * 60 + m : NaN;
}
export function clock(total) { return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`; }
export function endTime(time, duration) { return clock(minutes(time) + duration); }
export function serviceFromText(text) {
  const s = text.toLocaleLowerCase('de-DE');
  if (/färb|faerb|färben|farbe|color|strähn|straehn|tönung/.test(s)) return 'farbe';
  if (/herr|männer|maenner|bart|maschinenschnitt/.test(s)) return 'herren';
  if (/styling|föhn|foehn|waschen|frisur|hochsteck/.test(s)) return 'styling';
  if (/damen|schneid|schnitt|haare|friseur/.test(s)) return 'damen';
  return null;
}
export function parseMessage(text, baseDate = todayISO()) {
  const s = String(text || '').toLocaleLowerCase('de-DE').trim();
  const result = { date:null, time:null, serviceId:serviceFromText(s), confirm:false, decline:false, cancel:false, reschedule:false };
  result.cancel = /\b(absagen|stornieren|absage|storno)\b/.test(s);
  result.reschedule = /\b(verschieben|umbuchen|verlegen)\b/.test(s);
  result.confirm = /^(ja\b|klar\b|passt\b|okay\b|ok\b|super\b|gerne\b|perfekt\b|bestätig|buchen\b|nehm|machen wir|einverstanden)/.test(s);
  result.decline = /^(nein\b|doch nicht|abbrechen|lieber nicht)/.test(s);
  const exact = s.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/);
  if (exact) {
    let year = exact[3] ? Number(exact[3]) : Number(baseDate.slice(0,4));
    if (year < 100) year += 2000;
    let proposed = isoDate(year, Number(exact[2]), Number(exact[1]));
    if (proposed && !exact[3] && proposed < baseDate) proposed = isoDate(year + 1, Number(exact[2]), Number(exact[1]));
    result.date = proposed;
  } else if (s.includes('übermorgen') || s.includes('uebermorgen')) {
    result.date = addDays(baseDate, 2);
  } else if (/\bmorgen\b/.test(s)) {
    result.date = addDays(baseDate, 1);
  } else if (/\bheute\b/.test(s)) {
    result.date = baseDate;
  } else {
    const weekdays = [['sonntag',0],['montag',1],['dienstag',2],['mittwoch',3],['donnerstag',4],['freitag',5],['samstag',6]];
    const found = weekdays.find(([word]) => s.includes(word));
    if (found) result.date = nextWeekday(baseDate,found[1]);
  }
  const timeMatch = s.match(/\b(?:um\s*)?(\d{1,2}):(\d{2})(?:\s*uhr)?\b/) || s.match(/\bum\s+(\d{1,2})[.](\d{2})(?:\s*uhr)?\b/) || s.match(/\b(?:um\s*)?(\d{1,2})\s*uhr(?:\s*(\d{2}))?\b/) || s.match(/\bum\s+(\d{1,2})\b/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]), min = Number(timeMatch[2] || 0);
    if (hour < 24 && min < 60) result.time = clock(hour * 60 + min);
  }
  return result;
}
export function canBook({ bookings, date, time, serviceId, staffId = null, services = DEFAULT_SERVICES, staff = STAFF, nowDate = todayISO(), nowTime = null }) {
  const service = services.find(x => x.id === serviceId);
  if (!service || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !Number.isFinite(minutes(time))) return { ok:false, reason:'Angaben unvollständig' };
  if (date < nowDate || (date === nowDate && nowTime && minutes(time) <= minutes(nowTime))) return { ok:false, reason:'Termin liegt in der Vergangenheit' };
  const hours = HOURS[dayOfWeek(date)];
  if (!hours) return { ok:false, reason:'Sonntags geschlossen' };
  const start = minutes(time), end = start + Number(service.duration);
  if (start < hours[0] || end > hours[1] || start % 15 !== 0) return { ok:false, reason:'Außerhalb der Öffnungszeiten' };
  if (start < 13 * 60 && end > 12 * 60 + 30) return { ok:false, reason:'Mittagspause von 12:30 bis 13:00 Uhr' };
  const relevantStaff = staffId ? staff.filter(x => x.id === staffId) : staff;
  const free = relevantStaff.filter(member => !bookings.some(a => {
    if (a.date !== date || a.staffId !== member.id || a.status === 'cancelled') return false;
    const bStart = minutes(a.time), bService = services.find(x => x.id === a.serviceId);
    const bEnd = bStart + Number(a.duration || bService?.duration || 30);
    return start < bEnd && end > bStart;
  }));
  if (!free.length) return { ok:false, reason:'Bereits ausgebucht' };
  free.sort((a,b) => bookings.filter(x => x.date === date && x.staffId === a.id && x.status !== 'cancelled').length - bookings.filter(x => x.date === date && x.staffId === b.id && x.status !== 'cancelled').length);
  return { ok:true, staff:free[0] };
}
export function alternatives({ bookings, date, time, serviceId, services = DEFAULT_SERVICES, staff = STAFF, nowDate = todayISO(), nowTime = null, limit = 3 }) {
  const desired = minutes(time);
  if (!Number.isFinite(desired)) return [];
  const candidates = [];
  for (let step = 15; step <= 240; step += 15) {
    for (const start of [desired - step, desired + step]) {
      if (start < 0 || start >= 1440) continue;
      const proposed = clock(start);
      const availability = canBook({bookings,date,time:proposed,serviceId,services,staff,nowDate,nowTime});
      if (availability.ok && !candidates.some(x => x.time === proposed)) candidates.push({ time:proposed, staff:availability.staff });
      if (candidates.length >= limit) return candidates.sort((a,b) => minutes(a.time)-minutes(b.time));
    }
  }
  return candidates.sort((a,b) => minutes(a.time)-minutes(b.time));
}
export function makeDemoData(baseDate = todayISO()) {
  const fri = nextWeekday(baseDate,5), tomorrow = addDays(baseDate,1);
  const todayIsOpen = dayOfWeek(baseDate) !== 0;
  const sample = [
    ['a1','Lara Hoffmann',todayIsOpen ? baseDate : tomorrow,'09:30','damen','mara'],
    ['a2','Ben Richter',todayIsOpen ? baseDate : tomorrow,'10:30','herren','leonie'],
    ['a3','Sophie Neumann',tomorrow,'14:00','farbe','mara'],
    ['a4','Jonas Berger',addDays(baseDate,2),'11:00','herren','leonie'],
    ['a5','Emilia Becker',fri,'15:00','damen','mara'],
    ['a6','Nina Schulz',fri,'15:00','farbe','leonie'],
    ['a7','Paul Weber',fri,'10:00','herren','mara']
  ];
  return sample.map(([id,client,date,time,serviceId,staffId]) => ({ id,client,date,time,serviceId,staffId,phone:'',origin:'demo',status:'confirmed',duration:DEFAULT_SERVICES.find(x=>x.id===serviceId).duration }));
}