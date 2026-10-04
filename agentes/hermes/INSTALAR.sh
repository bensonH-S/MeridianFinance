#!/bin/sh
cd dirname 
if [ -x /usr/bin/python ]; then
  exec /usr/bin/python hermes.py --instalar
fi
exec python hermes.py --instalar
