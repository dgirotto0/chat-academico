const mailjet = require('node-mailjet').apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

mailjet
  .post('send', { version: 'v3.1' })
  .request({
    Messages: [
      {
        From: {
          Email: "no-reply@scientifique.ai",
          Name: "Suporte Scientifique AI"
        },
        To: [
          {
            Email: "dgirotto00@gmail.com",
            Name: "Daniel Girotto"
          }
        ],
        Subject: "Teste Mailjet",
        HTMLPart: "<h3>Teste de envio via Mailjet</h3>"
      }
    ]
  })
  .then(result => {
    console.log(result.body);
  })
  .catch(err => {
    console.error(err);
  });
