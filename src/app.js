import {
  DEFAULT_SERVICES, STAFF, HOURS, TIMEZONE, todayISO, addDays, dayOfWeek, mondayOf, nextWeekday,
  displayDate, minutes, clock, endTime, parseMessage, canBook, alternatives, makeDemoData
} from './core.js';

const ICONS = {
  'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  'calendar-days':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  'calendar-check':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18m5 5 2 2 4-4"/>',
  'message-circle':'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
  'scissors':'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.1 8.1 12.8 12.8M14.5 10.5l6.4-7.4M8.1 15.9l2.8-2.8"/>',
  'settings-2':'<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  'plus':'<path d="M12 5v14M5 12h14"/>',
  'arrow-right':'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'x':'<path d="M18 6 6 18M6 6l12 12"/>',
  'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  'trending-up':'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  'sparkles':'<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>',
  'send':'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  'check':'<path d="m5 12 4 4L19 6"/>',
  'check-check':'<path d="m3 12 4 4 5-5M10 12l4 4 7-8"/>',
  'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  'shield-check':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  'edit':'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4 10.5-10.5Z"/>',
  'trash':'<path d="M3 6h18m-2 0-.8 14H5.8L5 6m3 0V4h8v2M10 10v7m4-7v7"/>',
  'rotate-ccw':'<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/>',
  'coffee':'<path d="M4 8h14v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm14 1h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2"/>',
  'wand':'<path d="M4 20 20 4M15 3l1 3m5 3 2 1M3 10l3 1M8 3l1 3"/>',
  'alert-circle':'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
  'more-horizontal':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
const icon = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24">${ICONS[name] || ICONS.info}</svg>`;
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const STORE_KEY = 'takt-salon-prototype-v1';
const nowTime = () => new Intl.DateTimeFormat('de-DE', {timeZone:TIMEZONE, hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
const timeStamp = () => new Intl.DateTimeFormat('de-DE', {timeZone:TIMEZONE,hour:'2-digit',minute:'2-digit'}).format(new Date());
const firstName = name => String(name).split(' ')[0];
const serviceOf = id => state.services.find(s => s.id === id) || state.services[0];
const staffOf = id => STAFF.find(s => s.id === id) || STAFF[0];
const getAppointments = () => liveData ? liveData.appointments.map(a => ({...a,origin:'whatsapp'})) : state.appointments;
const appointmentsOn = date => getAppointments().filter(a => a.date === date && a.status !== 'cancelled').sort((a,b)=>a.time.localeCompare(b.time));
const booked = a => a.status !== 'cancelled';
const n = num => new Intl.NumberFormat('de-DE').format(num);
const randomId = () => globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const weekdayShort = iso => displayDate(iso, {weekday:'short'}).replace('.','');
const formatLong = iso => displayDate(iso,{weekday:'long',day:'numeric',month:'long',year:'numeric'});

function makeThread(index, name) {
  return {id:`thread-${index}`,name,pending:null,suggestions:[],messages:[{
    role:'bot', text:`Hallo${index===1?'':' '+firstName(name)}! 👋 Schön, dass du da bist. Wann möchtest du zu uns kommen?`,time:'09:41'
  }]};
}
function freshState() {
  const date = todayISO();
  const selectedDate = nextWeekday(date,5);
  return {view:'dashboard',selectedDate,weekStart:mondayOf(selectedDate),services:structuredClone(DEFAULT_SERVICES),salonName:'Atelier Neun',appointments:makeDemoData(date),threads:[makeThread(1,'Testkundin'),makeThread(2,'Miriam Adler')],activeThreadId:'thread-1',version:1};
}
function getState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && saved.version === 1 && Array.isArray(saved.appointments) && Array.isArray(saved.services) && Array.isArray(saved.threads)) {
      return {...freshState(),...saved,view:'dashboard'};
    }
  } catch(e) { /* Lokale Speicherung kann gesperrt sein. */ }
  return freshState();
}
let state = getState();
let selectedBookingId = null;
let liveData = null; // Nur im Speicher, echte Kundendaten nicht in localStorage.
let liveKey = ''; // Nur für diese Sitzung im Arbeitsspeicher.
let toastTimer;
function persist() {
  try { localStorage.setItem(STORE_KEY,JSON.stringify(state)); } catch(e) { /* Demo bleibt im aktuellen Tab nutzbar. */ }
}
function change(patch = {}) { Object.assign(state,patch); persist(); render(); }
function toast(message) {
  const root = $('#toast-root');
  root.innerHTML = `<div class="toast">${icon('check')}<span>${escapeHTML(message)}</span></div>`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; },3600);
}
function header(eyebrow,title,subtitle,actions='') {
  return `<div class="page-title-row"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div>${actions?`<div class="title-actions">${actions}</div>`:''}</div>`;
}
function panelTitle(title,subtitle,iconName='calendar-days',right='') {
  return `<div class="panel-header"><div class="panel-title"><div class="panel-title-icon">${icon(iconName)}</div><div><h2>${title}</h2><p>${subtitle}</p></div></div>${right}</div>`;
}
function stat(title,value,note,iconName) {
  return `<div class="stat-card"><div class="stat-head"><span>${title}</span><span class="stat-icon">${icon(iconName)}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`;
}
function agendaItem(a) {
  const service = serviceOf(a.serviceId), person = staffOf(a.staffId);
  return `<button type="button" class="agenda-item" data-appointment="${escapeHTML(a.id)}"><div class="agenda-time">${escapeHTML(a.time)}</div><div class="agenda-color ${service.color}"></div><div class="agenda-info"><strong>${escapeHTML(a.client)}</strong><small>${escapeHTML(service.name)} · ${service.duration} Min.</small></div><div class="agenda-staff"><span class="avatar ${person.color}">${person.initials}</span><span>${person.name}</span></div></button>`;
}
function agenda(iso) {
  const appts=appointmentsOn(iso);
  return `<div class="agenda-head"><span>${escapeHTML(displayDate(iso,{weekday:'long',day:'numeric',month:'long'}))}</span><small>${appts.length} Termine</small></div><div class="agenda-list">${appts.length?appts.map(agendaItem).join(''):`<div class="empty-state">${icon('calendar-check')}<strong>Hier ist noch Platz.</strong><p>Für diesen Tag sind keine Termine hinterlegt.</p><button type="button" class="btn btn-secondary btn-small" data-action="new-booking">Termin eintragen</button></div>`}</div>`;
}
function weekController() {
  const end = addDays(state.weekStart,6);
  return `<div class="week-controller"><button type="button" class="icon-btn" data-week="-7" title="Vorherige Woche" aria-label="Vorherige Woche">${icon('chevron-left')}</button><span class="week-caption">${escapeHTML(displayDate(state.weekStart,{day:'numeric',month:'short'}))} – ${escapeHTML(displayDate(end,{day:'numeric',month:'short'}))}</span><button type="button" class="icon-btn" data-week="7" title="Nächste Woche" aria-label="Nächste Woche">${icon('chevron-right')}</button></div>`;
}
function weekStrip() {
  return `<div class="week-days">${Array.from({length:7},(_,i)=>{
    const date=addDays(state.weekStart,i), count=appointmentsOn(date).length;
    return `<button type="button" data-date="${date}" class="week-day ${date===state.selectedDate?'selected':''} ${date===todayISO()?'today':''} ${dayOfWeek(date)===0?'closed':''}" aria-label="${escapeHTML(formatLong(date))}" aria-pressed="${date===state.selectedDate}"><span>${escapeHTML(weekdayShort(date))}</span><strong>${Number(date.slice(-2))}</strong>${count?'<i class="day-dot"></i>':'<small>·</small>'}</button>`;
  }).join('')}</div>`;
}
function renderCalendarPreview(){
  return `<section class="panel">${panelTitle('Dein Kalender','Die Woche auf einen Blick','calendar-days',weekController())}${weekStrip()}${agenda(state.selectedDate)}</section>`;
}
function threadActive() { return state.threads.find(t=>t.id===state.activeThreadId) || state.threads[0]; }
function suggestSamples() {
  const fri=nextWeekday(todayISO(),5);
  const [yr,mo,day]=fri.split('-');
  return [`Haare schneiden am ${Number(day)}.${Number(mo)}. um 15 Uhr`,`Herrenhaarschnitt morgen um 10 Uhr`,`Kann ich meinen Termin absagen?`];
}
function chatPanel(compact=false) {
  const thread=threadActive();
  if(!thread) return '';
  const suggestions=thread.suggestions?.length?thread.suggestions:suggestSamples();
  return `<section class="panel chat-panel ${compact?'':'inbox-chat'}">
    <div class="chat-header"><div class="chat-mark">${icon('message-circle')}</div><div><div class="chat-name">${compact?'KI-Empfang':'Chat mit '+escapeHTML(thread.name)}</div><div class="chat-sub"><i class="green-dot"></i>${compact?'Antwortet auf Terminanfragen':'Du schreibst als Kunde'}</div></div><div class="chat-head-side"><span class="chat-mode">SIMULATION</span>${compact?`<button class="icon-btn" title="Nachrichten öffnen" data-nav="inbox">${icon('arrow-right')}</button>`:''}</div></div>
    <div class="chat-area" data-chat-scroll><div class="chat-day">HEUTE · TESTGESPRÄCH</div>${thread.messages.map(m=>`<div class="bubble-row ${m.role==='customer'?'customer':'bot'}"><div class="bubble-avatar">${m.role==='customer'?'K':'✳'}</div><div class="bubble">${escapeHTML(m.text)}<small>${escapeHTML(m.time||'09:42')}${m.role==='customer'?' ✓✓':''}</small></div></div>`).join('')}</div>
    <div class="chat-quick">${suggestions.map(s=>`<button class="quick-chip" type="button" data-suggestion="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join('')}</div>
    <form id="chatForm" class="chat-compose"><input name="message" autocomplete="off" maxlength="400" placeholder="Als Kunde Nachricht schreiben ..." aria-label="Testnachricht" required><button class="send-btn" type="submit" title="Nachricht senden" aria-label="Nachricht senden">${icon('send')}</button></form>
    <div class="test-note">${icon('info')}<span>Dies ist eine lokale Simulation. Es werden keine echten WhatsApp-Nachrichten versendet.</span></div>
  </section>`;
}
function upcomingList() {
  const items=getAppointments().filter(a=>booked(a)&&a.date>=todayISO()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,4);
  return `<section class="panel">${panelTitle('Demnächst im Salon','Deine nächsten bestätigten Termine','clock',`<button class="btn btn-outline btn-small" type="button" data-nav="calendar">Alle ansehen ${icon('arrow-right')}</button>`)}<div class="upcoming-list">${items.length?items.map(a=>`<div class="upcoming-item"><div class="upcoming-date">${escapeHTML(displayDate(a.date,{day:'numeric',month:'short'}))}<small>${a.time} Uhr</small></div><span class="avatar ${staffOf(a.staffId).color}">${staffOf(a.staffId).initials}</span><div class="upcoming-main"><strong>${escapeHTML(a.client)}</strong><small>${escapeHTML(serviceOf(a.serviceId).name)} · ${staffOf(a.staffId).name}</small></div><span class="booking-tag">Bestätigt</span></div>`).join(''):`<div class="empty-state">Noch keine anstehenden Termine</div>`}</div></section>`;
}
function renderDashboard() {
  const today=todayISO(), week=mondayOf(today), weekEnd=addDays(week,6);
  const todayCount=appointmentsOn(today).length;
  const weekCount=getAppointments().filter(a=>booked(a) && a.date>=week && a.date<=weekEnd).length;
  const demoCount=getAppointments().filter(a=>booked(a) && (a.origin==='chat'||a.origin==='whatsapp')).length;
  const hour=new Date().toLocaleString('de-DE',{timeZone:TIMEZONE,hour:'2-digit',hourCycle:'h23'});
  const greeting=Number(hour)<11?'Guten Morgen':Number(hour)<17?'Guten Tag':'Guten Abend';
  return `${header('Dein Tag. Dein Rhythmus.',`${greeting}<span style="color:#adc76e">.</span>`,`Termine im Blick, Anfragen im Griff. Dein Salon läuft.`,`<span class="title-date">${escapeHTML(formatLong(today))}</span>`)}
  <div class="stats-grid">${stat('Termine heute',n(todayCount),todayCount===0?'Noch keine Termine':'Eingeplant für heute','calendar-check')}${stat('Diese Woche',n(weekCount),'Bestätigte Buchungen','calendar-days')}${stat('Vom Assistenten',n(demoCount),liveData?'Per WhatsApp gebucht':'Im Testchat gebucht','sparkles')}${stat('Team im Einsatz',String(STAFF.length),'Mara & Leonie','users')}</div>
  <div class="grid-primary">${renderCalendarPreview()}${chatPanel(true)}</div>
  <div class="below-grid">${upcomingList()}<section class="intro-panel"><div class="intro-icon">${icon('sparkles')} SO EINFACH KANN BUCHEN SEIN</div><h2>Deine Kunden schreiben. Dein Kalender antwortet.</h2><p>Teste eine Anfrage für Freitag um 15 Uhr. Beide Stylistinnen sind bereits belegt – der Assistent findet passende Alternativen.</p><button type="button" class="btn btn-lime btn-small" data-nav="inbox">Testchat öffnen ${icon('arrow-right')}</button></section></div>`;
}
function calendarView() {
  const dates=Array.from({length:7},(_,i)=>addDays(state.weekStart,i));
  let active=getAppointments().filter(booked);
  const headerCells=dates.map(d=>`<span class="${d===todayISO()?'is-today':''} ${dayOfWeek(d)===0?'is-closed':''}">${escapeHTML(weekdayShort(d))}<strong>${Number(d.slice(-2))}</strong></span>`).join('');
  const columns=dates.map(d=>{
    const dayA=appointmentsOn(d);
    const events=dayA.map(a=>{
      const serv=serviceOf(a.serviceId), start=minutes(a.time), dur=Number(a.duration||serv.duration);
      const overlap=dayA.some(b=>b.id!==a.id && (minutes(b.time)<start+dur && minutes(b.time)+Number(b.duration||serviceOf(b.serviceId).duration)>start));
      const staffIndex=STAFF.findIndex(s=>s.id===a.staffId);
      const left=overlap?(staffIndex===0?'3%':'51%'):'3%';
      const width=overlap?'46%':'94%';
      return `<button class="cal-event ${serv.color}" title="${escapeHTML(a.client)} · ${escapeHTML(serv.name)}" style="top:${Math.max(0,start-540)}px;height:${Math.max(27,dur-3)}px;left:${left};width:${width}" data-appointment="${escapeHTML(a.id)}"><small>${escapeHTML(a.time)}</small><strong>${escapeHTML(firstName(a.client))}</strong><small>${escapeHTML(serv.short)} · ${escapeHTML(staffOf(a.staffId).name)}</small></button>`;
    }).join('');
    return `<div class="calendar-column ${dayOfWeek(d)===0?'closed':''}"><button type="button" class="cal-add" data-cal-date="${d}" title="Termin hinzufügen" aria-label="Termin am ${escapeHTML(d)} hinzufügen" ${dayOfWeek(d)===0?'disabled':''}></button>${events}</div>`;
  }).join('');
  return `${header('Zeit für Übersicht.','Dein Terminkalender','Alles, was im Studio passiert – auf einen Blick.')}
    <div class="calendar-toolbar">${weekController()}<div class="title-actions"><button type="button" class="btn btn-outline btn-small" data-action="today">Diese Woche</button><button type="button" class="btn btn-dark btn-small" data-action="new-booking">${icon('plus')} Termin eintragen</button></div></div>
    <section class="panel calendar-full"><div class="calendar-scroll"><div class="calendar-head"><span></span>${headerCells}</div><div class="calendar-body"><div class="calendar-times">${Array.from({length:10},(_,i)=>`<span style="top:${i*60+1}px">${String(i+9).padStart(2,'0')}:00</span>`).join('')}</div>${columns}</div></div><div class="calendar-legend">${state.services.map(s=>`<span class="legend-item"><i class="${s.color}"></i>${escapeHTML(s.name)}</span>`).join('')}</div></section>`;
}
function inboxView() {
  return `${header('Immer im Gespräch.','Nachrichten & Assistent','Teste echte Gesprächsabläufe – von der Anfrage bis zur Bestätigung.',`<button class="btn btn-dark" data-action="new-thread">${icon('plus')} Testchat</button>`)}
  <div class="inbox-grid"><section class="panel threads-panel">${panelTitle('Gespräche','Testkunden','users',`<button class="icon-btn" type="button" data-action="new-thread" title="Neuer Testkunde">${icon('plus')}</button>`)}<div class="threads-list">${state.threads.map(t=>{const last=t.messages.at(-1);return `<button type="button" class="thread-item ${t.id===state.activeThreadId?'active':''}" data-thread="${t.id}"><span class="avatar">${escapeHTML(firstName(t.name).slice(0,1))}</span><span class="thread-copy"><strong>${escapeHTML(t.name)}</strong><small>${escapeHTML(last?.text||'').slice(0,50)}</small></span><span class="thread-time">${escapeHTML(last?.time||'')}</span></button>`;}).join('')}</div></section>
  ${chatPanel()}
  <section class="panel inbox-info"><div class="info-icon">${icon('sparkles')}</div><h3>So arbeitet takt.</h3><p>Dein digitaler Empfang erkennt Terminwünsche in normaler Sprache und gleicht sie automatisch mit dem Kalender ab.</p><div class="info-line">${icon('check')} Erkennt Datum, Uhrzeit & Leistung</div><div class="info-line">${icon('check')} Beachtet Öffnungszeiten & Pausen</div><div class="info-line">${icon('check')} Verhindert Überschneidungen</div><div class="info-line">${icon('check')} Bucht erst nach einer Bestätigung</div><div class="settings-alert"><strong>Nur Simulation</strong> Dieser Testchat bleibt simuliert. Echte eingehende WhatsApp-Nachrichten findest du unter WhatsApp Live.</div></section></div>`;
}
function serviceCard(s) {
  return `<section class="panel service-card ${s.color}"><button type="button" class="icon-btn" data-edit-service="${s.id}" title="Leistung bearbeiten" aria-label="${escapeHTML(s.name)} bearbeiten">${icon('edit')}</button><span class="service-icon">${icon(s.id==='farbe'?'wand':s.id==='styling'?'sparkles':'scissors')}</span><h2>${escapeHTML(s.name)}</h2><p>Service im Salon</p><div class="service-bottom"><div><div class="service-price">${n(s.price)} €</div><div class="service-duration">Preis pro Behandlung</div></div><span class="booking-tag">${s.duration} Min.</span></div></section>`;
}
function servicesView() {
  return `${header('Deine Leistungen.','Was bietest du an?','Dauer und Preis lassen sich bearbeiten. Die Terminlogik berücksichtigt die hinterlegte Behandlungsdauer.')}
    <div class="services-grid">${state.services.map(serviceCard).join('')}</div><div class="settings-alert" style="max-width:700px;margin-top:19px"><strong>Die Dauer entscheidet.</strong> Bei einer 90-minütigen Coloration prüft takt. automatisch, ob der gesamte Zeitraum frei ist – nicht nur der Start um 15 Uhr.</div>`;
}
function settingsView() {
  const weekdays=[['Montag',1],['Dienstag',2],['Mittwoch',3],['Donnerstag',4],['Freitag',5],['Samstag',6],['Sonntag',0]];
  return `${header('Alles an deinem Platz.','Studio-Einstellungen','Hier legst du die Grundlagen für die automatische Terminplanung fest.')}
  <div class="settings-layout"><section class="panel settings-box">${panelTitle('Dein Studio','Profil und Team','settings-2',`<button type="button" class="icon-btn" data-action="edit-salon" title="Studionamen ändern">${icon('edit')}</button>`)}
    <div class="setting-row"><div><strong>Studioname</strong><small>Name im Terminassistenten</small></div><div class="value">${escapeHTML(state.salonName)}</div></div>
    <div class="setting-row"><div><strong>Mitarbeiterinnen</strong><small>Automatische Zuordnung beim Buchen</small></div><div class="value">${STAFF.map(s=>`<span class="staff-pill"><span class="avatar ${s.color}">${s.initials}</span>${s.name}</span>`).join('')}</div></div>
    <div class="setting-row"><div><strong>Mittagspause</strong><small>Für beide Teammitglieder</small></div><div class="value">12:30 – 13:00</div></div>
    <div class="setting-row"><div><strong>WhatsApp-Verbindung</strong><small>Echte Termine in D1, sobald Meta eingerichtet ist</small></div><div class="value">${liveData ? (liveData.waConfigured?'API eingerichtet':'API-Zugang fehlt') : 'Nicht angemeldet'}</div></div>
    <div class="settings-alert"><strong>${icon('shield-check')} Simulation und Live getrennt</strong> Demo-Termine bleiben im Browser. Echte WhatsApp-Termine werden in Cloudflare D1 gespeichert und nur nach Admin-Anmeldung angezeigt.</div></section>
    <section class="panel settings-box">${panelTitle('Öffnungszeiten','Aktuell festgelegte Demo-Zeiten','clock')}
    ${weekdays.map(([name,day])=>`<div class="setting-row"><strong>${name}</strong><span class="value">${HOURS[day]?`${clock(HOURS[day][0])} – ${clock(HOURS[day][1])}`:'Geschlossen'}</span></div>`).join('')}
    <div class="setting-row"><div><strong>Demo zurücksetzen</strong><small>Entfernt alle Änderungen und Testbuchungen</small></div><button type="button" class="btn btn-secondary btn-small" data-action="reset">${icon('rotate-ccw')} Zurücksetzen</button></div></section></div>`;
}
function liveView() {
  const callback = escapeHTML(location.origin + '/api/whatsapp/webhook');
  const credentials = `<section class="panel settings-box" style="max-width:640px"><h2>Live-Zugang</h2><p class="page-subtitle" style="margin:12px 0 20px">Gib den in Cloudflare als ADMIN_API_KEY hinterlegten Schlüssel ein. Der Schlüssel wird nur im Speicher dieses Tabs verwendet.</p><form id="liveConnectForm"><div class="form-field"><label class="form-label" for="live-token">Admin-Schlüssel</label><input type="password" id="live-token" name="key" class="form-input" autocomplete="off" required placeholder="ADMIN_API_KEY"></div><button class="btn btn-dark" type="submit">Live-Daten verbinden</button></form></section>`;
  if (!liveData) return `${header('WhatsApp statt Telefonklingeln.','WhatsApp Live','Hier erscheinen die echten Kundennachrichten und Buchungen aus Cloudflare D1.')}${credentials}<div class="settings-alert"><strong>Meta-Webhook-Adresse</strong><code>${callback}</code><p style="margin:6px 0 0">Diese HTTPS-Adresse in der Meta-App bei Webhooks hinterlegen. Die Anmeldung hier ersetzt nicht die Freischaltung durch Meta.</p></div>`;
  const recent = liveData.threads.flatMap(t => t.messages.map(m => ({...m,name:t.name,waId:t.waId}))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,36);
  const future = liveData.appointments.filter(a=>a.status==='confirmed' && a.date>=todayISO()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `${header('WhatsApp Live','Echte Anfragen & Buchungen',liveData.waConfigured?'Backend-Zugang und WhatsApp-Schlüssel sind eingerichtet. Prüfe zusätzlich die Meta-Webhook-Verifizierung.':'Datenbank ist erreichbar. Für den WhatsApp-Empfang fehlen noch Meta-Schlüssel.',`<button data-action="refresh-live" class="btn btn-dark" type="button">Aktualisieren</button><button data-action="disconnect-live" class="btn btn-outline" type="button">Abmelden</button>`)}
    <div class="stats-grid">${stat('Live-Buchungen',String(future.length),'Aktuell bestätigt','calendar-check')}${stat('WhatsApp-Kontakte',String(liveData.threads.length),'Im D1-Postfach','users')}${stat('Nachrichten',String(recent.length),'Letzte 120 gesamt','message-circle')}${stat('API-Konfiguration',liveData.waConfigured?'OK':'Offen',liveData.waConfigured?'Schlüssel hinterlegt':'Meta-Schlüssel ergänzen','shield-check')}</div>
    <div class="settings-layout"><section class="panel settings-box"><h2>Kommende Live-Termine</h2><div style="margin-top:12px">${future.length?future.slice(0,25).map(a=>`<div class="setting-row"><div><strong>${escapeHTML(a.client)}</strong><small>${escapeHTML(a.date)} · ${escapeHTML(a.time)} Uhr · ${escapeHTML(serviceOf(a.serviceId).name)}</small></div><div class="value">${escapeHTML(staffOf(a.staffId).name)}</div></div>`).join(''):'<p class="page-subtitle" style="margin-top:18px">Noch keine echten Buchungen.</p>'}</div></section>
    <section class="panel settings-box"><h2>Letzte WhatsApp-Nachrichten</h2><div style="margin-top:12px;max-height:650px;overflow:auto">${recent.length?recent.map(m=>`<div class="setting-row"><div style="min-width:0"><strong>${escapeHTML(m.name)} · ${m.direction==='in'?'Kunde':'Assistent'}</strong><small style="white-space:normal;overflow-wrap:anywhere;line-height:1.5">${escapeHTML(m.body)}</small></div><div class="value" style="white-space:nowrap">${escapeHTML(m.createdAt.slice(0,16))}</div></div>`).join(''):'<p class="page-subtitle" style="margin-top:18px">Noch keine eingehenden WhatsApp-Nachrichten.</p>'}</div></section></div>`;
}
async function refreshLive() {
  if (!liveKey) return;
  try {
    const response = await fetch('/api/live',{headers:{authorization:`Bearer ${liveKey}`},cache:'no-store'});
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    liveData = data;
    render();
  } catch(error) {
    if(/Zugriff verweigert|401/.test(error.message)){liveKey='';liveData=null;}
    render();toast(error.message);
  }
}
function render() {
  const titles={dashboard:'ÜBERSICHT',calendar:'KALENDER',inbox:'TESTCHAT',live:'WHATSAPP LIVE',services:'LEISTUNGEN',settings:'EINSTELLUNGEN'};
  $('#breadcrumb').textContent=titles[state.view]||'ÜBERSICHT';
  $('#sidebar-salon').textContent=state.salonName;
  $('#top-date').textContent=displayDate(todayISO(),{weekday:'short',day:'numeric',month:'long'});
  document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===state.view;el.classList.toggle('active',active);if(el.matches('.nav-link'))el.setAttribute('aria-current',active?'page':'false');});
  $('#nav-message-count').textContent=String(state.threads.length);
  const views={dashboard:renderDashboard,calendar:calendarView,inbox:inboxView,live:liveView,services:servicesView,settings:settingsView};
  $('#page-content').innerHTML=(views[state.view]||renderDashboard)();
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
  requestAnimationFrame(()=>{document.querySelectorAll('[data-chat-scroll]').forEach(el=>el.scrollTop=el.scrollHeight);});
}
function response(text,suggestions=[]){return {text,suggestions};}
function createBooking(data) {
  const service=serviceOf(data.serviceId);
  const a={id:randomId(),client:data.client,date:data.date,time:data.time,serviceId:data.serviceId,staffId:data.staffId,
    duration:service.duration,phone:data.phone||'',origin:data.origin||'manual',customerId:data.customerId||null,status:'confirmed'};
  state.appointments.push(a);persist();return a;
}
function availability(date,time,serviceId,staffId=null) {
  return canBook({bookings:state.appointments,date,time,serviceId,staffId,services:state.services,staff:STAFF,nowDate:todayISO(),nowTime:nowTime()});
}
function findAlternatives(date,time,serviceId) {
  return alternatives({bookings:state.appointments,date,time,serviceId,services:state.services,staff:STAFF,nowDate:todayISO(),nowTime:nowTime(),limit:3});
}
function botThink(thread,userText) {
  const msg=parseMessage(userText,todayISO());
  let pending=thread.pending;
  if (pending?.kind==='cancel' && msg.confirm) {
    const a=state.appointments.find(b=>b.id===pending.appointmentId && booked(b) && b.customerId===thread.id);
    thread.pending=null;
    if(!a) return response('Ich konnte den Termin nicht mehr finden. Bitte melde dich beim Salon.');
    a.status='cancelled';
    return response(`Dein Termin am ${displayDate(a.date,{day:'numeric',month:'long'})} um ${a.time} Uhr wurde abgesagt. Danke für die Info! ✨`);
  }
  if (msg.cancel) {
    const customerBookings=state.appointments.filter(a=>a.customerId===thread.id && booked(a) && a.date>=todayISO()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    if(!customerBookings.length) return response('In diesem Testchat finde ich noch keinen gebuchten Termin. Für echte Kundentermine müsste später das WhatsApp-Konto mit dem Kalender verbunden sein.');
    const a=customerBookings[0];
    thread.pending={kind:'cancel',appointmentId:a.id};
    return response(`Möchtest du deinen Termin am ${displayDate(a.date,{day:'numeric',month:'long'})} um ${a.time} Uhr wirklich absagen?`,['Ja, bitte absagen','Nein']);
  }
  if (msg.reschedule) return response('Klar! In dieser Demo kannst du deinen bestehenden Termin zunächst absagen und danach einen neuen Wunschtermin buchen.',['Termin absagen']);
  if (pending?.kind==='cancel' && msg.decline) {thread.pending=null;return response('Alles klar – dein Termin bleibt bestehen. 😊');}
  if (pending?.kind==='offer' && msg.confirm && !msg.date && !msg.time && !msg.serviceId) {
    const a=availability(pending.date,pending.time,pending.serviceId);
    if(a.ok){
      const booking=createBooking({client:thread.name,date:pending.date,time:pending.time,serviceId:pending.serviceId,staffId:a.staff.id,origin:'chat',customerId:thread.id});
      thread.pending=null;
      const s=serviceOf(booking.serviceId);
      return response(`Perfekt! ✅ Dein Termin für ${s.name} ist am ${displayDate(booking.date,{weekday:'long',day:'numeric',month:'long'})} um ${booking.time} Uhr bestätigt. ${staffOf(booking.staffId).name} freut sich auf dich!`,['Ich möchte noch einen Termin buchen','Termin absagen']);
    }
    pending={kind:'request',date:pending.date,time:pending.time,serviceId:pending.serviceId};
  }
  if (msg.decline && pending) {thread.pending=null;return response('Kein Problem! Wenn du einen anderen Termin möchtest, schreib mir einfach. 😊');}
  // Neue Angaben überschreiben bestehende Angebotsdaten, z.B. "16 Uhr wäre besser".
  const date=msg.date || pending?.date || null;
  const time=msg.time || pending?.time || null;
  const serviceId=msg.serviceId || pending?.serviceId || null;
  if(!date){thread.pending={kind:'request',date,time,serviceId};return response('Sehr gerne! Für welchen Tag möchtest du einen Termin? 📅',['Morgen um 10 Uhr','Am Freitag um 15 Uhr']);}
  if(date<todayISO()){thread.pending=null;return response('Dieses Datum liegt bereits in der Vergangenheit. Für welchen zukünftigen Tag darf ich nachsehen?');}
  if(!serviceId){thread.pending={kind:'request',date,time,serviceId};return response(`Für den ${displayDate(date,{day:'numeric',month:'long'})}: Welche Leistung darf es sein? ✂️`,state.services.map(s=>s.name));}
  if(!time){thread.pending={kind:'request',date,time,serviceId};return response(`Alles klar, ${serviceOf(serviceId).name}. Um wie viel Uhr möchtest du am ${displayDate(date,{day:'numeric',month:'long'})} kommen?`,['10 Uhr','14 Uhr','15 Uhr']);}
  const open=availability(date,time,serviceId);
  if(open.ok){
    thread.pending={kind:'offer',date,time,serviceId};
    return response(`Gute Nachrichten! ✨ Am ${displayDate(date,{weekday:'long',day:'numeric',month:'long'})} um ${time} Uhr ist noch ein Termin für ${serviceOf(serviceId).name} (${serviceOf(serviceId).duration} Min.) frei. Soll ich ihn verbindlich buchen?`,['Ja, bitte buchen','Nein, danke']);
  }
  const choices=findAlternatives(date,time,serviceId);
  if(choices.length){
    thread.pending={kind:'request',date,time:null,serviceId};
    return response(`Um ${time} Uhr klappt es leider nicht (${open.reason.toLowerCase()}). Ich könnte dir am ${displayDate(date,{day:'numeric',month:'long'})} aber ${choices.map(c=>c.time+' Uhr').join(', ')} anbieten. Was passt dir?`,choices.map(c=>`${c.time} Uhr passt`));
  }
  thread.pending={kind:'request',date:null,time,serviceId};
  return response(`Am ${displayDate(date,{day:'numeric',month:'long'})} habe ich leider keinen passenden Termin mehr gefunden (${open.reason.toLowerCase()}). Hast du einen anderen Tag im Sinn?`,['Morgen','Am Freitag']);
}
function sendCustomerMessage(value) {
  const message=String(value).trim().slice(0,400);if(!message)return;
  const thread=threadActive();if(!thread)return;
  thread.messages.push({role:'customer',text:message,time:timeStamp()});
  let reply;
  try{reply=botThink(thread,message);}catch(e){console.error('Antwortfehler:',e);reply=response('Da ist bei der Prüfung etwas schiefgelaufen. Kannst du den Wunschtermin bitte nochmal schreiben?');}
  thread.messages.push({role:'bot',text:reply.text,time:timeStamp()});
  thread.suggestions=reply.suggestions;
  persist();render();
}
function modal(content) {$('#modal-root').innerHTML=`<div class="modal-overlay" data-overlay="true"><div class="modal-box" role="dialog" aria-modal="true" aria-label="Dialog">${content}</div></div>`;}
function closeModal() {$('#modal-root').innerHTML='';selectedBookingId=null;}
function modalHeading(title,subtitle) {return `<div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button type="button" class="icon-btn" data-action="close-modal" aria-label="Schließen">${icon('x')}</button></div>`;}
function bookingModal(date=state.selectedDate,time='10:00') {
  modal(`${modalHeading('Neuer Termin','Trage eine Buchung manuell in deinen Kalender ein.')}
    <form id="bookingForm" class="modal-body"><div id="modal-error"></div>
    <div class="form-field"><label class="form-label" for="book-client">Name des Kunden</label><input class="form-input" id="book-client" name="client" maxlength="80" placeholder="z. B. Anna Müller" required autofocus></div>
    <div class="form-grid"><div class="form-field"><label class="form-label" for="book-date">Datum</label><input class="form-input" id="book-date" type="date" name="date" min="${todayISO()}" value="${escapeHTML(date)}" required></div>
    <div class="form-field"><label class="form-label" for="book-time">Uhrzeit</label><input class="form-input" id="book-time" type="time" step="900" name="time" value="${escapeHTML(time)}" required></div></div>
    <div class="form-field"><label class="form-label" for="book-service">Leistung</label><select class="form-input" id="book-service" name="serviceId">${state.services.map(s=>`<option value="${s.id}">${escapeHTML(s.name)} · ${s.duration} Min.</option>`).join('')}</select></div>
    <div class="form-field"><label class="form-label" for="book-staff">Mitarbeiterin</label><select class="form-input" id="book-staff" name="staffId"><option value="">Automatisch frei zuweisen</option>${STAFF.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Abbrechen</button><button type="submit" class="btn btn-dark">${icon('plus')} Termin speichern</button></div></form>`);
}
function serviceModal(id) {
  const s=serviceOf(id);
  modal(`${modalHeading('Leistung bearbeiten','Preis und Zeitaufwand für deinen Salon.')}<form id="serviceForm" class="modal-body"><input type="hidden" name="id" value="${escapeHTML(s.id)}"><div id="modal-error"></div><div class="form-field"><label class="form-label" for="edit-name">Name</label><input class="form-input" id="edit-name" name="name" maxlength="50" value="${escapeHTML(s.name)}" required></div><div class="form-grid"><div class="form-field"><label class="form-label" for="edit-duration">Dauer in Minuten</label><select class="form-input" id="edit-duration" name="duration">${[15,30,45,60,75,90,105,120,150,180].map(x=>`<option value="${x}" ${s.duration===x?'selected':''}>${x} Min.</option>`).join('')}</select></div><div class="form-field"><label class="form-label" for="edit-price">Preis in €</label><input class="form-input" id="edit-price" name="price" type="number" min="0" max="2000" step="1" value="${s.price}" required></div></div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Abbrechen</button><button type="submit" class="btn btn-dark">Änderungen speichern</button></div></form>`);
}
function studioModal() {
  modal(`${modalHeading('Studio bearbeiten','So heißt dein Salon innerhalb von takt.')}<form id="studioForm" class="modal-body"><div class="form-field"><label class="form-label" for="studio-name">Salonname</label><input class="form-input" id="studio-name" name="salonName" value="${escapeHTML(state.salonName)}" maxlength="45" required autofocus></div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Abbrechen</button><button class="btn btn-dark" type="submit">Speichern</button></div></form>`);
}
function detailsModal(id) {
  selectedBookingId=id;
  const a=getAppointments().find(x=>x.id===id);if(!a)return;
  const s=serviceOf(a.serviceId),staff=staffOf(a.staffId);
  modal(`${modalHeading('Termindetails','Alle Informationen zu dieser Buchung.')}
    <div class="modal-body"><div class="details-heading">${escapeHTML(a.client)}</div><div class="details-date">${icon('calendar-days')} ${escapeHTML(formatLong(a.date))}<div><strong>${a.time} – ${endTime(a.time,a.duration||s.duration)} Uhr</strong></div></div>
    <div class="details-row"><span>Leistung</span><strong>${escapeHTML(s.name)}</strong></div><div class="details-row"><span>Mitarbeiterin</span><strong>${staff.name}</strong></div><div class="details-row"><span>Herkunft</span><strong>${a.origin==='whatsapp'?'WhatsApp Live':a.origin==='chat'?'Testchat':a.origin==='demo'?'Beispieldaten':'Manuell'}</strong></div>
    <div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">Schließen</button>${booked(a) && a.origin!=='whatsapp'?`<button class="btn danger" type="button" data-action="cancel-booking">${icon('trash')} Termin absagen</button>`:''}</div></div>`);
}
function showError(message){const el=$('#modal-error');if(el)el.innerHTML=`<p class="modal-error">${escapeHTML(message)}</p>`;}

document.addEventListener('click', e=>{
  if(e.target.matches('[data-overlay]')){closeModal();return;}
  const nav=e.target.closest('[data-nav]');if(nav){change({view:nav.dataset.nav});if(nav.dataset.nav==='live' && liveKey)refreshLive();window.scrollTo({top:0,behavior:'smooth'});return;}
  const week=e.target.closest('[data-week]');if(week){change({weekStart:addDays(state.weekStart,Number(week.dataset.week)),selectedDate:addDays(state.selectedDate,Number(week.dataset.week))});return;}
  const date=e.target.closest('[data-date]');if(date){change({selectedDate:date.dataset.date});return;}
  const th=e.target.closest('[data-thread]');if(th){change({activeThreadId:th.dataset.thread});return;}
  const suggestion=e.target.closest('[data-suggestion]');if(suggestion){sendCustomerMessage(suggestion.dataset.suggestion);return;}
  const service=e.target.closest('[data-edit-service]');if(service){serviceModal(service.dataset.editService);return;}
  const app=e.target.closest('[data-appointment]');if(app){detailsModal(app.dataset.appointment);return;}
  const cal=e.target.closest('[data-cal-date]');if(cal){if(liveData){toast('Manuelle Live-Buchungen sind noch nicht verfügbar.');return;}const box=cal.getBoundingClientRect();const diff=Math.max(0,e.clientY-box.top);const start=Math.round((540+diff)/15)*15;bookingModal(cal.dataset.calDate,clock(Math.min(17*60,Math.max(9*60,start))));return;}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  switch(action){
    case 'refresh-live':refreshLive();break;
    case 'disconnect-live':liveData=null;liveKey='';render();toast('Live-Ansicht abgemeldet');break;
    case 'new-booking':if(liveData)toast('Live-Buchungen kommen über WhatsApp. Für manuelle Live-Termine folgt eine eigene Funktion.');else bookingModal();break;
    case 'close-modal':closeModal();break;
    case 'today':change({selectedDate:todayISO(),weekStart:mondayOf(todayISO())});break;
    case 'new-thread':{const id=randomId();const thread=makeThread(state.threads.length+1,`Testkunde ${state.threads.length+1}`);thread.id=id;state.threads.unshift(thread);change({activeThreadId:id,view:'inbox'});toast('Neuer Testchat gestartet');break;}
    case 'reset':if(confirm('Alle Demo-Termine und Nachrichten zurücksetzen?')){try{localStorage.removeItem(STORE_KEY);}catch(e){}state=freshState();render();toast('Demo wurde zurückgesetzt');}break;
    case 'edit-salon':studioModal();break;
    case 'cancel-booking':{
      const a=state.appointments.find(x=>x.id===selectedBookingId);
      if(a){a.status='cancelled';persist();closeModal();render();toast('Termin wurde abgesagt');}
      break;
    }
  }
});
document.addEventListener('submit',e=>{
  if(!['chatForm','bookingForm','serviceForm','studioForm','liveConnectForm'].includes(e.target.id))return;
  e.preventDefault();
  const form=e.target, data=Object.fromEntries(new FormData(form).entries());
  if(form.id==='liveConnectForm'){liveKey=data.key.trim();form.reset();refreshLive();return;}
  if(form.id==='chatForm'){form.reset();sendCustomerMessage(data.message);return;}
  if(form.id==='bookingForm'){
    if(liveData)return showError('Live-Buchungen können noch nicht manuell angelegt werden.');
    if(!data.client?.trim())return showError('Bitte den Kundennamen eintragen.');
    const a=availability(data.date,data.time,data.serviceId,data.staffId||null);
    if(!a.ok)return showError(`Dieser Termin kann nicht gebucht werden: ${a.reason}.`);
    createBooking({client:data.client.trim(),date:data.date,time:data.time,serviceId:data.serviceId,staffId:a.staff.id,origin:'manual'});
    state.selectedDate=data.date;state.weekStart=mondayOf(data.date);closeModal();render();toast('Termin erfolgreich eingetragen');return;
  }
  if(form.id==='serviceForm'){
    const s=state.services.find(x=>x.id===data.id);if(!s)return;
    if(!data.name?.trim())return showError('Bitte eine Bezeichnung angeben.');
    s.name=data.name.trim().slice(0,50);s.duration=Number(data.duration);s.price=Number(data.price);
    persist();closeModal();render();toast('Leistung gespeichert');return;
  }
  if(form.id==='studioForm'){
    const name=data.salonName?.trim();if(!name)return;
    state.salonName=name.slice(0,45);persist();closeModal();render();toast('Studio aktualisiert');
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && $('#modal-root').children.length)closeModal();});
setInterval(()=>{if(liveKey && document.visibilityState==='visible')refreshLive();},30000);
render();
