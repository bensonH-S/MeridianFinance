"""Grava a semana do banco (sábado) em cada despesa importada.

A API publicada ainda não altera competencia no PATCH, mas grava no cadastro.
Então a linha antiga sai e entra outra igual, com a semana certa.
"""

from __future__ import annotations

import json
import unicodedata
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import openpyxl

API = "https://grupoalvim.com.br/financas/api"
PASTA = Path(__file__).resolve().parents[1] / "Dados Grupo Alvim" / "05. BANCO 2026" / "09. SETEMBRO 2026"
SEMANAS = [
    ("04. BANCO 19.09 A 26.09.xlsx", "2026-09-19"),
    ("03. BANCO 12.09 A 19.09.xlsx", "2026-09-12"),
]
ALIASES = {
    "POPOYES VAL": "POPVAL",
    "KING ASSESSORIA": "KING",
    "SUPER KING": "SUPER KING",
    "ALVIM PARTICIPACOES": "ALVIM PARTICIPACOES",
}


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.upper().split())


def api(method: str, path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def loja_key(header: str) -> str:
    chave = norm(header)
    return ALIASES.get(chave, chave.split(" ", 1)[0])


def linhas(path: Path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    loja = None
    for row in wb.active.iter_rows(min_col=1, max_col=5, values_only=True):
        nf, nome, valor, venc, _codigo = (tuple(row) + (None,) * 5)[:5]
        if isinstance(nome, str) and norm(valor) == "VALOR":
            loja = loja_key(nome)
            continue
        if not loja or not isinstance(nome, str) or norm(nome).startswith("TOTAL"):
            continue
        if not isinstance(valor, (int, float)):
            continue
        data = venc.date().isoformat() if isinstance(venc, datetime) else ""
        yield loja, norm(nome), round(float(valor), 2), data
    wb.close()


def main() -> None:
    despesas = api("GET", "/despesas")
    pool = defaultdict(list)
    for item in despesas:
        chave = (norm(item["origem"]), norm(item["descricao"]), round(float(item["valor"]), 2), item.get("vencimento") or "")
        pool[chave].append(item)
    feitas = 0
    for arquivo, semana in SEMANAS:
        for loja, nome, valor, data in linhas(PASTA / arquivo):
            fila = pool[(loja, nome, valor, data)]
            if not fila:
                continue
            atual = fila.pop(0)
            if atual.get("competencia") == semana:
                continue
            api("PATCH", f"/despesas/{atual['id']}", {
                "descricao": atual["descricao"],
                "valor": atual["valor"],
                "vencimento": atual["vencimento"],
                "documento_ref": None,
                "forma_pagamento": atual["forma_pagamento"],
                "empresa_origem_id": atual["origem_id"],
                "fornecedor_id": atual.get("fornecedor_id"),
                "plano_conta_id": atual.get("plano_conta_id"),
                "conta_saida_id": atual.get("conta_saida_id"),
            })
            api("POST", "/despesas", {
                "descricao": atual["descricao"],
                "valor": atual["valor"],
                "vencimento": atual["vencimento"],
                "documento_ref": atual.get("documento_ref"),
                "forma_pagamento": atual["forma_pagamento"],
                "empresa_origem_id": atual["origem_id"],
                "fornecedor_id": atual.get("fornecedor_id"),
                "plano_conta_id": atual.get("plano_conta_id"),
                "conta_saida_id": atual.get("conta_saida_id"),
                "competencia": semana,
            })
            api("DELETE", f"/despesas/{atual['id']}")
            feitas += 1
            if feitas % 50 == 0:
                print("semanas", feitas, flush=True)
    print("semanas", feitas)


if __name__ == "__main__":
    main()
