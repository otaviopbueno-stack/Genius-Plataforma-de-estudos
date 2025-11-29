export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return res.status(500).json({ error: 'Configuração de API ou Assistant ID ausente.' });
  }

  try {
    // 1. Criar uma Thread e adicionar a mensagem do usuário
    // (Para simplificar, criamos uma thread nova a cada requisição, mas o ideal seria persistir o thread_id)
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: req.body.messages[0].content }]
      })
    });
    const thread = await threadResponse.json();

    // 2. Iniciar o Run (Executar o Agente)
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({ assistant_id: assistantId })
    });
    const run = await runResponse.json();

    // 3. Polling (Esperar o Agente pensar, ler arquivos e usar Python)
    // Vercel Serverless tem limite de tempo (geralmente 10s no plano free, 60s no pro).
    // O Agente pode demorar. Este é um loop simples.
    let runStatus = run.status;
    let attempts = 0;
    
    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1s
      attempts++;
      
      if (attempts > 55) throw new Error("Timeout: A IA demorou muito para processar (limite Vercel).");

      const statusCheck = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });
      const statusData = await statusCheck.json();
      runStatus = statusData.status;

      if (runStatus === "failed" || runStatus === "cancelled") {
        throw new Error(`Erro no Agente: ${statusData.last_error?.message || runStatus}`);
      }
    }

    // 4. Buscar as mensagens de resposta
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });
    const messages = await messagesResponse.json();

    // Pegar a última resposta da IA
    const lastMessage = messages.data.filter(msg => msg.role === 'assistant')[0];
    const textResponse = lastMessage.content[0].text.value;

    // Retornar no formato que o frontend espera
    res.status(200).json({
      choices: [{ message: { content: textResponse } }]
    });

  } catch (error) {
    console.error("Erro no Agente:", error);
    res.status(500).json({ error: error.message });
  }
}
