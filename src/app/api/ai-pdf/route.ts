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

    // Helper to get all generative models in a robust order of preference
    async function getModelsToTry(): Promise<string[]> {
      const preferredOrder = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-1.0-pro"
      ];
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();
        if (!data.models) return preferredOrder.map(m => m.startsWith("models/") ? m : `models/${m}`);
        
        const available = data.models.map((m: any) => m.name);
        const clean = (name: string) => name.replace(/^models\//, "");

        const orderedList: string[] = [];
        // First add the preferred ones if they are in the available list
        for (const pref of preferredOrder) {
          const matched = available.find((av: string) => clean(av) === pref);
          if (matched) {
            orderedList.push(matched);
          }
        }
        // Then add any other available models that support generateContent
        for (const m of data.models) {
          if (m.supportedGenerationMethods?.includes("generateContent") && !orderedList.includes(m.name)) {
            orderedList.push(m.name);
          }
        }
        
        return orderedList.length > 0 ? orderedList : preferredOrder.map(m => `models/${m}`);
      } catch (e) {
        console.error("Failed to fetch available Gemini models", e);
        return preferredOrder.map(m => `models/${m}`);
      }
    }

    // Extract history
    const historyText = messages.map((m: any) => `${m.role === 'assistant' ? 'IA' : 'Usuário'}: ${m.content}`).join("\n\n");
    const prompt = `Aqui está o histórico da conversa e a última mensagem do usuário:\n\n${historyText}\n\nLembre-se de retornar APENAS JSON válido seguindo a estrutura fornecida no system prompt.`;

    const modelsToTry = await getModelsToTry();
    let rawContent = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Tentando obter resposta com o modelo: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: {
            responseMimeType: "application/json",
          }
        });
        const result = await model.generateContent(prompt);
        rawContent = result.response.text();
        if (rawContent) {
          console.log(`Sucesso com o modelo: ${modelName}`);
          break; // Success!
        }
      } catch (err: any) {
        console.warn(`Falha com o modelo ${modelName}:`, err.message || err);
        lastError = err;
      }
    }

    if (!rawContent) {
      console.error("Todos os modelos do Gemini falharam.", lastError);
      return NextResponse.json({
        error: `Erro na API do Gemini após tentar múltiplos modelos. Último erro: ${lastError?.message || lastError}. Modelos tentados: ${modelsToTry.join(", ")}`
      }, { status: 500 });
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
