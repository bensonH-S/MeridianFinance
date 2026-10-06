# Extrai cert+chave PEM de um PFX ICP-Brasil (RC2). Uso interno do ativar-bb-dda.
import sys
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    pkcs12,
)

data = open(sys.argv[1], 'rb').read()
key, cert, chain = pkcs12.load_key_and_certificates(data, sys.argv[2].encode('utf-8'))
if not key or not cert:
    raise SystemExit(2)
sys.stdout.buffer.write(cert.public_bytes(Encoding.PEM))
for item in chain or []:
    sys.stdout.buffer.write(item.public_bytes(Encoding.PEM))
sys.stdout.buffer.write(key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()))
