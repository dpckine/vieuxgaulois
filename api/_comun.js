/*
 * Funciones de Vercel para las notificaciones push (web push con claves VAPID).
 * Variables de entorno en Vercel:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  claves VAPID (ver claves-vercel.txt, no se sube a GitHub)
 *   VAPID_SUBJECT                        mailto: de contacto, p. ej. mailto:club@ejemplo.cl
 *   FIREBASE_SERVICE_ACCOUNT             JSON de la cuenta de servicio de Firebase (Configuración > Cuentas de servicio)
 * Las suscripciones se guardan en Firestore, colección suscripciones (sólo accesible desde aquí).
 */
const crypto = require('crypto');
const admin = require('firebase-admin');
const webpush = require('web-push');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
const fs = admin.firestore();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:vieuxgaulois@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

class ErrorHttp extends Error { constructor(msg, status) { super(msg); this.status = status; } }

// Mismo criterio que las reglas de Firestore: sesión unida a un usuario del club, activo y con la clave vigente.
async function miembro(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) throw new ErrorHttp('Sin sesión', 401);
  let uid;
  try { uid = (await admin.auth().verifyIdToken(token)).uid; } catch (e) { throw new ErrorHttp('Sesión no válida', 401); }
  const c = await fs.doc('cuentas/' + uid).get();
  if (!c.exists) throw new ErrorHttp('Sesión no válida', 401);
  const { id, h } = c.data();
  const a = await fs.doc('acceso/' + id).get();
  if (!a.exists || a.data().activo !== true || a.data().h !== h) throw new ErrorHttp('Sesión no válida', 401);
  return { id, rol: a.data().rol };
}

const idSuscripcion = (endpoint) => crypto.createHash('sha256').update(String(endpoint)).digest('hex');

// Envuelve un manejador: sólo el método indicado, JSON de entrada y errores como { error }.
function ruta(metodo, fn) {
  return async (req, res) => {
    try {
      if (req.method !== metodo) throw new ErrorHttp('Método no permitido', 405);
      const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      res.status(200).json((await fn(req, cuerpo)) || { ok: true });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Error del servidor' });
      if (!e.status) console.error(e);
    }
  };
}

module.exports = { admin, fs, webpush, ErrorHttp, miembro, idSuscripcion, ruta };
