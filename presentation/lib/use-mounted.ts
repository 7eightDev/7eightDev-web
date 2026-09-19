"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `false` durante il render sul server e al primo render del client, `true` da
 * subito dopo l'idratazione — l'equivalente lint-safe della coppia
 * `useState`/`useEffect` (niente setState dentro un effect).
 *
 * Serve a tutto ciò che dipende dal tema: next-themes legge `localStorage`
 * durante il primo render del client, quindi un componente che renderizza il
 * tema risolto produrrebbe markup diverso da quello del server. Chi usa questo
 * hook rende un primo passaggio neutro, identico a quello del server, e solo
 * dopo passa al tema reale.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
