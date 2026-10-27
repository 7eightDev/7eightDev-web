"use server";

import { Resend } from "resend";
import { emailConfigFromEnv } from "@/infrastructure/container";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface HomeContactResult {
  readonly ok: boolean;
  readonly error?: string;
}

export async function submitHomeContactAction(input: {
  nome: string;
  email: string;
  telefono?: string;
  tipo: string;
  budget: string;
  msg: string;
}): Promise<HomeContactResult> {
  const nome = input.nome?.trim();
  const email = input.email?.trim();
  const telefono = input.telefono?.trim() || "";
  const tipo = input.tipo?.trim();
  const budget = input.budget?.trim();
  const msg = input.msg?.trim();

  if (!nome) return { ok: false, error: "Inserisci nome o azienda" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email non valida" };
  if (telefono && !/^[+0-9\s]{8,20}$/.test(telefono)) {
    return { ok: false, error: "Formato telefono non valido" };
  }
  if (!tipo) return { ok: false, error: "Seleziona un tipo" };
  if (!msg || msg.length < 12) return { ok: false, error: "Raccontami qualche dettaglio in più" };

  const config = emailConfigFromEnv();
  if (!config) {
    return {
      ok: false,
      error: "Configurazione email mancante.",
    };
  }

  const resend = new Resend(config.apiKey);

  try {
    const subject = `Richiesta preventivo da ${nome} (${tipo})`;
    const text = [
      "Nuova richiesta preventivo dal form home",
      "",
      `Nome/Azienda: ${nome}`,
      `Email: ${email}`,
      telefono ? `Telefono: ${telefono}` : "",
      `Tipo progetto: ${tipo}`,
      `Budget indicativo: ${budget}`,
      "",
      "Messaggio:",
      msg,
      "",
      "---",
      "7eightDev - Form preventivo home",
    ]
      .filter((l) => l !== "")
      .join("\n");

    const html = `
<!doctype html>
<html lang="it">
  <head><meta charset="utf-8" /></head>
  <body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;">
    <h2 style="margin:0 0 16px;">Nuova richiesta preventivo dal form home</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="font-weight:bold;">Nome/Azienda</td><td>${escapeHtml(nome)}</td></tr>
      <tr><td style="font-weight:bold;">Email</td><td>${escapeHtml(email)}</td></tr>
      ${telefono ? `<tr><td style="font-weight:bold;">Telefono</td><td>${escapeHtml(telefono)}</td></tr>` : ""}
      <tr><td style="font-weight:bold;">Tipo progetto</td><td>${escapeHtml(tipo)}</td></tr>
      <tr><td style="font-weight:bold;">Budget indicativo</td><td>${escapeHtml(budget)}</td></tr>
    </table>
    <h3 style="margin:24px 0 8px;">Messaggio</h3>
    <p style="white-space:pre-wrap;margin:0;">${escapeHtml(msg)}</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;" />
    <p style="color:#475569;font-size:12px;">7eightDev - Form preventivo home</p>
  </body>
</html>
`;

    // Invia a info@7eightdev.com reindirizzato a 7eightdev@gmail.com via Resend
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: ["info@7eightdev.com", "7eightdev@gmail.com"],
      replyTo: email,
      subject,
      html,
      text,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    if (!data?.id) {
      return { ok: false, error: "Invio non riuscito" };
    }

    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
