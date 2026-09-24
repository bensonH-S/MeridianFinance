# Banco — núcleo

Database `meridian_finance`. Sem foreign key para o Meridian. Script: `db/001_nucleo.sql`.

As planilhas e o PDF ficam na pasta `Dados Grupo Alvim/`, fora do Git. Elas têm conta, CPF e chave PIX.

## O que cada arquivo ensinou

| Arquivo | O que é | O que entra |
|---|---|---|
| `DADOS LOJAS ATUALIZADO- 2026.xlsx` | 24 empresas | Razão social, CNPJ, IE, endereço. 21 lojas com `bk_number`. Sem BK: Alvim Participações, KING e SUPER KING (holding). |
| `CONTAS BANCO DO BRASIL - GA.pdf` | 20 lojas | Banco do Brasil, mesma agência, conta por loja. Liga pelo CNPJ. |
| `DADOS ITAÚ- 2026.xlsx` | 22 contas | Itaú, mesma agência, conta por empresa. Liga pelo CNPJ. |
| `PlanoDeContas (4).xlsx` | 180 contas | 168 a pagar, 12 a receber. A chave é o **nome**. Códigos contábeis vieram vazios. Quase nada marcado como fixa ou variável. |
| `Dados fornecedor.xlsx` | 955 cadastros do F360 | Nome, CPF/CNPJ, plano padrão (pelo nome), PIX e conta de destino. A maior parte é gente: salário, mão de obra temporária, treinamento. |
| `08.CX REI ALVIM 2026.xls` | Caixa de agosto da Rei | Como a despesa nasce e como se paga. |

## Formas de pagamento

No caixa da Rei a forma não é uma coluna. É a aba:

- **dinheiro** — aba DESPESAS: vale e meta, pagos no caixa da loja.
- **online** — aba ONLINE: rescisão e vale, pagos por transferência.
- **boleto** — aba C_O_: fornecedor e custo fixo com vencimento (aluguel, Gimba, Platlog).
- **guia** — aba C_O_, bloco de impostos: FGTS, GPS, DARF, PIS/COFINS.

O plano de contas da despesa sai do nome usado ali (ALUGUEL, FGTS, BEBIDAS) e do plano padrão do fornecedor.

## Duas contas diferentes

`contas_bancarias` é a conta **nossa**, de onde o dinheiro sai. Uma loja pode ter Itaú e Banco do Brasil.

`fornecedor_pagamentos` é a conta **deles**, para onde o PIX ou a TED vai. Não mistura com a conta de saída.

Origem e saída continuam separadas: a despesa nasce numa empresa (`empresa_origem_id`) e pode sair de outra conta (`conta_saida_id`).
