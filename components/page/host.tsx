"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Reorder } from "framer-motion";
import { GripVertical, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import YouTubePlayer from "youtube-player";
import NewTrack from "./new-track";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

interface Track {
  id: string;
  title: string;
  url: string;
  videoId?: string;
}

const Host = () => {
  const ytPlayer = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeVideo, setActiveVideo] = useState("");
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("join-room-response", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setRoomId(data.roomId);
      }
      setTimeout(setupPlayer, 1000);
    });
    socketRef.current.on("room-tracks", (tracks: Track[]) => {
      if (tracks) setTracks(tracks);
    });
    socketRef.current.on(
      "current-playing-change",
      ({ index }: { index: number }) => {
        if (index && index >= 0) {
          setCurrentTrackIndex(index);
        }
      }
    );

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    document.getElementById("roomId")?.focus();
  }, []);

  useEffect(() => {
    if (currentTrackIndex < 0 || !roomId) return;
    socketRef.current.emit("update-current-playing", {
      roomId,
      index: currentTrackIndex,
    });
  }, [currentTrackIndex, roomId]);

  useEffect(() => {
    const currentTrack = tracks[currentTrackIndex];
    if (!ytPlayer.current || currentTrackIndex < 0) return;
    if (!currentTrack) {
      setCurrentTrackIndex(0);
      return;
    }
    setActiveVideo(currentTrack.videoId!);
    ytPlayer.current.loadVideoById(currentTrack.videoId);
    ytPlayer.current.playVideo();
  }, [currentTrackIndex]);

  const setupPlayer = () => {
    const player = YouTubePlayer("video-player", { width: 300, height: 180 });
    player.on("stateChange", async (event: any) => {
      if (event.data === 0) {
        setCurrentTrackIndex((index) => index + 1);
      }
    });
    ytPlayer.current = player;
  };

  const createRoom = () => {
    setLoading(true);
    socketRef.current.emit("create-room", newRoomId);
  };

  const addTrack = (newTrack: Track[]) => {
    socketRef.current.emit("join-room-response", (data: any) => {
      if (data.type === "success") {
        setRoomId(data.roomId);
      }
    });
    socketRef.current.emit("add-track", {
      roomId: roomId,
      tracks: newTrack,
    });
    setTracks([...tracks, ...newTrack]);
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
  };

  const removeTrack = (id: string) => {
    const newTracks = tracks.filter((track) => track.id !== id);
    setTracks(newTracks);
    socketRef.current.emit("update-tracks", {
      roomId: roomId,
      tracks: newTracks,
    });
  };

  if (!roomId)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Create Room Id</h1>
        <div className="flex gap-2">
          <Input
            id="roomId"
            placeholder="RoomId"
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createRoom();
            }}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <Button onClick={createRoom} disabled={!newRoomId || loading}>
            Create Room
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-[1500px] w-full mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Sync Tune
        </h1>
        <div className="flex max-md:flex-col gap-4 w-full">
          <div className="flex-1 space-y-4 md:max-w-[500px]">
            <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
              <CardContent className="p-6 flex justify-center items-center">
                <div id="video-player" />
              </CardContent>
            </Card>
            <NewTrack onAdd={addTrack} />
          </div>
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 flex-[2]">
            <CardHeader>
              <CardTitle className="text-white !flex justify-between">
                <p>Playlist ({tracks.length} tracks) </p>
                <p className="text-base">Joining Code : {roomId}</p>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[calc(100vh-205px)] overflow-y-auto">
                <Reorder.Group
                  axis="y"
                  values={tracks}
                  onReorder={(newOrder) => {
                    setTracks(newOrder);
                    socketRef.current.emit("update-tracks", {
                      roomId: roomId,
                      tracks: newOrder,
                    });
                  }}
                  className="space-y-2 pr-2"
                >
                  {tracks.map((track, index) => (
                    <Reorder.Item
                      key={track.id}
                      value={track}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        activeVideo === track.videoId
                          ? "bg-white/20 border border-white/30"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="cursor-move text-gray-400 hover:text-white">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium line-clamp-1 overflow-hidden break-all">
                              {track.title}
                            </p>
                            <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                              YouTube
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Track {index + 1}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={"ghost"}
                        size="icon"
                        onClick={() => selectTrack(index)}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrack(track.id);
                        }}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Reorder.Item>
                  ))}
                  {tracks.length === 0 && (
                    <p className="text-gray-400 text-center py-8">
                      No tracks in playlist
                    </p>
                  )}
                </Reorder.Group>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Host;
