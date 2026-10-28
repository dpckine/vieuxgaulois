// Clave pública VAPID para que el navegador cree la suscripción.
module.exports = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Faltan las claves VAPID en Vercel' });
  res.status(200).json({ clave: process.env.VAPID_PUBLIC_KEY });
};
