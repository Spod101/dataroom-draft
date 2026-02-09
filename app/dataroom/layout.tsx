"use client";

import { DataRoomProvider } from "@/contexts/dataroom-context";

export default function DataRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DataRoomProvider>{children}</DataRoomProvider>;
}
