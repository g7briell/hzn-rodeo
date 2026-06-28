import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { pdfText, messages, eventoId, eventoNome } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured in environment variables" },
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
${pdfText ? pdfText : 'Nenhum PDF enviado.'}
====================================
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    // Helper to get a supported Gemini model name
    async function getSupportedModel(): Promise<string> {
      // First try the most recent stable model name
      const preferred = ["gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"];
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();
        if (!data.models) return preferred[0];
        const available = data.models.map((m: any) => m.name);
        for (const name of preferred) {
          if (available.includes(name)) return name;
        }
        // Fallback to the first model that supports generateContent
        const withGenerate = data.models.find((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
        return withGenerate?.name || preferred[0];
      } catch (e) {
        console.error("Failed to fetch available Gemini models", e);
        // If fetching fails, just use the most common name
        return preferred[0];
      }
    }

    const selectedModel = await getSupportedModel();
    const model = genAI.getGenerativeModel({
      model: selectedModel,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Extract history
    const historyText = messages.map((m: any) => `${m.role === 'assistant' ? 'IA' : 'Usuário'}: ${m.content}`).join("\n\n");
    const prompt = `Aqui está o histórico da conversa e a última mensagem do usuário:\n\n${historyText}\n\nLembre-se de retornar APENAS JSON válido seguindo a estrutura fornecida no system prompt.`;

    let rawContent = "";
    try {
      const result = await model.generateContent(prompt);
      rawContent = result.response.text();
    } catch (apiErr: any) {
      console.error("Gemini API error", apiErr);
      // Attempt to retrieve the list of available models via raw HTTP request
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();
        const availableNames = data.models?.map((m: any) => m.name) || [];
        return NextResponse.json({
          error: `Erro na API do Gemini: ${apiErr.message}. Modelos disponíveis para sua chave: ${availableNames.join(", ")}`
        }, { status: 500 });
      } catch (listErr: any) {
        return NextResponse.json({
          error: `Erro na API do Gemini: ${apiErr.message}. Falha adicional ao buscar modelos disponíveis: ${listErr.message}`
        }, { status: 500 });
      }
    }

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
      acao_tipo: parsedResult.acao_tipo || null,
      dados: parsedResult.dados || null,
      eventoId,
      eventoNome,
    });
  } catch (err: any) {
    console.error("AI PDF API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
