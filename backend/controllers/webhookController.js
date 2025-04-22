const { User, WebhookEvent } = require('../models');
const crypto = require('crypto');

/**
 * Processa webhooks do Hotmart e atualiza o status da assinatura do usuário
 */
exports.processHotmartWebhook = async (req, res) => {
  try {
    // Extrai dados do webhook
    const payload = req.body;
    const signature = req.headers['x-hotmart-signature'];
    
    // Log do payload para debug
    console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
    
    // Validar assinatura se necessário
    // const isValid = verifySignature(payload, signature);
    // if (!isValid) {
    //   return res.status(401).json({ message: 'Assinatura inválida' });
    // }
    
    // Extrair dados importantes do payload
    const event = payload.event;
    const hottok = payload.hottok;
    const eventId = payload.id;
    const creationDate = payload.creation_date;
    
    // Identificar o usuário baseado no tipo do evento
    let userEmail = null;
    let transactionCode = null;
    let subscriptionStatus = null;
    
    if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
      userEmail = payload.data.buyer.email;
      transactionCode = payload.data.purchase.transaction;
      subscriptionStatus = 'approved';
    } 
    else if (event === 'PURCHASE_CANCELED' || event === 'PURCHASE_REFUNDED') {
      userEmail = payload.data.buyer.email;
      transactionCode = payload.data.purchase.transaction;
      subscriptionStatus = event === 'PURCHASE_CANCELED' ? 'canceled' : 'refunded';
    }
    else if (event === 'SUBSCRIPTION_CANCELLATION') {
      userEmail = payload.data.subscriber.email;
      transactionCode = payload.data.subscriber.code;
      subscriptionStatus = 'canceled';
    }
    else if (event === 'RECURRING_PAYMENT_FAILED') {
      userEmail = payload.data.subscriber.email;
      transactionCode = payload.data.subscriber.code;
      subscriptionStatus = 'refused';
    }
    
    if (!userEmail || !transactionCode) {
      console.log('❌ Evento não tratado ou dados incompletos:', event);
      return res.status(422).json({ message: 'Dados insuficientes para processar' });
    }
    
    // Verificar se esse evento já foi processado
    const existingEvent = await WebhookEvent.findOne({
      where: { 
        transactionCode: transactionCode, 
        eventType: event 
      }
    });
    
    if (existingEvent) {
      console.log(`🔁 Evento já processado: ${transactionCode} / ${event}`);
      
      // IMPORTANTE: Se for uma aprovação de compra, atualizar o status do usuário 
      // mesmo que o evento já tenha sido processado antes
      if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
        // Buscar usuário e atualizar status
        const user = await User.findOne({ where: { email: userEmail } });
        
        if (user) {
          // Atualizar status para approved E ativar a conta
          user.status = 'approved';
          user.active = true; // Garantir que a conta está ativa
          await user.save();
          console.log(`✅ Status do usuário ${userEmail} atualizado para 'approved' e conta ativada`);
        } else {
          console.log(`⚠️ Usuário não encontrado para email: ${userEmail}`);
        }
      }
      
      // Responder com sucesso para não reprocessar
      return res.status(200).json({ message: 'Evento já processado' });
    }
    
    // Criar registro do evento
    await WebhookEvent.create({
      eventId: eventId,
      eventType: event,
      transactionCode: transactionCode,
      userEmail: userEmail,
      payload: JSON.stringify(payload),
      processedAt: new Date()
    });
    
    // Buscar usuário
    const user = await User.findOne({ where: { email: userEmail } });
    
    if (!user) {
      console.log(`⚠️ Usuário não encontrado para email: ${userEmail}`);
      return res.status(200).json({ message: 'Usuário não encontrado, evento registrado' });
    }
    
    // Atualizar status do usuário
    if (subscriptionStatus) {
      user.status = subscriptionStatus;
      
      // Se o status for 'approved', também ativar a conta
      if (subscriptionStatus === 'approved') {
        user.active = true;
        console.log(`✅ Usuário ${userEmail} ativado e status atualizado para ${subscriptionStatus}`);
      }
      
      await user.save();
      console.log(`✅ Status do usuário ${userEmail} atualizado para ${subscriptionStatus}`);
    }
    
    return res.status(200).json({ message: 'Evento processado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ message: 'Erro interno ao processar webhook' });
  }
};

/**
 * Função para verificar assinatura do webhook Hotmart
 */
function verifySignature(payload, signature) {
  // Implementar verificação de assinatura se necessário
  // Exemplo:
  // const secret = process.env.HOTMART_WEBHOOK_SECRET;
  // const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  
  // Por enquanto, retorna true
  return true;
}
