import { theme } from "@/lib/theme";
import { PasskeyForm } from "./passkey-form";

export default function PasskeyLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-100 px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-lg font-semibold text-neutral-900">{theme.org.name}</h1>
        <p className="mb-6 text-center text-sm text-neutral-500">Verify with your passkey</p>
        <PasskeyForm />
      </div>
    </main>
  );
}
