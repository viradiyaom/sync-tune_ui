"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Track } from "@/lib/type";
import { extractYouTubeId, extractYouTubePlaylistId } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";

type Props = {
  onAdd: (v: Track[], t: boolean) => void;
};

const API_KEY = process.env.NEXT_PUBLIC_YT_API_KEY;

const NewTrack = ({ onAdd }: Props) => {
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [newTrackTitle, setNewTrackTitle] = useState("");

  const addTrack = (addNext = false) => {
    if (!newTrackUrl) return;
    const isPlaylist = newTrackUrl.includes("playlist");
    if (isPlaylist) {
      const playlistId = extractYouTubePlaylistId(newTrackUrl);
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          const songs = data.items.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            url: "",
            videoId: item.snippet.resourceId.videoId,
          }));
          onAdd(songs, addNext);
        });
    } else {
      const videoId = extractYouTubeId(newTrackUrl);
      const isYouTube = videoId !== null;

      const newTrack: Track = {
        id: Date.now().toString(),
        title:
          newTrackTitle ||
          (isYouTube ? `YouTube Video (${videoId})` : "Unknown Track"),
        url: newTrackUrl,
        videoId: videoId || undefined,
      };
      onAdd([newTrack], addNext);
    }
    setNewTrackUrl("");
    setNewTrackTitle("");
  };

  return (
    <Card className="bg-black/20 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Add New Track</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Track title (optional)"
          value={newTrackTitle}
          onChange={(e) => setNewTrackTitle(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />
        <Input
          placeholder="YouTube video or playlist URL"
          value={newTrackUrl}
          onChange={(e) => setNewTrackUrl(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />
        <div className="flex gap-4">
          <Button
            onClick={() => addTrack(true)}
            disabled={!newTrackUrl}
            className="w-full"
          >
            <Plus className="w-4 h-4" />
            Add Next
          </Button>
          <Button
            onClick={() => addTrack()}
            disabled={!newTrackUrl}
            className="w-full"
          >
            <Plus className="w-4 h-4" />
            Add at End
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewTrack;
