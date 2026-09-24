"""Substitui as contas pelos nomes da planilha Contas (F360)."""

import re
import unicodedata
from pathlib import Path

import openpyxl
import psycopg

from importar_nucleo import MERIDIAN_ENV, load_env

PLANILHA = Path(r"f:\Users\Benson\Downloads\Contas (1).xlsx")


def norm(value) -> str:
    text = unicodedata.normalize("NFKD", "" if value is None else str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return "".join(text.upper().split())


def digits(value) -> str:
    return re.sub(r"\D", "", "" if value is None else str(value))


def main() -> None:
    env = load_env(MERIDIAN_ENV)
    wb = openpyxl.load_workbook(PLANILHA, read_only=True, data_only=True)
    linhas = [r for r in wb.active.iter_rows(values_only=True) if r and r[0] and r[0] != "Nome"]
    wb.close()

    with psycopg.connect(
        host=env["DB_HOST"], user=env["DB_USER"], password=env["DB_PASS"],
        port=int(env.get("DB_PORT") or 5432), dbname="meridian_finance",
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("alter table contas_bancarias add column if not exists nome text")
            cur.execute("alter table contas_bancarias add column if not exists tipo text")
            cur.execute("alter table contas_bancarias alter column agencia drop not null")
            cur.execute("alter table contas_bancarias alter column numero drop not null")
            cur.execute("alter table contas_bancarias alter column banco drop not null")
            cur.execute("""
                select conname from pg_constraint
                where conrelid = 'contas_bancarias'::regclass and contype = 'c'
                  and pg_get_constraintdef(oid) like '%banco%'
            """)
            for (nome,) in cur.fetchall():
                cur.execute(f'alter table contas_bancarias drop constraint "{nome}"')
            cur.execute("select id, cnpj, apelido from empresas")
            por_cnpj = {}
            por_apelido = {}
            for eid, cnpj, apelido in cur.fetchall():
                if cnpj:
                    por_cnpj[digits(cnpj)] = eid
                if apelido:
                    por_apelido[norm(apelido)] = eid

            cur.execute("""
                select d.id, c.empresa_id, c.banco
                from despesas d
                join contas_bancarias c on c.id = d.conta_saida_id
            """)
            vinculos = cur.fetchall()
            cur.execute("update despesas set conta_saida_id = null")
            cur.execute("delete from contas_bancarias")

            sem = []
            for row in linhas:
                nome = str(row[0]).strip()
                tipo_xl = str(row[1] or "")
                banco_xl = str(row[4] or "")
                agencia = str(row[5]).strip() if row[5] and str(row[5]).strip() not in ("-", "") else None
                numero = str(row[6]).strip() if row[6] else None
                digito = str(row[7]).strip() if row[7] else None
                cnpj = digits(row[9]) if len(row) > 9 else ""
                empresa_id = por_cnpj.get(cnpj)
                if not empresa_id:
                    chave = norm(nome).replace("CAIXALOJA", "").replace("ITAU", "").replace("BK", "")
                    if chave == "SUPERKIN":
                        chave = "SUPERKING"
                    empresa_id = por_apelido.get(chave)
                if not empresa_id:
                    sem.append(nome)
                    continue
                if "Dinheiro" in tipo_xl:
                    banco, tipo = None, "dinheiro"
                    agencia = numero = digito = None
                elif "Brasil" in banco_xl:
                    banco, tipo = "banco_do_brasil", "corrente"
                else:
                    banco, tipo = "itau", "corrente"
                cur.execute("""
                    insert into contas_bancarias (empresa_id, nome, tipo, banco, agencia, numero, digito)
                    values (%s, %s, %s, %s, %s, %s, %s)
                """, (empresa_id, nome, tipo, banco, agencia, numero, digito))

            for despesa_id, empresa_id, banco in vinculos:
                cur.execute("""
                    update despesas set conta_saida_id = (
                      select id from contas_bancarias
                      where empresa_id = %s and banco = %s and tipo = 'corrente'
                      order by nome limit 1
                    ) where id = %s
                """, (empresa_id, banco, despesa_id))

        conn.commit()
        with conn.cursor() as cur:
            cur.execute("select tipo, count(*) from contas_bancarias group by 1 order by 1")
            print("tipos", cur.fetchall())
            cur.execute("select count(*) from contas_bancarias")
            print("total", cur.fetchone()[0])
            print("sem_empresa", sem)


if __name__ == "__main__":
    main()
