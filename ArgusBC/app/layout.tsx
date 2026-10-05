import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AgentProvider } from "@/lib/agent-context";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "SF Pro Text",
    "Segoe UI",
    "system-ui",
    "sans-serif",
  ],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "ARGUS // Data Timeline & Control Plane",
  description: "Modern AI operations workspace and deterministic privacy-preserving control plane for RedactCore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="antialiased min-h-screen bg-argus-canvas text-argus-ink font-sans selection:bg-argus-brand/15">
        <AuthProvider>
          <WorkspaceProvider>
            <AgentProvider>{children}</AgentProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
