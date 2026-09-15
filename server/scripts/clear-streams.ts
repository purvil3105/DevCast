import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up dummy data...\n');

  // Delete in order to respect foreign key constraints
  const deletedSubmissions = await prisma.submission.deleteMany({});
  console.log(`  ✓ Deleted ${deletedSubmissions.count} submissions`);

  const deletedSessions = await prisma.challengeSession.deleteMany({});
  console.log(`  ✓ Deleted ${deletedSessions.count} challenge sessions`);

  const deletedStreams = await prisma.stream.deleteMany({});
  console.log(`  ✓ Deleted ${deletedStreams.count} streams`);

  const deletedChallenges = await prisma.challenge.deleteMany({});
  console.log(`  ✓ Deleted ${deletedChallenges.count} challenges`);

  const deletedCourses = await prisma.course.deleteMany({});
  console.log(`  ✓ Deleted ${deletedCourses.count} courses`);

  console.log('\n✅ Database cleaned! Dashboard will now show 0 streams.');
  console.log('   Users are preserved — you can still log in with existing accounts.');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
