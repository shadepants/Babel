import urllib.request, json
with urllib.request.urlopen('http://localhost:8000/api/relay/models', timeout=10) as r:
    data = json.loads(r.read())
for m in data['models']:
    print(m['model'])