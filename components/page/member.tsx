"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Track } from "@/lib/type";
import { shareRoom } from "@/lib/utils";
import { Reorder } from "framer-motion";
import {
  GripVertical,
  Pause,
  Play,
  RefreshCcw,
  Share2,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import io from "socket.io-client";
import YouTubePlayer from "youtube-player";
import NewTrack from "./new-track";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

const Member = () => {
  const router = useRouter();
  const ytPlayer = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeVideo, setActiveVideo] = useState("");
  const [roomConfig, setRoomConfig] = useState<any>({ roomId: "" });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [syncWithHost, setSyncWithHost] = useState(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("join-room", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setNewRoomId("");
        setRoomConfig(data);
        setTracks((e) => {
          setActiveVideo(e[data.currentPlaying]?.videoId!);
          return e;
        });
      } else {
        router.replace("/");
        toast.error(data.message || "Something went wrong");
      }
    });

    socketRef.current.on("room-tracks", (tracks: Track[]) => {
      setTracks(tracks);
    });
    socketRef.current.on("update-playing-status", setIsPlaying);
    socketRef.current.on("clear-state", () => {
      toast.error("Host disconnected");
      setRoomConfig({ roomId: "" });
      router.replace("/");
    });

    socketRef.current.on("sync-response", (data: any) => {
      console.log("🚀 - socketRef.current.on - data:", data);
      if (data.type === "TIME") {
        if (data.playerState === 1) {
          // if (ytPlayer.current) {
          //   ytPlayer.current.loadVideoById(data.videoId);
          //   // ytPlayer.current.seekTo(data.currentTime, true);
          //   return;
          // }
          setTimeout(async () => {
            setActiveVideo(data.videoId!);
            ytPlayer.current.loadVideoById(data.videoId);
            await ytPlayer.current.playVideo();
            setTimeout(() => {
              const addTime = (+new Date() - data.time) / 1000 + 0.5;
              ytPlayer.current.seekTo(data.currentTime + addTime, true);
            }, 1000);
          }, 1000);
        }
      }
    });

    socketRef.current.on(
      "update-current-playing",
      ({ index }: { index: number }) => {
        setCurrentTrackIndex((e) => {
          if (e === index) {
            ytPlayer.current.pauseVideo();
          }
          return index;
        });
        setTracks((e) => {
          setActiveVideo(e[index].videoId!);
          return e;
        });
      }
    );

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const memberId = searchParams.get("memberId");
    if (memberId) {
      joinRoom(memberId);
    } else {
      document.getElementById("roomId")?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    const currentTrack = tracks[currentTrackIndex];
    if (!ytPlayer.current || currentTrackIndex < 0) return;
    if (!currentTrack) {
      setCurrentTrackIndex(0);
      return;
    }
    setActiveVideo(currentTrack.videoId!);
    ytPlayer.current.loadVideoById(currentTrack.videoId);
  }, [currentTrackIndex]);

  const joinRoom = (id?: string) => {
    setLoading(true);
    socketRef.current.emit("join-room", id || newRoomId);
  };

  const addTrack = (newTrack: Track[]) => {
    socketRef.current.emit("add-track", {
      tracks: newTrack,
    });
    setTracks([...tracks, ...newTrack]);
  };

  const removeTrack = (id: string) => {
    const newTracks = tracks.filter((track) => track.id !== id);
    setTracks(newTracks);
    socketRef.current.emit("update-tracks", {
      tracks: newTracks,
    });
  };

  const selectTrack = (index: number) => {
    if (currentTrackIndex === index) {
      socketRef.current.emit("update-playing-status", {
        value: !isPlaying,
      });
      return;
    }
    socketRef.current.emit("update-current-playing", {
      index,
    });
  };

  const handelSync = () => {
    setSyncWithHost((e) => !e);
    if (syncWithHost) {
      return;
    }
    socketRef.current.emit("sync-request");

    setTimeout(() => {
      const player = YouTubePlayer("video-player", { width: 300, height: 180 });
      ytPlayer.current = player;
    }, 1000);
  };

  if (!roomConfig.roomId)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Join Room Id</h1>
        <div className="flex gap-2">
          <Input
            id="roomId"
            placeholder="RoomId"
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") joinRoom();
            }}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <Button onClick={() => joinRoom()} disabled={!newRoomId || loading}>
            Join Room
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
            <Button onClick={handelSync} className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              {syncWithHost ? "Pause Sync" : "Sync with Host"}
            </Button>
            {syncWithHost && (
              <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
                <CardContent className="p-6 flex justify-center items-center">
                  <div id="video-player" />
                </CardContent>
              </Card>
            )}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
              <CardContent className="p-6 flex justify-between items-center">
                <p className="font-bold text-white">
                  Joining Code : {roomConfig.roomId}
                </p>
                <button onClick={() => shareRoom(roomConfig.roomId)}>
                  <Share2 className="stroke-white" />
                </button>
              </CardContent>
            </Card>
            <NewTrack onAdd={addTrack} />
          </div>
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 flex-[2]">
            <CardHeader>
              <CardTitle className="text-white !flex justify-between">
                Playlist ({tracks.length} tracks)
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
                      {roomConfig?.allowMemberToPlay && (
                        <Button
                          variant={"ghost"}
                          size="icon"
                          onClick={() => selectTrack(index)}
                          className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                        >
                          {activeVideo === track.videoId && isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
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

export default Member;
