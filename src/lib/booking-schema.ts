import { z } from "zod";

/**
 * Input accepted by startBooking. There is deliberately no `environment`
 * field: the server decides sandbox vs live (see payments-environment.ts),
 * and any value a client sends is stripped.
 */
export const startBookingInputSchema = z.object({
  therapistId: z.string().uuid(),
  serviceId: z.string().uuid(),
  slotStart: z.string().min(8).max(40),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(255).optional(),
  returnUrl: z.string().url().max(600),
});

export type StartBookingInput = z.infer<typeof startBookingInputSchema>;
