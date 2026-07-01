import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { getTodaysWord, formatWordOfDayDate } from "@/lib/word-of-the-day";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { DictionaryBookmark } from "@/types";

const DictionaryClient = dynamic(
  () =>
    import("@/components/dictionary/DictionaryClient").then(
      (m) => m.DictionaryClient
    ),
  { loading: () => <PageSkeleton /> }
);

export default async function DictionaryPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const { data: bookmarks } = await supabase
    .from("companion_dictionary_bookmarks")
    .select("id, user_id, word, definition, phonetic, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <DictionaryClient
      initialBookmarks={(bookmarks ?? []) as DictionaryBookmark[]}
      word={getTodaysWord()}
      dateLabel={formatWordOfDayDate()}
    />
  );
}
