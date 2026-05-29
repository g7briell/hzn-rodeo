const fs = require('fs');

const fixEncoding = (file) => {
    let text = fs.readFileSync(file, 'utf8');
    const map = {
        'Ãƒ': 'Ã',
        'Ãµ': 'õ',
        'Ã§': 'ç',
        'Ãª': 'ê',
        'Ã³': 'ó',
        'Ã¡': 'á',
        'Ã©': 'é',
        'Ã­': 'í',
        'Ãº': 'ú',
        'Ã¢': 'â',
        'Ã´': 'ô',
        'Ã ': 'à',
        'Ã‰': 'É',
        'Ã ': 'Í',
        'Ã“': 'Ó',
        'Ãš': 'Ú',
        'Ã‡': 'Ç',
        'Ã•': 'Õ',
        'Ã‚': 'Â',
        'ÃŠ': 'Ê',
        'Ã”': 'Ô',
        'Ãǟ': 'Ã', // In case
        'PEǟO': 'PEÃO',
        'PEǟ?ES': 'PEÕES',
        'JUǟZES': 'JUÍZES',
        'PRǟXIMO': 'PRÓXIMO',
        'LANǟ?AR': 'LANÇAR',
        'CONFERǟNCIA': 'CONFERÊNCIA',
        'ATUALIZAǟ?ǟO': 'ATUALIZAÇÃO',
        'Sǟ': 'SÓ',
        'VOCǟ': 'VOCÊ',
        'Jǟ': 'JÁ',
        'ESTǟ': 'ESTÁ',
        'ǟLTIMA': 'ÚLTIMA',
        'VERSǟO': 'VERSÃO',
        'CONCLUǟDO': 'CONCLUÍDO',
        'NǟO': 'NÃO',
        'Nǟ\'O': 'NÃO',
        'PRǟMIO': 'PRÊMIO',
        'SǟRIE': 'SÉRIE',
        'PRǟPRIO': 'PRÓPRIO',
        'AUTOMǟTICO': 'AUTOMÁTICO',
        'OPǟ?ǟES': 'OPÇÕES'
    };
    
    // Also manual replacements for the mess we saw in the terminal:
    text = text.replace(/PEÃƒO/g, 'PEÃO');
    text = text.replace(/PEÃ•ES/g, 'PEÕES');
    text = text.replace(/JUÃZES/g, 'JUÍZES');
    text = text.replace(/PRÃ“XIMO/g, 'PRÓXIMO');
    text = text.replace(/LANÃ‡AR/g, 'LANÇAR');
    text = text.replace(/LANÃ‡AMENTO/g, 'LANÇAMENTO');
    text = text.replace(/CONFERÃŠNCIA/g, 'CONFERÊNCIA');
    text = text.replace(/ATUALIZAÃ‡ÃƒO/g, 'ATUALIZAÇÃO');
    text = text.replace(/SÃ³/g, 'SÓ');
    text = text.replace(/VOCÃŠ/g, 'VOCÊ');
    text = text.replace(/JÃ¡/g, 'JÁ');
    text = text.replace(/ESTÃ/g, 'ESTÁ');
    text = text.replace(/ÃšLTIMA/g, 'ÚLTIMA');
    text = text.replace(/VERSÃƒO/g, 'VERSÃO');
    text = text.replace(/CONCLUÃDO/g, 'CONCLUÍDO');
    text = text.replace(/NÃƒO/g, 'NÃO');
    text = text.replace(/PRÃŠMIO/g, 'PRÊMIO');
    text = text.replace(/SÃ‰RIE/g, 'SÉRIE');
    text = text.replace(/PRÃ“PRIO/g, 'PRÓPRIO');
    text = text.replace(/AUTOMÃЃTICO/g, 'AUTOMÁTICO');
    text = text.replace(/OPÃ‡Ã•ES/g, 'OPÇÕES');
    text = text.replace(/PEǟ'O/g, 'PEÃO');
    text = text.replace(/PEǟes/g, 'Peões');
    text = text.replace(/Peǟes/g, 'Peões');
    text = text.replace(/Nǟ'O/g, 'NÃO');
    text = text.replace(/LANǟ\?AR/g, 'LANÇAR');
    text = text.replace(/LANǟ\?AMENTO/g, 'LANÇAMENTO');

    // Simple brute force: Find all occurrences of Ã followed by something in index.html
    text = text.replace(/Ãƒ/g, 'Ã')
               .replace(/Ãµ/g, 'õ')
               .replace(/Ã§/g, 'ç')
               .replace(/Ãª/g, 'ê')
               .replace(/Ã³/g, 'ó')
               .replace(/Ã¡/g, 'á')
               .replace(/Ã©/g, 'é')
               .replace(/Ã­/g, 'í')
               .replace(/Ãº/g, 'ú')
               .replace(/Ã¢/g, 'â')
               .replace(/Ã´/g, 'ô')
               .replace(/Ã /g, 'à')
               .replace(/Ã‰/g, 'É')
               .replace(/Ã /g, 'Í')
               .replace(/Ã“/g, 'Ó')
               .replace(/Ãš/g, 'Ú')
               .replace(/Ã‡/g, 'Ç')
               .replace(/Ã•/g, 'Õ')
               .replace(/Ã‚/g, 'Â')
               .replace(/ÃŠ/g, 'Ê')
               .replace(/Ã”/g, 'Ô');
    
    fs.writeFileSync(file, text, 'utf8');
};

fixEncoding('client_app/index.html');
fixEncoding('client_app/renderer.js');
console.log('Fixed');
