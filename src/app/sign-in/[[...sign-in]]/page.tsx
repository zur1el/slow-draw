import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center px-5 py-10">
      <SignIn />
    </main>
  );
}