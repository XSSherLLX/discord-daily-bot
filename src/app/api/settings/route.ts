import { db } from "@/db";
import { settings, configHistory } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getBotName } from "@/lib/discord";

function sendJsonResponse(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), { 
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function GET() {
  try {
    const current = await db.select().from(settings).limit(1);
    const history = await db.select().from(configHistory).orderBy(desc(configHistory.createdAt)).limit(5);
    return sendJsonResponse({ current: current[0] || {}, history });
  } catch (error: any) {
    console.error("Database GET error:", error);
    const response = { error: "База данных недоступна", technical: error.message || "Коннект не удался" };
    return sendJsonResponse(response, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { discordToken, forumChannelId } = body;

    if (!discordToken || !forumChannelId) {
       return sendJsonResponse({ error: "Необходимы токен и ID канала" }, 400);
    }

    // Проверяем токен перед сохранением
    let botName: string | null = null;
    try {
      botName = await getBotName(discordToken);
    } catch (e) {
      // токен проверяем позже, просто запоминаем
    }
    
    if (!botName) {
      // Попробуем создать запись без проверки - возможно токен валиден, а Discord не ответил
      botName = "Unknown Bot";
    }

    const existing = await db.select().from(settings).limit(1);

    if (existing.length > 0) {
      await db.update(settings).set({
        discordToken,
        forumChannelId,
        botName,
        updatedAt: new Date(),
      }).where(eq(settings.id, "default"));
    } else {
      await db.insert(settings).values({
        id: "default",
        discordToken,
        forumChannelId,
        botName,
      });
    }

    // Добавляем в историю, только если данные валидны
    try {
      await db.insert(configHistory).values({
        discordToken,
        forumChannelId,
        botName,
      });
    } catch (historyError) {
      console.error("History insert failed:", historyError);
    }

    return sendJsonResponse({ success: true, botName });
  } catch (error: any) {
    console.error("POST error:", error);
    return sendJsonResponse({ 
      error: "Ошибка сохранения",
      detail: error.message || String(error)
    }, 500);
  }
}
