"""Language adapter only: run installed Python SDK against synthetic vectors."""
import asyncio
import base64
from decimal import Decimal
import inspect
import json
from pathlib import Path
import re
from urllib.parse import parse_qsl
import httpx
import zenmoney_api as api
from zenmoney_api import protocol, transactions, entities, oauth
from local_http import redirect_check

def decode(node):
    kind = node['type']
    if kind == 'null': return None
    if kind in ('string', 'boolean'): return node['value']
    if kind == 'number':
        raw = node['lexeme']
        return Decimal(raw) if any(c in raw for c in '.eE') else int(raw)
    if kind == 'array': return [decode(x) for x in node['items']]
    return {k: decode(v) for k, v in node['entries']}

def encode(value):
    if value is None: return {'type': 'null'}
    if isinstance(value, bool): return {'type': 'boolean', 'value': value}
    if isinstance(value, (int, float, Decimal)): return {'type': 'number', 'lexeme': str(value)}
    if isinstance(value, str): return {'type': 'string', 'value': value}
    if isinstance(value, (list, tuple)): return {'type': 'array', 'items': [encode(x) for x in value]}
    return {'type': 'object', 'entries': [[k, encode(v)] for k, v in value.items()]}

PARAMS = {'serverTimestamp':'server_timestamp', 'forceFetch':'force_fetch','incomeAccount':'income_account','outcomeAccount':'outcome_account','incomeInstrument':'income_instrument','outcomeInstrument':'outcome_instrument','fromAccount':'from_account','toAccount':'to_account','fromInstrument':'from_instrument','toInstrument':'to_instrument','amountOut':'amount_out','amountIn':'amount_in','debtAccount':'debt_account','accountType':'account_type'}
ERRORS = {ValueError: 'validation', api.ResponseError:'response', api.HTTPError:'http', api.TransportError:'transport', api.ClientClosedError:'closed'}

async def run(c, asynchronous):
    requests = []
    cursor = 0
    def handler(request):
        nonlocal cursor
        assert request.url.host == 'api.zenmoney.ru'
        headers = {'content-type': request.headers['content-type'].split(';')[0]}
        if 'authorization' in request.headers: headers['authorization'] = request.headers['authorization']
        body = (sorted([list(pair) for pair in parse_qsl(request.content.decode(),keep_blank_values=True)])
                if 'form-urlencoded' in headers['content-type'] else protocol.decode_json(request.content))
        requests.append({'method': request.method, 'url': str(request.url), 'headers': headers, 'body': body})
        if cursor >= len(c['events']): raise AssertionError('Unexpected extra request')
        event = c['events'][cursor]; cursor += 1
        if event.get('disconnect'): raise httpx.ReadError('Synthetic disconnect')
        content = base64.b64decode(event['bodyBase64']) if 'bodyBase64' in event else event['body'].encode()
        return httpx.Response(event['status'], content=content)
    transport = httpx.MockTransport(handler)
    client = (api.AsyncClient if asynchronous else api.Client)('TEST_BEARER_NOT_A_SECRET', transport=transport, clock=lambda:c['clock'], max_response_bytes=decode(c['input']).get('config',{}).get('maxResponseBytes',64*1024*1024))
    oc = (api.AsyncOAuthClient if asynchronous else api.OAuthClient)('APP','TEST_SECRET','https://example.invalid/callback', transport=httpx.MockTransport(handler))
    out = {'caseId':c['id'], 'runtime':'python-async' if asynchronous else 'python-sync', 'status':'completed','featureIds':c['featureIds']}
    try:
        args = decode(c['input']); args.pop('config',None); op = c['operation']; group, name = op.split('.')
        params = {PARAMS.get(k,k):v for k,v in args.items()}
        supported=json.loads(Path('contracts/v1/schema.json').read_text())['properties']['operation']['enum']
        if op not in supported: raise AssertionError('Unsupported contract operation')
        if group == 'codec':
            value = protocol.decode_json(base64.b64decode(args['bodyBase64']) if 'bodyBase64' in args else args['raw'].encode()) if name == 'decode' else protocol.decode_json(protocol.encode_json(args['value']))
        elif group == 'protocol':
            if name == 'entityKey': value = protocol.entity_key(args['kind'],args['entity'])
            else:
                value = protocol.decode_diff(args['raw'].encode(),args['cursor'])
                value = {'data':dict(value),'rawJson':value.raw_json,'serverTimestamp':value.server_timestamp}
        elif group == 'transactions':
            if name == 'update': value=transactions.update(args['entity'],now=args.get('now'),**args['fields'])
            elif name == 'clearBudget': value=transactions.clear_budget(args['budget'],now=args.get('now'))
            elif name == 'deletion': value=transactions.deletion(args['kind'],args['id'],user=args['user'],now=args.get('now'))
            else: value=getattr(transactions,name)(**params)
        elif group == 'entities':
            fields = params.pop('fields', {})
            value=getattr(entities,name)(**params,**fields)
        elif group == 'client':
            if name == 'closed':
                value=client.aclose() if asynchronous else client.close()
                if inspect.isawaitable(value): await value
                value=client.read_diff()
            elif name == 'upsert': value=client.upsert(args['kind'],args['entities'],args.get('serverTimestamp',0))
            elif name == 'suggest': value=client.suggest(args['transactions'])
            elif name == 'delete': value=client.delete(args['deletions'],args.get('serverTimestamp',0))
            else: value=getattr(client,'read_diff' if name=='readDiff' else name)(**params)
        elif group == 'oauth':
            if name=='authorizationUrl': value=oauth.authorization_url(args['clientId'],args['redirectUri'],state=args['state'])
            elif name=='callbackCode': value=oauth.callback_code(args['callbackUrl'],expected_state=args['expectedState'])
            elif name=='closed':
                value=oc.aclose() if asynchronous else oc.close()
                if inspect.isawaitable(value): await value
                value=oc.refresh('TEST_REFRESH')
            else: value=getattr(oc,'exchange_code' if name=='exchangeCode' else name)(args['value'])
        else: raise AssertionError('Unsupported operation')
        if inspect.isawaitable(value): value=await value
        if isinstance(value,api.Token): value={'accessToken':value.access_token,'tokenType':value.token_type,'expiresIn':value.expires_in,'refreshToken':value.refresh_token}
        out['result']=encode(value)
    except tuple(ERRORS) as exc:
        out['error']=next(category for cls,category in ERRORS.items() if isinstance(exc,cls))
        if isinstance(exc,api.HTTPError): out['statusCode']=exc.status_code
    finally:
        if asynchronous: await client.aclose(); await oc.aclose()
        else: client.close(); oc.close()
    out['requests']=encode(requests)
    return out

async def main():
    manifest=json.loads(Path('contracts/manifest.json').read_text())
    assert protocol.KINDS == ('instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction','country')
    assert protocol.FORCE_FETCH == ('instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction')
    assert protocol.WRITABLE == ('account','tag','merchant','budget','reminder','reminderMarker','transaction')
    assert protocol.DELETABLE == ('account','tag','merchant','reminder','reminderMarker','transaction')
    for asynchronous in [False,True]:
        for entry in manifest['cases']:
            c=json.loads((Path('contracts')/entry['file']).read_text())
            print(json.dumps(await run(c,asynchronous)))
        await redirect_check(asynchronous)
        print(json.dumps({'caseId':'native-http-redirect','runtime':'python-async' if asynchronous else 'python-sync','status':'completed','error':'http','statusCode':302}))
        for case_id,value in [('native-cycle', []), ('native-unsupported', object())]:
            if case_id=='native-cycle': value.append(value)
            try: protocol.encode_json(value)
            except ValueError: pass
            else: raise AssertionError('Invalid native value accepted')
            print(json.dumps({'caseId':case_id,'runtime':'python-async' if asynchronous else 'python-sync','status':'completed','error':'validation'}))

asyncio.run(main())
