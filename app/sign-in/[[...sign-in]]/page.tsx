import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Accedi — 7eightDev",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <SignIn />
    </main>
  );
}
