import re, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'C:\hand_sign\frontend\static\js\signs-data.js', encoding='utf-8') as f:
    content = f.read()

words = re.findall(r"aihubWord:\s*'([^']+)'", content)
unique_words = sorted(set(words))
print(f'Total aihubWord entries: {len(words)}, unique: {len(unique_words)}')

with open(r'C:\hand_sign\aihub_keypoint_index.json', encoding='utf-8') as f:
    kp = set(json.load(f).keys())

found = [w for w in unique_words if w in kp]
missing = [w for w in unique_words if w not in kp]
print(f'In keypoint index: {len(found)}')
print(f'Missing from index: {len(missing)}')
print('Found:', found[:20])
print()
print('Missing:', missing)
