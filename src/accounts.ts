import { invoke } from '@tauri-apps/api/tauri';
import { writable, get } from 'svelte/store';
import { raise_error } from './carpeError';
import { responses } from './debug';
import { miner_loop_enabled} from "./miner";
import { success, error } from './carpeNotify';
export interface AccountEntry {
  account: string,
  authkey: string,
  nickname: string,
  on_chain: boolean,
  balance: number,
}

export const new_account = function (account: string, authkey: string, nickname: string): AccountEntry {

  return {
    account: account,
    authkey: authkey,
    nickname: nickname,
    on_chain: false,
    balance: 0,
  }
};

export const signingAccount = writable<AccountEntry>(new_account("", "", ""));
export const mnem = writable("");
export const isInit = writable(false);
export const isRefreshingAccounts = writable(false);

// export const account = writable("");
// export const authkey = writable("");
export const all_accounts = writable<AccountEntry[]>([]);

export function loadAccounts() {
  invoke('get_all_accounts')
    .then((result: object) => {
      all_accounts.set(result.accounts);
      
      // set initial signingAccount
      if (get(signingAccount).account == "" && result.accounts.length > 0) {
        signingAccount.set(result.accounts[0]);
      } else {
        /* TODO no accounts in the current network
        signingAccount.set(new_account("", "", ""));
        */
      }
      // fetch data from the chain
      refreshAccounts();
    })
    .catch((error) => raise_error(error));
}

function refreshAccounts() {
  isRefreshingAccounts.set(true);
  invoke('refresh_accounts')
    .then((result: object) => {
      all_accounts.set(result.accounts);
      isRefreshingAccounts.set(false);
    })
    .catch(error => {
      isRefreshingAccounts.set(false);
    })
}

export async function is_initialized(): Promise<boolean> {
  invoke("is_init", {})
    .then((res) => {
      responses.set(res);
      if (res) {
        isInit.set(true);
      }
      // for testnet
      res
    })
    .catch((e) => raise_error(e));
}

export function findOneAccount(account: string): AccountEntry {
  let list = get(all_accounts);
  let found = list.find((i) => i.account == account)
  return found
}

export async function setAccount(an_address: string, is_first_account: boolean) {
  if (get(signingAccount).account == an_address) {
    return
  }
 
  // cannot switch profile with miner running
  if (get(miner_loop_enabled)) {
    error("To switch accounts you need to turn miner off first.");
    return
  }

  let a = findOneAccount(an_address);
  signingAccount.set(a);

  await invoke("switch_profile", {
    account: a.account,
  })
  .then((res) => {
    success("Account switched to " + a.nickname);
    responses.set(res);
    // for testnet
  })
  .catch((e) => raise_error(e));
}

export function addNewAccount(account: AccountEntry) {
  let list = get(all_accounts);
  account.on_chain = false;
  list.push(account);    
  all_accounts.set(list);
}

export function addRestoredAccount(account: AccountEntry) {
  invoke('query_balance', {account: account.account})
    .then((balance: number) => {
      let list = get(all_accounts);
      account.on_chain = true;
      account.balance = Number(balance);
      list.push(account);    
      all_accounts.set(list);
    })
    .catch((e) => raise_error(e));
}

export async function init_account_balance(authkey: string) {
  let list = get(all_accounts);
  let account = list.find((a) => a.authkey == authkey);
  invoke('query_balance', {account: account.account})
    .then((balance: number) => {
      console.log('>>> init balance: ' + balance);      
      account.on_chain = true;
      account.balance = Number(balance);
      all_accounts.set(list);
    })
    .catch((e) => raise_error(e));
}
