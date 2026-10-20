export type ErrorCategory = 'validation' | 'response' | 'transport' | 'http' | 'closed';
export class ZenMoneyError extends Error {
  constructor(readonly category: ErrorCategory, readonly code: string, message: string) {
    super(message); this.name = new.target.name;
  }
  toJSON(): {name: string; category: ErrorCategory; code: string} {
    return {name:this.name,category:this.category,code:this.code};
  }
}
export class ValidationError extends ZenMoneyError {
  constructor(code = 'invalid_input') { super('validation',code,'Invalid ZenMoney request input'); }
}
export class ResponseError extends ZenMoneyError {
  constructor(code = 'invalid_response') { super('response',code,'Invalid ZenMoney response'); }
}
export class HTTPError extends ZenMoneyError {
  constructor(readonly statusCode: number) { super('http','http_error',`ZenMoney returned HTTP ${statusCode}`); }
  override toJSON(): ReturnType<ZenMoneyError['toJSON']> & {statusCode:number} {return {...super.toJSON(),statusCode:this.statusCode};}
}
export class TransportError extends ZenMoneyError {
  constructor(code: 'network' | 'timeout' | 'aborted' = 'network') {super('transport',code,'ZenMoney connection did not complete');}
}
export class ClientClosedError extends ZenMoneyError {
  constructor() {super('closed','client_closed','ZenMoney client is closed');}
}
