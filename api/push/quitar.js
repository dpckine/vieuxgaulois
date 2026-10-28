const { fs, miembro, idSuscripcion, ruta } = require('../_comun');

// Borra la suscripción de este navegador (sólo si es del usuario que la pide).
module.exports = ruta('POST', async (req, { endpoint }) => {
  const { id } = await miembro(req);
  const ref = fs.doc('suscripciones/' + idSuscripcion(endpoint));
  const s = await ref.get();
  if (s.exists && s.data().id === id) await ref.delete();
});
