# MERIDIAN FINANCE

**Financeiro, pagamentos, aprovações e conciliação**

Domínio financeiro do Grupo Alvim. A **UI do dia a dia** é o módulo **Financeiro** no portal Meridian (`Check_visaodono` → `/financeiro/*`). Este repo é a API, scripts e docs.

## Uso diário

1. Portal Meridian (UI + sessão)
2. API deste repo na porta **5080** (`npm start`) — proxy `/api/financeiro/*`
3. Ver [docs/CUTOVER.md](docs/CUTOVER.md)

Não use o Vite isolado (`5176`) no fluxo diário.

## O que este sistema é

documento / evento operacional → obrigação → vencimento → classificação → aprovação → pagamento → conciliação

## O que este sistema não é

- Não é o Meridian operacional (estoque, NF de entrada, operação da loja)
- Não é o FreeControl (ponto, folha, PIX da pessoa)
- A IA não movimenta dinheiro sozinha. Ela prepara. O financeiro revisa. O Felipe autoriza.

## Banco

Schema **`finance`** em `vision_check` (mesma instância). Sem FK para `public` operacional.

```bash
npm run migrate:finance-schema
```

Legacy: `FINANCE_DB_NAME=meridian_finance` + `FINANCE_SCHEMA=0`.

Detalhe: [docs/ARQUITETURA.md](docs/ARQUITETURA.md) · [docs/BANCO.md](docs/BANCO.md) · [docs/CUTOVER.md](docs/CUTOVER.md).
