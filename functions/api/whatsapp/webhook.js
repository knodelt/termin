import { parseMessage, canBook, alternatives, DEFAULT_SERVICES, STAFF, todayISO, minutes, displayDate, TIMEZONE } from '../../../src/core.js';

const plain = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
function clockNow() {
  return new Intl.DateTimeFormat('de-DE', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
}
function sameString(a, b) {
  const first = new TextEncoder().encode(String(a || ''));
  const second = new TextEncoder().encode(String(b || ''));
  let diff = first.length ^ second.length;
  for (let i = 0; i < Math.max(first.length, second.length); i++) diff |= (first[i] || 0) ^ (second[i] || 0);
  return diff === 0;
}
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && env.WA_VERIFY_TOKEN && sameString(token, env.WA_VERIFY_TOKEN) && /^\d+$/.test(challenge || '')) return plain(challenge);
  return plain('Not authorized', 403);
}
export async function verifySignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/i.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const value = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const received = signature.slice(7).toLowerCase();
  let difference = 0;
  for (let i = 0; i < value.length; i++) difference |= value[i] ^ parseInt(received.slice(i * 2, i * 2 + 2), 16);
  return difference === 0;
}
const svc = id => DEFAULT_SERVICES.find(s => s.id === id);
const dateLabel = date => displayDate(date, { weekday:'long', day:'numeric', month:'long' });
async function loadBookings(db, date) {
  const { results } = await db.prepare('SELECT id, date, time, service_id AS serviceId, staff_id AS staffId, duration, status FROM appointments WHERE date = ? AND status = ?').bind(date, 'confirmed').all();
  return results;
}
async function getCustomer(db, waId, name) {
  await db.prepare('INSERT OR IGNORE INTO customers(wa_id,name,pending) VALUES (?,?,?)').bind(waId, name, '{}').run();
  const customer = await db.prepare('SELECT pending,name FROM customers WHERE wa_id=?').bind(waId).first();
  if (name && name !== customer.name) await db.prepare('UPDATE customers SET name=? WHERE wa_id=?').bind(name, waId).run();
  let pending = {};
  try { pending = JSON.parse(customer.pending || '{}') || {}; } catch {}
  return pending;
}
async function answer(env, { waId, name, text, messageId }) {
  const db = env.DB;
  const currentDate = todayISO();
  const nowTime = clockNow();
  let pending = await getCustomer(db, waId, name);
  const parsed = parseMessage(text, currentDate);
  const save = async (reply, nextPending = {}) => {
    await db.batch([
      db.prepare('UPDATE customers SET pending=?, updated_at=CURRENT_TIMESTAMP WHERE wa_id=?').bind(JSON.stringify(nextPending), waId),
      db.prepare('INSERT OR IGNORE INTO messages (id,wa_id,direction,body) VALUES (?,?,?,?)').bind(messageId, waId, 'in', text),
      db.prepare('INSERT OR REPLACE INTO messages (id,wa_id,direction,body) VALUES (?,?,?,?)').bind(`${messageId}:out`, waId, 'out', reply),
      db.prepare('UPDATE webhook_events SET reply=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=?').bind(reply, 'ready', messageId)
    ]);
    return reply;
  };
  if (pending.kind === 'cancel' && parsed.decline) return save('Alles klar, dein Termin bleibt bestehen. 🙂');
  if (pending.kind === 'cancel' && parsed.confirm) {
    const result = await db.prepare('UPDATE appointments SET status=? WHERE id=? AND wa_id=? AND status=?').bind('cancelled', pending.appointmentId, waId, 'confirmed').run();
    return save(result.meta.changes ? 'Dein Termin wurde abgesagt. Wir freuen uns, dich bald wiederzusehen! 🙂' : 'Der Termin ist bereits abgesagt oder nicht mehr vorhanden.');
  }
  if (parsed.cancel) {
    const existing = await db.prepare('SELECT id, date, time FROM appointments WHERE wa_id=? AND date>=? AND status=? ORDER BY date,time LIMIT 1').bind(waId,currentDate,'confirmed').first();
    if (!existing) return save('Ich finde noch keinen aktiven Termin unter dieser WhatsApp-Nummer. Bitte melde dich direkt im Salon.');
    return save(`Möchtest du deinen Termin am ${dateLabel(existing.date)} um ${existing.time} Uhr wirklich absagen? Antworte mit Ja oder Nein.`, { kind:'cancel', appointmentId:existing.id });
  }
  if (parsed.reschedule) return save('Zum Verschieben sage deinen bisherigen Termin bitte erst ab und vereinbare anschließend einen neuen. Bei Fragen hilft dir unser Team.');
  if (parsed.decline && pending.kind) return save('Alles klar! Schreib mir, wenn du einen anderen Termin möchtest. 🙂');
  if (pending.kind === 'offer' && parsed.confirm && !parsed.date && !parsed.time && !parsed.serviceId) {
    const { date, time, serviceId } = pending;
    const booked = await loadBookings(db, date);
    const check = canBook({ bookings:booked, date,time,serviceId,nowDate:currentDate,nowTime });
    if (check.ok) {
      const service = svc(serviceId);
      const appointmentId = `wa:${messageId}`;
      const alreadyBooked = await db.prepare('SELECT id FROM appointments WHERE id=? AND wa_id=? AND status=?').bind(appointmentId,waId,'confirmed').first();
      if (alreadyBooked) return save(`✅ Bestätigt! Dein Termin für ${service.name} ist am ${dateLabel(date)} um ${time} Uhr. Wir freuen uns auf dich!`);
      try {
        await db.prepare('INSERT OR IGNORE INTO appointments(id,wa_id,client,date,time,start_min,end_min,service_id,staff_id,duration) VALUES(?,?,?,?,?,?,?,?,?,?)')
          .bind(appointmentId,waId,name,date,time,minutes(time),minutes(time)+service.duration,serviceId,check.staff.id,service.duration).run();
        return save(`✅ Bestätigt! Dein Termin für ${service.name} ist am ${dateLabel(date)} um ${time} Uhr. Wir freuen uns auf dich!`);
      } catch(error) {
        if (!String(error).includes('appointment_conflict')) throw error;
      }
    }
    const fresh = await loadBookings(db,date);
    const options = alternatives({bookings:fresh,date,time,serviceId,nowDate:currentDate,nowTime});
    if (options.length) return save(`Gerade wurde ${time} Uhr vergeben. Frei wäre noch: ${options.map(x=>x.time+' Uhr').join(', ')}. Welche Uhrzeit passt dir?`, {kind:'request',date,time:null,serviceId});
    return save('Dieser Termin ist inzwischen nicht mehr verfügbar. Für welchen anderen Tag soll ich schauen?', {kind:'request',date:null,time:null,serviceId});
  }
  const date = parsed.date || pending.date || null;
  const time = parsed.time || pending.time || null;
  const serviceId = parsed.serviceId || pending.serviceId || null;
  if (!date) return save('Gerne! Für welchen Tag möchtest du einen Termin? 📅', {kind:'request',date:null,time,serviceId});
  if (!serviceId) return save(`Für ${dateLabel(date)}: Möchtest du einen Damenhaarschnitt, Herrenhaarschnitt, eine Coloration oder Styling?`, {kind:'request',date,time,serviceId:null});
  if (!time) return save(`Um wie viel Uhr möchtest du am ${dateLabel(date)} für ${svc(serviceId).name} vorbeikommen?`, {kind:'request',date,time:null,serviceId});
  const bookings = await loadBookings(db,date);
  const check = canBook({ bookings,date,time,serviceId,nowDate:currentDate,nowTime });
  if (check.ok) return save(`Am ${dateLabel(date)} um ${time} Uhr ist ${svc(serviceId).name} (${svc(serviceId).duration} Minuten) möglich. Soll ich den Termin verbindlich buchen? Antworte mit Ja oder Nein.`, {kind:'offer',date,time,serviceId});
  const options = alternatives({bookings,date,time,serviceId,nowDate:currentDate,nowTime});
  if (options.length) return save(`Um ${time} Uhr geht es leider nicht (${check.reason}). Ich hätte ${options.map(x=>x.time+' Uhr').join(', ')} frei. Welche Uhrzeit passt dir?`, {kind:'request',date,time:null,serviceId});
  return save(`Für ${dateLabel(date)} finde ich leider keinen passenden freien Termin (${check.reason}). Hast du einen anderen Tag im Sinn?`, {kind:'request',date:null,time:null,serviceId});
}
async function sendWhatsApp(env, waId, text) {
  if (!env.WA_ACCESS_TOKEN || !env.WA_PHONE_NUMBER_ID) throw Error('WhatsApp credentials missing');
  const version = /^v\d+\.0$/.test(env.WA_GRAPH_VERSION || '') ? env.WA_GRAPH_VERSION : 'v25.0';
  const result = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(env.WA_PHONE_NUMBER_ID)}/messages`, {
    method:'POST', headers:{'Authorization':`Bearer ${env.WA_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({ messaging_product:'whatsapp',to:waId,type:'text',text:{preview_url:false,body:text} })
  });
  if (!result.ok) throw Error(`WhatsApp send failed: HTTP ${result.status}`);
}
async function handleInbound(env, msg, name) {
  if (!msg?.id || !/^\d{6,20}$/.test(msg.from || '')) return;
  const messageId = msg.id;
  const waId = msg.from;
  const text = msg.type === 'text' ? String(msg.text?.body || '').trim().slice(0,1000) : '';
  const inserted = await env.DB.prepare('INSERT OR IGNORE INTO webhook_events(message_id,wa_id) VALUES(?,?)').bind(messageId, waId).run();
  let event = await env.DB.prepare('SELECT status,reply,updated_at FROM webhook_events WHERE message_id=?').bind(messageId).first();
  if (event.status === 'sent') return;
  if (event.status === 'processing' && !inserted.meta.changes) {
    const updatedAt = Date.parse((event.updated_at || '').replace(' ','T')+'Z');
    if (Date.now() - updatedAt < 60_000) throw Error('Another webhook is processing this message');
  }
  let reply = event.reply;
  if (!reply) {
    if (text) reply = await answer(env,{waId,name,text,messageId});
    else {
      reply = 'Bitte schicke mir deinen Terminwunsch als Textnachricht. 🙂';
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO messages(id,wa_id,direction,body) VALUES(?,?,?,?)').bind(messageId,waId,'in','[Nicht-Textnachricht]'),
        env.DB.prepare('INSERT OR IGNORE INTO messages(id,wa_id,direction,body) VALUES(?,?,?,?)').bind(`${messageId}:out`,waId,'out',reply),
        env.DB.prepare('UPDATE webhook_events SET reply=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=?').bind(reply,'ready',messageId)
      ]);
    }
  }
  await env.DB.prepare('UPDATE webhook_events SET reply=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=?').bind(reply,'ready',messageId).run();
  try {
    await sendWhatsApp(env,waId,reply);
    await env.DB.prepare('UPDATE webhook_events SET status=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=?').bind('sent',messageId).run();
  } catch (error) {
    await env.DB.prepare('UPDATE webhook_events SET status=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=?').bind('failed',messageId).run();
    throw error;
  }
}
export async function onRequestPost({ request, env }) {
  if (!env.META_APP_SECRET || !env.WA_VERIFY_TOKEN || !env.WA_PHONE_NUMBER_ID || !env.WA_ACCESS_TOKEN || !env.DB) return plain('Not configured',503);
  const raw = await request.text();
  if (raw.length > 150000) return plain('Too large',413);
  const valid = await verifySignature(raw, request.headers.get('x-hub-signature-256'), env.META_APP_SECRET);
  if (!valid) return plain('Invalid signature',401);
  let payload;
  try { payload=JSON.parse(raw); } catch { return plain('Malformed JSON',400); }
  if (payload?.object !== 'whatsapp_business_account') return plain('Ignored');
  try {
    for (const entry of payload.entry || []) for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      if (String(value.metadata?.phone_number_id || '') !== String(env.WA_PHONE_NUMBER_ID)) continue;
      for (const msg of value.messages || []) {
        const name = String(value.contacts?.find(x => x.wa_id === msg.from)?.profile?.name || 'WhatsApp-Kunde').slice(0,80);
        await handleInbound(env,msg,name);
      }
    }
    return plain('EVENT_RECEIVED');
  } catch (error) {
    console.error('WhatsApp webhook processing error:',error.message);
    return plain('Temporary error',500);
  }
}
