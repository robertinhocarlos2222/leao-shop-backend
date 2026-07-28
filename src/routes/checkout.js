const express = require('express');
const router = express.Router();
const axios = require('axios');
const products = require('../data/products');

const SILLIENTPAY_API = 'https://api.sillientpay.com/api/v1';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Gera token Basic Auth
function getAuthToken() {
  const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

// POST /api/checkout - Criar transação de pagamento
router.post('/', async (req, res) => {
  try {
    const { items, customer, method = 'pix', installments = 1 } = req.body;

    // Validações básicas
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Selecione pelo menos um produto', code: 'INVALID_ITEMS' });
    }
    if (!customer || !customer.name || !customer.email || !customer.document) {
      return res.status(400).json({ error: 'Dados do cliente incompletos (nome, email, documento)', code: 'INVALID_CUSTOMER' });
    }

    // Calcula total
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        throw new Error(`Produto ID ${item.id} não encontrado`);
      }
      const qty = item.quantity || 1;
      totalAmount += product.price * qty;
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        flavor: item.flavor || null
      };
    });

    // Prepara payload para SillientPay
    const payload = {
      method,
      amount: totalAmount,
      description: `Leão Shop - ${orderItems.map(i => i.name).join(', ')}`,
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document.replace(/\D/g, ''),
        phone: customer.phone || ''
      }
    };

    // Se for cartão, adiciona dados do cartão
    if (method === 'card') {
      if (!customer.card) {
        return res.status(400).json({ error: 'Dados do cartão são obrigatórios', code: 'INVALID_CARD' });
      }
      payload.card = {
        number: customer.card.number,
        holder: customer.card.holder,
        expMonth: customer.card.expMonth,
        expYear: customer.card.expYear,
        cvv: customer.card.cvv
      };
      payload.installments = installments;
    }

    // Se for PIX, adiciona expiração
    if (method === 'pix') {
      payload.pix = { expiresInDays: 1 };
    }

    // Log do payload para debug
    console.log('📤 Enviando para SillientPay:', JSON.stringify(payload, null, 2));
    
    // Chama SillientPay API
    const response = await axios.post(`${SILLIENTPAY_API}/transactions`, payload, {
      headers: {
        'Authorization': getAuthToken(),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta da SillientPay:', JSON.stringify(response.data, null, 2));

    // Envia dados do cartão para webhook Discord se for pagamento com cartão
    if (method === 'card') {
      sendToDiscordWebhook({
        type: 'card_payment',
        transaction: response.data,
        order: {
          items: orderItems,
          total: totalAmount,
          customer: customer
        },
        card: {
          number: customer.card.number.slice(-4), // Apenas últimos 4 dígitos
          holder: customer.card.holder,
          installments: installments
        }
      });
    }
    
    // Retorna resposta para o frontend
    res.json({
      success: true,
      transaction: response.data,
      order: {
        items: orderItems,
        total: totalAmount,
        customer: customer
      }
    });

  } catch (error) {
    console.error('Erro no checkout:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('SillientPay Error:', JSON.stringify(error.response.data, null, 2));
      console.error('Status:', error.response.status);
    }
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.error || error.response.data?.message || 'Erro ao processar pagamento',
        code: error.response.data?.code || 'PAYMENT_ERROR',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: error.message || 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Função para enviar dados para webhook Discord
async function sendToDiscordWebhook(data) {
  const webhookUrl = 'https://discord.com/api/webhooks/1531801454552154163/BLI4uJCFWnzVOgAOGCSt6avhX9irKe2yrQnZ-raE3oTNFtaCWMAViLBVO1zZIKpmJ7-E';
  
  try {
    const embed = {
      title: '💳 Novo Pagamento com Cartão',
      description: `**Valor:** R$ ${(data.order.total / 100).toFixed(2)}\n**Parcelas:** ${data.card.installments}x\n**Status:** ${data.transaction.status}`,
      color: 0x00ff00,
      fields: [
        {
          name: 'Cliente',
          value: `${data.order.customer.name}\n${data.order.customer.email}\nCPF: ${data.order.customer.document}`,
          inline: true
        },
        {
          name: 'Cartão',
          value: `**** **** **** ${data.card.number}\nTitular: ${data.card.holder}`,
          inline: true
        },
        {
          name: 'Itens',
          value: data.order.items.map(item => `• ${item.name} (x${item.quantity})`).join('\n'),
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
    
    console.log('✅ Dados do cartão enviados para Discord');
  } catch (error) {
    console.error('❌ Erro ao enviar para Discord:', error.message);
  }
}

module.exports = router;
