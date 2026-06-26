import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "host@example.com";
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Demo Host" },
    create: { email, passwordHash, name: "Demo Host" },
  });

  // Reset prior demo data for this user (order respects FK constraints:
  // games cascade to sessions/players/responses; question sets cascade to questions/options).
  await prisma.game.deleteMany({ where: { ownerId: user.id } });
  await prisma.questionSet.deleteMany({ where: { ownerId: user.id } });

  const set = await prisma.questionSet.create({
    data: {
      ownerId: user.id,
      title: "ERP Millionaire — Sample",
      description: "A 5-question demo spanning every question type.",
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            title:
              "Which Dynamics 365 module is the primary system of record for financial transactions?",
            timeLimitSeconds: 20,
            basePoints: 1000,
            options: {
              create: [
                { order: 1, text: "General Ledger", isCorrect: true, points: 1000 },
                { order: 2, text: "Accounts Payable", isCorrect: false, points: 400 },
                { order: 3, text: "Supply Chain Management", isCorrect: false, points: 0 },
                { order: 4, text: "Sales Hub", isCorrect: false, points: 0 },
              ],
            },
          },
          {
            order: 2,
            type: "TRUE_FALSE",
            title:
              "In Dynamics 365 Finance & Operations, a Legal Entity corresponds to a Company.",
            timeLimitSeconds: 15,
            basePoints: 1000,
            options: {
              create: [
                { order: 1, text: "True", isCorrect: true, points: 1000 },
                { order: 2, text: "False", isCorrect: false, points: 0 },
              ],
            },
          },
          {
            order: 3,
            type: "MULTIPLE_SELECT",
            title:
              "Select all that are Dynamics 365 Finance & Operations apps.",
            timeLimitSeconds: 25,
            basePoints: 1000,
            options: {
              create: [
                { order: 1, text: "Finance", isCorrect: true, points: 0 },
                { order: 2, text: "Supply Chain Management", isCorrect: true, points: 0 },
                { order: 3, text: "Mailchimp", isCorrect: false, points: 0 },
                { order: 4, text: "Project Operations", isCorrect: true, points: 0 },
              ],
            },
          },
          {
            order: 4,
            type: "SHORT_TEXT",
            title:
              "What three-letter acronym describes software that integrates core business processes like finance, HR, and supply chain?",
            timeLimitSeconds: 20,
            basePoints: 1000,
            acceptedAnswers: JSON.stringify(["ERP", "Enterprise Resource Planning"]),
          },
          {
            order: 5,
            type: "NUMERIC",
            title: "In which year was Microsoft Dynamics 365 first launched?",
            timeLimitSeconds: 20,
            basePoints: 1000,
            numericAnswer: 2016,
            numericTolerance: 1,
          },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });

  const game = await prisma.game.create({
    data: {
      ownerId: user.id,
      questionSetId: set.id,
      title: "ERP Millionaire — Demo Game",
      scoringMode: "WEIGHTED",
      valueSource: "PRESET",
      speedBonus: true,
    },
  });

  console.log(
    `Seeded host "${user.email}" (password: password123), question set "${set.title}" ` +
      `with ${set.questions.length} questions, and game "${game.title}".`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
