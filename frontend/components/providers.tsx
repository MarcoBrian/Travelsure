"use client";

import { createAppKit } from "@reown/appkit/react";
import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import { mainnet, arbitrum, polygon, optimism, base } from "@reown/appkit/networks";
import { ReactNode } from "react";

// 1. Get projectId at https://dashboard.reown.com
const projectId = "845fb350ba83d50180234b4f77a4455a";

// 2. Create a metadata object
const metadata = {
  name: "Travelsure",
  description: "Web3 Flight Insurance - Protect your travels with blockchain-powered insurance",
  url: "https://travelsure.com",
  icons: ["https://travelsure.com/icon.png"],
};

// 3. Create the AppKit instance
createAppKit({
  adapters: [new Ethers5Adapter()],
  metadata: metadata,
  networks: [mainnet, arbitrum, polygon, optimism, base],
  projectId,
  features: {
    analytics: true,
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
