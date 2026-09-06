import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SALT_ROUNDS = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('Seeding database...');

  const password1 = await hashPassword('password123');
  const password2 = await hashPassword('password123');
  const password3 = await hashPassword('password123');

  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      fullname: 'Alice Johnson',
      email: 'alice@example.com',
      passwordHash: password1,
      avatarUrl: 'https://i.pravatar.cc/150?u=alice',
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      fullname: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: password2,
      avatarUrl: 'https://i.pravatar.cc/150?u=bob',
    },
  });

  const charlie = await prisma.user.upsert({
    where: { username: 'charlie' },
    update: {},
    create: {
      username: 'charlie',
      fullname: 'Charlie Brown',
      email: 'charlie@example.com',
      passwordHash: password3,
      avatarUrl: 'https://i.pravatar.cc/150?u=charlie',
    },
  });

  console.log('Users created:', { alice, bob, charlie });

  const directChat = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      creatorId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const groupChat = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      name: 'Dev Team',
      creatorId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'ADMIN' },
          { userId: charlie.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('Conversations created:', { directChat, groupChat });

  const messages = await Promise.all([
    prisma.message.create({
      data: {
        conversationId: directChat.id,
        senderId: alice.id,
        content: 'Hey Bob!',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: directChat.id,
        senderId: bob.id,
        content: 'Hi Alice!',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: groupChat.id,
        senderId: alice.id,
        content: 'Welcome to the team chat!',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: groupChat.id,
        senderId: charlie.id,
        content: 'Thanks for having me!',
      },
    }),
  ]);

  console.log('Messages created:', messages.length);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
