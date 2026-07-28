const axios = require('axios');

const SILLIENTPAY_API = 'https://api.sillientpay.com/api/v1';
const CLIENT_ID = 'sp_live_dc12fcc19d853844452fa38b1e7a173b';
const CLIENT_SECRET = 'sk_2059dd02d8ed502858fd9817774893f4df9422d99c259a447082d770d10ce1fd';

const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

async function testAPI() {
  try {
    console.log('🔍 Testando conexão com SillientPay...\n');
    
    // Teste 1: Verificar saldo
    console.log('1. Testando GET /balance...');
    const balance = await axios.get(`${SILLIENTPAY_API}/balance`, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Saldo:', balance.data);
    
    // Teste 2: Criar transação PIX
    console.log('\n2. Testando POST /transactions (PIX)...');
    const payload = {
      method: 'pix',
      amount: 1000, // R$ 10,00
      description: 'Teste Leão Shop',
      customer: {
        name: 'Teste',
        email: 'teste@email.com',
        document: '12345678900',
        phone: '11999999999'
      },
      pix: { expiresInDays: 1 }
    };
    
    const transaction = await axios.post(`${SILLIENTPAY_API}/transactions`, payload, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Transação criada:', transaction.data);
    console.log('\n✅ TUDO FUNCIONANDO! A SillientPay está respondendo corretamente.');
    
  } catch (error) {
    console.error('\n❌ ERRO:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data || error.message);
    console.error('\nStack:', error.stack);
  }
}

testAPI();