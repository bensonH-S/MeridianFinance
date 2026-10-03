# coding: utf-8
# Um arquivo so. Na loja Linux (CentOS / MWPOS / Python 2.7):
#   python mwpos_enviar_caixa.py --instalar
# ou de dois cliques / rode:
#   sh INSTALAR.sh
#
# Ele descobre o BK no storecfg, testa o envio, e se der certo
# instala o cron e manda do dia 1 do mes ate hoje.
# O mesmo pendrive serve nas 20 lojas (URL e token iguais; BK muda sozinho).

from __future__ import print_function

import json
import os
import re
import shutil
import socket
import sqlite3
import stat
import subprocess
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

DEST_DIR = "/home/administrador"
DEST_SCRIPT = os.path.join(DEST_DIR, "azimut_enviar_caixa.py")
DEST_ENV = os.path.join(DEST_DIR, "azimut_caixa.env")
DEST_LOG = os.path.join(DEST_DIR, "azimut_caixa.log")
CRON_INGEST = "15 2 * * * {python} {script} >> {log} 2>&1"
CRON_PING = "*/15 * * * * {python} {script} --ping >> {log} 2>&1"
URL_PADRAO = "https://grupoalvim.com.br/financas/api/caixa/ingest"


def dinheiro(n):
    try:
        return round(float(n or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def texto(valor):
    if valor is None:
        return ""
    if sys.version_info[0] < 3 and isinstance(valor, unicode):
        return valor.encode("utf-8")
    return str(valor)


def ler_env(caminho):
    dados = {}
    if not os.path.isfile(caminho):
        return dados
    for linha in open(caminho, "r"):
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        dados[chave.strip()] = valor.strip().strip('"').strip("'")
    return dados


def pasta_deste_arquivo():
    return os.path.dirname(os.path.abspath(__file__))


def candidatos_env():
    return [
        os.path.join(os.getcwd(), "azimut_caixa.env"),
        os.path.join(pasta_deste_arquivo(), "azimut_caixa.env"),
        DEST_ENV,
    ]


def carregar_cfg():
    dados = {}
    for caminho in candidatos_env():
        dados.update(ler_env(caminho))
    for chave in ("AZIMUT_URL", "AZIMUT_TOKEN", "BK_NUMBER", "PASTA"):
        if os.environ.get(chave):
            dados[chave] = os.environ.get(chave)
    if not dados.get("AZIMUT_URL"):
        dados["AZIMUT_URL"] = URL_PADRAO
    return dados


def tem_order_db(pasta):
    if not os.path.isdir(pasta):
        return False
    try:
        return any(n.startswith("order.db") for n in os.listdir(pasta))
    except Exception:
        return False


def achar_pasta(cfg):
    pasta = cfg.get("PASTA") or ""
    if pasta and os.path.isdir(pasta):
        return pasta
    for candidato in CANDIDATOS_PASTA:
        if os.path.isfile(os.path.join(candidato, "storecfg.db")) or tem_order_db(candidato):
            return candidato
    raiz_home = "/home/administrador"
    if os.path.isdir(raiz_home):
        for raiz, dirs, arquivos in os.walk(raiz_home):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "archive")]
            if "storecfg.db" in arquivos and any(a.startswith("order.db") for a in arquivos):
                return raiz
            if raiz.count(os.sep) > 8:
                dirs[:] = []
    return CANDIDATOS_PASTA[0]


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
    bk = re.sub(r"\D", "", cfg.get("BK_NUMBER") or "")
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
    if not os.path.isdir(pasta):
        return []
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
    ids = []
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
            ids.append(order_id)
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
    return totais, ids


def nome_bandeira(desc):
    d = (desc or "").upper()
    if "MASTER" in d or "MAESTRO" in d:
        return "Mastercard"
    if "VISA ELECTRON" in d or d == "VISA":
        return "Visa"
    if "VISA VALE" in d:
        return "Visa Vale"
    if "ELO" in d:
        return "Elo"
    if "HIPER" in d:
        return "Hipercard"
    if "AMERICAN" in d or "AMEX" in d:
        return "Amex"
    if "ALELO" in d:
        return "Alelo"
    if "SODEXO" in d:
        return "Sodexo"
    if "TICKET" in d:
        return "Ticket"
    if d.startswith("VR") or " VR" in d:
        return "VR"
    if d:
        return desc
    return "Outros"


def tipo_bandeira(detalhes, tipo_tender):
    d = (detalhes or "").lower()
    if "credito" in d:
        return "credito"
    if "debito" in d:
        return "debito"
    if "refeicao" in d or "voucher" in d or "aliment" in d:
        return "voucher"
    try:
        t = int(tipo_tender or 0)
    except (TypeError, ValueError):
        t = 0
    if t == 1:
        return "credito"
    if t == 2:
        return "debito"
    return "outros"


def extrair_bandeiras(pasta, order_ids):
    if not order_ids:
        return []
    arquivo = os.path.join(pasta, "fiscal_persistcomp.db")
    if not os.path.isfile(arquivo):
        return []
    soma = {}
    try:
        c = sqlite3.connect(arquivo)
        mapa = {}
        for bid, desc, det in c.execute("select Bandeira, Descricao, Detalhes from BandeiraCartao"):
            mapa[bid] = (desc, det)
        passo = 400
        i = 0
        while i < len(order_ids):
            pedaco = order_ids[i:i + passo]
            q = "select Bandeira, Type, Amount from PaymentData where OrderId in (%s)" % ",".join("?" * len(pedaco))
            for bid, tipo, valor in c.execute(q, pedaco):
                if int(tipo or 0) in (0, 28, 33, 39, 50, 51):
                    continue
                desc, det = mapa.get(bid, (None, None))
                chave = (nome_bandeira(desc), tipo_bandeira(det, tipo))
                soma[chave] = dinheiro(soma.get(chave, 0) + dinheiro(valor))
            i += passo
        c.close()
    except Exception as err:
        print("bandeiras:", err)
        return []
    lista = []
    for (nome, tipo), valor in sorted(soma.items(), key=lambda item: -item[1]):
        if valor > 0:
            lista.append({"bandeira": nome, "tipo": tipo, "valor": valor})
    return lista


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


def python_cmd():
    exe = sys.executable or "/usr/bin/python"
    if os.path.isfile("/usr/bin/python"):
        return "/usr/bin/python"
    return exe


def enviar(url, token, payload):
    corpo = json.dumps(payload)
    if sys.version_info[0] >= 3 and not isinstance(corpo, bytes):
        corpo = corpo.encode("utf-8")
    req = urllib_request.Request(url, corpo)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + token)
    try:
        resp = urllib_request.urlopen(req, timeout=45)
        texto_resp = resp.read()
        print(texto_resp)
        return 0
    except urllib_error.HTTPError as err:
        print("Azimut recusou:", err.code, err.read())
        return 1
    except Exception as err:
        print("Nao enviou:", err)
        return 1


def payload_dia(bk, data, totais, bandeiras=None):
    corpo = {
        "bk_number": bk,
        "data": data,
        "observacao": "Servidor da loja MWPOS",
        "bandeiras": bandeiras or [],
    }
    corpo.update(totais)
    return corpo


def url_heartbeat(url):
    if "/caixa/ingest" in url:
        return url.replace("/caixa/ingest", "/caixa/heartbeat")
    return url.rstrip("/") + "/heartbeat"


def ping(url, token, bk):
    if not url or not token or not bk:
        return 1
    print("oi:", bk)
    return enviar(url_heartbeat(url), token, {"bk_number": bk, "mensagem": "tamos conectado"})


def dia_com_venda(pasta, limite=14):
    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(0, limite):
        dia = hoje - timedelta(days=i)
        totais, ids = extrair(pasta, dia.strftime("%Y%m%d"))
        if tem_movimento(totais):
            return dia, totais, ids
    return None, None, None


def gravar_env(caminho, url, token):
    linhas = [
        "# Mesmo arquivo nas 20 lojas. O BK a loja descobre sozinha.",
        "AZIMUT_URL=" + url,
        "AZIMUT_TOKEN=" + token,
        "",
    ]
    dest = open(caminho, "w")
    dest.write("\n".join(linhas))
    dest.close()
    try:
        os.chmod(caminho, stat.S_IRUSR | stat.S_IWUSR)
    except Exception:
        pass


def instalar_cron():
    ingest = CRON_INGEST.format(python=python_cmd(), script=DEST_SCRIPT, log=DEST_LOG)
    ping_cron = CRON_PING.format(python=python_cmd(), script=DEST_SCRIPT, log=DEST_LOG)
    proc = subprocess.Popen(["crontab", "-l"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, _err = proc.communicate()
    if sys.version_info[0] >= 3 and isinstance(out, bytes):
        out = out.decode("utf-8", "replace")
    atuais = []
    if out:
        for item in out.splitlines():
            if "azimut_enviar_caixa.py" in item:
                continue
            if item.strip():
                atuais.append(item.rstrip("\n"))
    atuais.append(ping_cron)
    atuais.append(ingest)
    corpo = "\n".join(atuais) + "\n"
    if sys.version_info[0] >= 3 and not isinstance(corpo, bytes):
        corpo = corpo.encode("utf-8")
    proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    _out, err = proc.communicate(corpo)
    if proc.returncode != 0:
        print("Nao gravou o cron:", err)
        return 1
    print("cron:", ping_cron)
    print("cron:", ingest)
    return 0


def instalar():
    cfg = carregar_cfg()
    url = (cfg.get("AZIMUT_URL") or "").strip()
    token = (cfg.get("AZIMUT_TOKEN") or "").strip()
    if not url or not token:
        print("Falta AZIMUT_TOKEN no azimut_caixa.env desta pasta.")
        return 1

    pasta = achar_pasta(cfg)
    bk = descobrir_bk(cfg, pasta)
    nome = ler_chave_storecfg(pasta, "Store.RazaoSocial") or ler_chave_storecfg(pasta, "Store.Name")
    print("pasta:", pasta)
    print("loja:", bk, texto(nome))
    print("host:", socket.gethostname())
    if not tem_order_db(pasta):
        print("Nao achei order.db nesta pasta. O MWPOS esta neste servidor?")
        return 1
    if not bk:
        print("Nao achei o BK no storecfg nem no hostname.")
        return 1

    if not os.path.isdir(DEST_DIR):
        print("Esta maquina nao e o servidor da loja (", DEST_DIR, "nao existe).")
        return 1

    shutil.copy2(os.path.abspath(__file__), DEST_SCRIPT)
    gravar_env(DEST_ENV, url, token)
    print("instalado:", DEST_SCRIPT)
    print("config:", DEST_ENV)

    print("--- oi, tamos conectado ---")
    if ping(url, token, bk):
        print("O Azimut nao recebeu o oi da loja.")
        return 1

    print("--- teste de envio ---")
    dia, totais, ids = dia_com_venda(pasta)
    if not dia:
        print("Nao achei venda nos ultimos 14 dias para testar o Azimut.")
        return 1
    data = dia.strftime("%Y-%m-%d")
    bands = extrair_bandeiras(pasta, ids)
    print("teste:", data, json.dumps(totais), "bandeiras", len(bands))
    if enviar(url, token, payload_dia(bk, data, totais, bands)):
        print("Teste falhou. Nao instalei o cron nem disparei o mes.")
        return 1
    print("teste ok")

    if instalar_cron():
        return 1

    print("--- enviando do dia 1 ate hoje ---")
    return enviar_periodo(cfg, pasta, bk, url, token, datas_periodo(
        datetime.now().replace(hour=0, minute=0, second=0, microsecond=0, day=1),
        datetime.now().replace(hour=0, minute=0, second=0, microsecond=0),
    ))


def uso():
    print("Na loja:")
    print("  python mwpos_enviar_caixa.py --instalar")
    print("  python mwpos_enviar_caixa.py --ping")
    print("  python mwpos_enviar_caixa.py              # ontem")
    print("  python mwpos_enviar_caixa.py --mes")
    print("  python mwpos_enviar_caixa.py --hoje")
    print("  python mwpos_enviar_caixa.py 2026-10-02")
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
        return datas_periodo(hoje.replace(day=1), hoje)
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


def enviar_periodo(cfg, pasta, bk, url, token, dias):
    falhas = 0
    enviados = 0
    pulados = 0
    for dia in dias:
        data = dia.strftime("%Y-%m-%d")
        totais, ids = extrair(pasta, data.replace("-", ""))
        if not tem_movimento(totais):
            print(data, "sem venda, pulou")
            pulados += 1
            continue
        bands = extrair_bandeiras(pasta, ids)
        print(data, json.dumps(totais), "bandeiras", len(bands))
        if not url or not token:
            continue
        if enviar(url, token, payload_dia(bk, data, totais, bands)):
            falhas += 1
        else:
            enviados += 1
    if url and token:
        ping(url, token, bk)
    if not url or not token:
        print("So extrai. Coloque AZIMUT_URL e AZIMUT_TOKEN no azimut_caixa.env")
        return 0
    print("enviados:", enviados, "pulados:", pulados, "falhas:", falhas)
    return 1 if falhas else 0


def main():
    argv = sys.argv[1:]
    if argv and argv[0] == "--instalar":
        return instalar()

    cfg = carregar_cfg()
    pasta = achar_pasta(cfg)
    bk = descobrir_bk(cfg, pasta)
    nome = ler_chave_storecfg(pasta, "Store.RazaoSocial") or ler_chave_storecfg(pasta, "Store.Name")
    url = (cfg.get("AZIMUT_URL") or "").strip()
    token = (cfg.get("AZIMUT_TOKEN") or "").strip()
    if argv and argv[0] == "--ping":
        print("loja:", bk)
        return ping(url, token, bk)
    try:
        dias = escolher_datas(argv)
    except ValueError:
        return uso()
    if dias is None:
        return uso()

    print("pasta:", pasta)
    print("loja:", bk, texto(nome))
    if not bk:
        print("Nao achei o BK. Informe BK_NUMBER no azimut_caixa.env")
        return 1
    return enviar_periodo(cfg, pasta, bk, url, token, dias)


if __name__ == "__main__":
    sys.exit(main() or 0)
