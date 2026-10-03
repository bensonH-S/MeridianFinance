#!/bin/sh
# Rode no Linux da loja, na pasta do pendrive:
#   sh INSTALAR.sh
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY=/usr/bin/python
if [ ! -x "$PY" ]; then
  PY=python
fi
exec "$PY" "$DIR/mwpos_enviar_caixa.py" --instalar
