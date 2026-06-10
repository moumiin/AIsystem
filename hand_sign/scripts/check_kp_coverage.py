import json, sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('aihub_keypoint_index.json', encoding='utf-8') as f:
    kp = set(json.load(f).keys())

with open(r'frontend\static\js\signs-data.js', encoding='utf-8') as f:
    content = f.read()
signs_words = set(re.findall(r"aihubWord:\s*'([^']+)'", content))

found = sorted(signs_words & kp)
missing = sorted(signs_words - kp)
print(f'signs-data.js aihubWord 중 키포인트 있음: {len(found)}개')
print(f'없음: {len(missing)}개')
print('없는것:', missing[:30])
print()

new_available = sorted(kp - signs_words)
print(f'키포인트에는 있지만 signs-data에 없는 단어: {len(new_available)}개')
print()
print('전체 목록:')
for w in new_available:
    print(f'  {w}')
