const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
      }
    });
  }

  async sendAlert(jaula, modulo, tiempo, cliente = '99') {
    try {
      const mailOptions = {
        from: config.EMAIL_USER,
        to: 'alertas@smarteyes.cl', // Siempre incluir email principal
        subject: 'Aviso de inyección de oxígeno Abick',
        html: `
          <html>
            <head>
              <title>Aviso de Inyección de Oxígeno</title>
            </head>
            <body>
              <h3>Estimados, la jaula número '${jaula}' del módulo '${modulo}' en acopio Abick se encuentra inyectando oxígeno durante ${tiempo} minutos, favor comunicarse con supervisor a cargo para regularizar esto en caso que sea anormal.</h3>
              <br>
              <h3>Saludos</h3>
            </body>
          </html>
        `
      };

      // Si hay cliente específico, agregar sus emails
      if (cliente !== '99') {
        const clientEmails = await this.getClientEmails(cliente);
        if (clientEmails.length > 0) {
          mailOptions.to += `, ${clientEmails.join(', ')}`;
        }
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Alerta enviada para jaula ${jaula} (${tiempo} min)`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error enviando email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getClientEmails(aliasCliente) {
    try {
      // Esta función debería conectarse a la base de datos para obtener emails
      // Por ahora retornamos un array vacío
      return [];
    } catch (error) {
      console.error('Error obteniendo emails de cliente:', error.message);
      return [];
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Servidor de email configurado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en configuración de email:', error.message);
      return false;
    }
  }
}

module.exports = EmailService;
