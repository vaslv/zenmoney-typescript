"""Native HTTP redirect behavior against loopback only; no fake Response shortcut."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import httpx
import zenmoney_api as api

async def redirect_check(asynchronous):
    calls=[]
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            calls.append(self.path)
            self.rfile.read(int(self.headers.get('Content-Length','0')))
            self.send_response(302)
            self.send_header('Location','/redirect-target')
            self.send_header('Content-Length','0')
            self.end_headers()
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    def route(request):
        assert request.url.host=='api.zenmoney.ru'
        return httpx.Request(request.method,request.url.copy_with(scheme='http',host='127.0.0.1',port=server.server_port),headers=request.headers,content=request.content)
    class SyncRoute(httpx.BaseTransport):
        def __init__(self):self.inner=httpx.HTTPTransport(trust_env=False)
        def handle_request(self,request):return self.inner.handle_request(route(request))
        def close(self):self.inner.close()
    class AsyncRoute(httpx.AsyncBaseTransport):
        def __init__(self):self.inner=httpx.AsyncHTTPTransport(trust_env=False)
        async def handle_async_request(self,request):return await self.inner.handle_async_request(route(request))
        async def aclose(self):await self.inner.aclose()
    client=(api.AsyncClient if asynchronous else api.Client)('TEST_BEARER_NOT_A_SECRET',transport=AsyncRoute() if asynchronous else SyncRoute())
    try:
        try:
            if asynchronous:await client.read_diff()
            else:client.read_diff()
        except api.HTTPError as error:assert error.status_code==302
        else:raise AssertionError('Redirect unexpectedly accepted')
        assert calls==['/v8/diff/'],calls
    finally:
        if asynchronous:await client.aclose()
        else:client.close()
        server.shutdown();server.server_close();thread.join()
