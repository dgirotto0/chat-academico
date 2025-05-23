// backend/services/emailService.js

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Criar o transporter usando Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,        // smtp.gmail.com
  port: process.env.SMTP_PORT,        // 587
  secure: false,                      // TLS vai ser negociado via STARTTLS
  auth: {
    user: process.env.SMTP_USER,      // seu.email@gmail.com
    pass: process.env.SMTP_PASS       // App Password de 16 caracteres
  }
});

/**
 * Envia email de boas-vindas com login e senha temporária
 * @param {string} to - email do usuário
 * @param {string} tempPassword - senha temporária gerada
 * @returns {Promise}
 */
exports.sendLoginEmail = (to, tempPassword) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password`;
  
  const html = `
    <p>Olá,</p>
    <p>Seu acesso ao chat foi criado com sucesso. Segue seu login:</p>
    <ul>
      <li><b>Email:</b> ${to}</li>
      <li><b>Senha temporária:</b> ${tempPassword}</li>
    </ul>
    <p>Para sua segurança, por favor redefina sua senha no primeiro acesso:</p>
    <p><a href="${resetLink}">Redefinir senha</a></p>
    <p>Obrigado e bons estudos!</p>
  `;

  return transporter.sendMail({
    from: `"Suporte Scientifique AI" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Seu acesso ao chat Scientifique AI',
    html
  });
};

/**
 * Gera um token de redefinição, salva no banco e envia email com link
 * @param {Object} user - objeto do usuário
 * @param {Object} db - conexão com o banco de dados (sequelize)
 * @returns {Promise} resultado da operação
 */
exports.sendPasswordResetEmail = async (user, db) => {
  try {
    // Gerar token aleatório para redefinição
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora
    
    // Salvar token no banco (tabela password_reset_tokens)
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      { replacements: [user.id, token, expiresAt] }
    );
    
    // Gerar link de redefinição
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    // Enviar email
    await transporter.sendMail({
      from: `"Suporte Scientifique AI" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Recuperação de Senha - Scientifique AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3f51b5; text-align: center;">Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha no Scientifique AI. Clique no link abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" style="display: inline-block; background-color: #3f51b5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 15px;">Redefinir Senha</a>
          </p>
          <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
            ${resetLink}
          </p>
          <p><strong>Importante:</strong> Este link é válido por 1 hora.</p>
          <p style="font-size: 12px; color: #666; text-align: center; margin-top: 30px;">
            Se você não solicitou esta recuperação de senha, ignore este email.
          </p>
        </div>
      `
    });
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email de recuperação de senha:', error);
    return { success: false, error };
  }
};
