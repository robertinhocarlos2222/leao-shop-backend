const express = require('express');
const router = express.Router();

// POST /api/webhook - Receber notificações da SillientPay
router.post('/', (req, res) => {
  try {
    // O body vem como Buffer (raw), precisamos parsear
    const payload = JSON.parse(req.body.toString());
    
    console.log('📬 Webhook recebido:', JSON.stringify(payload, null, 2));

    const { event, data } = payload;

    switch (event) {
      case 'transaction.paid':
        console.log(`✅ Pagamento confirmado! Transação: ${data.id}`);
        console.log(`   Produto: ${data.product || 'N/A'}`);
        console.log(`   Valor: ${(data.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
        console.log(`   Cliente: ${data.customer?.name}`);
        // Aqui você pode adicionar lógica para:
        // - Atualizar status do pedido no banco
        // - Enviar email de confirmação
        // - Liberar acesso ao produto
        break;

      case 'transaction.refused':
        console.log(`❌ Pagamento recusado! Transação: ${data.id}`);
        break;

      case 'withdrawal.approved':
        console.log(`💰 Saque aprovado! ID: ${data.id}, Valor: ${(data.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
        break;

      case 'withdrawal.rejected':
        console.log(`❌ Saque rejeitado! ID: ${data.id}`);
        break;

      case 'withdrawal.requested':
        console.log(`📤 Saque solicitado! ID: ${data.id}`);
        break;

      case 'transfer.received':
        console.log(`💸 Transferência recebida! ID: ${data.id}`);
        break;

      default:
        console.log(`📋 Evento desconhecido: ${event}`);
    }

    // Sempre retornar 200 para confirmar recebimento
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error.message);
    // Mesmo com erro, retornar 200 para evitar reenvios desnecessários
    res.status(200).json({ received: true });
  }
});

module.exports = router;