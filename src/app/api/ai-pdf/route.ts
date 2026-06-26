import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pdfText, prompt, eventoId, eventoNome } = await req.json();

    if (!pdfText || !prompt) {
      return NextResponse.json(
        { error: "pdfText and prompt are required" },
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

    const systemPrompt = `Voce eh um assistente especialista em rodeio brasileiro.
Voce recebera o texto extraido de um PDF de programacao de rodeio e um pedido do usuario.
Sua tarefa eh extrair as informacoes solicitadas e retornar um JSON estruturado.

Retorne APENAS um JSON valido no seguinte formato (sem markdown, sem explicacoes, apenas o JSON puro):
{
  "montarias": [
    {
      "competidor_nome": "NOME DO COMPETIDOR EM MAIUSCULAS",
      "touro_nome": "NOME DO TOURO EM MAIUSCULAS",
      "cia_nome": "NOME DA CIA EM MAIUSCULAS",
      "dia": "DIA 1",
      "escalado_no_evento": "NOME DO EVENTO SE MENCIONADO"
    }
  ],
  "resumo": "Breve resumo do que foi extraido"
}

Regras:
- Todos os nomes em MAIUSCULAS
- dia deve ser "DIA 1", "DIA 2", etc
- Se nao conseguir identificar algum campo, use null
- Nao invente informacoes que nao estao no PDF
- Se nao encontrar montarias, retorne montarias: []`;

    const userMessage = `PEDIDO DO USUARIO: ${prompt}\n\nTEXTO DO PDF:\n${pdfText.substring(0, 12000)}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
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
        .replace(/```json\n?/g, "")
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
      montarias: parsedResult.montarias || [],
      resumo: parsedResult.resumo || "",
      eventoId,
      eventoNome,
    });
  } catch (err: any) {
    console.error("AI PDF API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
