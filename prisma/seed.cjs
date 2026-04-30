require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('\n🌱 Seeding FinPay database...\n');

  // ── System account ────────────────────────────────────────────────────────
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@finpay.dev' },
    update: {},
    create: {
      email: 'system@finpay.dev',
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
      firstName: 'FinPay',
      lastName: 'System',
      account: {
        create: {
          balance: 999999999.00,
          currency: 'ZAR',
        },
      },
    },
  });

  console.log('✅ System account ready:', systemUser.email, '\n');

  // ── Demo users ────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('SecurePass123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@finpay.dev' },
    update: {},
    create: {
      email: 'alice@finpay.dev',
      passwordHash: password,
      firstName: 'Alice',
      lastName: 'Smith',
      account: {
        create: { balance: 10000.00, currency: 'ZAR' },
      },
    },
    include: { account: true },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@finpay.dev' },
    update: {},
    create: {
      email: 'bob@finpay.dev',
      passwordHash: password,
      firstName: 'Bob',
      lastName: 'Jones',
      account: {
        create: { balance: 5000.00, currency: 'ZAR' },
      },
    },
    include: { account: true },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@finpay.dev' },
    update: {},
    create: {
      email: 'charlie@finpay.dev',
      passwordHash: password,
      firstName: 'Charlie',
      lastName: 'Dube',
      account: {
        create: { balance: 2500.00, currency: 'ZAR' },
      },
    },
    include: { account: true },
  });

  console.log('✅ Users created:');
  console.log(`   Alice   → ${alice.email}   (R ${Number(alice.account.balance).toLocaleString()})`);
  console.log(`   Bob     → ${bob.email}     (R ${Number(bob.account.balance).toLocaleString()})`);
  console.log(`   Charlie → ${charlie.email} (R ${Number(charlie.account.balance).toLocaleString()})`);
  console.log();

  // ── Transactions ──────────────────────────────────────────────────────────
  const transactions = [
    {
      idempotencyKey: 'seed-tx-001',
      senderId:    alice.account.id,
      receiverId:  bob.account.id,
      amount:      1500.00,
      description: 'Rent contribution',
      status:      'COMPLETED',
      createdAt:   daysAgo(14),
    },
    {
      idempotencyKey: 'seed-tx-002',
      senderId:    bob.account.id,
      receiverId:  charlie.account.id,
      amount:      300.00,
      description: 'Lunch split',
      status:      'COMPLETED',
      createdAt:   daysAgo(10),
    },
    {
      idempotencyKey: 'seed-tx-003',
      senderId:    charlie.account.id,
      receiverId:  alice.account.id,
      amount:      750.00,
      description: 'Concert tickets',
      status:      'COMPLETED',
      createdAt:   daysAgo(7),
    },
    {
      idempotencyKey: 'seed-tx-004',
      senderId:    alice.account.id,
      receiverId:  charlie.account.id,
      amount:      200.00,
      description: 'Grocery run',
      status:      'COMPLETED',
      createdAt:   daysAgo(5),
    },
    {
      idempotencyKey: 'seed-tx-005',
      senderId:    bob.account.id,
      receiverId:  alice.account.id,
      amount:      500.00,
      description: 'Freelance payment',
      status:      'COMPLETED',
      createdAt:   daysAgo(3),
    },
    {
      idempotencyKey: 'seed-tx-006',
      senderId:    alice.account.id,
      receiverId:  bob.account.id,
      amount:      100.00,
      description: 'Parking',
      status:      'COMPLETED',
      createdAt:   daysAgo(1),
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.upsert({
      where:  { idempotencyKey: tx.idempotencyKey },
      update: {},
      create: tx,
    });
  }

  console.log(`✅ ${transactions.length} transactions created`);
  console.log();

  // ── Audit logs ────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId:    alice.id,
        action:    'REGISTER',
        entity:    'user',
        entityId:  alice.id,
        ipAddress: '127.0.0.1',
        createdAt: daysAgo(30),
      },
      {
        userId:    bob.id,
        action:    'REGISTER',
        entity:    'user',
        entityId:  bob.id,
        ipAddress: '127.0.0.1',
        createdAt: daysAgo(28),
      },
      {
        userId:    charlie.id,
        action:    'REGISTER',
        entity:    'user',
        entityId:  charlie.id,
        ipAddress: '127.0.0.1',
        createdAt: daysAgo(20),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Audit log entries created');
  console.log();
  console.log('─'.repeat(50));
  console.log('🎉 Seed complete. Demo accounts ready:\n');
  console.log('   Email                  Password');
  console.log('   alice@finpay.dev       SecurePass123');
  console.log('   bob@finpay.dev         SecurePass123');
  console.log('   charlie@finpay.dev     SecurePass123');
  console.log();
  console.log('   Swagger UI → http://localhost:3000/api/docs\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
