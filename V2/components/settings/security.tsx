"use client";

import { ChevronDown, Info, Laptop, LogOut, Smartphone, Tablet, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { MethodIcon, methodLabel } from "@/components/auth/provider-icons";
import {
  countries,
  countryById,
  defaultCountry,
  formatPhone,
  isPlausible,
  maskedNumber,
} from "@/components/auth/phone";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/ui/otp-input";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { hashString } from "@/lib/hash";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { useSavedAccounts } from "@/lib/saved-accounts";
import { cityLabel, me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { ConfirmSheet } from "./confirm-sheet";

const DEMO_CODE = "123456";

type Device = { id: string; name: string; detail: string; icon: React.ReactNode; current?: boolean };

const deviceList = (city: string): Device[] => [
  { id: "d-1", name: "iPhone 15", detail: `Safari · ${city} · Active now`, icon: <Smartphone size={18} />, current: true },
  { id: "d-2", name: "MacBook Air", detail: `Chrome · ${city} · Yesterday`, icon: <Laptop size={18} /> },
  { id: "d-3", name: "iPad", detail: `Safari · ${city} · Oct 12`, icon: <Tablet size={18} /> },
];

/** A stable masked number for an account that signed in another way (prototype). */
const fallbackNumber = (accountId: string) => `+1 ••• ••• ${String(1000 + (hashString(accountId) % 9000))}`;

/**
 * Sign-in and security. Yapp signs in with a phone number and a 6-digit code (or Apple, Google,
 * TikTok, Instagram), so there is no password to change: the number can be changed (with a code),
 * devices signed out, and the account deleted (simulated). Log out asks first, like the account
 * menu's; a saved account is removed from this device only on the sign-in screen.
 */
export function SecurityControls() {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const { signOut } = usePrefs();
  const saved = useSavedAccounts();
  const account = me.account(s);
  const creator = me.creator(s);
  const business = me.business(s);
  const row = saved.find((r) => r.accountId === account.id);
  const [number, setNumber] = useState(() =>
    row?.method === "phone" ? row.identifier : fallbackNumber(account.id),
  );
  const seedDevices = deviceList(cityLabel(creator?.cityId ?? business.cityId));
  const [devices, setDevices] = useState(seedDevices);
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const signOutDevice = (device: Device) => {
    setDevices((list) => list.filter((d) => d.id !== device.id));
    toast({
      message: `Signed out of ${device.name}`,
      action: {
        label: "Undo",
        onClick: () =>
          setDevices((list) => seedDevices.filter((d) => d.id === device.id || list.some((x) => x.id === d.id))),
      },
    });
  };

  return (
    <div className="flex flex-col divide-y divide-(--y-line)">
      <div className="flex flex-wrap items-center gap-3 pb-5">
        <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
          <Smartphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="y-small font-semibold">Phone number</p>
          <p className="y-small y-fg-2">
            <bdi dir="ltr" className="y-num">
              {number}
            </bdi>
            {" · "}We text a code to sign you in. There&apos;s no password.
          </p>
        </div>
        <PillButton variant="soft" size="sm" onClick={() => setChanging(true)}>
          Change number
        </PillButton>
      </div>

      {row && row.method !== "phone" ? (
        <div className="flex flex-wrap items-center gap-3 py-5">
          <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
            <MethodIcon method={row.method} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="y-small font-semibold">Also signs in with {methodLabel[row.method]}</p>
            <p className="y-small y-fg-2">
              <bdi dir="ltr">{row.identifier}</bdi>
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="y-small font-semibold">Signed-in devices</h3>
          {devices.length > 1 ? (
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => {
                const before = devices;
                setDevices((list) => list.filter((d) => d.current));
                toast({
                  message: "Signed out of all other devices",
                  action: { label: "Undo", onClick: () => setDevices(before) },
                });
              }}
            >
              Sign out of other devices
            </PillButton>
          ) : null}
        </div>
        <ul className="flex flex-col">
          {devices.map((device) => (
            <li key={device.id} className="flex min-h-14 items-center gap-3 py-1.5">
              <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
                {device.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="y-small flex items-center gap-2 font-medium">
                  {device.name}
                  {device.current ? (
                    <Badge tone="neutral" className="!min-h-5 !px-2 text-[11px]">
                      This device
                    </Badge>
                  ) : null}
                </p>
                <p className="y-micro y-fg-2 truncate">{device.detail}</p>
              </div>
              {!device.current ? (
                <PillButton variant="ghost" size="sm" onClick={() => signOutDevice(device)} aria-label={`Sign out of ${device.name}`}>
                  Sign out
                </PillButton>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="min-w-0 flex-1">
          <h3 className="y-small font-semibold">Log out</h3>
          <p className="y-micro y-fg-2">
            This account stays saved on this device, so signing back in is one tap. To take it off this device,
            remove it on the sign-in screen.
          </p>
        </div>
        <PillButton
          variant="soft"
          size="sm"
          icon={<LogOut size={16} aria-hidden className="y-flip" />}
          onClick={() => setLoggingOut(true)}
        >
          Log out
        </PillButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="min-w-0 flex-1">
          <h3 className="y-small font-semibold">Delete account</h3>
          <p className="y-micro y-fg-2">Finish active orders and jobs first. Anything held is refunded or paid out.</p>
        </div>
        <PillButton variant="ghost" size="sm" icon={<Trash2 size={16} aria-hidden />} onClick={() => setDeleting(true)}>
          Delete account
        </PillButton>
      </div>

      <ConfirmSheet
        open={loggingOut}
        onClose={() => setLoggingOut(false)}
        title="Log out of Yapp?"
        description={`${account.firstName}'s account stays saved on this device for one-tap sign in.`}
        confirmLabel="Log out"
        onConfirm={() => {
          setLoggingOut(false);
          signOut();
          toast({ message: "Logged out", tone: "info" });
          router.push(paths.landing);
        }}
      />
      <ChangeNumberSheet
        open={changing}
        onClose={() => setChanging(false)}
        onChanged={(masked) => {
          setNumber(masked);
          setChanging(false);
          toast({ message: "Number updated. Use it next time you sign in." });
        }}
      />
      <ConfirmSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="Your orders, creator profile, portfolio and reviews will be removed for good. This can't be undone."
        confirmLabel="Delete account"
        typed={creator?.handle ?? account.firstName.toUpperCase()}
        onConfirm={() => {
          setDeleting(false);
          toast({
            message: "This is a demo, so your account stays. In the live product it would close once open work is settled.",
            tone: "info",
          });
        }}
      />
    </div>
  );
}

/** New number → a code to it → done. Simulated: the demo code is 123456. */
function ChangeNumberSheet({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: (masked: string) => void;
}) {
  const id = useId();
  const [countryId, setCountryId] = useState(defaultCountry.id);
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"number" | "code">("number");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const country = countryById(countryId);
  const plausible = isPlausible(phone, country);

  const close = () => {
    setPhone("");
    setStage("number");
    setCode("");
    setError(null);
    onClose();
  };
  const verify = (value: string) => {
    if (value.length < 6) return;
    if (value !== DEMO_CODE) {
      setError("That code doesn't match. Check the latest text.");
      return;
    }
    const masked = maskedNumber(phone, country);
    setPhone("");
    setStage("number");
    setCode("");
    onChanged(masked);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Change your number"
      description={stage === "number" ? "We'll text a code to the new number." : "Enter the 6-digit code we sent."}
      width="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          {stage === "number" ? (
            <PillButton variant="contrast" disabled={!plausible} onClick={() => setStage("code")}>
              Send code
            </PillButton>
          ) : (
            <PillButton variant="contrast" disabled={code.length < 6} onClick={() => verify(code)}>
              Verify and save
            </PillButton>
          )}
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
        </div>
      }
    >
      {stage === "number" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-tel`} className="y-label">
            New phone number
          </label>
          <div className="flex gap-2" dir="ltr">
            <div className="y-signin-cc">
              <span aria-hidden className="y-num">
                {country.dial}
              </span>
              <ChevronDown size={16} aria-hidden />
              <select aria-label="Country code" value={countryId} onChange={(event) => setCountryId(event.target.value)}>
                {countries.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.dial})
                  </option>
                ))}
              </select>
            </div>
            <input
              id={`${id}-tel`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="y-input y-num min-w-0 flex-1"
              value={phone}
              data-autofocus
              onChange={(event) => setPhone(formatPhone(event.target.value, country))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <OtpInput
            value={code}
            label="Verification code"
            invalid={Boolean(error)}
            describedBy={`${id}-hint`}
            onChange={(value) => {
              setCode(value);
              setError(null);
              if (value.length === 6) verify(value);
            }}
          />
          <p id={`${id}-hint`} className={`y-small flex items-center gap-1.5 px-1 ${error ? "font-medium text-(--y-danger)" : "y-fg-2"}`} aria-live="polite">
            {error ?? (
              <>
                <Info size={14} aria-hidden />
                Demo: use code <span className="y-num font-semibold">{DEMO_CODE}</span>
              </>
            )}
          </p>
        </div>
      )}
    </Sheet>
  );
}
