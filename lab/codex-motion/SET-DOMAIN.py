"""Run: python SET-DOMAIN.py https://your-domain.com (or include /inspire)."""
from pathlib import Path
import sys,json,re
from urllib.parse import urlparse
if len(sys.argv)!=2:
    raise SystemExit('Usage: python SET-DOMAIN.py https://your-domain.com')
url=sys.argv[1].rstrip('/')
parsed=urlparse(url)
if parsed.scheme not in ('http','https') or not parsed.netloc or parsed.query or parsed.fragment:
    raise SystemExit('Enter a complete website URL without a query or fragment.')
p=Path(__file__).parent/'index.html'
s=p.read_text()
s=re.sub(r'\s*<link rel="canonical"[^>]+>','',s)
s=re.sub(r'\s*<meta property="og:url"[^>]+>','',s)
s=s.replace('</head>',f'  <link rel="canonical" href="{url}/">\n  <meta property="og:url" content="{url}/">\n</head>')
m=re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
graph=json.loads(m.group(1))
# Only internal page identities change. External portfolio and Envato links stay intact.
for item in graph['@graph']:
    item['@id']=url+'/#'+item['@id'].split('#')[-1]
    for value in item.values():
        if isinstance(value,dict) and '@id' in value:
            value['@id']=url+'/#'+value['@id'].split('#')[-1]
    if item['@type'] in ('WebSite','WebPage'):
        item['url']=url+'/'
s=s[:m.start(1)]+'\n'+json.dumps(graph,ensure_ascii=False,indent=2)+'\n  '+s[m.end(1):]
p.write_text(s,encoding='utf-8')
print('Domain metadata updated:',url)
