import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
type Period = "MORNING" | "AFTERNOON";

const WEEKDAYS_MON_FRI: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEKDAYS_MON_SAT: Weekday[] = [...WEEKDAYS_MON_FRI, "SATURDAY"];

interface WindowRule {
  days: Weekday[];
  period: Period;
  start: string;
  end: string;
}

/** Développe des règles compactes (ex: "Lundi-Vendredi, matin, 08:30-12:30") en lignes PharmacyTimeWindow. */
function expandRules(rules: WindowRule[]) {
  return rules.flatMap((rule) =>
    rule.days.map((weekday) => ({ weekday, period: rule.period, startTime: rule.start, endTime: rule.end }))
  );
}

/** Comptes de démonstration — voir README pour les identifiants de test. */
const DEMO_USERS = [
  {
    id: "seed-user-dispatcher",
    email: "dispatcher@pharmaroute.be",
    name: "Isabelle (Dispatcher)",
    password: "dispatcher123",
    role: "DISPATCHER" as const,
  },
  {
    id: "seed-user-driver",
    email: "chauffeur@pharmaroute.be",
    name: "Jean (Chauffeur)",
    password: "chauffeur123",
    role: "DRIVER" as const,
  },
];

async function main() {
  for (const demoUser of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(demoUser.password, 10);
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name, role: demoUser.role, passwordHash },
      create: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        passwordHash,
      },
    });
  }

  const depot = await prisma.depot.upsert({
    where: { id: "seed-depot-bruxelles" },
    update: {},
    create: {
      id: "seed-depot-bruxelles",
      name: "Dépôt central Bruxelles",
      address: "Chaussée de Louvain 431",
      postalCode: "1030",
      city: "Schaerbeek",
      latitude: 50.8676,
      longitude: 4.3898,
      openingTime: "06:30",
    },
  });

  // Grilles horaires variées (Lundi-Samedi, matin/après-midi) pour bien
  // représenter les cas d'usage : matin seul, matin+après-midi, samedi ouvert/fermé.
  const pharmacies = [
    {
      apbCode: "APB-10012",
      name: "Pharmacie du Centre",
      address: "Rue de la Loi 16",
      postalCode: "1000",
      city: "Bruxelles",
      latitude: 50.8455,
      longitude: 4.3641,
      bacsCount: 3,
      windowRules: [
        { days: WEEKDAYS_MON_FRI, period: "MORNING" as Period, start: "07:30", end: "08:30" },
        { days: WEEKDAYS_MON_FRI, period: "AFTERNOON" as Period, start: "14:00", end: "15:00" },
      ],
    },
    {
      apbCode: "APB-10045",
      name: "Pharmacie Léopold",
      address: "Avenue Louise 240",
      postalCode: "1050",
      city: "Ixelles",
      latitude: 50.8259,
      longitude: 4.3675,
      bacsCount: 2,
      windowRules: [
        { days: WEEKDAYS_MON_FRI, period: "MORNING" as Period, start: "08:00", end: "09:00" },
        { days: WEEKDAYS_MON_FRI, period: "AFTERNOON" as Period, start: "14:30", end: "16:00" },
        { days: ["SATURDAY"] as Weekday[], period: "MORNING" as Period, start: "09:00", end: "12:00" },
      ],
    },
    {
      apbCode: "APB-20077",
      name: "Pharmacie de la Gare",
      address: "Place Rogier 8",
      postalCode: "1210",
      city: "Saint-Josse-ten-Noode",
      latitude: 50.8598,
      longitude: 4.3563,
      bacsCount: 4,
      windowRules: [{ days: WEEKDAYS_MON_SAT, period: "MORNING" as Period, start: "07:00", end: "08:00" }],
    },
    {
      apbCode: "APB-30512",
      name: "Pharmacie Sainte-Catherine",
      address: "Rue Antoine Dansaert 87",
      postalCode: "1000",
      city: "Bruxelles",
      latitude: 50.85,
      longitude: 4.3488,
      bacsCount: 1,
      windowRules: [
        { days: WEEKDAYS_MON_FRI, period: "MORNING" as Period, start: "09:00", end: "10:30" },
        { days: WEEKDAYS_MON_FRI, period: "AFTERNOON" as Period, start: "15:00", end: "18:00" },
      ],
    },
    {
      apbCode: "APB-40188",
      name: "Pharmacie Meiser",
      address: "Boulevard Auguste Reyers 90",
      postalCode: "1030",
      city: "Schaerbeek",
      latitude: 50.855,
      longitude: 4.3897,
      bacsCount: 2,
      windowRules: [
        { days: WEEKDAYS_MON_FRI, period: "MORNING" as Period, start: "08:30", end: "09:30" },
        { days: WEEKDAYS_MON_FRI, period: "AFTERNOON" as Period, start: "13:30", end: "17:00" },
        { days: ["SATURDAY"] as Weekday[], period: "MORNING" as Period, start: "09:00", end: "12:30" },
      ],
    },
    {
      apbCode: "APB-50291",
      name: "Pharmacie Flagey",
      address: "Place Eugène Flagey 18",
      postalCode: "1050",
      city: "Ixelles",
      latitude: 50.8298,
      longitude: 4.3729,
      bacsCount: 3,
      windowRules: [
        { days: WEEKDAYS_MON_FRI, period: "MORNING" as Period, start: "07:30", end: "09:00" },
        { days: WEEKDAYS_MON_FRI, period: "AFTERNOON" as Period, start: "14:00", end: "18:30" },
      ],
    },
  ];

  for (const { windowRules, ...pharmacy } of pharmacies) {
    const rows = expandRules(windowRules);
    await prisma.pharmacy.upsert({
      where: { apbCode: pharmacy.apbCode },
      update: { ...pharmacy, timeWindows: { deleteMany: {}, create: rows } },
      create: { ...pharmacy, timeWindows: { create: rows } },
    });
  }

  console.log(`✔ Dépôt "${depot.name}" et ${pharmacies.length} pharmacies insérés.`);
  console.log(`✔ ${DEMO_USERS.length} comptes de démonstration créés (voir README).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
