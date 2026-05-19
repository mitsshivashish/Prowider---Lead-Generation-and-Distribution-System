export interface ServiceCatalogItem {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  backendServiceId: 1 | 2 | 3;
}

export const SERVICE_DETAILS: Record<
  number,
  { name: string; tagline: string; description: string; type: "Plumbing" | "Electrical" | "Cleaning" }
> = {
  1: {
    name: "Plumbing",
    tagline: "Expert leak repair, installations, and emergency plumbing",
    description:
      "From burst pipes to water heater installs — connect with trusted local plumbers who respond fast and do the job right.",
    type: "Plumbing",
  },
  2: {
    name: "Electrical",
    tagline: "Safe wiring, panel upgrades, and reliable electrical work",
    description:
      "Licensed electricians for repairs, new installations, panel upgrades, and safety inspections at your home or business.",
    type: "Electrical",
  },
  3: {
    name: "Cleaning",
    tagline: "Deep cleaning, recurring services, and move-out cleans",
    description:
      "Professional cleaners for one-time deep cleans, recurring schedules, and move-in/move-out services.",
    type: "Cleaning",
  },
};

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 1, name: "Plumbing", category: "Home Services", description: "Leak repair, installations, and emergency plumbing.", icon: "🔧", backendServiceId: 1 },
  { id: 2, name: "Electrical", category: "Home Services", description: "Wiring, panel upgrades, and electrical repairs.", icon: "⚡", backendServiceId: 2 },
  { id: 3, name: "HVAC", category: "Home Services", description: "Heating, cooling, and ventilation services.", icon: "❄️", backendServiceId: 1 },
  { id: 4, name: "House Cleaning", category: "Home Services", description: "Deep cleaning and recurring home services.", icon: "✨", backendServiceId: 3 },
  { id: 5, name: "Carpentry", category: "Home Services", description: "Custom woodwork, repairs, and installations.", icon: "🪚", backendServiceId: 1 },
  { id: 6, name: "Painting", category: "Home Services", description: "Interior and exterior painting services.", icon: "🎨", backendServiceId: 3 },
  { id: 7, name: "Landscaping", category: "Home Services", description: "Lawn care, garden design, and outdoor upkeep.", icon: "🌿", backendServiceId: 3 },
  { id: 8, name: "Roofing", category: "Home Services", description: "Roof repair, replacement, and inspections.", icon: "🏠", backendServiceId: 1 },
  { id: 9, name: "Pest Control", category: "Home Services", description: "Safe and effective pest removal solutions.", icon: "🐜", backendServiceId: 3 },
];

export const TESTIMONIALS = [
  {
    name: "Sarah Jenkins",
    service: "Plumbing Service",
    text: "I found an amazing plumber within hours. The booking process was seamless and the work quality exceeded my expectations.",
    avatar: "SJ",
  },
  {
    name: "Michael Chen",
    service: "Electrical Service",
    text: "The electrician was punctual, polite, and extremely knowledgeable. ProWider made finding help so easy.",
    avatar: "MC",
  },
  {
    name: "Emily Rodriguez",
    service: "Cleaning Service",
    text: "Booking a deep clean was effortless. Our home has never looked better — highly recommend ProWider!",
    avatar: "ER",
  },
];

export function getServiceDetail(id: number) {
  return SERVICE_DETAILS[id] ?? null;
}
