/** Typed fetch errors for client-side API calls. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public upgradeRequired?: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new ApiError("Empty server response", res.status);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("Invalid server response", res.status);
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ data: T; res: Response }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("Network error — check your connection");
  }
  const data = await parseJsonResponse<T>(res);
  return { data, res };
}
