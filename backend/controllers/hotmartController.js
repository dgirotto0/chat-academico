// controllers/hotmartController.js
const crypto = require('crypto');
const { User, HotmartEventLog } = require('../models');
const { sendLoginEmail } = require('../services/emailService');

/**
 * Valida o token estático enviado no header X-HOTMART-HOTTOK
 */
function validateHottok(req) {
  const hottokHeader = req.headers['x-hotmart-hottok'];
  const hottokParam = req.params.token;
  const secret = process.env.HOTMART_WEBHOOK_SECRET;
  const callbackToken = process.env.CALLBACK_TOKEN;



  // Se CALLBACK_TOKEN estiver definido, ambos devem bater
  if (callbackToken) {
    return (hottokHeader && hottokHeader === secret) && (hottokParam && hottokParam === callbackToken);
  }
  // Se não, só valida o header
  return hottokHeader && hottokHeader === secret;
}

/**
 * Handler para webhooks da Hotmart via MemberKit
 */
exports.handleWebhook = async (req, res) => {
  try {
    // 1) Autenticação pelo hottok
    if (!validateHottok(req)) {
      console.warn('🔥 HOTTOK inválido:', req.headers['x-hotmart-hottok']);
      return res.status(401).json({ message: 'Invalid HOTTOK' });
    }

    // 2) Log completo da carga útil para inspeção
    console.log('📦 Payload completo:', JSON.stringify(req.body, null, 2));

    // 3) Extrair dados do payload v2.0.0
    const eventType = req.body.event;        // ex: PURCHASE_PAID, PURCHASE_CHARGEBACK, SUBSCRIPTION_CANCELLATION etc.
    const data      = req.body.data || {};

    // Determine o ID da transação ou do assinante
    let purchaseId;
    let email;
    let name;

    // Eventos de compra incluem data.purchase
    if (data.purchase && data.purchase.transaction) {
      purchaseId = data.purchase.transaction;
      if (data.buyer && data.buyer.email) {
        email = data.buyer.email;
        name  = data.buyer.name || `${data.buyer.first_name || ''} ${data.buyer.last_name || ''}`.trim();
      }
    }
    // Eventos de assinatura incluem data.subscriber
    else if (data.subscriber && data.subscriber.code) {
      purchaseId = data.subscriber.code;
      email      = data.subscriber.email;
      name       = data.subscriber.name;
    }

    // Caso não tenha purchaseId (evento irrelevante), ignorar
    const relevantEvents = [
      'PURCHASE_PAID', 'PURCHASE_APPROVED',
      'PURCHASE_CHARGEBACK', 'PURCHASE_REFUNDED', 'PURCHASE_EXPIRED',
      'SUBSCRIPTION_CANCELLATION', 'CLUB_FIRST_ACCESS', 'PURCHASE_DELAYED'
    ];
    if (!purchaseId || !relevantEvents.includes(eventType)) {
      console.log(`⚠️ Evento ignorado ou sem purchaseId: ${eventType}`);
      return res.status(200).end();
    }

    const isPurchaseApproval = eventType === 'PURCHASE_PAID' || eventType === 'PURCHASE_APPROVED';
    
    // 4) Idempotência: evita duplicar processamento do mesmo evento EXCETO para purchases
    let eventAlreadyProcessed = false;
    try {
      const exists = await HotmartEventLog.findOne({ 
        where: { purchaseId, eventType }
      });
      
      if (exists) {
        eventAlreadyProcessed = true;
        console.log(`🔁 Evento já processado: ${purchaseId} / ${eventType}`);
        
        // Para outros eventos além de aprovação de compra, encerrar processamento
        if (!isPurchaseApproval) {
          return res.status(200).end();
        }
        
        // Para aprovações, continuamos mesmo que já processado, apenas logamos
        console.log(`⚠️ Evento de aprovação, continuando processamento mesmo já processado`);
      }
    } catch (error) {
      // Se a tabela não existir ainda, apenas logue o erro e continue
      if (error.name === 'SequelizeDatabaseError' && error.parent.code === '42P01') {
        console.warn('⚠️ Tabela hotmart_event_logs não existe ainda, ignorando verificação de duplicidade');
      } else {
        throw error; // Propaga outros erros
      }
    }

    // 5) Registrar o evento bruto (apenas se for a primeira vez)
    if (!eventAlreadyProcessed) {
      try {
        await HotmartEventLog.create({ purchaseId, eventType, payload: req.body });
        console.log(`📝 Evento registrado: ${purchaseId} / ${eventType}`);
      } catch (error) {
        // Se a tabela não existir ainda, apenas logue o erro e continue
        if (error.name === 'SequelizeDatabaseError' && error.parent.code === '42P01') {
          console.warn('⚠️ Tabela hotmart_event_logs não existe ainda, ignorando registro');
        } else {
          throw error;
        }
      }
    }

    // 6) Criar ou atualizar usuário conforme o tipo de evento
    let user = null;
    if (email) {
      user = await User.findOne({ where: { email } });
    }

    switch (eventType) {
      case 'PURCHASE_PAID':
      case 'PURCHASE_APPROVED':
        if (!user && email) {
          const tempPass = crypto.randomBytes(6).toString('hex');
          user = await User.create({
            name,
            email,
            password: tempPass,
            role: 'aluno',
            status: 'approved',
            active: true,
            mustResetPassword: true,
            hotmartPurchaseId: purchaseId
          });
          console.log(`✅ Novo usuário criado após pagamento: ${email}`);
          
          try {
            await sendLoginEmail(email, tempPass);
            console.log(`📧 E-mail de boas-vindas enviado para: ${email}`);
          } catch (emailError) {
            console.error(`❌ Erro ao enviar email para ${email}:`, emailError);
          }
        } else if (user) {
          await user.update({ 
            status: 'approved',
            active: true
          });
          console.log(`🔄 Usuário existente reativado após pagamento: ${email}`);
        }
        break;

      case 'PURCHASE_CHARGEBACK':
      case 'PURCHASE_REFUNDED':
        if (user) {
          await user.update({ 
            status: 'refunded',
            active: false // Explicitly set active to false
          });
          console.log(`🔄 Usuário marcado como refunded e desativado: ${email}`);
        }
        break;
      case 'PURCHASE_DELAYED':
      case 'PURCHASE_EXPIRED':
        if (user) {
          await user.update({ 
            status: 'expired',
            active: false // Explicitly set active to false
          });
          console.log(`🔄 Usuário marcado como expired e desativado: ${email}`);
        }
        break;

      case 'SUBSCRIPTION_CANCELLATION':
        if (user) {
          await user.update({ 
            status: 'canceled',
            active: false // Explicitly set active to false
          });
          console.log(`🔄 Usuário marcado como canceled e desativado: ${email}`);
        }
        break;

      case 'CLUB_FIRST_ACCESS':
        console.log(`ℹ️ Primeiro acesso ao clube para: ${purchaseId}`);
        break;

      default:
        console.log(`ℹ️ Evento não tratado: ${eventType}`);
    }

    // 7) Responder 200 OK ao Hotmart/MemberKit
    return res.status(200).end();
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ message: 'Erro interno ao processar webhook' });
  }
};
