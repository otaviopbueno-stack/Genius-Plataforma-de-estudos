// Este arquivo roda no servidor da Vercel, não no navegador.
// Ele protege sua API Key.

export default async function handler(req, res) {
  // 1. Verifica se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Pega a chave das Configurações do Vercel
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API Key not configured on server' });
  }

  try {
    // 3. Repassa a requisição para a OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // 4. Devolve a resposta para o seu site
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ error: 'Error fetching from OpenAI' });
  }
}
