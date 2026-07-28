/** Parse `https://github.com/owner/repo` (optional trailing slash / .git). */
export function parseGithubRepo(
  url: string
): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

/**
 * Fetch stargazer count from the GitHub API.
 * Cached for an hour; returns null on failure so the UI can omit the badge.
 */
export async function fetchGithubStars(
  githubUrl: string
): Promise<number | null> {
  const parts = parseGithubRepo(githubUrl);
  if (!parts) return null;

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "andresmorales-personal-site",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${parts.owner}/${parts.repo}`,
      {
        headers,
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
}

export async function fetchGithubStarsMap(
  urls: (string | undefined)[]
): Promise<Map<string, number>> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  const entries = await Promise.all(
    unique.map(async (url) => {
      const stars = await fetchGithubStars(url);
      return [url, stars] as const;
    })
  );
  const map = new Map<string, number>();
  for (const [url, stars] of entries) {
    if (stars != null) map.set(url, stars);
  }
  return map;
}
