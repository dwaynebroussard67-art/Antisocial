import { z } from "zod";

export const createNeedSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(3000),
    category: z.enum(["service", "skills", "logistics", "administrative", "creative", "other"]),
    isVirtual: z.boolean(),
    location: z.string().trim().max(200).optional(),
    slotsNeeded: z.number().int().min(1).max(500),
    deadline: z.string().datetime().optional(),
  })
  .refine((d) => d.isVirtual || !!d.location, {
    message: "location is required when isVirtual is false",
    path: ["location"],
  });
