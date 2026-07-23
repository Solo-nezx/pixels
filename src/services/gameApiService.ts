import { Game } from '../types';
import { mockGames } from '../data/mockData';

// Cache to prevent duplicate network calls
const gameCache = new Map<string, Game>();

// List of popular modern game app IDs on Steam
const TOP_STEAM_APP_IDS = [
  { id: '1245620', name: 'ELDEN RING' },
  { id: '2358720', name: 'Black Myth: Wukong' },
  { id: '1091500', name: 'Cyberpunk 2077' },
  { id: '271590', name: 'Grand Theft Auto V' },
  { id: '1174180', name: 'Red Dead Redemption 2' },
  { id: '1086940', name: 'Baldur\'s Gate 3' },
  { id: '292030', name: 'The Witcher 3: Wild Hunt' },
  { id: '1593500', name: 'God of War' },
  { id: '2050650', name: 'Resident Evil 4' },
  { id: '553850', name: 'HELLDIVERS™ 2' },
  { id: '990080', name: 'Hogwarts Legacy' },
  { id: '2669320', name: 'EA SPORTS FC™ 25' },
  { id: '1623730', name: 'Palworld' },
  { id: '1817070', name: 'Marvel\'s Spider-Man Remastered' },
  { id: '2246340', name: 'Monster Hunter Wilds' },
  { id: '1364780', name: 'Street Fighter™ 6' },
  { id: '1778820', name: 'TEKKEN 8' },
  { id: '2515020', name: 'FINAL FANTASY XVI' },
  { id: '2124490', name: 'SILENT HILL 2' },
  { id: '1551360', name: 'Forza Horizon 5' },
  { id: '2215430', name: 'Ghost of Tsushima DIRECTOR\'S CUT' },
  { id: '367520', name: 'Hollow Knight' },
  { id: '377160', name: 'Fallout 4' },
  { id: '730', name: 'Counter-Strike 2' },
];

/**
 * Strips HTML tags and unescapes HTML entities from Steam descriptions.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Transforms Steam App Details API response into our App's Game interface
 */
function transformSteamGameDetails(appId: string, data: any): Game {
  const name = data.name || 'Untitled Game';
  const coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`;
  const bannerUrl = data.header_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

  let releaseYear = 2024;
  if (data.release_date?.date) {
    const match = data.release_date.date.match(/\d{4}/);
    if (match) releaseYear = parseInt(match[0], 10);
  }

  const developer = data.developers && data.developers.length > 0
    ? data.developers[0]
    : (data.publishers && data.publishers.length > 0 ? data.publishers[0] : 'Game Studio');

  const genres = data.genres ? data.genres.map((g: any) => g.description) : ['Action', 'RPG'];
  
  const platforms: string[] = [];
  if (data.platforms?.windows) platforms.push('PC');
  if (data.platforms?.mac) platforms.push('macOS');
  if (data.platforms?.linux) platforms.push('Linux');
  if (platforms.length === 0) platforms.push('PC', 'PlayStation 5', 'Xbox Series X');

  let metascore = data.metacritic?.score;
  if (!metascore) {
    metascore = Math.floor(Math.random() * 10 + 88);
  }

  const averageRating = parseFloat((metascore / 20).toFixed(1));

  let summary = stripHtml(data.short_description || data.detailed_description || '');
  if (!summary) {
    summary = `Experience ${name}, an incredible ${genres.join('/')} title created by ${developer}.`;
  }

  const game: Game = {
    id: `steam_${appId}`,
    title: name,
    coverUrl,
    bannerUrl,
    releaseYear,
    developer,
    genres,
    platforms,
    averageRating,
    ratingCount: Math.floor(metascore * 18 + 450),
    summary,
    metascore,
  };

  gameCache.set(game.id, game);
  return game;
}

/**
 * Fetches popular live games directly from Steam API over the internet.
 */
export async function fetchPopularGamesFromApi(pageSize: number = 24): Promise<Game[]> {
  try {
    const targetIds = TOP_STEAM_APP_IDS.slice(0, pageSize);

    // Fetch details in batches or concurrently
    const promises = targetIds.map(async (item) => {
      try {
        if (gameCache.has(`steam_${item.id}`)) {
          return gameCache.get(`steam_${item.id}`)!;
        }

        const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${item.id}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();

        if (json[item.id]?.success && json[item.id]?.data) {
          return transformSteamGameDetails(item.id, json[item.id].data);
        }
      } catch (e) {
        console.warn(`Failed to fetch live details for game ${item.id}:`, e);
      }

      // Fallback construction with real cover URL
      const fallbackGame: Game = {
        id: `steam_${item.id}`,
        title: item.name,
        coverUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900_2x.jpg`,
        bannerUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
        releaseYear: 2024,
        developer: 'Gaming Studio',
        genres: ['Action', 'RPG'],
        platforms: ['PC', 'PlayStation 5', 'Xbox Series X'],
        averageRating: 4.8,
        ratingCount: 1250,
        summary: `Experience ${item.name}, one of the highest rated games in video game history.`,
        metascore: 92,
      };
      gameCache.set(fallbackGame.id, fallbackGame);
      return fallbackGame;
    });

    const results = await Promise.all(promises);
    const validGames = results.filter((g): g is Game => g !== null);

    if (validGames.length > 0) {
      return validGames;
    }
  } catch (err) {
    console.warn('Failed to fetch live popular games, using mock fallback:', err);
  }

  return mockGames;
}

/**
 * Searches for games live on the internet using Steam Store Search API.
 */
export async function searchGamesFromApi(query: string, pageSize: number = 20): Promise<Game[]> {
  if (!query.trim()) return fetchPopularGamesFromApi(pageSize);

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encoded}&l=english&cc=US`);
    if (!res.ok) throw new Error(`Steam search HTTP ${res.status}`);

    const json = await res.json();
    if (json.items && Array.isArray(json.items) && json.items.length > 0) {
      const searchItems = json.items.slice(0, pageSize);

      const gamePromises = searchItems.map(async (item: any) => {
        const appId = item.id.toString();
        if (gameCache.has(`steam_${appId}`)) {
          return gameCache.get(`steam_${appId}`)!;
        }

        // Try to fetch full details
        try {
          const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            if (detailJson[appId]?.success && detailJson[appId]?.data) {
              return transformSteamGameDetails(appId, detailJson[appId].data);
            }
          }
        } catch (e) {
          // Ignore error and fall back
        }

        // Quick search item conversion
        const metascore = item.metascore ? parseInt(item.metascore, 10) : 85;
        const quickGame: Game = {
          id: `steam_${appId}`,
          title: item.name || 'Untitled Game',
          coverUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
          bannerUrl: item.tiny_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
          releaseYear: 2024,
          developer: 'Steam Developer',
          genres: ['Action', 'Adventure'],
          platforms: item.platforms?.windows ? ['PC', 'PlayStation 5'] : ['PC', 'Console'],
          averageRating: parseFloat((metascore / 20).toFixed(1)),
          ratingCount: 800,
          summary: `Experience ${item.name} live on Steam.`,
          metascore,
        };
        gameCache.set(quickGame.id, quickGame);
        return quickGame;
      });

      const foundGames = await Promise.all(gamePromises);
      return foundGames;
    }
  } catch (err) {
    console.warn(`Failed to search live games for query "${query}":`, err);
  }

  // Local fallback filter if offline or API error
  return mockGames.filter(g =>
    g.title.toLowerCase().includes(query.toLowerCase()) ||
    g.developer.toLowerCase().includes(query.toLowerCase()) ||
    g.genres.some(genre => genre.toLowerCase().includes(query.toLowerCase()))
  );
}

/**
 * Fetches single game details with enriched description from live Steam API.
 */
export async function fetchGameDetailsFromApi(gameId: string): Promise<Game | null> {
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }

  const appId = gameId.replace('steam_', '');
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const json = await res.json();
    if (json[appId]?.success && json[appId]?.data) {
      return transformSteamGameDetails(appId, json[appId].data);
    }
  } catch (err) {
    console.warn(`Failed to fetch live details for game ${gameId}:`, err);
  }

  return mockGames.find(g => g.id === gameId) || null;
}
