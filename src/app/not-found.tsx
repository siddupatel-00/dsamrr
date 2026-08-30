import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4 max-w-md mx-auto font-mono">
      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
        <UserX className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-zinc-100 font-sans">User Not Found</h2>
      <p className="text-xs text-zinc-400">
        This profile does not exist yet. Verify your platform handles to create your profile.
      </p>
      <div className="pt-2 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </Link>
        <Link
          href="/settings/verify"
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition"
        >
          Verify Handle
        </Link>
      </div>
    </div>
  );
}
