"""Cadastra as despesas das planilhas semanais de banco (sábado a sábado).

Lê os xlsx de Dados Grupo Alvim e envia para a API que já fala com o banco.
Não grava de novo uma linha com o mesmo documento_ref.
"""

from __future__ import annotations

import json
import unicodedata
import urllib.request
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
PASTA = ROOT / "Dados Grupo Alvim" / "05. BANCO 2026" / "09. SETEMBRO 2026"
ARQUIVOS = [
    "03. BANCO 12.09 A 19.09.xlsx",
    "04. BANCO 19.09 A 26.09.xlsx",
]
API = "https://grupoalvim.com.br/financas/api"
GUIAS = {"GPS", "FGTS", "DARF", "PIS", "COFINS", "INSS", "DAS", "SIMPLES", "GUIA"}
ALIASES = {
    "POPOYES VAL": "POPVAL",
    "KING ASSESSORIA": "KING",
    "SUPER KING": "SUPER KING",
    "ALVIM PARTICIPACOES": "ALVIM PARTICIPACOES",
}


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.upper().split())


def forma(descricao: str, codigo: str) -> str:
    nome = norm(descricao)
    codigo_n = norm(codigo)
    token = nome.split(" ", 1)[0] if nome else ""
    if "FOLHA" in codigo_n or nome.startswith("FREE") or "FERIADO" in nome or nome.startswith("VALE"):
        return "folha"
    if token in GUIAS:
        return "guia"
    return "boleto"


def api_json(method: str, path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def loja_id(header: str, empresas: dict[str, str]) -> str | None:
    chave = norm(header)
    alvo = ALIASES.get(chave, chave.split(" ", 1)[0])
    return empresas.get(alvo)


def linhas(path: Path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    loja = None
    semana = path.name.split(".", 1)[0]
    for row in ws.iter_rows(min_col=1, max_col=5, values_only=True):
        nf, nome, valor, vencimento, codigo = (tuple(row) + (None,) * 5)[:5]
        if isinstance(nome, str) and norm(str(valor)) == "VALOR":
            loja = nome.strip()
            continue
        if not isinstance(nome, str) or not nome.strip():
            continue
        if norm(nome).startswith("TOTAL"):
            continue
        if not isinstance(valor, (int, float)):
            continue
        data = None
        if isinstance(vencimento, datetime):
            data = vencimento.date().isoformat()
        nf_txt = "" if nf is None else str(nf).strip()
        if nf_txt.endswith(".0"):
            nf_txt = nf_txt[:-2]
        doc = f"BANCO-{semana}|{norm(loja or '')}|{nf_txt}|{norm(nome)}|{valor:.2f}|{data or ''}"
        yield {
            "loja": loja,
            "descricao": nome.strip(),
            "valor": round(float(valor), 2),
            "vencimento": data,
            "documento_ref": doc,
            "forma_pagamento": forma(nome, "" if codigo is None else str(codigo)),
        }
    wb.close()


def main() -> None:
    empresas = {norm(e["apelido"]): e["id"] for e in api_json("GET", "/empresas")}
    existentes = {d.get("documento_ref") for d in api_json("GET", "/despesas") if d.get("documento_ref")}
    criadas = 0
    puladas = 0
    sem_loja: dict[str, int] = {}
    for nome in ARQUIVOS:
        for item in linhas(PASTA / nome):
            empresa = loja_id(item["loja"] or "", empresas)
            if not empresa:
                sem_loja[item["loja"] or "?"] = sem_loja.get(item["loja"] or "?", 0) + 1
                continue
            if item["documento_ref"] in existentes:
                puladas += 1
                continue
            corpo = {
                "descricao": item["descricao"],
                "valor": item["valor"],
                "vencimento": item["vencimento"],
                "documento_ref": item["documento_ref"],
                "forma_pagamento": item["forma_pagamento"],
                "empresa_origem_id": empresa,
            }
            api_json("POST", "/despesas", corpo)
            existentes.add(item["documento_ref"])
            criadas += 1
            if criadas % 50 == 0:
                print("criadas", criadas, flush=True)
    print("criadas", criadas)
    print("ja existiam", puladas)
    print("sem empresa", json.dumps(sem_loja, ensure_ascii=False))


if __name__ == "__main__":
    main()
