/**
 * Partial Italian localization for the Clerk sign-in flow (email + OTP).
 * `LocalizationResource` is DeepPartial, so only the strings surfaced by the
 * login/verification flow are overridden here; the rest keeps the defaults.
 * Used both by the custom sign-in dialog and the /sign-in page.
 */
export const clerkAuthLocalization = {
  formFieldInputPlaceholder__emailAddress: "Inserisci la tua email",
  formFieldInputPlaceholder__password: "Inserisci la tua password",
  formButtonPrimary: "Continua",
  formButtonPrimary__continue: "Continua",
  formButtonPrimary__verify: "Verifica",
  backButton: "Indietro",
  formFieldAction__forgotPassword: "Password dimenticata?",
  footerActionLink__useAnotherMethod: "Usa un altro metodo",
  signIn: {
    start: {
      title: "Accedi",
      subtitle: "Bentornato! Inserisci le tue credenziali per continuare.",
    },
    password: {
      title: "Inserisci la password",
      subtitle: "Ora inserisci la password associata a questo account.",
      actionLink: "Usa un altro metodo",
    },
    alternativeMethods: {
      title: "Usa un altro metodo",
      subtitle: "Hai problemi? Puoi accedere con uno di questi metodi.",
      actionText: "Non ne hai nessuno?",
      actionLink: "Richiedi assistenza",
      blockButton__emailCode: "Codice di verifica a {{identifier}}",
      blockButton__password: "Password",
      getHelp: {
        title: "Richiedi assistenza",
        content: "Contattaci e ti aiutiamo a recuperare l'accesso.",
        blockButton__emailSupport: "Contatta il supporto via email",
      },
    },
    emailCode: {
      title: "Controlla la tua email",
      subtitle: "Inserisci il codice di verifica che ti abbiamo inviato.",
      formTitle: "Codice di verifica",
      resendButton: "Invia di nuovo",
    },
    emailLink: {
      title: "Controlla la tua email",
      subtitle: "Ti abbiamo inviato un link per accedere.",
      formTitle: "Link di accesso",
      formSubtitle: "Apri il link ricevuto per completare l'accesso.",
      resendButton: "Invia di nuovo",
    },
    phoneCode: {
      title: "Controlla il tuo telefono",
      subtitle: "Inserisci il codice di verifica che ti abbiamo inviato via SMS.",
      formTitle: "Codice di verifica",
      resendButton: "Invia di nuovo",
    },
    newDeviceVerificationNotice:
      "Per motivi di sicurezza ti chiediamo di verificare il nuovo dispositivo.",
  },
};