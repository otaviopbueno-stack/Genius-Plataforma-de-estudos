InsFlow - Plataforma de Estudos Inteligente 🧠

Aplicação web focada na preparação para o ENEM e Vestibulares, utilizando Inteligência Artificial para gerar conteúdo personalizado, questões inéditas e correções de redação.

🚀 Funcionalidades

Gerador de Questões: Criação de questões inéditas com base em tópicos ou textos de apoio (PDFs do Firebase).

Assistente de Redação: Correção e sugestão de melhorias.

Conteúdo Didático: Resumos e explicações de matérias.

🛠️ Estrutura do Projeto

index.html: O aplicativo (Frontend).

api/chat.js: Backend Serverless (Vercel) para proteger a API Key.

vercel.json: Configuração de deploy.

🔒 Configuração (Vercel)

Este projeto utiliza uma Serverless Function para ocultar a chave da OpenAI.

Faça o fork/clone deste repositório.

Importe o projeto na Vercel.

Nas configurações do projeto na Vercel (Settings > Environment Variables), adicione:

Key: OPENAI_API_KEY

Value: sua-chave-sk-...

Faça o deploy.

⚠️ Uso Local

Se rodar localmente sem o ambiente Vercel, o aplicativo solicitará a chave API diretamente no navegador e a salvará no localStorage.
