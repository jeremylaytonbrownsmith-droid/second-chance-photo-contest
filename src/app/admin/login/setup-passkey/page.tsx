import { theme } from "@/lib/theme";
import { SetupPasskeyForm } from "./setup-passkey-form";

export default function SetupPasskeyPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-100 px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-lg font-semibold text-neutral-900">{theme.org.name}</h1>
        <p className="mb-2 text-center text-sm text-neutral-500">One more step</p>
        <p className="mb-6 text-center text-sm text-neutral-600">
          This account doesn&apos;t have a passkey yet. Set one up now using your device&apos;s Face ID, Touch ID,
          or fingerprint — no app to install, nothing to remember.
        </p>
        <SetupPasskeyForm />
      </div>
    </main>
  );
}
