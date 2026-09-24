"""Liga as despesas do banco semanal ao fornecedor e ao plano já cadastrados.

Troca o documento interno BANCO-... pelo número da NF, quando existe.
"""

from __future__ import annotations

import json
import unicodedata
import urllib.parse
import urllib.request

API = "https://grupoalvim.com.br/financas/api"


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.upper().split())


def api(method: str, path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=40) as res:
        return json.load(res)


def nf_de(documento: str) -> str | None:
    partes = (documento or "").split("|")
    if len(partes) < 3 or not documento.startswith("BANCO-"):
        return documento or None
    nf = partes[2].strip()
    return nf or None


def escolher(descricao: str, hits: list[dict]) -> dict | None:
    alvo = norm(descricao)
    melhor = None
    for item in hits:
        nome = norm(item["nome"])
        if nome == alvo:
            return item
        if alvo.startswith(nome) or nome.startswith(alvo):
            if melhor is None or len(nome) > len(norm(melhor["nome"])):
                melhor = item
    return melhor


def main() -> None:
    despesas = [d for d in api("GET", "/despesas") if str(d.get("documento_ref") or "").startswith("BANCO-")]
    planos = {norm(p["nome"]): p["id"] for p in api("GET", "/plano")}
    cache: dict[str, dict | None] = {}
    ligadas = sem_fornecedor = sem_plano = 0
    for despesa in despesas:
        chave = norm(despesa["descricao"])
        if chave not in cache:
            termos = [despesa["descricao"][:40]]
            token = despesa["descricao"].split(" ", 1)[0]
            if token and token != termos[0]:
                termos.append(token)
            hits = []
            for termo in termos:
                hits.extend(api("GET", f"/fornecedores?q={urllib.parse.quote(termo)}"))
            cache[chave] = escolher(despesa["descricao"], hits)
        fornecedor = cache[chave]
        plano_id = None
        if fornecedor and fornecedor.get("plano_conta_id"):
            plano_id = fornecedor["plano_conta_id"]
        else:
            token = chave.split(" ", 1)[0]
            plano_id = planos.get(chave) or planos.get(token)
        if fornecedor:
            ligadas += 1
        else:
            sem_fornecedor += 1
        if not plano_id:
            sem_plano += 1
        api("PATCH", f"/despesas/{despesa['id']}", {
            "descricao": despesa["descricao"],
            "valor": despesa["valor"],
            "vencimento": despesa["vencimento"],
            "documento_ref": nf_de(despesa.get("documento_ref") or ""),
            "forma_pagamento": despesa["forma_pagamento"],
            "empresa_origem_id": despesa["origem_id"],
            "fornecedor_id": fornecedor["id"] if fornecedor else None,
            "plano_conta_id": plano_id,
            "conta_saida_id": despesa.get("conta_saida_id"),
            "dados_pagamento": despesa.get("pagamento"),
        })
        feitas = ligadas + sem_fornecedor
        if feitas % 50 == 0:
            print("atualizadas", feitas, flush=True)
    print("com fornecedor", ligadas)
    print("sem fornecedor", sem_fornecedor)
    print("sem plano", sem_plano)


if __name__ == "__main__":
    main()
