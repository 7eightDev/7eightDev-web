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
import { clerkAuthLocalization } from '@/presentation/features/shared/clerk-auth-localization';
import { ThemeProvider } from '@/presentation/components/shared/theme-provider';

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
    <html lang="it" className={cn('font-sans', figtree.variable)} suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClerkProvider localization={clerkAuthLocalization}>
          <ThemeProvider>{children}</ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
