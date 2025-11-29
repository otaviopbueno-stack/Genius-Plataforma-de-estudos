export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return res.status(500).json({ error: 'Configuração de API ou Assistant ID ausente.' });
  }

  // 1. Rota de CHECK (Verificar Status) - Rápida (<1s)
  if (req.method === 'GET') {
    const { threadId, runId } = req.query;
    if (!threadId || !runId) return res.status(400).json({ error: 'Faltam IDs' });

    try {
      // Verifica status
      const runCheck = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: { "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" }
      });
      const runStatus = await runCheck.json();

      if (runStatus.status === 'completed') {
        // Se acabou, pega a resposta
        const msgResp = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          headers: { "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" }
        });
        const messages = await msgResp.json();
        const lastMsg = messages.data.find(m => m.role === 'assistant');
        return res.status(200).json({ status: 'completed', response: lastMsg.content[0].text.value });
      } 
      
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        return res.status(200).json({ status: 'failed', error: runStatus.last_error });
      }

      // Ainda rodando
      return res.status(200).json({ status: 'in_progress' });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. Rota de START (Iniciar Conversa) - Rápida (<2s)
  if (req.method === 'POST') {
    try {
      // Cria Thread
      const threadResp = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ messages: [{ role: "user", content: req.body.messages[0].content }] })
      });
      const thread = await threadResp.json();

      // Inicia Run
      const runResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ assistant_id: assistantId })
      });
      const run = await runResp.json();

      // Devolve IDs para o navegador monitorar
      return res.status(200).json({ threadId: thread.id, runId: run.id });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
