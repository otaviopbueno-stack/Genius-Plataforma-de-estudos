export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Define os IDs disponíveis no sistema
  const assistants = {
    default: process.env.OPENAI_ASSISTANT_ID,       // Gerador de Questões
    auditor: process.env.OPENAI_ASSISTANT_ID_AUDITOR // Auditor de Conteúdo
  };

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key não configurada.' });
  }

  // Cabeçalhos Anti-Cache
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  // --- MODO VERIFICAÇÃO (GET) ---
  // Verifica se o agente (qualquer um) terminou
  if (req.method === 'GET') {
    const { threadId, runId } = req.query;
    if (!threadId || !runId) return res.status(400).json({ error: 'IDs faltando' });

    try {
      const runCheck = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: { "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" }
      });
      const runStatus = await runCheck.json();

      if (runStatus.status === 'completed') {
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

      return res.status(200).json({ status: 'in_progress' });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- MODO INÍCIO (POST) ---
  // Inicia o agente específico
  if (req.method === 'POST') {
    try {
      // Descobre qual agente usar (padrão é o gerador)
      const agentType = req.body.agentType || 'default';
      const selectedAssistantId = assistants[agentType];

      if (!selectedAssistantId) {
        return res.status(400).json({ error: `Agente '${agentType}' não configurado no servidor.` });
      }

      // 1. Cria Thread
      const threadResp = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ messages: [{ role: "user", content: req.body.messages[0].content }] })
      });
      const thread = await threadResp.json();

      // 2. Inicia Run com o Assistente Escolhido
      const runResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ assistant_id: selectedAssistantId })
      });
      const run = await runResp.json();

      return res.status(200).json({ threadId: thread.id, runId: run.id });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
