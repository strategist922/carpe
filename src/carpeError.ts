import { writable } from 'svelte/store';
import { error } from './carpeNotify';

export interface CarpeError {
  category: number;
  uid: number;
  msg: string;
};

let list_errors: CarpeError;
export const errors = writable(list_errors);

export function raise_error(err: CarpeError, quiet: boolean = false) {
  errors.set(err);
  console.log(err);
  let msg =`Error (${err.uid}): ${err.msg}`
  if (!quiet) {
    error(msg);
  }
}

