# Roda NO SERVIDOR da loja (CentOS / MWPOS), nao no notebook.
# Python 2.7. Descobre a loja no MWPOS e manda o caixa para o Azimut.
#
# Instalar:
#   cp agentes/mwpos_enviar_caixa.py /home/administrador/azimut_enviar_caixa.py
#   criar /home/administrador/azimut_caixa.env  (URL e token; BK e pasta sao opcionais)
#   chmod 600 /home/administrador/azimut_caixa.env
#
# Primeiro disparo (dia 1 do mes ate hoje):
#   /usr/bin/python /home/administrador/azimut_enviar_caixa.py --mes
#
# Todo dia (ontem):
#   crontab -e
#   15 2 * * * /usr/bin/python /home/administrador/azimut_enviar_caixa.py >> /home/administrador/azimut_caixa.log 2>&1
#
# azimut_caixa.env:
#   AZIMUT_URL=https://SEU-AZIMUT/api/caixa/ingest
#   AZIMUT_TOKEN=cole-a-chave-aqui
#   BK_NUMBER=           # opcional; se vazio le Store.Id no storecfg.db
#   PASTA=               # opcional; procura sozinho

from __future__ import print_function

import json
import os
import re
import socket
import sqlite3
import sys
from datetime import datetime, timedelta

try:
    import urllib.request as urllib_request
    import urllib.error as urllib_error
except ImportError:
    import urllib2 as urllib_request
    urllib_error = urllib_request

MAPA = {
    0: "dinheiro",
    1: "credito",
    2: "debito",
    28: "ifood",
    33: "rappi",
    39: "food99",
    50: "cart_digital",
    51: "pix",
}

CANDIDATOS_PASTA = [
    "/home/administrador/mwpos_server/data/server/databases",
    "/home/administrador/mwpos_server/data/databases",
    "/opt/mwpos_server/data/server/databases",
]


def dinheiro(n):
    try:
        return round(float(n or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def ler_env(caminho):
    dados = {}
    if not os.path.exists(caminho):
        return dados
    for linha in open(caminho, "r"):
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        dados[chave.strip()] = valor.strip()
    return dados


def achar_pasta(cfg):
    pasta = os.environ.get("PASTA") or cfg.get("PASTA") or ""
    if pasta and os.path.isdir(pasta):
        return pasta
    for candidato in CANDIDATOS_PASTA:
        if os.path.isfile(os.path.join(candidato, "storecfg.db")) or tem_order_db(candidato):
            return candidato
    aqui = os.path.dirname(os.path.abspath(__file__))
    for raiz, dirs, arquivos in os.walk("/home/administrador"):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        if "storecfg.db" in arquivos and any(a.startswith("order.db") for a in arquivos):
            return raiz
        if raiz.count(os.sep) - aqui.count(os.sep) > 8:
            dirs[:] = []
    return CANDIDATOS_PASTA[0]


def tem_order_db(pasta):
    if not os.path.isdir(pasta):
        return False
    return any(n.startswith("order.db") for n in os.listdir(pasta))


def ler_chave_storecfg(pasta, chave):
    arquivo = os.path.join(pasta, "storecfg.db")
    if not os.path.isfile(arquivo):
        return ""
    try:
        c = sqlite3.connect(arquivo)
        row = c.execute("select KeyValue from Configuration where KeyPath=?", (chave,)).fetchone()
        c.close()
        return str(row[0]).strip() if row and row[0] is not None else ""
    except Exception:
        return ""


def descobrir_bk(cfg, pasta):
    bk = os.environ.get("BK_NUMBER") or cfg.get("BK_NUMBER") or ""
    bk = re.sub(r"\D", "", bk)
    if bk:
        return bk
    bk = re.sub(r"\D", "", ler_chave_storecfg(pasta, "Store.Id"))
    if bk:
        return bk
    host = socket.gethostname() or ""
    achado = re.search(r"(\d{4,6})", host)
    if achado:
        return achado.group(1)
    return ""


def arquivos_pedido(pasta):
    return sorted(
        os.path.join(pasta, f)
        for f in os.listdir(pasta)
        if f.startswith("order.db") and os.path.isfile(os.path.join(pasta, f))
    )


def extrair(pasta, business_period):
    totais = {
        "dinheiro": 0.0,
        "pix": 0.0,
        "debito": 0.0,
        "credito": 0.0,
        "cart_digital": 0.0,
        "ifood": 0.0,
        "azul": 0.0,
        "rappi": 0.0,
        "food99": 0.0,
    }
    for caminho in arquivos_pedido(pasta):
        c = sqlite3.connect(caminho)
        tabs = [r[0] for r in c.execute("select name from sqlite_master where type='table'")]
        if "Orders" not in tabs or "OrderTender" not in tabs:
            c.close()
            continue
        pedidos = c.execute(
            "select OrderId, PriceListTotal from Orders where BusinessPeriod=? and StateId=5",
            (business_period,),
        ).fetchall()
        for order_id, preco in pedidos:
            preco = dinheiro(preco)
            tenders = c.execute(
                "select TenderId, TenderAmount from OrderTender where OrderId=?",
                (order_id,),
            ).fetchall()
            outros = 0.0
            tem_dinheiro = False
            for tid, valor in tenders:
                campo = MAPA.get(int(tid))
                valor = dinheiro(valor)
                if campo == "dinheiro":
                    tem_dinheiro = True
                    continue
                if campo:
                    totais[campo] = dinheiro(totais[campo] + valor)
                    outros = dinheiro(outros + valor)
            if tem_dinheiro:
                resto = dinheiro(preco - outros)
                if resto < 0:
                    resto = 0.0
                totais["dinheiro"] = dinheiro(totais["dinheiro"] + resto)
        c.close()
    return totais


def tem_movimento(totais):
    return sum(totais.values()) > 0


def datas_periodo(inicio, fim):
    dias = []
    atual = inicio
    while atual <= fim:
        dias.append(atual)
        atual = atual + timedelta(days=1)
    return dias


def parse_data(texto):
    return datetime.strptime(texto, "%Y-%m-%d")


def enviar(url, token, payload):
    corpo = json.dumps(payload)
    if sys.version_info[0] >= 3 and not isinstance(corpo, bytes):
        corpo = corpo.encode("utf-8")
    req = urllib_request.Request(url, corpo)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + token)
    try:
        resp = urllib_request.urlopen(req, timeout=30)
        texto = resp.read()
        print(texto)
        return 0
    except urllib_error.HTTPError as err:
        print("Azimut recusou:", err.code, err.read())
        return 1
    except Exception as err:
        print("Nao enviou:", err)
        return 1


def uso():
    print("Uso:")
    print("  python azimut_enviar_caixa.py              # ontem")
    print("  python azimut_enviar_caixa.py --mes        # dia 1 do mes ate hoje")
    print("  python azimut_enviar_caixa.py --hoje")
    print("  python azimut_enviar_caixa.py 2026-10-02")
    print("  python azimut_enviar_caixa.py --desde 2026-10-01 [--ate 2026-10-03]")
    return 2


def escolher_datas(argv):
    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if not argv:
        return [hoje - timedelta(days=1)]
    if argv[0] in ("-h", "--help"):
        return None
    if argv[0] == "--hoje":
        return [hoje]
    if argv[0] == "--mes":
        inicio = hoje.replace(day=1)
        return datas_periodo(inicio, hoje)
    if argv[0] == "--desde":
        if len(argv) < 2:
            return None
        inicio = parse_data(argv[1])
        fim = hoje
        if len(argv) >= 4 and argv[2] == "--ate":
            fim = parse_data(argv[3])
        return datas_periodo(inicio, fim)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", argv[0]):
        return [parse_data(argv[0])]
    return None


def main():
    cfg = ler_env("/home/administrador/azimut_caixa.env")
    pasta = achar_pasta(cfg)
    bk = descobrir_bk(cfg, pasta)
    nome = ler_chave_storecfg(pasta, "Store.RazaoSocial") or ler_chave_storecfg(pasta, "Store.Name")
    try:
        dias = escolher_datas(sys.argv[1:])
    except ValueError:
        return uso()
    if dias is None:
        return uso()

    print("pasta:", pasta)
    print("loja:", bk, nome.encode("utf-8") if nome and sys.version_info[0] < 3 else nome)

    url = os.environ.get("AZIMUT_URL") or cfg.get("AZIMUT_URL") or ""
    token = os.environ.get("AZIMUT_TOKEN") or cfg.get("AZIMUT_TOKEN") or ""
    if not bk:
        print("Nao achei o BK. Informe BK_NUMBER no azimut_caixa.env")
        return 1

    falhas = 0
    enviados = 0
    pulados = 0
    for dia in dias:
        data = dia.strftime("%Y-%m-%d")
        totais = extrair(pasta, data.replace("-", ""))
        if not tem_movimento(totais):
            print(data, "sem venda, pulou")
            pulados += 1
            continue
        payload = {
            "bk_number": bk,
            "data": data,
            "observacao": "Servidor da loja MWPOS",
        }
        payload.update(totais)
        print(data, json.dumps(payload))
        if not url or not token:
            continue
        codigo = enviar(url, token, payload)
        if codigo:
            falhas += 1
        else:
            enviados += 1

    if not url or not token:
        print("So extraí. Para enviar, preencha AZIMUT_URL e AZIMUT_TOKEN em azimut_caixa.env")
        return 0
    print("enviados:", enviados, "pulados:", pulados, "falhas:", falhas)
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main() or 0)
