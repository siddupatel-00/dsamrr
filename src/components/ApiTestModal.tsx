"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, ExternalLink, Play, Sparkles } from "lucide-react";
import { DsaApi } from "@/data/dsaApis";

export function ApiTestModal({
  api,
  onClose,
  onCopy,
}: {
  api: DsaApi;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopy = (text: string, type: "curl" | "url" | "json") => {
    onCopy(text, type.toUpperCase());
    if (type === "curl") {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-zinc-100 font-mono">
              {api.type}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 font-sans">{api.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {api.platform}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{api.maintainer}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs font-mono">
          {/* Endpoint URL Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>GET Endpoint</span>
              <button
                onClick={() => handleCopy(api.endpoint, "url")}
                className="hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? "Copied URL" : "Copy URL"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 text-emerald-400 overflow-x-auto select-all">
              {api.endpoint}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-zinc-400 uppercase">Latency</div>
              <div className="font-bold text-zinc-200 mt-0.5">{api.latencyMs}ms</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-zinc-400 uppercase">Rate Limit</div>
              <div className="font-bold text-zinc-200 mt-0.5">{api.rateLimit}</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-zinc-400 uppercase">Uptime</div>
              <div className="font-bold text-emerald-400 mt-0.5">{api.uptime}</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-zinc-400 uppercase">Auth</div>
              <div className="font-bold text-zinc-200 mt-0.5">{api.authType}</div>
            </div>
          </div>

          {/* Sample cURL Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Terminal className="w-3 h-3 text-zinc-400" />
                <span>Sample cURL</span>
              </span>
              <button
                onClick={() => handleCopy(api.sampleCurl, "curl")}
                className="hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl ? "Copied cURL" : "Copy cURL"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 text-zinc-300 overflow-x-auto text-[11px]">
              {api.sampleCurl}
            </pre>
          </div>

          {/* Sample JSON Response */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                <span>Sample 200 OK JSON Output</span>
              </span>
              <button
                onClick={() => handleCopy(JSON.stringify(api.sampleResponse, null, 2), "json")}
                className="hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? "Copied JSON" : "Copy JSON"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 text-emerald-300/90 overflow-x-auto max-h-48 text-[11px]">
              {JSON.stringify(api.sampleResponse, null, 2)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <a
            href={api.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono"
          >
            <span>Official Documentation</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => handleCopy(api.endpoint, "url")}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs font-mono transition flex items-center gap-1.5"
          >
            <Copy className="w-3 h-3" />
            <span>Copy Base URL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
