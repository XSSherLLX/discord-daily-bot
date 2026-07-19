import { db } from "@/db";
import { settings } from "@/db/schema";
import { getForumThreads, getThreadMessages } from "@/lib/discord";
import { NextResponse } from "next/server";

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 (Вс) - 6 (Сб)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Установка на понедельник
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const configResult = await db.select().from(settings).limit(1);
    const config = configResult[0];

    if (!config || !config.discordToken || !config.forumChannelId) {
      return NextResponse.json({ error: "Настройки не найдены" }, { status: 400 });
    }

    // Обработка конечной даты
    const endDateTime = endDateStr ? new Date(endDateStr) : new Date();
    endDateTime.setHours(23, 59, 59, 999);

    // Обработка начальной даты
    let startDateTime: Date;
    if (startDateStr) {
      startDateTime = new Date(startDateStr);
      startDateTime.setHours(0, 0, 0, 0);
    } else {
      // По умолчанию - понедельник текущей недели
      startDateTime = new Date(endDateTime);
      const day = startDateTime.getDay();
      const diff = startDateTime.getDate() - day + (day === 0 ? -6 : 1);
      startDateTime.setDate(diff);
      startDateTime.setHours(0, 0, 0, 0);
    }

    const threads = await getForumThreads(config.discordToken, config.forumChannelId);

    // Фильтруем темы по выбранному диапазону
    const weeklyThreads = threads.filter((thread: any) => {
      const timestampFromId = Math.floor(Number(thread.id) / 4194304) + 1420070400000;
      const createdAt = new Date(thread.thread_metadata?.create_timestamp || timestampFromId);
      return createdAt >= startDateTime && createdAt <= endDateTime;
    });

    const reportData = [];

    for (const thread of weeklyThreads) {
      const messages = await getThreadMessages(config.discordToken, thread.id);
      
      // Вычисляем дату создания темы
      const timestampFromId = Math.floor(Number(thread.id) / 4194304) + 1420070400000;
      const createdAtDate = new Date(thread.thread_metadata?.create_timestamp || timestampFromId);
      const day = String(createdAtDate.getDate()).padStart(2, '0');
      const month = String(createdAtDate.getMonth() + 1).padStart(2, '0');
      const year = createdAtDate.getFullYear();
      const datePrefix = `${day}.${month}.${year}`;

      reportData.push({
        threadName: thread.name,
        datePrefix: datePrefix,
        folderName: `${datePrefix} - ${thread.name}`,
        messages: messages.map((m: any) => ({
          author: m.author.username,
          content: m.content,
          attachments: m.attachments.map((a: any) => ({
            url: a.url,
            filename: a.filename
          }))
        }))
      });
    }

    return NextResponse.json({ 
      rangeStart: startDateTime.toLocaleDateString('ru-RU'),
      rangeEnd: endDateTime.toLocaleDateString('ru-RU'),
      totalThreads: weeklyThreads.length,
      data: reportData 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
