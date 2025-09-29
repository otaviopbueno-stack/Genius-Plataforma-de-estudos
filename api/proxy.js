export default async function handler(req, res) {
  // 1. Assegura que o pedido é um POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2. Obtém os dados do pedido do frontend
  const { prompt, isJson } = req.body;

  // 3. Obtém a chave da API das Environment Variables do Vercel (seguro)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
  }

  const apiUrl = `https://api.openai.com/v1/chat/completions`;

  const payload = {
      model: "gpt-4o",
      messages: [{"role": "user", "content": prompt}],
      ...(isJson && { response_format: { "type": "json_object" } }),
  };

  try {
    // 4. Faz a chamada à API da OpenAI a partir do servidor
    const openaiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("Erro da API da OpenAI:", errorData);
      return res.status(openaiResponse.status).json({ error: `Erro da API da OpenAI: ${errorData.error.message}` });
    }

    const data = await openaiResponse.json();
    
    // 5. Envia a resposta da OpenAI de volta para o frontend
    res.status(200).json(data);

  } catch (error) {
    console.error('Erro no proxy da API:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao processar o seu pedido.' });
  }
}
