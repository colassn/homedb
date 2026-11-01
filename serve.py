#!/usr/bin/env python3
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import mimetypes
mimetypes.add_type('text/javascript','.mjs')
print('開啟 http://localhost:8080 。手機及正式 PWA 請使用 HTTPS 主機。')
ThreadingHTTPServer(('127.0.0.1',8080),SimpleHTTPRequestHandler).serve_forever()
