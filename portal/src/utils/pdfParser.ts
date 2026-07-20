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

/**
 * Intelligently parses rodeo lines into structured entities
 */
export async function parseRodeoPdf(file: File): Promise<ParsePdfResult> {
  const lines = await extractPdfText(file);
  const rawText = lines.join('\n');

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
        const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length >= 2);
        const cleanTextParts = textParts.filter(p => {
          const cleanP = p.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
          return !reserveKeywords.some(kw => cleanP.includes(kw));
        });

        if (cleanTextParts.length >= 1) {
          let touro = cleanTextParts[0].replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
          let cia = cleanTextParts[1] ? cleanTextParts[1].trim().toUpperCase() : 'CIA OUTRAS';

          if (touro && touro.length >= 3 && !ignoreWords.includes(touro)) {
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

      const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length > 2);
      let peao = '';
      let touro = '';
      let cia = '';
      let cidade = '';

      if (textParts.length >= 3) {
        peao = textParts[0];
        touro = textParts[1];
        cia = textParts[2];
        if (textParts[3] && textParts[3].includes('-')) cidade = textParts[3];
      } else if (textParts.length === 2) {
        peao = textParts[0];
        touro = textParts[1];
      }

      peao = peao.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
      touro = touro.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
      cia = cia.trim().toUpperCase();

      // Ignore if peao is actually a repete / reserve keyword
      if (reserveKeywords.some(kw => peao.includes(kw))) {
        if (touro && touro.length >= 3 && !ignoreWords.includes(touro)) {
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
