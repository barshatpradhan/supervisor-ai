/**
 * The curated native emoji set for the composer and reactions: no library, no network.
 * Keep the characters in sync with backend/src/utils/emoji.ts, which validates reactions.
 */
interface EmojiOption {
  char: string
  name: string
}

export interface EmojiGroup {
  label: string
  emoji: readonly EmojiOption[]
}

const group = (label: string, entries: Array<[string, string]>): EmojiGroup => ({
  label,
  emoji: entries.map(([char, name]) => ({ char, name })),
})

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  group('Smileys', [
    ['😀', 'grinning face'], ['😃', 'grinning face with big eyes'], ['😄', 'grinning face with smiling eyes'],
    ['😁', 'beaming face'], ['😆', 'grinning squinting face'], ['😅', 'grinning face with sweat'],
    ['😂', 'face with tears of joy'], ['🙂', 'slightly smiling face'], ['😉', 'winking face'],
    ['😊', 'smiling face with smiling eyes'], ['😇', 'smiling face with halo'], ['🥰', 'smiling face with hearts'],
    ['😍', 'smiling face with heart eyes'], ['😘', 'face blowing a kiss'], ['😋', 'face savoring food'],
    ['😎', 'smiling face with sunglasses'], ['🤓', 'nerd face'], ['🤩', 'star-struck'],
    ['🥳', 'partying face'], ['😏', 'smirking face'], ['🤔', 'thinking face'],
    ['🤨', 'face with raised eyebrow'], ['😐', 'neutral face'], ['😑', 'expressionless face'],
    ['😶', 'face without mouth'], ['🙄', 'face with rolling eyes'], ['😬', 'grimacing face'],
    ['😌', 'relieved face'], ['😴', 'sleeping face'], ['😷', 'face with medical mask'],
    ['🤒', 'face with thermometer'], ['🤯', 'exploding head'], ['😮', 'face with open mouth'],
    ['😲', 'astonished face'], ['🥺', 'pleading face'], ['😢', 'crying face'],
    ['😭', 'loudly crying face'], ['😤', 'face with steam from nose'], ['😠', 'angry face'],
    ['😡', 'pouting face'], ['🤗', 'smiling face with open hands'], ['🤫', 'shushing face'],
    ['🤭', 'face with hand over mouth'], ['🫡', 'saluting face'],
  ]),
  group('Gestures', [
    ['👍', 'thumbs up'], ['👎', 'thumbs down'], ['👌', 'OK hand'], ['✌️', 'victory hand'],
    ['🤞', 'crossed fingers'], ['🤝', 'handshake'], ['👏', 'clapping hands'], ['🙌', 'raising hands'],
    ['👐', 'open hands'], ['🙏', 'folded hands'], ['💪', 'flexed biceps'], ['👋', 'waving hand'],
    ['🤙', 'call me hand'], ['👀', 'eyes'], ['🫶', 'heart hands'], ['✍️', 'writing hand'],
  ]),
  group('Symbols', [
    ['❤️', 'red heart'], ['🧡', 'orange heart'], ['💛', 'yellow heart'], ['💚', 'green heart'],
    ['💙', 'blue heart'], ['💜', 'purple heart'], ['🖤', 'black heart'], ['💯', 'hundred points'],
    ['✅', 'check mark button'], ['☑️', 'check box with check'], ['❌', 'cross mark'], ['⚠️', 'warning'],
    ['❗', 'exclamation mark'], ['❓', 'question mark'], ['⭐', 'star'], ['🌟', 'glowing star'],
    ['✨', 'sparkles'], ['🔥', 'fire'], ['⚡', 'high voltage'], ['💡', 'light bulb'],
    ['🎯', 'bullseye'], ['🚀', 'rocket'], ['🎉', 'party popper'], ['🎊', 'confetti ball'],
    ['🏆', 'trophy'], ['🥇', 'first place medal'],
  ]),
  group('Work', [
    ['📌', 'pushpin'], ['📎', 'paperclip'], ['📝', 'memo'], ['📋', 'clipboard'], ['📅', 'calendar'],
    ['📆', 'tear-off calendar'], ['⏰', 'alarm clock'], ['⏳', 'hourglass not done'], ['⌛', 'hourglass done'],
    ['📈', 'chart increasing'], ['📉', 'chart decreasing'], ['📊', 'bar chart'], ['💼', 'briefcase'],
    ['🗂️', 'card index dividers'], ['📁', 'file folder'], ['📂', 'open file folder'], ['🔍', 'magnifying glass'],
    ['🔧', 'wrench'], ['🛠️', 'hammer and wrench'], ['⚙️', 'gear'], ['🧪', 'test tube'], ['🐛', 'bug'],
    ['💻', 'laptop'], ['🖥️', 'desktop computer'], ['📱', 'mobile phone'], ['☕', 'hot beverage'],
    ['🍕', 'pizza'], ['🧠', 'brain'], ['🔒', 'locked'], ['🔑', 'key'],
  ]),
]

/** Quick reactions shown first under a message. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '✅'] as const

const namesByChar = new Map(EMOJI_GROUPS.flatMap((entry) => entry.emoji.map((option) => [option.char, option.name] as const)))

export function emojiName(char: string) {
  return namesByChar.get(char) ?? char
}
