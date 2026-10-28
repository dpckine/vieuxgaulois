const { db, webpush, ErrorHttp, miembro, ruta } = require('../_comun');

/*
 * Envía los avisos que dejó una acción (db.notificar de la lógica del club): [{ para: [ids], titulo, cuerpo, tab }].
 * Lo llama la app después de guardar. Sólo usuarios del club, y con límites para evitar abusos.
 */
module.exports = ruta('POST', async (req, { notificar }) => {
  await miembro(req);
  if (!Array.isArray(notificar) || notificar.length > 20) throw new ErrorHttp('Avisos no válidos', 400);
  let enviados = 0;
  for (const n of notificar) {
    const para = Array.from(new Set((Array.isArray(n.para) ? n.para : []).map(String))).slice(0, 500);
    const datos = JSON.stringify({ titulo: String(n.titulo || '').slice(0, 80), cuerpo: String(n.cuerpo || '').slice(0, 180), tab: String(n.tab || '').slice(0, 30) });
    // Firestore admite hasta 30 valores en una consulta "in".
    for (let i = 0; i < para.length; i += 30) {
      const subs = await db().collection('suscripciones').where('id', 'in', para.slice(i, i + 30)).get();
      await Promise.all(subs.docs.map((d) => webpush.sendNotification(d.data().sub, datos, { TTL: 86400 })
        .then(() => { enviados++; })
        // 404/410: el navegador ya no tiene esa suscripción.
        .catch((e) => (e.statusCode === 404 || e.statusCode === 410 ? d.ref.delete() : console.error('push', e.statusCode, e.body)))));
    }
  }
  return { ok: true, enviados };
});
