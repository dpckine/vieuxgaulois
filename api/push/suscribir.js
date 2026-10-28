const { admin, fs, ErrorHttp, miembro, idSuscripcion, ruta } = require('../_comun');

// Guarda la suscripción de este navegador a nombre del usuario que inició sesión.
module.exports = ruta('POST', async (req, { sub }) => {
  const { id } = await miembro(req);
  if (!sub || !/^https:\/\//.test(sub.endpoint || '') || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw new ErrorHttp('Suscripción no válida', 400);
  await fs.doc('suscripciones/' + idSuscripcion(sub.endpoint)).set({
    id, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    creado: admin.firestore.FieldValue.serverTimestamp(),
  });
});
