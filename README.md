# MERIDIAN FINANCE

**Financeiro, pagamentos, aprovações e conciliação**

Sistema financeiro do Grupo Alvim. Produto separado do Meridian operacional e do ImpSheet.

Este repositório começa limpo de propósito. O ImpSheet continua com automações de planilha e o mockup antigo. O Meridian (`Check_visaodono`) continua operacional. O FreeControl continua com folha e pessoas.

## O que este sistema é

Ciclo financeiro:

documento / evento operacional → obrigação → vencimento → classificação → aprovação → pagamento → conciliação

## O que este sistema não é

- Não é o Meridian operacional (estoque, NF de entrada, operação da loja)
- Não é o FreeControl (ponto, folha, PIX da pessoa)
- Não é o F360 (só usamos o plano de contas como referência)
- A IA não movimenta dinheiro sozinha. Ela prepara. O financeiro revisa. O Felipe autoriza.

## Relação com os outros sistemas

| Sistema | Papel |
|---|---|
| Meridian | Operação. Ex.: NF recebida na loja |
| FreeControl | Pessoas e labor. Ex.: lote FREE / folha |
| Meridian Finance | Obrigação de pagar, aprovação, pagamento, conciliação |

Loja se identifica por `bk_number`. Origem da despesa não é necessariamente a conta que paga.

## Banco

Database `meridian_finance` na mesma instância Postgres do Meridian. Sem foreign key para tabelas do Meridian. Sem schema dentro de `vision_check`.

Detalhe das decisões: [docs/ARQUITETURA.md](docs/ARQUITETURA.md)

## Status

Projeto criado. Implementação ainda não começou.
