function timingSafeEquals(left, right) {
  const a = new TextEncoder().encode(left || '');
  const b = new TextEncoder().encode(right || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length,b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}
export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_API_KEY || !env.DB) return Response.json({error:'Live-Backend ist noch nicht eingerichtet.'},{status:503});
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !timingSafeEquals(token,env.ADMIN_API_KEY)) return Response.json({error:'Zugriff verweigert.'},{status:401,headers:{'Cache-Control':'no-store'}});
  try {
    const [appointments, customers, messages] = await Promise.all([
      env.DB.prepare("SELECT id,client,date,time,service_id AS serviceId,staff_id AS staffId,duration,status,created_at AS createdAt FROM appointments WHERE date >= date('now','-30 day') ORDER BY date,time LIMIT 400").all(),
      env.DB.prepare('SELECT wa_id AS waId,name,updated_at AS updatedAt FROM customers ORDER BY updated_at DESC LIMIT 40').all(),
      env.DB.prepare('SELECT id,wa_id AS waId,direction,body,created_at AS createdAt FROM messages ORDER BY created_at DESC LIMIT 120').all()
    ]);
    const threads = customers.results.map(c => ({...c, messages:messages.results.filter(m=>m.waId===c.waId).reverse()}));
    return Response.json({ready:true,waConfigured:Boolean(env.WA_ACCESS_TOKEN && env.WA_PHONE_NUMBER_ID && env.WA_VERIFY_TOKEN && env.META_APP_SECRET),appointments:appointments.results,threads},{headers:{'Cache-Control':'no-store,private','X-Content-Type-Options':'nosniff'}});
  } catch(error) {
    console.error('Live API error',error.message);
    return Response.json({error:'Datenbank nicht eingerichtet oder temporär nicht verfügbar.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
