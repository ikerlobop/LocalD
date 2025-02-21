const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 5000;

// Conectar a la base de datos (o crearla si no existe)
const db = new sqlite3.Database('./conversations.db');

// Crear la tabla para almacenar las conversaciones
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

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
        // Guardar la pregunta del usuario en la base de datos
        db.run(
            'INSERT INTO conversations (role, content) VALUES (?, ?)',
            ['user', question],
            function (err) {
                if (err) {
                    console.error('Error saving user question:', err);
                    return res.status(500).json({ error: 'Failed to save conversation' });
                }

                // Recuperar el historial de conversaciones
                db.all('SELECT role, content FROM conversations ORDER BY timestamp', async (err, rows) => {
                    if (err) {
                        console.error('Error retrieving conversation history:', err);
                        return res.status(500).json({ error: 'Failed to retrieve conversation history' });
                    }

                    // Construir el contexto con el historial de conversaciones
                    let context = '';
                    rows.forEach((entry) => {
                        context += `${entry.role === 'user' ? 'Tú' : 'LLaMA 3'}: ${entry.content}\n`;
                    });

                    // Enviar la pregunta y el contexto a Ollama
                    const ollamaUrl = 'http://localhost:11434/api/generate';
                    const payload = {
                        model: 'llama3',
                        prompt: context,
                        stream: false,
                    };

                    const response = await axios.post(ollamaUrl, payload);

                    // Guardar la respuesta del modelo en la base de datos
                    db.run(
                        'INSERT INTO conversations (role, content) VALUES (?, ?)',
                        ['assistant', response.data.response],
                        function (err) {
                            if (err) {
                                console.error('Error saving model response:', err);
                                return res.status(500).json({ error: 'Failed to save conversation' });
                            }

                            // Devolver la respuesta al frontend
                            res.json(response.data);
                        }
                    );
                });
            }
        );
    } catch (error) {
        console.error('Error communicating with Ollama:', error);
        res.status(500).json({ error: 'Failed to get response from Ollama' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});