"""Apaga as duas semanas importadas e cadastra só a de 19/09 a 26/09."""

from __future__ import annotations

import json
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

import openpyxl

API = "https://grupoalvim.com.br/financas/api"
ARQUIVO = Path(__file__).resolve().parents[1] / "Dados Grupo Alvim" / "05. BANCO 2026" / "09. SETEMBRO 2026" / "04. BANCO 19.09 A 26.09.xlsx"
SEMANA = "2026-09-19"
APAGAR = {"2026-09-12", "2026-09-19"}
ALIASES = {
    "POPOYES VAL": "POPVAL",
    "KING ASSESSORIA": "KING",
    "SUPER KING": "SUPER KING",
    "ALVIM PARTICIPACOES": "ALVIM PARTICIPACOES",
}
GUIAS = {"GPS", "FGTS", "DARF", "PIS", "COFINS", "INSS", "DAS", "SIMPLES", "GUIA"}
PREFIXOS = ("FREE FERIADOS", "REEMB FERIADOS", "FERIADOS", "REEMB", "TREIN", "FREE")


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.upper().replace("+", " ").replace("-", " ").split())


def api(method: str, path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def forma(descricao: str, codigo: str) -> str:
    nome = norm(descricao)
    codigo_n = norm(codigo)
    token = nome.split(" ", 1)[0] if nome else ""
    if "FOLHA" in codigo_n or nome.startswith("FREE") or "FERIADO" in nome or nome.startswith("VALE"):
        return "folha"
    if token in GUIAS:
        return "guia"
    return "boleto"


def pessoa(descricao: str) -> str:
    nome = norm(descricao)
    for prefixo in PREFIXOS:
        if nome.startswith(prefixo + " "):
            return nome[len(prefixo) + 1:]
    return ""


def escolher(alvo: str, hits: list[dict]) -> dict | None:
    melhor = None
    for item in hits:
        nome = norm(item["nome"])
        if nome == alvo:
            return item
        if alvo.startswith(nome) or nome.startswith(alvo) or alvo in nome or nome in alvo:
            if melhor is None or len(nome) > len(norm(melhor["nome"])):
                melhor = item
    return melhor


def fornecedor(descricao: str, cache: dict[str, dict | None]) -> dict | None:
    alvos = []
    nome_pessoa = pessoa(descricao)
    if nome_pessoa:
        alvos.append(nome_pessoa)
    alvos.append(norm(descricao))
    token = norm(descricao).split(" ", 1)[0]
    if token and token not in alvos:
        alvos.append(token)
    chave = "|".join(alvos)
    if chave in cache:
        return cache[chave]
    hits = []
    for alvo in alvos:
        if len(alvo) < 2:
            continue
        hits.extend(api("GET", "/fornecedores?q=" + urllib.parse.quote(alvo[:40])))
    achado = None
    for alvo in alvos:
        achado = escolher(alvo, hits)
        if achado:
            break
    cache[chave] = achado
    return achado


def linhas():
    wb = openpyxl.load_workbook(ARQUIVO, read_only=True, data_only=True)
    loja = None
    for row in wb.active.iter_rows(min_col=1, max_col=5, values_only=True):
        nf, nome, valor, vencimento, codigo = (tuple(row) + (None,) * 5)[:5]
        if isinstance(nome, str) and norm(valor) == "VALOR":
            loja = nome.strip()
            continue
        if not loja or not isinstance(nome, str) or norm(nome).startswith("TOTAL"):
            continue
        if not isinstance(valor, (int, float)):
            continue
        data = vencimento.date().isoformat() if isinstance(vencimento, datetime) else None
        nf_txt = "" if nf is None else str(nf).strip()
        if nf_txt.endswith(".0"):
            nf_txt = nf_txt[:-2]
        yield {
            "loja": loja,
            "descricao": nome.strip(),
            "valor": round(float(valor), 2),
            "vencimento": data,
            "documento_ref": nf_txt or None,
            "forma_pagamento": forma(nome, "" if codigo is None else str(codigo)),
        }
    wb.close()


def main() -> None:
    atuais = api("GET", "/despesas")
    apagar = [d for d in atuais if d.get("competencia") in APAGAR]
    for i, item in enumerate(apagar, 1):
        api("DELETE", f"/despesas/{item['id']}")
        if i % 100 == 0:
            print("apagadas", i, flush=True)
    print("apagadas", len(apagar), flush=True)

    empresas = {norm(e["apelido"]): e["id"] for e in api("GET", "/empresas")}
    planos = {norm(p["nome"]): p["id"] for p in api("GET", "/plano")}
    cache: dict[str, dict | None] = {}
    criadas = sem_loja = com_fornecedor = 0
    faltando: dict[str, int] = {}
    for item in linhas():
        chave = norm(item["loja"])
        empresa = empresas.get(ALIASES.get(chave, chave.split(" ", 1)[0]))
        if not empresa:
            sem_loja += 1
            faltando[item["loja"]] = faltando.get(item["loja"], 0) + 1
            continue
        cadastro = fornecedor(item["descricao"], cache)
        plano_id = None
        if cadastro and cadastro.get("plano_conta_id"):
            plano_id = cadastro["plano_conta_id"]
        else:
            nome = norm(item["descricao"])
            plano_id = planos.get(nome) or planos.get(nome.split(" ", 1)[0])
        api("POST", "/despesas", {
            "descricao": item["descricao"],
            "valor": item["valor"],
            "vencimento": item["vencimento"],
            "documento_ref": item["documento_ref"],
            "forma_pagamento": item["forma_pagamento"],
            "empresa_origem_id": empresa,
            "fornecedor_id": cadastro["id"] if cadastro else None,
            "plano_conta_id": plano_id,
            "competencia": SEMANA,
        })
        criadas += 1
        if cadastro:
            com_fornecedor += 1
        if criadas % 50 == 0:
            print("criadas", criadas, flush=True)
    print("criadas", criadas)
    print("com fornecedor", com_fornecedor)
    print("sem loja", json.dumps(faltando, ensure_ascii=False))


if __name__ == "__main__":
    main()
