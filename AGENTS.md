# MERIDIAN FINANCE

Financeiro, pagamentos, aprovações e conciliação.

Módulo do portal **Meridian** (`Check_visaodono` → `/financeiro/*`). Este repo permanece como API/lib e scripts de migração — **não** use o Vite isolado no dia a dia.

- Meridian: operação (estoque, NF, loja) + shell do portal
- FreeControl: pessoas e labor
- Financeiro (este domínio): obrigação, aprovação, pagamento, conciliação — schema `vision_check.finance`
- IA prepara. Financeiro revisa. Felipe autoriza. IA não move dinheiro.

Banco: schema **`finance`** em `vision_check`, sem FK para o operacional.

Decisões: `docs/ARQUITETURA.md`. Cutover: `docs/CUTOVER.md`.
