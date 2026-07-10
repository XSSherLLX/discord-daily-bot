"use client";

import { useState, useEffect } from "react";

// Функция для форматирования даты в дд.мм.гггг
function formatDbDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function getTodayDate(): string {
  const now = new Date();
  const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const year = moscowTime.getFullYear();
  const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
  const day = String(moscowTime.getDate()).padStart(2, '0');
  return `${day}.${month}.${year}`;
}

export default function Home() {
  const [discordToken, setDiscordToken] = useState("");
  const [forumChannelId, setForumChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [currentBot, setCurrentBot] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState("");
  const [showManualDate, setShowManualDate] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      
      if (!settingsRes.ok) {
        setMessage(`Ошибка загрузки: ${settingsData.error || "Не удалось подключиться к базе"}`);
        return;
      }

      if (settingsData.current?.discordToken) {
          setDiscordToken(settingsData.current.discordToken);
          setCurrentBot(settingsData.current.botName);
      }
      if (settingsData.current?.forumChannelId) setForumChannelId(settingsData.current.forumChannelId);
      setHistory(settingsData.history || []);

      const postsRes = await fetch("/api/posts");
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }

      setManualDate(getTodayDate());
    } catch (err: any) {
      const isDnsError = err.message?.includes("ENOTFOUND") || message.includes("ENOTFOUND");
      if (isDnsError) {
        setMessage("Ошибка DNS: Компьютер не видит сервер Supabase. Попробуйте использовать адрес 'Pooler' из настроек Supabase (порт 6543).");
      } else {
        setMessage("Нет связи с сервером базы данных. Проверьте .env файл.");
      }
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discordToken, forumChannelId }),
      });
      
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: `Server error: ${res.status} ${res.statusText}` };
      }

      if (res.ok) {
        setMessage("Настройки сохранены!");
        fetchData();
      } else {
        const errorMsg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Неизвестная ошибка");
        setMessage(`Ошибка: ${errorMsg}`);
        console.error("Server error detail:", data);
      }
    } catch (err) {
      setMessage("Ошибка сети или сервера");
    } finally {
      setLoading(false);
    }
  };

  const triggerPost = async (useDate?: string) => {
    setLoading(true);
    setMessage("Создание поста...");
    try {
        let res;
        
        if (useDate && useDate !== getTodayDate()) {
          // Используем POST с ручной датой
          res = await fetch("/api/cron/create-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: useDate }),
          });
        } else {
          // Обычное создание на сегодня
          res = await fetch("/api/cron/create-post");
        }
        
        const data = await res.json();
        if (data.success) {
          setMessage(`Пост создан! ID: ${data.discordPostId}`);
          fetchData();
        } else {
          setMessage(`Ошибка: ${data.error || data.message}`);
        }
    } catch (e) {
        setMessage("Ошибка при выполнении запроса");
    } finally {
        setLoading(false);
    }
  };

  const useFromHistory = (item: any) => {
      setDiscordToken(item.discordToken);
      setForumChannelId(item.forumChannelId);
      setMessage(`Данные бота "${item.botName}" подставлены в форму. Не забудьте сохранить.`);
  };

  const isFormValid = discordToken.trim() !== "" && forumChannelId.trim() !== "";

  // Форматируем дату при отображении
  const formattedDate = (dateStr: string) => formatDbDate(dateStr);

  return (
    <main className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Настройка Discord Бота</h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-semibold">
                  📅 Автоматическая публикация: каждый день в 00:00 (Московское время)
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  <strong>Как настроить:</strong> используйте сервис Cron-job.org или GitHub Actions<br/>
                  URL: <code className="bg-white px-1 rounded text-xs">https://your-domain.com/api/cron/create-post</code><br/>
                  Частота: <strong>ежедневно в 00:00 МСК</strong>
                </p>
              </div>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Текущий активный бот: <span className="font-bold">{currentBot || "Не настроен"}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Автопубликация:</strong> настроить на 00:00 МСК
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={saveSettings} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">Discord Bot Token</label>
              <input
                type="password"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="Ваш токен бота"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Forum Channel ID</label>
              <input
                type="text"
                value={forumChannelId}
                onChange={(e) => setForumChannelId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="ID канала-форума"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата для поста</label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualDate(!showManualDate)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  {showManualDate ? "Скрыть" : "Изменить дату"}
                </button>
              </div>
              {showManualDate && (
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  title="Выберите дату для поста (формат дд.мм.гггг при отображении)"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">
                Текущая дата: <span className="font-medium">{getTodayDate()}</span>
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
                <button
                type="submit"
                disabled={loading || !isFormValid}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {loading ? "Загрузка..." : "Сохранить настройки"}
                </button>

                <button
                type="button"
                onClick={() => triggerPost(showManualDate && manualDate ? manualDate : undefined)}
                disabled={loading || !currentBot}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {loading ? "Создание..." : "Создать пост"}
                </button>
            </div>
          </form>

          {message && (
            <div className={`p-4 rounded-md ${message.includes("Ошибка") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {message}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">История публикаций</h2>
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                {posts.length === 0 && (
                    <li className="p-4 text-gray-500">Публикаций пока нет</li>
                )}
                {posts.map((post) => (
                    <li key={post.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-indigo-600">{formattedDate(post.postDate)}</p>
                        <p className="text-sm text-gray-500">Discord ID: {post.discordPostId}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleString()}
                        </div>
                    </div>
                    </li>
                ))}
                </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">История конфигураций</h2>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            {history.length === 0 && <p className="text-gray-500 text-sm italic">История пуста</p>}
            {history.map((item) => (
              <div key={item.id} className="text-sm p-3 border rounded hover:border-indigo-300 cursor-pointer transition bg-gray-50" onClick={() => useFromHistory(item)}>
                <div className="font-bold text-indigo-600 truncate">{item.botName}</div>
                <div className="text-gray-500 text-xs truncate">ID: {item.forumChannelId}</div>
                <div className="text-[10px] text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 italic mt-2">* Нажмите на карточку, чтобы подставить данные в форму</p>
          </div>
        </div>
      </div>
    </main>
  );
}