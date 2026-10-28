// Clave pública VAPID para que el navegador cree la suscripción.
module.exports = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Falta la variable VAPID_PUBLIC_KEY en Vercel (entorno Production)' });
  res.status(200).json({ clave: process.env.VAPID_PUBLIC_KEY.trim() });
};
