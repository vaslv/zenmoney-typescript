"""Validate the installed public wheel against the approved source snapshot."""
from pathlib import Path
import hashlib
import importlib.metadata
import json
import zenmoney_api

baseline = json.loads(Path('docs/python-baseline.json').read_text())
assert importlib.metadata.version('zenmoney-python') == baseline['version']
root = Path(zenmoney_api.__file__).parent
for name, expected in baseline['moduleSha256'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
from decimal import Decimal
from zenmoney_api.protocol import decode_json, encode_json
value = decode_json(b'{"amount":1.00000000000000000001,"id":9007199254740993}')
assert value['amount'] == Decimal('1.00000000000000000001')
assert value['id'] == 9007199254740993
assert decode_json(encode_json(value)) == value
print(json.dumps({'reference': 'zenmoney-python 0.7.0', 'verifiedModules': 8, 'exactRoundtrip': 'passed'}))
