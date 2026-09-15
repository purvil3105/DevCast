import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to DB');
    
    // Count streams to be sure
    const count = await prisma.stream.count();
    console.log(`Stream count: ${count}`);
    
  } catch (err) {
    console.error('Error connecting:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
