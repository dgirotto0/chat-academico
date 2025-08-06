// backend/services/emailService.js

console.log('🔑 MAILJET_API_KEY:', process.env.MAILJET_API_KEY);
console.log('🔑 MAILJET_SECRET_KEY:', process.env.MAILJET_SECRET_KEY);

const mailjet = require('node-mailjet').apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);
const crypto = require('crypto');

const FROM_EMAIL = 'no-reply@scientifique.ai'; // ou seu email de envio
const FROM_NAME = 'Suporte Scientifique AI';

/**
 * Envia email de boas-vindas com login e senha temporária
 * @param {string} to - email do usuário
 * @param {string} tempPassword - senha temporária gerada
 * @returns {Promise}
 */
exports.sendLoginEmail = (to, tempPassword) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password`;

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: FROM_EMAIL,
          Name: FROM_NAME
        },
        To: [
          {
            Email: to,
            Name: to
          }
        ],
        Subject: 'Seu acesso ao chat Scientifique AI',
        HTMLPart: `
          <p>Olá,</p>
          <p>Seu acesso ao chat foi criado com sucesso. Segue seu login:</p>
          <ul>
            <li><b>Email:</b> ${to}</li>
            <li><b>Senha temporária:</b> ${tempPassword}</li>
          </ul>
          <p>Para sua segurança, por favor redefina sua senha no primeiro acesso:</p>
          <p><a href="${resetLink}">Redefinir senha</a></p>
          <p>Obrigado e bons estudos!</p>
        `
      }
    ]
  });
};

/**
 * Gera um token de redefinição, salva no banco e envia email com link
 * @param {Object} user - objeto do usuário
 * @param {string} token - token de redefinição
 * @returns {Promise} resultado da operação
 */
exports.sendPasswordResetEmail = async (user, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: FROM_EMAIL,
          Name: FROM_NAME
        },
        To: [
          {
            Email: user.email,
            Name: user.name || user.email
          }
        ],
        Subject: 'Recuperação de Senha - Scientifique AI',
        HTMLPart: `
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha no Scientifique AI.</p>
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Este link é válido por 1 hora.</p>
          <p>Se você não solicitou esta recuperação de senha, ignore este email.</p>
        `
      }
    ]
  });
};
