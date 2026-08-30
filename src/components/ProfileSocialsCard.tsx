"use client";

import React, { useState } from "react";
import { EditSocialsModal } from "./EditSocialsModal";
import { Edit3 } from "lucide-react";

export function ProfileSocialsCard({
  username,
  name,
  avatarUrl,
  twitterHandle,
  instagramHandle,
  linkedinHandle,
  githubHandle,
  showTwitter = 1,
  showInstagram = 1,
  showLinkedin = 1,
  showGithub = 1,
  isOwner,
}: {
  username: string;
  name: string;
  avatarUrl: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  linkedinHandle: string | null;
  githubHandle: string | null;
  showTwitter?: number | boolean;
  showInstagram?: number | boolean;
  showLinkedin?: number | boolean;
  showGithub?: number | boolean;
  isOwner: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const isTwitterActive = (showTwitter === 1 || showTwitter === true) && Boolean(twitterHandle);
  const isInstagramActive = (showInstagram === 1 || showInstagram === true) && Boolean(instagramHandle);
  const isLinkedinActive = (showLinkedin === 1 || showLinkedin === true) && Boolean(linkedinHandle);
  const isGithubActive = (showGithub === 1 || showGithub === true) && Boolean(githubHandle);

  const hasAnyActiveSocials = isTwitterActive || isInstagramActive || isLinkedinActive || isGithubActive;

  return (
    <>
      <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-400">Programmer</div>
          {isOwner && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 text-[10.5px] text-emerald-400 hover:text-emerald-300 font-mono transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Socials</span>
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
              alt={username}
              className="w-6 h-6 rounded-full bg-zinc-800 object-cover shrink-0"
            />
            <span className="font-bold text-white text-sm truncate">{name}</span>
          </div>

          {/* Social Accounts Links - Only rendered if toggled ON and populated */}
          {hasAnyActiveSocials && (
            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#1f2128]/80">
              {isTwitterActive && (
                <a
                  href={`https://x.com/${twitterHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`@${twitterHandle} on X`}
                  className="w-6 h-6 rounded-md bg-[#15171c] hover:bg-zinc-800 border border-[#262933] flex items-center justify-center text-zinc-400 hover:text-white transition text-xs font-bold font-mono"
                >
                  𝕏
                </a>
              )}
              {isInstagramActive && (
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`@${instagramHandle} on Instagram`}
                  className="w-6 h-6 rounded-md bg-[#15171c] hover:bg-zinc-800 border border-[#262933] flex items-center justify-center text-zinc-400 hover:text-pink-400 transition text-[11px]"
                >
                  IG
                </a>
              )}
              {isLinkedinActive && (
                <a
                  href={`https://linkedin.com/in/${linkedinHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`in/${linkedinHandle} on LinkedIn`}
                  className="w-6 h-6 rounded-md bg-[#15171c] hover:bg-zinc-800 border border-[#262933] flex items-center justify-center text-zinc-400 hover:text-sky-400 transition text-xs font-bold"
                >
                  in
                </a>
              )}
              {isGithubActive && (
                <a
                  href={`https://github.com/${githubHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`@${githubHandle} on GitHub`}
                  className="w-6 h-6 rounded-md bg-[#15171c] hover:bg-zinc-800 border border-[#262933] flex items-center justify-center text-zinc-400 hover:text-white transition text-xs font-mono"
                >
                  gh
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <EditSocialsModal
          initialSocials={{
            twitterHandle,
            instagramHandle,
            linkedinHandle,
            githubHandle,
            showTwitter,
            showInstagram,
            showLinkedin,
            showGithub,
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
