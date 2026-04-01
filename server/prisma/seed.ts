/**
 * prisma/seed.ts — Demo data seed
 * Keeps only the owner account, org, chapan profile, and catalog data.
 *
 * Usage: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HASH = await bcrypt.hash('demo1234', 10);

function ago(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
}

async function main() {
  console.log('🌱  Seeding database...');

  // ── OWNER ───────────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: 'admin@kort.local' },
    update: {},
    create: {
      id: 'u-owner',
      email: 'admin@kort.local',
      fullName: 'Арман Калиев',
      phone: '+77010000001',
      password: HASH,
      status: 'active',
    },
  });

  // ── ORGANIZATION ─────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: { mode: 'industrial', onboardingCompleted: true },
    create: {
      id: 'org-demo',
      name: 'Demo Company',
      slug: 'demo-company',
      mode: 'industrial',
      onboardingCompleted: true,
      currency: 'KZT',
      industry: 'Производство',
      // Extended profile
      legalForm: 'ТОО',
      legalName: 'Товарищество с ограниченной ответственностью «Demo Company»',
      city: 'Алматы',
      director: 'Арман Калиев',
    },
  });

  // ── OWNER MEMBERSHIP ─────────────────────────────────────────────────────
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: owner.id, orgId: org.id } },
    update: {},
    create: {
      userId: owner.id,
      orgId: org.id,
      role: 'owner',
      status: 'active',
      source: 'company_registration',
      joinedAt: ago(90),
      employeeAccountStatus: 'active',
      department: '',
    },
  });

  // ── CHAPAN PROFILE ────────────────────────────────────────────────────────
  await prisma.chapanProfile.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      displayName: 'Чапан Цех',
      descriptor: 'Ателье национальной одежды',
      orderPrefix: 'ЧП',
    },
  });

  // ── CHAPAN: WORKERS ───────────────────────────────────────────────────────
  await prisma.chapanWorker.createMany({
    data: ['Айгуль М.', 'Нурлан К.', 'Гүлнар А.', 'Бакыт С.'].map(name => ({ orgId: org.id, name })),
    skipDuplicates: true,
  });

  // ── CHAPAN: CATALOG ───────────────────────────────────────────────────────
  await prisma.chapanCatalogProduct.createMany({
    data: ['Чапан мужской', 'Чапан женский', 'Камзол', 'Белдемше', 'Саукеле'].map(name => ({ orgId: org.id, name })),
    skipDuplicates: true,
  });
  await prisma.chapanCatalogFabric.createMany({
    data: ['Бархат', 'Атлас', 'Шёлк', 'Парча', 'Трикотаж'].map(name => ({ orgId: org.id, name })),
    skipDuplicates: true,
  });
  await prisma.chapanCatalogSize.createMany({
    data: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '44', '46', '48', '50', '52', '54'].map(name => ({ orgId: org.id, name })),
    skipDuplicates: true,
  });

  console.log('✅  Seed complete!');
  console.log('');
  console.log('  Owner login:');
  console.log('    Email:    admin@kort.local');
  console.log('    Password: demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
