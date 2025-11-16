import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuzTrack - Real-time Location Sharing",
  description: "Share your location instantly with a private code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
