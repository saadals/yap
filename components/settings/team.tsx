"use client";

import { Mail, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { ME, actions, useDemo } from "@/lib/store";
import type { TeamMember } from "@/lib/types";

import { ConfirmSheet } from "./confirm-sheet";
import { isEmail } from "./controls";

/* -------------------------------------------------------------------------- */
/* Your profile                                                                */
/* -------------------------------------------------------------------------- */

type MemberForm = { name: string; title: string; email: string };
const pickMember = (m: TeamMember): MemberForm => ({ name: m.name, title: m.title, email: m.email });

export function MemberProfileForm() {
  const s = useDemo();
  const member = me.member(s);
  return <MemberInner key={JSON.stringify(pickMember(member))} member={member} />;
}

function MemberInner({ member }: { member: TeamMember }) {
  const toast = useToast();
  const [form, setForm] = useState<MemberForm>(() => pickMember(member));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = {
    name: form.name.trim().split(/\s+/).length < 2 ? "Enter your first and last name." : null,
    title: form.title.trim().length < 2 ? "Add your role, like Growth lead." : null,
    email: !isEmail(form.email) ? "Enter an email like nour@daftar.app." : null,
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(pickMember(member));
  const show = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ name: true, title: true, email: true });
        if (errors.name || errors.title || errors.email) return;
        actions.updateMember(ME.memberId, {
          name: form.name.trim().replace(/\s+/g, " "),
          title: form.title.trim(),
          email: form.email.trim().toLowerCase(),
        });
        toast({ message: "Saved" });
      }}
    >
      <div className="flex items-center gap-3">
        <FaceAvatar id={member.id} name="" size={56} />
        <p className="y-small y-fg-2 max-w-[44ch]">
          Creators see your name and role on offers and in messages.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          autoComplete="name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          onBlur={blur("name")}
          error={show("name")}
        />
        <TextField
          label="Role"
          required
          autoComplete="organization-title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          onBlur={blur("title")}
          error={show("title")}
        />
      </div>
      <TextField
        label="Email"
        required
        type="email"
        autoComplete="email"
        hint="Where we send your sign-in links and notifications."
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        onBlur={blur("email")}
        error={show("email")}
      />
      <div className="flex flex-wrap items-center gap-2">
        <PillButton type="submit" variant="contrast" disabled={!dirty}>
          Save your profile
        </PillButton>
        {!dirty ? <span className="y-micro y-fg-3">All changes saved</span> : null}
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

export function TeamSection() {
  const s = useDemo();
  const toast = useToast();
  const business = me.business(s);
  const members = s.team.filter((m) => m.businessId === ME.businessId);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2" aria-label={`${business.name} team`}>
        {members.map((member) => {
          const isMe = member.id === ME.memberId;
          return (
            <li key={member.id} className="y-tile flex flex-wrap items-center gap-3 p-3 ps-3">
              <FaceAvatar id={member.id} name="" size={44} />
              <div className="min-w-0 flex-1">
                <p className="y-small flex flex-wrap items-center gap-2 font-semibold">
                  {member.name}
                  {isMe ? <Badge tone="ink" className="!min-h-6 !px-2 text-xs">You</Badge> : null}
                  {invited.includes(member.id) ? (
                    <Badge tone="info" icon={<Mail size={12} aria-hidden />} className="!min-h-6 !px-2 text-xs">
                      Invite sent
                    </Badge>
                  ) : null}
                </p>
                <p className="y-micro y-fg-2 truncate">
                  {member.title} · {member.email}
                </p>
              </div>
              {isMe ? (
                <span className="y-micro y-fg-3 px-2">Edit above</span>
              ) : (
                <PillButton
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={16} aria-hidden />}
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setRemoving(member)}
                >
                  Remove
                </PillButton>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        <PillButton variant="soft" icon={<UserPlus size={18} aria-hidden />} onClick={() => setInviting(true)}>
          Invite a teammate
        </PillButton>
      </div>

      <InviteSheet
        open={inviting}
        onClose={() => setInviting(false)}
        existing={members.map((m) => m.email.toLowerCase())}
        onInvited={(id) => setInvited((list) => [...list, id])}
      />

      <ConfirmSheet
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : "Remove teammate?"}
        description={
          removing
            ? `${removing.name.split(" ")[0]} will lose access to ${business.name}'s requests, commissions and messages. Their past messages stay in each thread.`
            : undefined
        }
        confirmLabel="Remove from team"
        onConfirm={() => {
          if (!removing || removing.id === ME.memberId) return;
          actions.removeMember(removing.id);
          toast({ message: `${removing.name} removed from ${business.name}` });
          setRemoving(null);
        }}
      />
    </div>
  );
}

function InviteSheet({
  open,
  onClose,
  existing,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  existing: string[];
  onInvited: (id: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", title: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const email = form.email.trim().toLowerCase();
  const errors = {
    name: form.name.trim().length < 2 ? "Enter their name." : null,
    email: !isEmail(email)
      ? "Enter a work email like karim@daftar.app."
      : existing.includes(email)
        ? "Someone with this email is already on the team."
        : null,
    title: form.title.trim().length < 2 ? "Add their role, like Marketing manager." : null,
  };
  const show = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  const close = () => {
    setForm({ name: "", email: "", title: "" });
    setTouched({});
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Invite a teammate"
      description="They'll get an email to join. Everyone on the team can post requests, hire and approve work."
      width="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          <PillButton type="submit" form="invite-form" variant="contrast" icon={<Mail size={18} aria-hidden />}>
            Send invite
          </PillButton>
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <form
        id="invite-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched({ name: true, email: true, title: true });
          if (errors.name || errors.email || errors.title) return;
          const id = actions.inviteMember({ name: form.name.trim(), email, title: form.title.trim() });
          onInvited(id);
          toast({ message: `Invite sent to ${email}` });
          close();
        }}
      >
        <TextField
          label="Name"
          required
          autoComplete="off"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          onBlur={blur("name")}
          error={show("name")}
          data-autofocus
        />
        <TextField
          label="Work email"
          required
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          onBlur={blur("email")}
          error={show("email")}
        />
        <TextField
          label="Role"
          required
          placeholder="Marketing manager"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          onBlur={blur("title")}
          error={show("title")}
        />
      </form>
    </Sheet>
  );
}
