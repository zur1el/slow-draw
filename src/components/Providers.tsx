"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ServiceWorkerRegister />
      {children}
    </ClerkProvider>
  );
}