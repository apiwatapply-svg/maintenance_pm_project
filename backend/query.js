const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const details = await prisma.pMRecordDetail.findMany({ where: { recordId: 4455, subItemName: { not: null } } });
  console.log(JSON.stringify(details, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
