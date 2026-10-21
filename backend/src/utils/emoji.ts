/**
 * The curated emoji set used by the message composer and for reactions.
 * Keep in sync with frontend/src/features/messaging/utils/emoji.ts.
 */
const EMOJI_GROUPS = [
  {
    label: "Smileys",
    emoji: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "😘", "😋", "😎", "🤓", "🤩", "🥳", "😏", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😬", "😌", "😴", "😷", "🤒", "🤯", "😮", "😲", "🥺", "😢", "😭", "😤", "😠", "😡", "🤗", "🤫", "🤭", "🫡"],
  },
  {
    label: "Gestures",
    emoji: ["👍", "👎", "👌", "✌️", "🤞", "🤝", "👏", "🙌", "👐", "🙏", "💪", "👋", "🤙", "👀", "🫶", "✍️"],
  },
  {
    label: "Symbols",
    emoji: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "✅", "☑️", "❌", "⚠️", "❗", "❓", "⭐", "🌟", "✨", "🔥", "⚡", "💡", "🎯", "🚀", "🎉", "🎊", "🏆", "🥇"],
  },
  {
    label: "Work",
    emoji: ["📌", "📎", "📝", "📋", "📅", "📆", "⏰", "⏳", "⌛", "📈", "📉", "📊", "💼", "🗂️", "📁", "📂", "🔍", "🔧", "🛠️", "⚙️", "🧪", "🐛", "💻", "🖥️", "📱", "☕", "🍕", "🧠", "🔒", "🔑"],
  },
] as const;

const ALLOWED_EMOJI: ReadonlySet<string> = new Set(EMOJI_GROUPS.flatMap((group) => group.emoji));

export function isAllowedEmoji(value: string) {
  return ALLOWED_EMOJI.has(value);
}
