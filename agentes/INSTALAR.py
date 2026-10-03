# coding: utf-8
import os
import sys

aqui = os.path.dirname(os.path.abspath(__file__))
os.chdir(aqui)
sys.argv = ["mwpos_enviar_caixa.py", "--instalar"]
caminho = os.path.join(aqui, "mwpos_enviar_caixa.py")
if sys.version_info[0] < 3:
    execfile(caminho)
else:
    exec(compile(open(caminho).read(), caminho, "exec"))
