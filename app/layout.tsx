import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zimstock Pricing Simulator',
  description: 'Scenario-based ticket pricing simulator for Zimstock committee decisions.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
