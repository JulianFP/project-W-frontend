import type { Readable } from "svelte/store";
import { location, querystring, push, replace } from "svelte-spa-router";

//handles subscribe/unsubscribe to a store to reduce code reuse/boilerplate
function getStoreStringValue(store: Readable<string|undefined>): string {
  let storeVal: string = "";
  const unsubscribe = store.subscribe((value) => {
    if(typeof value === "string") storeVal = value;
  });

  unsubscribe();
  return storeVal;
}

export function loginForward(): void {
  const params = new URLSearchParams(getStoreStringValue(querystring));
  const locationVal: string = getStoreStringValue(location);

  if(locationVal && locationVal !== "/"){
    params.set("dest", locationVal);
  }
  let newQueryString: string = "";
  if(params.size > 0) newQueryString = "?" + params.toString();

  replace("/login" + newQueryString);
}

export function destForward(): void {
  const params = new URLSearchParams(getStoreStringValue(querystring));

  const destination: string|null = params.get("dest");
  params.delete("dest");
  
  let newQueryString: string = "";
  if(params.size > 0) newQueryString = "?" + params.toString();

  if(destination) push(destination + newQueryString);
  else push("/" + newQueryString);
}

export function preserveQuerystringForward(route: string): void {
  const params = new URLSearchParams(getStoreStringValue(querystring));
  if(params.size > 0) push(route + "?" + params.toString());
  else push(route);
}
