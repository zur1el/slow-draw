import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center px-5 py-10">
      <SignUp />
    </main>
  );
}