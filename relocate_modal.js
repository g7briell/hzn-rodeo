const fs = require('fs');
const file = 'portal/src/App.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const modalStartLine = lines.findIndex(l => l.includes('MODAL DE PERFIL DO COMPETIDOR')) - 1; // get the ======= line
const modalEndLine = lines.findIndex((l, i) => i > modalStartLine && l.includes('MODAL DE CADASTRO')) - 1;

if (modalStartLine > 0 && modalEndLine > modalStartLine) {
    const modalLines = lines.slice(modalStartLine, modalEndLine);
    
    // Remove modal from current location
    lines.splice(modalStartLine, modalEndLine - modalStartLine);

    // Find insertion point
    const insertPoint = lines.findIndex(l => l.includes('if (publicProfileSlug) {')) - 5; 
    // it's right before:
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }
    
    lines.splice(insertPoint, 0, ...modalLines);
    
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Successfully relocated modal JSX to line ' + insertPoint);
} else {
    console.log('Failed to find modal lines');
}
