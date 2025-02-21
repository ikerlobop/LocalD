const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware para permitir CORS y parsear JSON
app.use(cors());
app.use(express.json());

// Endpoint para enviar preguntas al modelo LLaMA 3
app.post('/ask', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'No question provided' });
    }

    try {
        // Enviar la pregunta a Ollama
        const ollamaUrl = 'http://localhost:11434/api/generate';
        const payload = {
            model: 'llama3',
            prompt: question,
            stream: false,
        };

        const response = await axios.post(ollamaUrl, payload);
        res.json(response.data);
    } catch (error) {
        console.error('Error communicating with Ollama:', error);
        res.status(500).json({ error: 'Failed to get response from Ollama' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});