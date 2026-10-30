export function ShareQrCode({ petName, dataUrl }: { petName: string; dataUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, not an optimizable remote image */}
      <img
        src={dataUrl}
        alt={`QR code linking to ${petName}'s page`}
        width={120}
        height={120}
        className="rounded-md border border-neutral-200"
      />
      <a
        href={dataUrl}
        download={`${petName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr-code.png`}
        className="text-xs font-medium text-brand-primary hover:text-brand-primary-dark"
      >
        Download QR code
      </a>
    </div>
  );
}
