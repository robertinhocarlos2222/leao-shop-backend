require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productsRoutes = require('./routes/products');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Webhook precisa do body raw (sem JSON parsing) para verificar assinatura
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Rotas
app.use('/api/products', productsRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Leão Shop API', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`🦁 Leão Shop API rodando na porta ${PORT}`);
});