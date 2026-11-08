import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { onRequestGet, onRequestPost } from '../functions/api/whatsapp/webhook.js';
import { onRequestGet as liveGet } from '../functions/api/live.js';

function createDB() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_whatsapp.sql',import.meta.url),'utf8'));
  const obj={
    prepare(sql) {
      return {bind(...args){return{
        async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:result.changes}};},
        async first(){return sqlite.prepare(sql).get(...args) ?? null;},
        async all(){return {results:sqlite.prepare(sql).all(...args)};}
      };}, async all(){return {results:sqlite.prepare(sql).all()}}};
    },
    async batch(statements){sqlite.exec('BEGIN TRANSACTION');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},
    sqlite
  };return obj;
}
function post(env,id,from,body,invalid=false){
  const data={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'9876'},contacts:[{wa_id:from,profile:{name:'Tester'}}],messages:[{id,from,type:'text',text:{body}}]}}]}]};
  const raw=JSON.stringify(data), mac=createHmac('sha256','app-secret').update(raw).digest('hex');
  const request=new Request('https://beispiel.pages.dev/api/whatsapp/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+ (invalid?'0'.repeat(64):mac)},body:raw});
  return onRequestPost({request,env});
}
test('Webhook verifiziert Challenge, HMAC und lehnt manipulierte Daten ab',async()=>{
  const env={DB:createDB(),WA_VERIFY_TOKEN:'verify-test',WA_PHONE_NUMBER_ID:'9876',WA_ACCESS_TOKEN:'token',META_APP_SECRET:'app-secret'};
  const challenge=await onRequestGet({request:new Request('https://beispiel.pages.dev/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=123456'),env});
  assert.equal(challenge.status,200);assert.equal(await challenge.text(),'123456');
  const bad=await post(env,'mid-bad','491234567890','Hallo',true);
  assert.equal(bad.status,401);
  assert.equal(env.DB.sqlite.prepare('select count(*) as n from webhook_events').get().n,0);
});
test('Terminbuchung per WhatsApp, idempotent, Konflikte und geschütztes Live-Postfach',async()=>{
  const db=createDB(),env={DB:db,WA_VERIFY_TOKEN:'verify-test',WA_PHONE_NUMBER_ID:'9876',WA_ACCESS_TOKEN:'token',META_APP_SECRET:'app-secret',ADMIN_API_KEY:'admin-super-secret'};
  const calls=[]; const before=globalThis.fetch;
  globalThis.fetch=async (url,opt)=>{calls.push(JSON.parse(opt.body));return new Response('{}',{status:200});};
  try {
    const customer='491234567890';
    let r=await post(env,'mid-1',customer,'Hallo ich brauche am 13.11.2026 um 15 Uhr einen Herrenhaarschnitt');assert.equal(r.status,200);
    assert.match(calls.at(-1).text.body,/15:00 Uhr ist/);
    assert.equal(db.sqlite.prepare('select count(*) as n from appointments').get().n,0,'Nicht vor der Bestätigung buchen');
    r=await post(env,'mid-2',customer,'Ja, bitte buchen');assert.equal(r.status,200);
    assert.equal(db.sqlite.prepare('select count(*) as n from appointments').get().n,1);
    const callCount=calls.length;
    r=await post(env,'mid-2',customer,'Ja, bitte buchen');assert.equal(r.status,200);
    assert.equal(calls.length,callCount,'Duplicate webhook should not send twice');
    const second='491234567891';
    await post(env,'mid-3',second,'13.11.2026 um 15 Uhr Herrenhaarschnitt');
    await post(env,'mid-4',second,'Ja');
    assert.equal(db.sqlite.prepare('select count(*) as n from appointments').get().n,2);
    const third='491234567892';
    await post(env,'mid-5',third,'13.11.2026 um 15 Uhr Herrenhaarschnitt');
    assert.match(calls.at(-1).text.body,/geht es leider nicht/);
    const denied=await liveGet({request:new Request('https://beispiel.pages.dev/api/live'),env});assert.equal(denied.status,401);
    const ok=await liveGet({request:new Request('https://beispiel.pages.dev/api/live',{headers:{authorization:'Bearer admin-super-secret'}}),env});
    assert.equal(ok.status,200); const json=await ok.json();assert.equal(json.appointments.length,2);assert.equal(json.threads.length,3);
    await post(env,'mid-6',customer,'Termin absagen');await post(env,'mid-7',customer,'Ja, bitte absagen');
    assert.equal(db.sqlite.prepare("select count(*) as n from appointments where status='cancelled'").get().n,1);
  } finally {globalThis.fetch=before;db.sqlite.close();}
});
