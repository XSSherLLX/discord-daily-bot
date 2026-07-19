import { db } from "@/db";
import { settings, configHistory } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getBotName, getChannelInfo } from "@/lib/discord";

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

    // Проверяем токен и канал перед сохранением
    let botName: string | null = null;
    try {
      botName = await getBotName(discordToken);
    } catch (e) {
      return sendJsonResponse({ error: "Неверный токен бота" }, 400);
    }
    
    const channelInfo = await getChannelInfo(discordToken, forumChannelId);
    if (!channelInfo) {
      return sendJsonResponse({ error: `Канал ${forumChannelId} не найден. Убедитесь, что бот добавлен на сервер.` }, 400);
    }

    // Тип 15 - это Forum Channel в Discord
    if (channelInfo.type !== 15) {
      const types: Record<number, string> = {
        0: "Текстовый канал",
        2: "Голосовой канал",
        4: "Категория",
        5: "Новостной канал",
        13: "Stage канал",
      };
      const typeName = types[channelInfo.type] || "Неизвестный тип";
      return sendJsonResponse({ error: `Этот ID принадлежит объекту "${channelInfo.name}" (${typeName}). Для парсинга нужен именно Форум.` }, 400);
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
