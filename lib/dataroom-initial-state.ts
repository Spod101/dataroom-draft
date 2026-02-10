import type { DataRoomFolder } from "./dataroom-types";

/** Initial state when no data is loaded from DB yet. Data will come from Supabase. */
export function getInitialDataRoomState(): DataRoomFolder[] {
  return [];
}
