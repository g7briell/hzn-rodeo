import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pdfText, messages, eventoId, eventoNome } = await req.json();

    if (!pdfText || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "pdfText and messages array are required" },
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
O usuário fará o upload de um arquivo PDF (texto fornecido abaixo) e conversará com você sobre ele.
Você DEVE SEMPRE responder em um JSON válido. Nunca responda fora do JSON. Não use blocos de código (como \`\`\`json). Apenas o JSON puro.

FORMATO DE RESPOSTA OBRIGATÓRIO:
{
  "resposta_chat": "A sua resposta em linguagem natural para o usuário. Seja claro e amigável.",
  "tipo_de_dados": "montarias" | null,
  "dados": [ ... ] | null
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

Se você tiver alguma dúvida, se o PDF for de outra coisa (como planilha de médias sem sorteio) ou se faltarem dados importantes, deixe "tipo_de_dados": null e "dados": null, e use o campo "resposta_chat" para perguntar ao usuário o que ele deseja fazer ou explicar o problema.

TEXTO DO PDF ENVIADO PELO USUÁRIO:
====================================
${pdfText.substring(0, 15000)}
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
