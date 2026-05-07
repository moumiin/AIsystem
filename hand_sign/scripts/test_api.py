import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
for q in ['1','2','3','10','100','1000','가족','안녕하세요']:
    body = json.dumps({'query': q}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/gemini-search',
        data=body, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        steps = data.get('steps', [])
        print(f'{q:8s}: source={data["source"]:12s}, steps={steps[:4]}')
    except Exception as e:
        print(f'{q:8s}: ERROR {e}')
