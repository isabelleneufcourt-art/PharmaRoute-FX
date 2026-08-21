import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

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

  const pharmacies = [
    {
      apbCode: "APB-10012",
      name: "Pharmacie du Centre",
      address: "Rue de la Loi 16",
      postalCode: "1000",
      city: "Bruxelles",
      latitude: 50.8455,
      longitude: 4.3641,
      timeWindowStart: "07:30",
      timeWindowEnd: "08:30",
      bacsCount: 3,
    },
    {
      apbCode: "APB-10045",
      name: "Pharmacie Léopold",
      address: "Avenue Louise 240",
      postalCode: "1050",
      city: "Ixelles",
      latitude: 50.8259,
      longitude: 4.3675,
      timeWindowStart: "08:00",
      timeWindowEnd: "09:00",
      bacsCount: 2,
    },
    {
      apbCode: "APB-20077",
      name: "Pharmacie de la Gare",
      address: "Place Rogier 8",
      postalCode: "1210",
      city: "Saint-Josse-ten-Noode",
      latitude: 50.8598,
      longitude: 4.3563,
      timeWindowStart: "07:00",
      timeWindowEnd: "08:00",
      bacsCount: 4,
    },
    {
      apbCode: "APB-30512",
      name: "Pharmacie Sainte-Catherine",
      address: "Rue Antoine Dansaert 87",
      postalCode: "1000",
      city: "Bruxelles",
      latitude: 50.85,
      longitude: 4.3488,
      timeWindowStart: "09:00",
      timeWindowEnd: "10:30",
      bacsCount: 1,
    },
    {
      apbCode: "APB-40188",
      name: "Pharmacie Meiser",
      address: "Boulevard Auguste Reyers 90",
      postalCode: "1030",
      city: "Schaerbeek",
      latitude: 50.855,
      longitude: 4.3897,
      timeWindowStart: "08:30",
      timeWindowEnd: "09:30",
      bacsCount: 2,
    },
    {
      apbCode: "APB-50291",
      name: "Pharmacie Flagey",
      address: "Place Eugène Flagey 18",
      postalCode: "1050",
      city: "Ixelles",
      latitude: 50.8298,
      longitude: 4.3729,
      timeWindowStart: "07:30",
      timeWindowEnd: "09:00",
      bacsCount: 3,
    },
  ];

  for (const pharmacy of pharmacies) {
    await prisma.pharmacy.upsert({
      where: { apbCode: pharmacy.apbCode },
      update: pharmacy,
      create: pharmacy,
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
