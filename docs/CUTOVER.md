# Cutover — portal único + schema `finance`

## Uso diário

1. Suba o **Meridian** (`Check_visaodono`): API + frontend.
2. Suba a API Finance (`npm start` neste repo, porta **5080**) — o portal faz proxy em `/auditoria/api/financeiro/*`.
3. Abra o portal Meridian → menu **FINANCEIRO** (`/financeiro/...`).
4. Permissão: `financeiro.ver` (migration `191_finance_schema.sql` + catálogo no boot).

**Não** abra mais `http://localhost:5176` (app Azimut isolado) no fluxo diário.

## Banco

```bash
# No Check_visaodono
npm run migrate   # inclui 191_finance_schema.sql

# Neste repo — copia meridian_finance.public → vision_check.finance
node scripts/migrar-para-schema-finance.mjs
```

Pool Finance (padrão): `DB_NAME` / `vision_check` + `search_path=finance,public`.

Rollback temporário:

```
FINANCE_DB_NAME=meridian_finance
FINANCE_SCHEMA=0
```

Depois de validar Contas a pagar / DDA / caixa, desligue o database `meridian_finance`.

## Variáveis

| Var | Uso |
|---|---|
| `FINANCEIRO_API_URL` | No Meridian: destino do proxy (default `http://127.0.0.1:5080`) |
| `FINANCE_DB_NAME` | DB do pool Finance (default = `DB_NAME` / `vision_check`) |
| `FINANCE_SCHEMA=0` | Desliga `search_path=finance` (legacy DB) |
