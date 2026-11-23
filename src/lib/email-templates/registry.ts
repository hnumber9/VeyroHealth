import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "founding-application": foundingApplication,
  "therapist-signup": therapistSignup,
  "therapist-onboarding-complete": therapistOnboardingComplete,
  "therapist-onboarding-received": therapistOnboardingReceived,
  "therapist-approved": therapistApproved,
  "booking-confirmation": bookingConfirmation,
  "therapist-booking-confirmation": therapistBookingConfirmation,
  "booking-cancelled": bookingCancelled,
  "therapist-booking-cancelled": therapistBookingCancelled,
  "booking-rescheduled": bookingRescheduled,
  "therapist-booking-rescheduled": therapistBookingRescheduled,
  "client-invite": clientInvite,
  "patient-interest": patientInterest,
  "calendar-disconnected": calendarDisconnected,
  "matching-enquiry": matchingEnquiry,
  "review-reminder": reviewReminder,
  "partner-enquiry": partnerEnquiry,
  "booking-needs-review": bookingNeedsReview,
};

import { template as foundingApplication } from "./founding-application";
import { template as therapistSignup } from "./therapist-signup";
import { template as therapistOnboardingComplete } from "./therapist-onboarding-complete";
import { template as therapistOnboardingReceived } from "./therapist-onboarding-received";
import { template as therapistApproved } from "./therapist-approved";
import { template as bookingConfirmation } from "./booking-confirmation";
import { template as therapistBookingConfirmation } from "./therapist-booking-confirmation";
import { template as bookingCancelled } from "./booking-cancelled";
import { template as therapistBookingCancelled } from "./therapist-booking-cancelled";
import { template as bookingRescheduled } from "./booking-rescheduled";
import { template as therapistBookingRescheduled } from "./therapist-booking-rescheduled";
import { template as clientInvite } from "./client-invite";
import { template as patientInterest } from "./patient-interest";
import { template as calendarDisconnected } from "./calendar-disconnected";
import { template as matchingEnquiry } from "./matching-enquiry";
import { template as reviewReminder } from "./review-reminder";
import { template as partnerEnquiry } from "./partner-enquiry";
import { template as bookingNeedsReview } from "./booking-needs-review";
