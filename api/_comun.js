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

class ErrorHttp extends Error { constructor(msg, status) { super(msg); this.status = status; } }

// Se configura en la primera llamada, para responder qué variable falta en vez de caerse al cargar.
let fs = null;
function configurar() {
  if (fs) return;
  const faltan = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT'].filter((k) => !process.env[k]);
  if (faltan.length) throw new ErrorHttp('Faltan variables en Vercel: ' + faltan.join(', '), 503);
  let cuenta;
  try { cuenta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); } catch (e) { throw new ErrorHttp('FIREBASE_SERVICE_ACCOUNT no es un JSON válido', 503); }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:vieuxgaulois@example.com', process.env.VAPID_PUBLIC_KEY.trim(), process.env.VAPID_PRIVATE_KEY.trim());
  } catch (e) { throw new ErrorHttp('Claves VAPID no válidas: ' + e.message, 503); }
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(cuenta) });
  fs = admin.firestore();
}
const db = () => { configurar(); return fs; };

// Mismo criterio que las reglas de Firestore: sesión unida a un usuario del club, activo y con la clave vigente.
async function miembro(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) throw new ErrorHttp('Sin sesión', 401);
  let uid;
  configurar();
  try { uid = (await admin.auth().verifyIdToken(token)).uid; } catch (e) { throw new ErrorHttp('Sesión no válida', 401); }
  const c = await db().doc('cuentas/' + uid).get();
  if (!c.exists) throw new ErrorHttp('Sesión no válida', 401);
  const { id, h } = c.data();
  const a = await db().doc('acceso/' + id).get();
  if (!a.exists || a.data().activo !== true || a.data().h !== h) throw new ErrorHttp('Sesión no válida', 401);
  return { id, rol: a.data().rol };
}

const idSuscripcion = (endpoint) => crypto.createHash('sha256').update(String(endpoint)).digest('hex');

// Envuelve un manejador: sólo el método indicado, JSON de entrada y errores como { error }.
function ruta(metodo, fn) {
  return async (req, res) => {
    try {
      if (req.method !== metodo) throw new ErrorHttp('Método no permitido', 405);
      configurar();
      const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      res.status(200).json((await fn(req, cuerpo)) || { ok: true });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Error del servidor' });
      if (!e.status) console.error(e);
    }
  };
}

module.exports = { admin, db, webpush, ErrorHttp, miembro, idSuscripcion, ruta };
