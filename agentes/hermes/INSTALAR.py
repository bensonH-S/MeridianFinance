# coding: utf-8
import os, sys
aqui = os.path.dirname(os.path.abspath(__file__))
os.chdir(aqui)
sys.argv = ["hermes.py", "--instalar"]
caminho = os.path.join(aqui, "hermes.py")
if sys.version_info[0] < 3:
    execfile(caminho)
else:
    exec(compile(open(caminho).read(), caminho, "exec"))
