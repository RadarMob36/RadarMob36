# Trends Brasil (Node.js, sem Claude)

## Rodar local

```bash
npm start
```

Depois abra:

`http://127.0.0.1:3000`

## Como funciona

- Backend busca trends em fontes abertas (RSS/Google News/Google Trends)
- Inclui sinais de X/Twitter via RSS do Google News (sem API paga do X)
- Filtra automaticamente para data de hoje (America/Sao_Paulo)
- Frontend mostra resultados em tempo real ao abrir e ao clicar em atualizar
- Pulso instantâneo global (no servidor) com multi-linhas por assunto e movers
