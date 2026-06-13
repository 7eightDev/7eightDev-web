import { Nav } from '@/presentation/features/landing/nav';
import { QuoteProvider } from '@/presentation/features/landing/quote-context';

export default function MarketingLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QuoteProvider>
      <Nav />
      {children}
    </QuoteProvider>
  );
}
