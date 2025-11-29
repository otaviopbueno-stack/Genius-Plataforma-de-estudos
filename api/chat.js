export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return res.status(500).json({ error: 'Configuração de API ou Assistant ID ausente no Vercel.' });
  }

  // MODO VERIFICAÇÃO (GET): O site pergunta "Já acabou?"
  if (req.method === 'GET') {
    const { threadId, runId } = req.query;
    if (!threadId || !runId) return res.status(400).json({ error: 'IDs faltando' });

    try {
      // 1. Verifica o status do Run
      const runCheck = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: { "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" }
      });
      const runStatus = await runCheck.json();

      // 2. Se completou, busca a resposta final
      if (runStatus.status === 'completed') {
        const msgResp = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          headers: { "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" }
        });
        const messages = await msgResp.json();
        // Pega a última mensagem do assistente
        const lastMsg = messages.data.find(m => m.role === 'assistant');
        const textResponse = lastMsg.content[0].text.value;
        
        return res.status(200).json({ status: 'completed', response: textResponse });
      } 
      
      // 3. Se falhou
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        return res.status(200).json({ status: 'failed', error: runStatus.last_error });
      }

      // 4. Se ainda está rodando
      return res.status(200).json({ status: 'in_progress' });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // MODO INÍCIO (POST): O site diz "Comece a gerar"
  if (req.method === 'POST') {
    try {
      // 1. Cria a Thread com a mensagem do usuário
      const threadResp = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ messages: [{ role: "user", content: req.body.messages[0].content }] })
      });
      const thread = await threadResp.json();

      // 2. Inicia o Run (Acorda o Agente)
      const runResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ assistant_id: assistantId })
      });
      const run = await runResp.json();

      // 3. Responde IMEDIATAMENTE com os IDs (Não espera o agente pensar)
      return res.status(200).json({ threadId: thread.id, runId: run.id });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
