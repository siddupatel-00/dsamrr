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
    label: "Left Spot #1 (L1)",
    defaultName: "Claim Ad Spot #L1",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-2",
    label: "Left Spot #2 (L2)",
    defaultName: "Claim Ad Spot #L2",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-3",
    label: "Left Spot #3 (L3)",
    defaultName: "Claim Ad Spot #L3",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-4",
    label: "Left Spot #4 (L4)",
    defaultName: "Claim Ad Spot #L4",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "left-5",
    label: "Left Spot #5 (L5)",
    defaultName: "Claim Ad Spot #L5",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-1",
    label: "Right Spot #1 (R1)",
    defaultName: "Claim Ad Spot #R1",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-2",
    label: "Right Spot #2 (R2)",
    defaultName: "Claim Ad Spot #R2",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-3",
    label: "Right Spot #3 (R3)",
    defaultName: "Claim Ad Spot #R3",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-4",
    label: "Right Spot #4 (R4)",
    defaultName: "Claim Ad Spot #R4",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
  {
    id: "right-5",
    label: "Right Spot #5 (R5)",
    defaultName: "Claim Ad Spot #R5",
    defaultTagline: "Vacant slot available for immediate booking",
    defaultUrl: "",
    defaultExpiresAt: "2026-01-01",
    defaultDurationDays: 15,
    isDefaultExpired: true,
  },
];
