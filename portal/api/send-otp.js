import { Resend } from 'resend';

export default async function handler(req, res) {
  // Configuração de CORS para permitir requisições locais e do domínio
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  // A chave da API pode vir do ambiente (Vercel) ou ficar fixa aqui (embora o ideal seja via ENV na Vercel)
  // Como estamos testando rápido, usaremos a que o usuário mandou. Para produção, mova isso para o painel da Vercel (Environment Variables)
  const resend = new Resend(process.env.RESEND_API_KEY || 're_D1XyZvJG_MQUuGogK8Pej1kDnhYCeGGcw');

  try {
    const data = await resend.emails.send({
      from: 'RodeoApp <onboarding@resend.dev>', // O Resend permite usar esse email padrão para testes. Depois, troque para o seu domínio oficial.
      to: email,
      subject: 'Seu Código de Acesso - RodeoApp',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #07090E; color: #FFFFFF; padding: 40px; text-align: center; border-radius: 10px;">
          <h1 style="color: #FFD700; margin-bottom: 20px;">RODEOAPP</h1>
          <p style="font-size: 16px; color: #8E9BAE;">Olá,</p>
          <p style="font-size: 16px; color: #8E9BAE;">Você solicitou acesso ao Portal do Competidor.</p>
          <div style="margin: 30px auto; padding: 20px; background-color: #121822; border-radius: 8px; border: 1px solid #333; max-width: 300px;">
            <p style="font-size: 14px; text-transform: uppercase; color: #8E9BAE; margin-bottom: 10px;">Seu Código de Segurança</p>
            <h2 style="font-size: 32px; letter-spacing: 5px; color: #FFFFFF; margin: 0;">${code}</h2>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 40px;">Se você não solicitou este código, ignore este e-mail.</p>
        </div>
      `
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
