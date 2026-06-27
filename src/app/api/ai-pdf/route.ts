import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pdfText, messages, eventoId, eventoNome } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured in environment variables" },
        { status: 500 }
      );
    }

    const systemPrompt = `Você é um assistente especialista em rodeio brasileiro do sistema HZN.
O usuário pode ou não ter feito upload de um arquivo PDF.
Você DEVE SEMPRE responder em um JSON válido. Nunca responda fora do JSON. Não use blocos de código (como \`\`\`json). Apenas o JSON puro.

FORMATO DE RESPOSTA OBRIGATÓRIO:
{
  "resposta_chat": "A sua resposta em linguagem natural para o usuário. Seja claro e amigável.",
  "tipo_de_dados": "montarias" | "acao" | null,
  "acao_tipo": "criar_evento" | "abrir_dar_nota" | null,
  "dados": [ ... ] | { ... } | null
}

REGRA PARA "montarias":
Se o usuário pedir para gerar a lista de montarias ou sorteio, e o PDF tiver os dados necessários, extraia e preencha o array "dados" assim:
"dados": [
  {
    "competidor_nome": "NOME DO COMPETIDOR EM MAIÚSCULAS",
    "touro_nome": "NOME DO TOURO EM MAIÚSCULAS (se não tiver, deixe null)",
    "cia_nome": "NOME DA CIA EM MAIÚSCULAS (se não tiver, deixe null)",
    "dia": "DIA 1"
  }
]
E mude "tipo_de_dados" para "montarias".

REGRA PARA AÇÕES DE CHAT (LANÇAR NOTAS):
Se o usuário pedir para "pegar um boi" ou "dar nota" ou "cadastrar nota" (mesmo que ele não especifique o boi exato, ou se houver vários, escolha o primeiro ou peça para ele especificar):
1. Primeiro pergunte (no resposta_chat): "Você vai cadastrar as notas agora?". Se o usuário disser "sim" ou já tiver afirmado, vá para o passo 2.
2. O ID do Evento atual selecionado pelo usuário é: ${eventoId ? eventoId : 'NENHUM'}.
3. Se o ID do Evento for 'NENHUM', pergunte ao usuário: "Qual o evento de destino? Se não existir, deseja que eu abra a tela para criar um novo evento?".
4. Se o usuário quiser criar um novo evento, OBRIGATORIAMENTE retorne "tipo_de_dados": "acao" e "acao_tipo": "criar_evento".
5. Se o ID do Evento não for 'NENHUM' (ou o usuário confirmar que o evento já está selecionado/criado), e o usuário quiser dar a nota, OBRIGATORIAMENTE retorne "tipo_de_dados": "acao", "acao_tipo": "abrir_dar_nota", e em "dados" envie UM ÚNICO objeto com o que você extraiu:
"dados": {
  "competidor_nome": "NOME SE TIVER OU STRING VAZIA",
  "touro_nome": "NOME DO TOURO OU STRING VAZIA",
  "cia_nome": "NOME DA CIA OU STRING VAZIA"
}
ATENÇÃO CRÍTICA: Nunca retorne "tipo_de_dados": "montarias" se o objetivo for abrir o pop-up de notas! E nunca retorne um array (lista) em "dados" para o acao_tipo "abrir_dar_nota", deve ser um ÚNICO objeto com as chaves acima. Se houver vários bois que combinam com o pedido, pegue apenas o primeiro. O sistema abrirá automaticamente o pop-up de dar notas para o usuário preencher.

TEXTO DO PDF ENVIADO PELO USUÁRIO (pode estar vazio):
====================================
${pdfText ? pdfText.substring(0, 15000) : 'Nenhum PDF enviado.'}
====================================
`;

    // Map frontend messages to Groq format
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: formattedMessages,
          temperature: 0.2,
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorData}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    let parsedResult;
    try {
      const cleaned = rawContent
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            {
              error: "Failed to parse AI response as JSON",
              rawResponse: rawContent,
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: "AI did not return valid JSON",
            rawResponse: rawContent,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      resposta_chat: parsedResult.resposta_chat || "",
      tipo_de_dados: parsedResult.tipo_de_dados || null,
      dados: parsedResult.dados || null,
      eventoId,
      eventoNome,
    });
  } catch (err: any) {
    console.error("AI PDF API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
