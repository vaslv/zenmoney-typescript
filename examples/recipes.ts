import {ZenMoneyClient,OAuthClient,decimal,transactions,entities,type Budget,type Reminder,type ReminderMarker,type Transaction,type Diff,type Integer} from 'zenmoney-typescript';

/** The caller supplies verified account IDs and persists the result atomically. */
export async function readHistory(token:string,cursor:Integer=0):Promise<Diff> {
  const client=new ZenMoneyClient({token});
  try{return await client.readDiff({serverTimestamp:cursor});}finally{client.close();}
}
export function movements(user:Integer,account:string,other:string,debtAccount:string,instrument:Integer):Transaction[] {
  const common={user,date:'2026-01-15',account,instrument};
  return [
    transactions.expense({...common,amount:decimal('12.34'),categories:['synthetic-tag'],viewed:false}),
    transactions.income({...common,amount:decimal('100.01')}),
    // A refund is income in the original expense category, not a new endpoint.
    transactions.income({...common,amount:decimal('2.34'),categories:['synthetic-tag']}),
    transactions.transfer({user,date:common.date,fromAccount:account,toAccount:other,fromInstrument:instrument,toInstrument:2,amountOut:decimal('20.00'),amountIn:decimal('19.12')}),
    ...(['lend','borrow','repay','collect'] as const).map(action=>transactions.debt({...common,debtAccount,action,amount:decimal('10.00'),payee:'Synthetic counterparty'})),
  ];
}
export function catalogs(user:Integer,instrument:Integer) {
  return {account:entities.account({user,instrument,title:'Synthetic cash'}),tag:entities.tag({user,title:'Synthetic category',fields:{showIncome:false}}),merchant:entities.merchant({user,title:'Synthetic merchant',fields:{mcc:5411}})};
}
export function recurring(user:Integer,account:string,instrument:Integer) {
  const movement={incomeAccount:account,outcomeAccount:account,incomeInstrument:instrument,outcomeInstrument:instrument,income:0,outcome:decimal('10.01'),tag:null,payee:null,comment:null,merchant:null};
  const reminder:Reminder={...movement,id:'synthetic-reminder',user,changed:1,interval:'month',step:1,points:[1],startDate:'2026-01-01',endDate:null,notify:true};
  const marker:ReminderMarker={...movement,id:'synthetic-marker',user,changed:1,isForecast:false,date:'2026-01-01',reminder:'synthetic-reminder',state:'planned',notify:false};
  const budget:Budget={user,changed:1,date:'2026-01-01',tag:null,income:0,outcome:decimal('100.01'),incomeLock:false,outcomeLock:true,isIncomeForecast:false,isOutcomeForecast:true};
  return {reminder,marker,budget};
}
/** Confidential server only. Never distribute clientSecret inside an extension. */
export async function exchangeOnTrustedServer(clientId:string,clientSecret:string,redirectUri:string,code:string) {
  const client=new OAuthClient({clientId,clientSecret,redirectUri});
  try{return await client.exchangeCode(code);}finally{client.close();}
}
