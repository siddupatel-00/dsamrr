export interface AdSlotDefinition {
  id: string;
  label: string;
  defaultName: string;
  defaultTagline: string;
  defaultUrl: string;
  defaultExpiresAt: string;
  defaultDurationDays: 15 | 30;
  isDefaultExpired?: boolean;
}

export const STANDARD_AD_SLOTS: AdSlotDefinition[] = [
  {
    id: "left-1",
    label: "Left Spotlight #1 (L1)",
    defaultName: "Pro Spotlight #L1",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-2",
    label: "Left Spotlight #2 (L2)",
    defaultName: "Pro Spotlight #L2",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-3",
    label: "Left Spotlight #3 (L3)",
    defaultName: "Pro Spotlight #L3",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-4",
    label: "Left Spotlight #4 (L4)",
    defaultName: "Pro Spotlight #L4",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-5",
    label: "Left Spotlight #5 (L5)",
    defaultName: "Pro Spotlight #L5",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-1",
    label: "Right Spotlight #1 (R1)",
    defaultName: "Pro Spotlight #R1",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-2",
    label: "Right Spotlight #2 (R2)",
    defaultName: "Pro Spotlight #R2",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-3",
    label: "Right Spotlight #3 (R3)",
    defaultName: "Pro Spotlight #R3",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-4",
    label: "Right Spotlight #4 (R4)",
    defaultName: "Pro Spotlight #R4",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-5",
    label: "Right Spotlight #5 (R5)",
    defaultName: "Pro Spotlight #R5",
    defaultTagline: "Available for developer project showcase",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
];
