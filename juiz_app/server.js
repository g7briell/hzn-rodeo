const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos da pasta atual
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Rota fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RODEOAPP JUIZ] Servidor rodando na porta ${PORT}`);
});
