import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedItem {
  peao: string;
  cidade?: string;
  touro: string;
  cia: string;
  status: string;
  tempo?: number;
  j1_peao?: number;
  j2_peao?: number;
  j1_touro?: number;
  j2_touro?: number;
  totalPeao?: number;
  totalTouro?: number;
  total?: number;
}

export interface ParsePdfResult {
  rawText: string;
  items: ParsedItem[];
  detectedPeoes: string[];
  detectedTouros: { nome: string; cia: string }[];
  detectedCias: string[];
  suggestedDay: string;
}

/**
 * Extracts raw text items from a PDF File (ArrayBuffer)
 */
export async function extractPdfText(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Group text items by line Y-coordinate roughly
    const items = content.items as any[];
    let lastY: number | null = null;
    let line = '';
    const lines: string[] = [];

    items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 4) {
        if (line.trim()) lines.push(line.trim());
        line = '';
      }
      line += item.str + ' ';
      lastY = y;
    });
    if (line.trim()) lines.push(line.trim());

    pageTexts.push(...lines);
  }

  return pageTexts;
}

function customGeminiPrompt(title: string, placeholder: string): Promise<string | null> {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md';
    bg.innerHTML = `
      <div class="bg-slate-900 border-2 border-yellow-500/50 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
        <div class="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
          <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
        </div>
        <h3 class="text-white font-black text-lg mb-2 uppercase">${title}</h3>
        <p class="text-slate-400 text-xs mb-6">Cole sua chave do Google AI Studio para ativar a Inteligência Artificial no leitor de PDF.</p>
        <input type="password" id="custom-prompt-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm font-mono mb-6 text-center focus:border-yellow-500 outline-none" placeholder="${placeholder}">
        <div class="flex gap-3">
          <button id="custom-prompt-cancel" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs">Pular / Off-line</button>
          <button id="custom-prompt-ok" class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase text-xs shadow-lg">Salvar e Usar</button>
        </div>
      </div>
    `;
    document.body.appendChild(bg);
    const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
    if (input) input.focus();

    const cleanup = (val: string | null) => {
      if (document.body.contains(bg)) document.body.removeChild(bg);
      resolve(val);
    };

    const cancelBtn = document.getElementById('custom-prompt-cancel');
    const okBtn = document.getElementById('custom-prompt-ok');
    if (cancelBtn) cancelBtn.onclick = () => cleanup(null);
    if (okBtn) okBtn.onclick = () => cleanup(input ? input.value : null);
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') cleanup(input.value);
        if (e.key === 'Escape') cleanup(null);
      };
    }
  });
}

async function parsePdfWithGemini(rawText: string): Promise<any> {
  let apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || localStorage.getItem('hzn_gemini_api_key') || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    const inputKey = await customGeminiPrompt("Chave API do Gemini", "AIzaSy...");
    if (!inputKey || !inputKey.trim()) return null;
    apiKey = inputKey.trim();
    localStorage.setItem('hzn_gemini_api_key', apiKey);
  }

  const systemPrompt = `Você é um leitor especialista de súmulas e listas de sorteio de rodeios brasileiros.
Sua função é analisar o texto extraído de um arquivo PDF de rodeio e retornar um JSON estrito contendo:
1. "montarias": todas as linhas com confrontos (competidor vs touro vs cia vs cidade).
2. "reservas": todos os touros reservas/repete da seção "Animais Reservas" ou "Touros Reservas" (que NÃO possuem competidor montando).

Retorne APENAS um objeto JSON com essa estrutura idêntica (sem blocos markdown \`\`\`json):
{
  "montarias": [
    {
      "peao": "EDIMILSON DA SILVA LUZ",
      "cidade": "VILA RICA-MT",
      "touro": "VIDA LOCA",
      "cia": "JP"
    }
  ],
  "reservas": [
    {
      "touro": "BERLIN",
      "cia": "VALE DOS SONHOS"
    }
  ]
}

REGRAS RÍGIDAS:
- NUNCA coloque touros reservas como nome de peão!
- Em "montarias", cada item DEVE ter "peao", "cidade", "touro" e "cia".
- Em "reservas", cada item DEVE ter apenas "touro" e "cia".
- Todos os nomes devem estar limpos e em MAIÚSCULAS.
- Ignore números de ordem (1, 2, 28) e letras de lado ('E', 'C').`;

  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nTEXTO BRUTO DO PDF:\n${rawText}` }] }
          ]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(text);
        if (parsed && (parsed.montarias || parsed.reservas)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Tentativa Gemini (${model}) falhou:`, e);
    }
  }
  return null;
}

function convertGeminiResultToParsedData(aiResult: any, rawText: string): ParsePdfResult {
  const items: ParsedItem[] = [];
  const peoesSet = new Set<string>();
  const tourosMap = new Map<string, string>();
  const ciasSet = new Set<string>();

  if (aiResult.montarias && Array.isArray(aiResult.montarias)) {
    aiResult.montarias.forEach((m: any) => {
      const peao = (m.peao || '').trim().toUpperCase();
      const touro = (m.touro || '').trim().toUpperCase();
      const cia = (m.cia || 'CIA OUTRAS').trim().toUpperCase();
      const cidade = (m.cidade || '').trim().toUpperCase();

      if (peao && peao.length >= 3) {
        peoesSet.add(peao);
        if (touro && touro.length >= 2) {
          if (cia && cia.length >= 2) {
            ciasSet.add(cia);
            tourosMap.set(touro, cia);
          } else if (!tourosMap.has(touro)) {
            tourosMap.set(touro, 'CIA OUTRAS');
          }
          items.push({
            peao,
            cidade,
            touro,
            cia: cia || tourosMap.get(touro) || 'CIA OUTRAS',
            status: 'ativa',
            tempo: 8.0,
            totalPeao: 0,
            totalTouro: 0,
            total: 0
          });
        }
      }
    });
  }

  if (aiResult.reservas && Array.isArray(aiResult.reservas)) {
    aiResult.reservas.forEach((r: any) => {
      const touro = (r.touro || '').trim().toUpperCase();
      const cia = (r.cia || 'CIA OUTRAS').trim().toUpperCase();
      if (touro && touro.length >= 2) {
        if (cia && cia.length >= 2) {
          ciasSet.add(cia);
          tourosMap.set(touro, cia);
        } else if (!tourosMap.has(touro)) {
          tourosMap.set(touro, 'CIA OUTRAS');
        }
      }
    });
  }

  const detectedTouros: { nome: string; cia: string }[] = [];
  tourosMap.forEach((cia, nome) => detectedTouros.push({ nome, cia }));

  let suggestedDay = 'DIA 1';
  const fullUpper = rawText.toUpperCase();
  if (fullUpper.includes('FINAL')) suggestedDay = 'FINAL';
  else if (fullUpper.includes('SEMI')) suggestedDay = 'SEMI-FINAL';
  else if (fullUpper.includes('DIA 4') || fullUpper.includes('ROUND 4')) suggestedDay = 'DIA 4';
  else if (fullUpper.includes('DIA 3') || fullUpper.includes('ROUND 3')) suggestedDay = 'DIA 3';
  else if (fullUpper.includes('DIA 2') || fullUpper.includes('ROUND 2')) suggestedDay = 'DIA 2';
  else if (fullUpper.includes('DIA 1') || fullUpper.includes('ROUND 1')) suggestedDay = 'DIA 1';

  return {
    rawText,
    items,
    detectedPeoes: Array.from(peoesSet),
    detectedTouros,
    detectedCias: Array.from(ciasSet),
    suggestedDay
  };
}

/**
 * Intelligently parses rodeo lines into structured entities
 */
export async function parseRodeoPdf(file: File): Promise<ParsePdfResult> {
  const lines = await extractPdfText(file);
  const rawText = lines.join('\n');

  try {
    const aiResult = await parsePdfWithGemini(rawText);
    if (aiResult && ((aiResult.montarias && aiResult.montarias.length > 0) || (aiResult.reservas && aiResult.reservas.length > 0))) {
      return convertGeminiResultToParsedData(aiResult, rawText);
    }
  } catch (e) {
    console.warn("Portal Gemini PDF parse fallback to regex:", e);
  }

  // Detect day / round from title text
  let suggestedDay = 'DIA 1';
  const fullUpper = rawText.toUpperCase();
  if (fullUpper.includes('FINAL')) suggestedDay = 'FINAL';
  else if (fullUpper.includes('SEMI')) suggestedDay = 'SEMI-FINAL';
  else if (fullUpper.includes('DIA 4') || fullUpper.includes('ROUND 4')) suggestedDay = 'DIA 4';
  else if (fullUpper.includes('DIA 3') || fullUpper.includes('ROUND 3')) suggestedDay = 'DIA 3';
  else if (fullUpper.includes('DIA 2') || fullUpper.includes('ROUND 2')) suggestedDay = 'DIA 2';
  else if (fullUpper.includes('DIA 1') || fullUpper.includes('ROUND 1')) suggestedDay = 'DIA 1';

  const items: ParsedItem[] = [];
  const peoesSet = new Set<string>();
  const tourosMap = new Map<string, string>(); // bullName -> ciaName
  const ciasSet = new Set<string>();

  // Known stopwords/headers to ignore
  const ignoreWords = ['SORTEIO', 'RANKING', 'RODEOAPP', 'HORÁRIO', 'RESULTADO', 'CAMPEONATO', 'EVENTO', 'JUIZ', 'PEÃO', 'TOURO', 'CIA', 'BOIADA', 'PONTOS', 'TEMPO', 'STATUS', 'ORDEM', 'CIDADE', 'ESTADO'];

  const reserveKeywords = [
    'ANIMAIS RESERVAS', 'ANIMAIS RESERVA', 'ANIMAL RESERVA', 'ANIMAL RESERVAS',
    'TOUROS RESERVAS', 'TOUROS RESERVA', 'TOURO RESERVA', 'TOURO RESERVAS',
    'RESERVA', 'RESERVAS', 'REPETE', 'REPETES', 'RE-RIDE', 'RERIDE', 'RR'
  ];

  let inReserveSection = false;

  lines.forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 3) return;

    const upper = cleanLine.toUpperCase();

    // Check if header line
    if (ignoreWords.some(w => upper.startsWith(w) && cleanLine.length < 30)) {
      if (upper.includes('SORTEIO') || upper.includes('RANKING') || upper.includes('COMPETIDOR')) {
        inReserveSection = false;
      }
      return;
    }

    // Detect reserve / repete section headers
    if (reserveKeywords.some(kw => upper.includes(kw))) {
      if (cleanLine.length < 45 && !upper.includes('VS') && !upper.includes(' X ') && !upper.includes('|')) {
        inReserveSection = true;
        return;
      }
    }

    const parts = cleanLine.split(/\s{2,}|\t|\||;/).map(p => p.trim()).filter(Boolean);
    const numMatches = cleanLine.match(/\b\d{1,2}(?:[\.,]\d{1,2})?\b/g) || [];
    const numbers = numMatches.map(n => parseFloat(n.replace(',', '.')));

    if (parts.length >= 1) {
      const firstPartClean = parts[0].replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
      const isRepetePrefix = reserveKeywords.some(kw => firstPartClean.startsWith(kw) || upper.startsWith(kw));

      if (inReserveSection || isRepetePrefix) {
        // Reserve bull line without rider
        const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length >= 2 && p.toUpperCase() !== 'E' && p.toUpperCase() !== 'C');
        const cleanTextParts = textParts.filter(p => {
          const cleanP = p.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
          return !reserveKeywords.some(kw => cleanP.includes(kw));
        });

        if (cleanTextParts.length >= 1) {
          let touro = cleanTextParts[0].replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
          let cia = cleanTextParts[1] ? cleanTextParts[1].trim().toUpperCase() : 'CIA OUTRAS';

          if (touro && touro.length >= 2 && !ignoreWords.includes(touro)) {
            if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
              ciasSet.add(cia);
              tourosMap.set(touro, cia);
            } else if (!tourosMap.has(touro)) {
              tourosMap.set(touro, 'CIA OUTRAS');
            }
          }
        }
        return;
      }

      // Filter out standalone numbers and side letters ('E', 'C' at the end)
      const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length >= 2 && p.toUpperCase() !== 'E' && p.toUpperCase() !== 'C');

      let peao = '';
      let touro = '';
      let cia = '';
      let cidade = '';

      // Check if one of the textParts is a City with state suffix (e.g. VILA RICA-MT, GUAIRA-SP, MIGUELOPOLIS-SP)
      const cityIdx = textParts.findIndex(p => /-[A-Z]{2}$/i.test(p.trim()));

      if (cityIdx > 0) {
        peao = textParts.slice(0, cityIdx).join(' ');
        cidade = textParts[cityIdx];
        touro = textParts[cityIdx + 1] || '';
        cia = textParts[cityIdx + 2] || '';
      } else if (textParts.length >= 4) {
        peao = textParts[0];
        cidade = textParts[1];
        touro = textParts[2];
        cia = textParts[3];
      } else if (textParts.length === 3) {
        peao = textParts[0];
        touro = textParts[1];
        cia = textParts[2];
      } else if (textParts.length === 2) {
        peao = textParts[0];
        touro = textParts[1];
      }

      peao = peao.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
      touro = touro.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
      cia = cia.trim().toUpperCase();

      // Ignore if peao is actually a repete / reserve keyword
      if (reserveKeywords.some(kw => peao.includes(kw))) {
        if (touro && touro.length >= 2 && !ignoreWords.includes(touro)) {
          if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
            ciasSet.add(cia);
            tourosMap.set(touro, cia);
          } else if (!tourosMap.has(touro)) {
            tourosMap.set(touro, 'CIA OUTRAS');
          }
        }
        return;
      }

      if (peao && peao.length >= 3 && !ignoreWords.includes(peao)) {
        peoesSet.add(peao);

        if (touro && touro.length >= 3 && !ignoreWords.includes(touro)) {
          if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
            ciasSet.add(cia);
            tourosMap.set(touro, cia);
          } else if (!tourosMap.has(touro)) {
            tourosMap.set(touro, 'CIA OUTRAS');
          }

          let score = 0;
          let tempo = 8.0;
          let status = 'ativa';

          if (upper.includes('QUEDA') || upper.includes('ZERO') || upper.includes('0,00') || upper.includes('0.00')) {
            status = 'queda';
            score = 0;
          } else if (upper.includes('RERIDE') || upper.includes('RE-RIDE')) {
            status = 'reride';
          } else if (numbers.length > 0) {
            const validScores = numbers.filter(n => n > 50 && n <= 100);
            if (validScores.length > 0) {
              score = validScores[0];
            }
          }

          items.push({
            peao,
            cidade,
            touro,
            cia: cia || tourosMap.get(touro) || 'CIA OUTRAS',
            status,
            tempo,
            totalPeao: score > 0 ? Math.round(score / 2) : 0,
            totalTouro: score > 0 ? Math.round(score / 2) : 0,
            total: score,
          });
        }
      }
    }
  });

  const detectedTouros: { nome: string; cia: string }[] = [];
  tourosMap.forEach((cia, nome) => {
    detectedTouros.push({ nome, cia });
  });

  return {
    rawText,
    items,
    detectedPeoes: Array.from(peoesSet),
    detectedTouros,
    detectedCias: Array.from(ciasSet),
    suggestedDay,
  };
}
