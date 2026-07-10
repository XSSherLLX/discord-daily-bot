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
