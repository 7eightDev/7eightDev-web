/**
 * Public, client-facing context (es. /p/[uuid]).
 * Shell volutamente nudo: nessuna nav interattiva né QuoteProvider.
 * La chrome (header + logo) è di proprietà della pagina stessa (QuoteView),
 * così il preventivo resta un documento autonomo e brandizzato.
 */
export default function PublicLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
