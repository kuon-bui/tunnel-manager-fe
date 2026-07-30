"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { subscribeDomains } from "@/lib/domain-stream";

export function DomainStreamProvider() {
  const queryClient = useQueryClient();
  useEffect(() => subscribeDomains(queryClient), [queryClient]);
  return null;
}