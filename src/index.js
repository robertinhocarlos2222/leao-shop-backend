require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

// Endpoint de teste para debug
app.post('/api/test-checkout', async (req, res) => {
  try {
    const { items, customer, method = 'pix' } = req.body;
    
    const SILLIENTPAY_API = 'https://api.sillientpay.com/api/v1';
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    
    const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const payload = {
      method,
      amount: 1000,
      description: 'Teste Leão Shop',
      customer: {
        name: customer?.name || 'Teste',
        email: customer?.email || 'teste@email.com',
        document: customer?.document || '12345678900',
        phone: customer?.phone || '11999999999'
      },
      pix: { expiresInDays: 1 }
    };
    
    console.log('🧪 Teste checkout - Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(`${SILLIENTPAY_API}/transactions`, payload, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Teste checkout - Resposta:', JSON.stringify(response.data, null, 2));
    
    res.json({ success: true, data: response.data });
    
  } catch (error) {
    console.error('❌ Teste checkout - Erro:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

app.listen(PORT, () => {
  console.log(`🦁 Leão Shop API rodando na porta ${PORT}`);
});