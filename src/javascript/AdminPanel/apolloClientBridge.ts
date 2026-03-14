/**
 * Shares jcontent's Apollo client (captured from its React context) with
 * components that live in separate React roots (e.g. the search modal).
 */
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";

let client: ApolloClient<NormalizedCacheObject> | null = null;
const callbacks: Array<() => void> = [];

export const setApolloClient = (
  c: ApolloClient<NormalizedCacheObject>,
): void => {
  client = c;
  callbacks.splice(0).forEach((cb) => cb());
};

export const getApolloClient = (): ApolloClient<NormalizedCacheObject> | null =>
  client;

export const onApolloClientReady = (cb: () => void): void => {
  if (client) cb();
  else callbacks.push(cb);
};
