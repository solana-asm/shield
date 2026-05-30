import { Metadata } from "next";

const { title, description, ogImage, baseURL, appName } = {
  title: "Shield: sBPF Precondition Guards for Solana",
  description:
    "sBPF assembly precondition guards for Solana transactions. Composable atomic-abort checks for slippage, deadlines, fees, balances, signers, and program allowlists. Live on mainnet via @solana-asm/shield.",
  baseURL: "https://shield.sbpf.dev",
  ogImage: "https://shield.sbpf.dev/open-graph.png",
  appName: "Shield",
};

export const siteConfig: Metadata = {
  title,
  description,
  metadataBase: new URL(baseURL),
  openGraph: {
    title,
    description,
    images: [ogImage],
    url: baseURL,
    siteName: appName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ogImage,
  },
  applicationName: appName,
  alternates: {
    canonical: baseURL,
  },
  keywords: [
    "Shield",
    "Solana",
    "sBPF",
    "sBPF assembly",
    "transaction guards",
    "precondition guards",
    "atomic abort",
    "Solana safety",
    "slippage guard",
    "fee ceiling",
    "compute unit floor",
    "program allowlist",
    "signer allowlist",
    "MEV protection",
    "keeper bots",
    "agent payments",
    "@solana-asm/shield",
  ],
};
