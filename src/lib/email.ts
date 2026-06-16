import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationLink = `${host}/verify?token=${token}`;

  console.log('----------------------------------------------------');
  console.log(`✉️ SIMULACIÓN DE EMAIL ENVIADO A: ${email}`);
  console.log(`Nombre: ${name}`);
  console.log(`Enlace de verificación: ${verificationLink}`);
  console.log('----------------------------------------------------');

  // If SMTP configurations are available in .env, we send the real email.
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"PRODE SER" <${smtpUser}>`,
        to: email,
        subject: 'Activa tu cuenta de PRODE SER 🏆',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #1B199A; margin-bottom: 5px;">PRODE SER</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Grupo de Jóvenes</p>
            </div>
            <h2 style="color: #1F2937;">¡Hola, ${name}! 👋</h2>
            <p style="color: #4B5563; line-height: 1.6;">
              Gracias por registrarte en la plataforma de PRODE para nuestro grupo de jóvenes. Para activar tu cuenta y poder ingresar tus pronósticos, por favor haz clic en el siguiente enlace de verificación:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #1B199A; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 9999px; box-shadow: 0 4px 12px rgba(27, 25, 154, 0.3); display: inline-block;">
                Verificar Correo Electrónico
              </a>
            </div>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center;">
              Si no solicitaste este correo, puedes ignorarlo con seguridad.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Correo real enviado exitosamente a ${email}`);
    } catch (error) {
      console.error('❌ Error al enviar correo de verificación:', error);
    }
  }
}
