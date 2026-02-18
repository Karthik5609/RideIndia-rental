import { motion } from "framer-motion";

const adventureRoutes = [
  {
    title: "3-Day Bengaluru to Ooty Adventure",
    distance: "Approx. 590 km round trip",
    bike: "Adventure / Touring",
    itinerary: [
      "Day 1: Bengaluru -> Mysuru (Breakfast stop at Ramanagara, evening palace walk).",
      "Day 2: Mysuru -> Bandipur -> Ooty (Forest stretch + tea estate sunset point).",
      "Day 3: Ooty local loop (Doddabetta, Pine Forest, Pykara Lake) -> return ride plan."
    ],
    staySuggestions: [
      "Mysuru: Budget - Hotel Roopa, Mid-range - Southern Star",
      "Ooty: Budget - Zostel Ooty, Mid-range - Fortune Retreats",
      "Premium: Sterling Ooty Elk Hill for valley views"
    ],
    tip: "Start by 6:00 AM on Day 1 to avoid city traffic."
  },
  {
    title: "Leh to Nubra Valley High-Altitude Loop",
    distance: "Approx. 280 km round trip",
    bike: "Adventure (350cc+)",
    itinerary: [
      "Day 1: Leh acclimatization + local monastery ride.",
      "Day 2: Leh -> Khardung La -> Diskit (Nubra Valley).",
      "Day 3: Nubra sand dunes sunrise + return to Leh."
    ],
    staySuggestions: [
      "Leh: Zostel Leh, Hotel Lingzi",
      "Nubra: Hunder Sarai tents, Nature's Nest camps"
    ],
    tip: "Carry layers and hydration support; weather changes quickly."
  },
  {
    title: "Manali to Spiti Valley Circuit",
    distance: "Approx. 760 km loop",
    bike: "Adventure / Touring",
    itinerary: [
      "Day 1: Manali -> Kaza via Kunzum Pass (long mountain ride).",
      "Day 2: Kaza -> Key Monastery -> Langza -> Kaza.",
      "Day 3: Kaza -> Kalpa / Narkanda (break journey).",
      "Day 4: Kalpa / Narkanda -> Manali."
    ],
    staySuggestions: [
      "Kaza: The Travellers Shed, Hotel Deyzor",
      "Kalpa: Echor Resort, local guest houses"
    ],
    tip: "Fuel up at every major town and keep offline maps."
  },
  {
    title: "Goa Coastal Sunset Ride",
    distance: "Approx. 210 km over 2 days",
    bike: "Commuter / Cruiser",
    itinerary: [
      "Day 1: Panaji -> Aguada -> Calangute -> Vagator.",
      "Day 2: Panaji -> Old Goa -> Cabo de Rama -> Palolem."
    ],
    staySuggestions: [
      "North Goa: Pappi Chulo Hostel, BloomSuites",
      "South Goa: Art Resort Goa, local beach cottages"
    ],
    tip: "Best between October and February for pleasant weather."
  }
];

export default function CuratedRoutes() {
  return (
    <motion.section
      id="routes"
      className="glass-card curated-route"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      <div className="section-head">
        <h2>Curated Routes</h2>
        <p>Personalized adventure plans with day-wise itineraries and stay suggestions.</p>
      </div>

      <div className="routes-grid">
        {adventureRoutes.map((route, index) => (
          <motion.article
            key={route.title}
            className="route-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            {index === 0 && <p className="label">Featured Adventure</p>}
            <h3>{route.title}</h3>
            <p className="route-meta">
              {route.distance} | Best bike: {route.bike}
            </p>

            <h4>Itinerary</h4>
            <ul>
              {route.itinerary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4>Stay Suggestions</h4>
            <ul>
              {route.staySuggestions.map((stay) => (
                <li key={stay}>{stay}</li>
              ))}
            </ul>

            <p className="hint">Pro tip: {route.tip}</p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}
