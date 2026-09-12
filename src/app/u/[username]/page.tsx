import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    username: string;
  };
}

export default function LegacyProfileRedirect({ params }: PageProps) {
  redirect(`/${params.username}`);
}
