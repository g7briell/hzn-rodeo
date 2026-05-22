import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Chave injetada diretamente para garantir o funcionamento imediato
const resend = new Resend('re_dA2RnhAT_KU4HWy77SeuyUBPtunwENnV8');

export async function POST(req: Request) {
  try {
    const { email, nome, token, validade } = await req.json();

    const data = await resend.emails.send({
      from: 'RODEOAPP <contato@rodeoapp.pro>', 
      to: [email],
      subject: '🏆 Seu acesso ao RODEOAPP chegou!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 40px; border-radius: 30px; border: 2px solid #EAB308; text-align: center;">
          
          <div style="margin-bottom: 30px;">
            <h1 style="font-style: italic; font-weight: 900; font-size: 36px; letter-spacing: -1px; margin: 0; color: #EAB308;">RODEOAPP<span style="color: #ffffff;">.PRO</span></h1>
            <p style="text-transform: uppercase; font-size: 10px; letter-spacing: 4px; color: #ffffff; margin-top: 5px; opacity: 0.7;">TECNOLOGIA • PERFORMANCE • RODEIO</p>
          </div>
          
          <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 30px; color: #ffffff; text-transform: uppercase;">Bem-vindo à Elite do Rodeio</h2>
          
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Olá <strong>${nome}</strong>, seu acesso à plataforma <strong>RODEOAPP</strong> foi liberado.</p>
          
          <div style="background-color: #111111; padding: 30px; border-radius: 20px; border: 1px solid #EAB308; margin: 30px 0; text-align: left;">
            <p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 900; color: #EAB308; text-transform: uppercase; letter-spacing: 2px;">Seus Dados de Acesso</p>
            
            <div style="margin-bottom: 20px;">
              <span style="color: #666666; font-size: 12px; display: block; margin-bottom: 5px;">E-MAIL DE LOGIN:</span>
              <span style="font-size: 18px; font-weight: bold; color: #ffffff;">${email}</span>
            </div>

            <div style="margin-bottom: 20px;">
              <span style="color: #666666; font-size: 12px; display: block; margin-bottom: 5px;">TOKEN DA LICENÇA:</span>
              <div style="font-size: 28px; font-weight: 900; color: #EAB308; font-family: monospace; letter-spacing: 3px; background: #000; padding: 15px; border-radius: 10px; border: 1px solid #333;">${token}</div>
            </div>
            
            <div style="border-top: 1px solid #222; padding-top: 20px;">
              <span style="color: #666666; font-size: 12px;">ACESSO VÁLIDO ATÉ:</span>
              <span style="font-weight: bold; color: #ffffff; margin-left: 10px;">${validade}</span>
            </div>
          </div>
          
          <div style="margin-top: 40px;">
            <p style="color: #666666; font-size: 12px; margin-bottom: 15px;">Dúvidas ou Suporte Técnico:</p>
            <a href="https://wa.me/5518981226665" style="display: inline-block; background-color: #EAB308; color: #000000; padding: 18px 40px; border-radius: 15px; text-decoration: none; font-weight: 900; font-size: 16px; text-transform: uppercase;">Falar com Suporte</a>
          </div>
          
          <p style="color: #333333; font-size: 10px; margin-top: 40px; font-weight: bold;">
            © 2026 RODEOAPP.PRO - TODOS OS DIREITOS RESERVADOS
          </p>
        </div>
      `
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
