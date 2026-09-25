import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRealtimeChannel = ReturnType<SupabaseClient["channel"]>;
type ChannelOptions = Parameters<SupabaseClient["channel"]>[1];

/**
 * `supabase.channel(topic)` returns the *existing* channel whenever a topic is
 * reused, and registering `postgres_changes` / `presence` callbacks on a
 * channel that is already joining or joined throws:
 *
 *   cannot add `postgres_changes` callbacks for realtime:<topic> after `subscribe()`
 *
 * React effects re-run (and components remount) while the previous
 * `removeChannel()` is still in flight, and several screens render the same
 * topic from the shared browser client — so the throw is easy to hit. Because
 * it happens inside an effect, React hands the whole subtree to the nearest
 * error boundary, which blanks the page.
 *
 * These helpers make realtime setup fail-soft: stale channels are torn down
 * first, listener registration is guarded, and nothing throws into React.
 */

function fullTopic(topic: string): string {
  return `realtime:${topic}`;
}

/** Removes a channel, swallowing (and logging) any failure. */
export async function removeChannelSafely(
  supabase: SupabaseClient,
  channel: AppRealtimeChannel | null | undefined
): Promise<void> {
  if (!channel) return;
  try {
    await supabase.removeChannel(channel);
  } catch (error) {
    console.error("[realtime] removeChannel failed:", error);
  }
}

/**
 * Creates a brand-new channel for `topic` after disposing any leftover channel
 * still registered under the same topic. Returns `null` when nothing could be
 * created — callers must treat that as "skip realtime", never as an error.
 */
export async function createFreshChannel(
  supabase: SupabaseClient,
  topic: string,
  options?: ChannelOptions,
  label = "realtime"
): Promise<AppRealtimeChannel | null> {
  try {
    const stale = supabase
      .getChannels()
      .filter((channel) => channel.topic === fullTopic(topic));
    for (const channel of stale) {
      await removeChannelSafely(supabase, channel);
    }
    return options ? supabase.channel(topic, options) : supabase.channel(topic);
  } catch (error) {
    console.error(`[${label}] failed to create channel "${topic}":`, error);
    return null;
  }
}

/**
 * Effect-friendly subscription: tears down any stale channel for `topic`,
 * attaches listeners via `attach` (inside a guard) and subscribes.
 *
 * Returns the effect cleanup function. Never throws into React.
 */
export function subscribeSafely(
  supabase: SupabaseClient,
  topic: string,
  attach: (channel: AppRealtimeChannel) => AppRealtimeChannel,
  options?: { channelOptions?: ChannelOptions; label?: string }
): () => void {
  const label = options?.label ?? "realtime";
  let disposed = false;
  let active: AppRealtimeChannel | null = null;

  void (async () => {
    const channel = await createFreshChannel(
      supabase,
      topic,
      options?.channelOptions,
      label
    );
    if (!channel) return;
    if (disposed) {
      await removeChannelSafely(supabase, channel);
      return;
    }
    try {
      active = attach(channel).subscribe();
    } catch (error) {
      console.error(`[${label}] listener registration failed for "${topic}":`, error);
      await removeChannelSafely(supabase, channel);
    }
  })();

  return () => {
    disposed = true;
    const channel = active;
    active = null;
    void removeChannelSafely(supabase, channel);
  };
}
