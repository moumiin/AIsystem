import json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from jamo_db import find_jamo, JAMO_DB

print('jamo_db keys:', list(JAMO_DB.keys())[:10])
print()

for q in ['1','2','3','4','5','6','7','8','9','10','안녕하세요','감사합니다','행복']:
    j = find_jamo(q)
    print(f'{q}: {j["name"] if j else "NOT IN JAMO"}')
