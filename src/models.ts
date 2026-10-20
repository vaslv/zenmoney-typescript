import type {ExactDecimal} from './numbers.js';
export type Integer = number | bigint;
export type Numeric = Integer | ExactDecimal;
export type JsonValue = null | boolean | string | Numeric | JsonValue[] | JsonObject;
export interface JsonObject {[key:string]:JsonValue | undefined}
export interface Instrument extends JsonObject {
  id?: Integer;
  changed?: Integer;
  title?: string;
  shortTitle?: string;
  symbol?: string;
  rate?: Numeric;
}
export interface Company extends JsonObject {
  id?: Integer;
  changed?: Integer;
  title?: string;
  fullTitle?: string | null;
  www?: string | null;
  country?: string | null;
}
export interface User extends JsonObject {
  id?: Integer;
  changed?: Integer;
  login?: string | null;
  currency?: Integer;
  parent?: Integer | null;
}
export interface Entity extends JsonObject {
  id?: string;
  changed?: Integer;
  user?: Integer;
}
export interface Account extends Entity {
  private?: boolean;
  balanceCorrectionType?: string;
  role?: Integer | null;
  instrument?: Integer | null;
  company?: Integer | null;
  type?: "cash" | "ccard" | "checking" | "loan" | "deposit" | "emoney" | "debt";
  title?: string;
  syncID?: (string)[] | null;
  balance?: Numeric | null;
  startBalance?: Numeric | null;
  creditLimit?: Numeric | null;
  inBalance?: boolean;
  savings?: boolean | null;
  enableCorrection?: boolean;
  enableSMS?: boolean;
  archive?: boolean;
  capitalization?: boolean | null;
  percent?: Numeric | null;
  startDate?: string | null;
  endDateOffset?: Integer | null;
  endDateOffsetInterval?: "day" | "week" | "month" | "year" | null;
  payoffStep?: Integer | null;
  payoffInterval?: "month" | "year" | null;
}
export interface Tag extends Entity {
  archive?: boolean;
  staticId?: string | null;
  title?: string;
  parent?: string | null;
  icon?: string | null;
  picture?: string | null;
  color?: Integer | null;
  showIncome?: boolean;
  showOutcome?: boolean;
  budgetIncome?: boolean;
  budgetOutcome?: boolean;
  required?: boolean | null;
}
export interface Merchant extends Entity {
  mcc?: Integer | null;
  title?: string;
}
export interface Movement extends Entity {
  incomeInstrument?: Integer;
  incomeAccount?: string;
  income?: Numeric;
  outcomeInstrument?: Integer;
  outcomeAccount?: string;
  outcome?: Numeric;
  tag?: (string)[] | null;
  merchant?: string | null;
  payee?: string | null;
  comment?: string | null;
}
export interface Transaction extends Movement {
  created?: Integer;
  deleted?: boolean;
  hold?: boolean | null;
  originalPayee?: string | null;
  date?: string;
  mcc?: Integer | null;
  reminderMarker?: string | null;
  opIncome?: Numeric | null;
  opIncomeInstrument?: Integer | null;
  opOutcome?: Numeric | null;
  opOutcomeInstrument?: Integer | null;
  latitude?: Numeric | null;
  longitude?: Numeric | null;
  viewed?: boolean;
  qrCode?: string | null;
  source?: string | null;
  incomeBankID?: string | null;
  outcomeBankID?: string | null;
}
export interface Reminder extends Movement {
  interval?: "day" | "week" | "month" | "year" | null;
  step?: Integer | null;
  points?: (Integer)[] | null;
  startDate?: string;
  endDate?: string | null;
  notify?: boolean;
}
export interface ReminderMarker extends Movement {
  isForecast?: boolean;
  date?: string;
  reminder?: string;
  state?: "planned" | "processed" | "deleted";
  notify?: boolean;
}
export interface Budget extends JsonObject {
  isIncomeForecast?: boolean;
  isOutcomeForecast?: boolean;
  changed?: Integer;
  user?: Integer;
  tag?: string | null;
  date?: string;
  income?: Numeric;
  incomeLock?: boolean;
  outcome?: Numeric;
  outcomeLock?: boolean;
}
export interface Deletion extends JsonObject {
  id: string;
  object: string;
  user: Integer;
  stamp: Integer;
}
export interface TransactionFields {
  originalPayee?: string | null;
  reminderMarker?: string | null;
  opIncome?: Numeric | null;
  opIncomeInstrument?: Integer | null;
  opOutcome?: Numeric | null;
  opOutcomeInstrument?: Integer | null;
  latitude?: Numeric | null;
  longitude?: Numeric | null;
  mcc?: Integer | null;
  hold?: boolean | null;
  deleted?: boolean;
  viewed?: boolean;
  qrCode?: string | null;
  source?: string | null;
  incomeBankID?: string | null;
  outcomeBankID?: string | null;
}
export interface BaseTransactionOptions extends TransactionFields {
  user: Integer;
  date: string;
  categories?: (string)[] | null;
  comment?: string | null;
  merchant?: string | null;
  id?: string | null;
  now?: Integer | null;
}
export interface TransactionOptions extends BaseTransactionOptions {
  payee?: string | null;
}
