import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ success: false, error: "Email and code are required" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY || 're_D1XyZvJG_MQUuGogK8Pej1kDnhYCeGGcw');

    const data = await resend.emails.send({
      from: 'RodeoApp <portal@rodeoapp.pro>',
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

    return NextResponse.json({ success: true, data }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error: any) {
    console.error("Erro ao enviar email OTP:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
