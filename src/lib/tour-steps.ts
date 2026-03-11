import type { DigiVariant } from "@/components/digi-mascot";

export interface TourStep {
  id: string;
  target: string | null; // data-tour attribute value, null = centred overlay
  title?: string;
  message: string;
  digiVariant: DigiVariant;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome!",
    message:
      "Hey! I'm Digi, your guide to the Digital Directions portal. Let me show you around — it'll only take a minute.",
    digiVariant: "neutral",
  },
  {
    id: "sidebar-projects",
    target: "sidebar-projects",
    title: "Your Projects",
    message:
      "This is where you'll find your integration projects. Each project tracks every step from kickoff to go-live.",
    digiVariant: "neutral",
  },
  {
    id: "sidebar-support",
    target: "sidebar-support",
    title: "Support",
    message:
      "Need help? Open a support ticket here and the DD team will jump in.",
    digiVariant: "neutral",
  },
  {
    id: "stat-cards",
    target: "stat-cards",
    title: "At a Glance",
    message:
      "These cards give you a snapshot — active projects, system health, and any steps waiting on you.",
    digiVariant: "neutral",
  },
  {
    id: "notification-bell",
    target: "notification-bell",
    title: "Notifications",
    message:
      "You'll get a ping here whenever something needs your attention — stage updates, messages, or alerts.",
    digiVariant: "neutral",
  },
  {
    id: "chat-bubble",
    target: "chat-bubble",
    title: "Chat with Digi",
    message:
      "And if you ever have a quick question, just tap my chat bubble down here. I can help with most things!",
    digiVariant: "neutral",
  },
  {
    id: "done",
    target: null,
    title: "You're all set!",
    message:
      "That's it! If you ever want to replay this tour, you'll find the option in the Help Centre.",
    digiVariant: "celebrating",
  },
];

export const TOUR_LS_KEY = "dd_portal_tour_completed";
