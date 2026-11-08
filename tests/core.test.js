import test from 'node:test';
import assert from 'node:assert/strict';
import {
 parseMessage, canBook, alternatives, makeDemoData, DEFAULT_SERVICES, STAFF, minutes,
 addDays, mondayOf, dayOfWeek, nextWeekday
} from '../src/core.js';
const BASE='2026-11-08';
const check=(data)=>canBook({bookings:[],date:'2026-11-13',time:'15:00',serviceId:'damen',nowDate:BASE,...data});
test('Datum 13.11 ist kein Uhrzeit-Match; 15 Uhr wird gelesen',()=>{
 const parsed=parseMessage('Hallo, ich möchte am 13.11. um 15 Uhr Haare schneiden lassen',BASE);
 assert.equal(parsed.date,'2026-11-13');assert.equal(parsed.time,'15:00');assert.equal(parsed.serviceId,'damen');
});
test('deutsche Datums-/Zeitformen und Wochentage',()=>{
 assert.deepEqual([parseMessage('morgen um 10:30',BASE).date,parseMessage('Freitag, 16 Uhr',BASE).date,parseMessage('übermorgen',BASE).date],['2026-11-09','2026-11-13','2026-11-10']);
 assert.equal(parseMessage('Am 30.02. bitte',BASE).date,null);
 assert.equal(parseMessage('Am 10.11.2026 um 14.30 Uhr',BASE).time,'14:30');
 assert.equal(parseMessage('am 13.11. ohne Uhrzeit',BASE).time,null);
});
test('bestätigen, absagen und Leistungen erkennen',()=>{
 assert.equal(parseMessage('Ja, bitte buchen',BASE).confirm,true);
 assert.equal(parseMessage('Ja, bitte absagen',BASE).cancel,true);
 assert.equal(parseMessage('Eine Coloration',BASE).serviceId,'farbe');
 assert.equal(parseMessage('Herrenhaarschnitt',BASE).serviceId,'herren');
});
test('Kapazität: zwei belegte Mitarbeiter blockieren denselben Zeitraum',()=>{
 const bookings=makeDemoData(BASE);
 const status=check({bookings});
 assert.equal(status.ok,false);assert.equal(status.reason,'Bereits ausgebucht');
});
test('sucht echte Alternativen und lässt nicht überlappen',()=>{
 const bookings=makeDemoData(BASE);
 const a=alternatives({bookings,date:'2026-11-13',time:'15:00',serviceId:'damen',nowDate:BASE});
 assert.equal(a.length,3);
 for(const slot of a)assert.equal(check({bookings,time:slot.time}).ok,true);
});
test('Behandlungsdauer, Mittagspause, geschlossener Sonntag',()=>{
 assert.equal(check({time:'12:00',serviceId:'damen'}).ok,false);
 assert.equal(check({time:'17:30',serviceId:'farbe'}).ok,false);
 assert.equal(check({date:'2026-11-15'}).reason,'Sonntags geschlossen');
 assert.equal(check({time:'14:30'}).ok,true);
});
test('Vergangenheit innerhalb des laufenden Tages ausschließen',()=>{
 assert.equal(check({nowDate:'2026-11-13',nowTime:'16:30',time:'15:00'}).ok,false);
 assert.equal(check({nowDate:'2026-11-13',nowTime:'14:00',time:'15:00'}).ok,true);
});
test('Wochen-Datumslogik auch sonntags korrekt',()=>{
 assert.equal(mondayOf('2026-11-08'),'2026-11-02');
 assert.equal(nextWeekday('2026-11-08',5),'2026-11-13');
 assert.equal(dayOfWeek(addDays('2026-11-08',1)),1);
});