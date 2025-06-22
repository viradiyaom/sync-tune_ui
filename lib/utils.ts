import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const extractYouTubePlaylistId = (url: string): string | null => {
  const regExp = /[?&]list=([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

export const shareRoom = (roomId: string) => {
  const roomLink = `${window.location.origin}/?memberId=${roomId}`;
  navigator
    .share({
      title: "🎶 Join me on Sync-Tune!",
      text: `I'm listening to music in sync with friends. Click the link below to join the room and vibe together in real-time:

👉 ${roomLink}

No install needed — just join and enjoy the music! 🎧
        `,
    })
    .then(() => console.log("Shared successfully"))
    .catch((error) => console.error("Sharing failed", error));
};
