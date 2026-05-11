const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const master = await prisma.masterChecklist.findUnique({ where: { id: 3222 } });
  console.log(master.options);
}
main().catch(console.error).finally(() => prisma.$disconnect());
