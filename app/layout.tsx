import type { Metadata } from 'next';
import {
  Space_Grotesk,
  Hanken_Grotesk,
  JetBrains_Mono,
  Figtree
} from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClerkProvider } from '@clerk/nextjs';
import { Nav } from '@/presentation/features/landing/nav';
import { QuoteProvider } from '@/presentation/features/landing/quote-context';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space',
  subsets: ['latin']
});

const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin']
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: '7eightDev — Sviluppo web, su due livelli',
  description:
    'Agenzia di sviluppo web specializzata in Next.js, TypeScript e React.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={cn('font-sans dark', figtree.variable)}>
      <body
        className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClerkProvider>
          <QuoteProvider>
            <Nav />
            {children}
          </QuoteProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
