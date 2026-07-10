import { db } from "@/db";
import { settings, forumPosts } from "@/db/schema";
import { createForumPost } from "@/lib/discord";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// Функция для форматирования даты в формате дд.мм.гггг
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Функция для получения текущей даты в московском часовом поясе
function getMoscowTime() {
  const now = new Date();
  const moscowOffset = 3; // UTC+3
  const moscowTime = new Date(now.getTime() + moscowOffset * 60 * 60 * 1000);
  return moscowTime;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manualDate = searchParams.get('date');
  const secret = searchParams.get('secret');

  // Проверка секретного ключа, если он задан в .env
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configResult = await db.select().from(settings).limit(1);
    const config = configResult[0];

    if (!config || !config.discordToken || !config.forumChannelId) {
      return NextResponse.json({ error: "Discord settings not configured" }, { status: 400 });
    }

    // Используем ручную дату или сегодняшнюю
    let postDate: string;
    let displayDate: string;
    
    if (manualDate) {
      const parts = manualDate.split('.');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        postDate = `${year}-${month}-${day}`;
        displayDate = manualDate;
      } else {
        postDate = new Date().toISOString().split('T')[0];
        displayDate = postDate.split('-').reverse().join('.');
      }
    } else {
      const now = getMoscowTime();
      postDate = now.toISOString().split('T')[0];
      displayDate = formatDate(now);
    }

    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const title = `Отчет за ${displayDate}`;
    const content = `Новая публикация от ${displayDate} в ${time} (МСК)`;
    const discordPostId = await createForumPost(config.discordToken, config.forumChannelId, title, content);

    await db.insert(forumPosts).values({
      id: crypto.randomUUID(),
      postDate: postDate,
      discordPostId: discordPostId,
    });

    return NextResponse.json({ success: true, discordPostId, displayDate });
  } catch (error: any) {
    console.error("Error creating forum post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Эндпоинт для ручного создания поста с указанием даты
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date } = body;

    const configResult = await db.select().from(settings).limit(1);
    const config = configResult[0];

    if (!config || !config.discordToken || !config.forumChannelId) {
      return NextResponse.json({ error: "Discord settings not configured" }, { status: 400 });
    }

    // Формат даты: дд.мм.гггг
    const postDate = formatDate(date || new Date());
    
    // Конвертируем в формат для БД
    const dbDate = postDate.split('.').reverse().join('-');

    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const title = `Отчет за ${postDate}`;
    const content = `Новая публикация от ${postDate} в ${time} (МСК)`;
    const discordPostId = await createForumPost(config.discordToken, config.forumChannelId, title, content);

    await db.insert(forumPosts).values({
      id: crypto.randomUUID(),
      postDate: dbDate,
      discordPostId: discordPostId,
    });

    return NextResponse.json({ success: true, discordPostId, displayDate: postDate });
  } catch (error: any) {
    console.error("Error creating forum post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}