# Arquitetura — Meridian Finance

Decisões de produto. O esquema do núcleo está em `docs/BANCO.md` e `db/001_nucleo.sql`.

Produto: **MERIDIAN FINANCE**
Slogan: **Financeiro, pagamentos, aprovações e conciliação**

## 1. Produto separado

Meridian Finance é um sistema novo. O Meridian operacional e o FreeControl continuam donos da operação. O financeiro recebe eventos e devolve status.

Fronteira:

- Meridian: “a NF 5820 entrou na Rei”
- Meridian Finance: “obrigação de R$ 10.710, boleto, vence dia 18, sai do Itaú da Rei, Felipe ainda não autorizou”

Operacional não marca pago. Financeiro não dá entrada de estoque.

## 2. Banco — opção B

| Opção | Veredito |
|---|---|
| A. mesmo database + schemas (`vision_check.finance.*`) | Não |
| B. database `meridian_finance` na mesma instância Postgres | Sim |
| C. instância/cloud à parte + só API | Depois, se o produto crescer |

IDs externos (`bk_number`, `nfe_id`, `employee_id`) + snapshot. Nunca JOIN nas tabelas do Meridian.

Integração no começo: HTTP autenticado + outbox no emissor. Sem event bus no MVP.

## 3. Responsabilidades

**Meridian / FreeControl**

- Receber mercadoria e registrar a NF
- Estoque e conferência
- Ponto, folha, FREE, TREIN, vale, meta
- Pessoa e chave PIX
- Operação da loja

**Meridian Finance**

- Obrigação de pagar (qualquer origem, não só NF)
- Vencimento, classificação, conta de saída
- Duplicidade, preparação, aprovação
- Pacote para o banco / Felipe
- Conciliação e auditoria

## 4. Cadastros mestres

Não duplicar o conceito. Pode haver cópia local, sincronizada por chave estável.

| Dado | Dono | Uso no Meridian Finance |
|---|---|---|
| Loja / CNPJ / BKN | Meridian | Cópia local por `bk_number` |
| Usuário operacional | Meridian / FreeControl | Não entra aqui |
| Usuário financeiro / Felipe | Meridian Finance | Cadastro próprio |
| Fornecedor PJ | Meridian Finance (CNPJ da NF ajuda) | Cadastro financeiro |
| Pessoa / PIX | FreeControl | Referência + snapshot |
| Plano de contas | Meridian Finance (lista herdada do F360) | Referência |

## 5. Estados da despesa

```
rascunho → classificada → pronta → autorizada → enviada → paga → conciliada
```

Laterais: `bloqueada_duplicata`, `aguardando_transferencia`, `cancelada`, `faltou`.

Origem da despesa ≠ conta que paga. Labor pode nascer na Rei e sair do Itaú KING.

## 6. Aprovação

1. Financeiro prepara (`rascunho` → `pronta`)
2. Felipe autoriza (`pronta` → `autorizada`)

IA classifica, detecta duplicata, sugere conta, monta lote. IA não autoriza e não envia ao banco.

## 7. Automação futura

1. Classificar + duplicata + vencimento/conta
2. Preparar o lote (hoje: planilha BANCO)
3. Importar extrato e marcar conciliada
4. Open Finance
5. Agente envia PIX/boleto só depois da autorização do Felipe

## 8. MVP

Entra: despesa de qualquer tipo, origem ≠ conta, dois papéis, trava de duplicata, vencidas sem pagar, marcar conciliada, NF do Meridian vira rascunho, labor do FreeControl, plano de contas.

Fica depois: Open Finance, agente pagando, boleto no app da loja, iFood/BK Office, SSO, schema compartilhado.

Ordem: núcleo → evento NF → labor → pacote Felipe → conciliação com extrato importado.
