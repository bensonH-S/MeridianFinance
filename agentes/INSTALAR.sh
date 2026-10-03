#!/bin/sh
cd `dirname $0`
if [ -x /usr/bin/python ]; then
  exec /usr/bin/python mwpos_enviar_caixa.py --instalar
fi
exec python mwpos_enviar_caixa.py --instalar
