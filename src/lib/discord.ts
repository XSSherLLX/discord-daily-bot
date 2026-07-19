export async function getChannelInfo(token: string, channelId: string) {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: {
        'Authorization': `Bot ${token}`,
        'User-Agent': 'DiscordBot',
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
}

export async function getBotName(token: string) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${token}`,
        'User-Agent': 'DiscordBot (https://github.com/discordjs/discord.js, 14.14.1)',
      },
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Discord API Error: ${response.status} ${err.message || ''}`);
    }
    
    const data = await response.json();
    return `${data.username}#${data.discriminator !== '0' ? data.discriminator : ''}`.replace(/#$/, '');
  } catch (e: any) {
    throw new Error(`Не удалось проверить токен: ${e.message}`);
  }
}

export async function createForumPost(token: string, channelId: string, title: string, content: string) {
  const url = `https://discord.com/api/v10/channels/${channelId}/threads`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://github.com/discordjs/discord.js, 14.14.1)',
    },
    body: JSON.stringify({
      name: title,
      message: {
        content: content,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create forum post');
  }

  return data.id;
}

export async function getForumThreads(token: string, channelId: string) {
  // 1. Получаем инфо о канале, чтобы узнать guild_id
  const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DiscordBot' }
  });
  
  if (!channelRes.ok) {
    const err = await channelRes.json();
    throw new Error(`Не удалось найти канал: ${err.message || channelRes.status}`);
  }
  
  const channelData = await channelRes.json();
  const guildId = channelData.guild_id;

  // 2. Получаем ВСЕ активные ветки сервера и фильтруем по нашему каналу
  const activeRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/threads/active`, {
    headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DiscordBot' }
  });
  
  let activeThreads = [];
  if (activeRes.ok) {
    const data = await activeRes.json();
    // Оставляем только те ветки, родителем которых является наш форум
    activeThreads = (data.threads || []).filter((t: any) => t.parent_id === channelId);
  }

  // 3. Получаем архивные ветки именно для этого канала
  const archivedRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads/archived/public`, {
    headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DiscordBot' }
  });

  let archivedThreads = [];
  if (archivedRes.ok) {
    const data = await archivedRes.json();
    archivedThreads = data.threads || [];
  }

  return [...activeThreads, ...archivedThreads];
}

export async function getThreadMessages(token: string, threadId: string) {
  const response = await fetch(`https://discord.com/api/v10/channels/${threadId}/messages?limit=100`, {
    headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DiscordBot' }
  });
  
  if (!response.ok) throw new Error(`Failed to fetch messages for thread ${threadId}`);
  return await response.json();
}
