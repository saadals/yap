"use client";

import { useParams } from "next/navigation";

import { JobPage } from "@/components/job/job-page";

/** One job (a commission) for both sides; the mode follows the viewer's side of the deal. */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <JobPage id={id} />;
}
