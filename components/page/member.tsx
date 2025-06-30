"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Track } from "@/lib/type";
import { cn, shareRoom } from "@/lib/utils";
import { Reorder } from "framer-motion";
import {
  GripVertical,
  Loader,
  Music,
  Pause,
  Play,
  RefreshCcw,
  Share2,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import YouTubePlayer from "youtube-player";
import NewTrack from "./new-track";
import { useAppContext } from "@/context/AppContext";
import { io } from "socket.io-client";
import { Slider } from "../ui/slider";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

const initialRoomConfig = {
  roomId: "",
  password: "",
  allowMemberToPlay: true,
  allowMemberControlVolume: true,
  allowMemberToSync: true,
};

const Member = () => {
  const router = useRouter();
  const ytPlayer = useRef<any>(null);
  const { socket } = useAppContext();
  const searchParams = useSearchParams();
  const [volume, setVolume] = useState(100);
  const [loading, setLoading] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeVideo, setActiveVideo] = useState("");
  const [syncWithHost, setSyncWithHost] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [roomConfig, setRoomConfig] = useState(initialRoomConfig);

  useEffect(() => {
    socket.current = io(SOCKET_URL);
    socket.current.on("join-room", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setNewRoomId("");
        setRoomConfig(data);
        setVolume(data.volume);
        setCurrentTrackIndex(data.currentPlaying);
        setTracks((e) => {
          setActiveVideo(e[data.currentPlaying]?.videoId!);
          return e;
        });
      } else {
        router.replace("/");
        toast.error(data.message || "Something went wrong");
      }
    });

    socket.current.on("room-tracks", (tracks: Track[]) => {
      setTracks(tracks);
    });

    socket.current.on("update-playing-status", setIsPlaying);

    socket.current.on("clear-state", () => {
      toast.error("Host disconnected");
      setRoomConfig(structuredClone(initialRoomConfig));
      router.replace("/");
    });

    socket.current.on("sync-response", (data: any) => {
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

    socket.current.on(
      "update-current-playing",
      ({ index }: { index: number }) => {
        setCurrentTrackIndex((e) => {
          if (e === index) {
            ytPlayer.current?.pauseVideo();
          }
          return index;
        });
        setTracks((e) => {
          setActiveVideo(e[index].videoId!);
          return e;
        });
      }
    );

    socket.current.on("update-volume", (value: number) => {
      ytPlayer.current?.setVolume(value);
      setVolume(value);
    });

    return () => {
      socket.current.disconnect();
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
    socket.current.emit("join-room", id || newRoomId);
  };

  const addTrack = (newTrack: Track[], addNext = false) => {
    setTracks((prev) => {
      const finalTracks = [...prev];

      if (addNext) {
        finalTracks.splice(currentTrackIndex + 1, 0, ...newTrack);
      } else {
        finalTracks.push(...newTrack);
      }

      socket.current.emit("update-tracks", {
        tracks: finalTracks,
      });
      return finalTracks;
    });
  };

  const removeTrack = (id: string) => {
    const newTracks = tracks.filter((track) => track.id !== id);
    setTracks(newTracks);
    socket.current.emit("update-tracks", {
      tracks: newTracks,
    });
  };

  const selectTrack = (index: number) => {
    if (currentTrackIndex === index || !isPlaying) {
      socket.current.emit("update-playing-status", {
        value: !isPlaying,
      });
      if (isPlaying) return;
    }
    socket.current.emit("update-current-playing", {
      index,
    });
  };

  const handelSync = () => {
    setSyncWithHost((e) => !e);
    if (syncWithHost) {
      return;
    }
    socket.current.emit("sync-request");

    setTimeout(() => {
      const player = YouTubePlayer("video-player", { width: 300, height: 180 });
      ytPlayer.current = player;
    }, 1000);
  };

  if (loading)
    return (
      <>
        <Loader className="animate-spin" />
        <div className="text-center">
          Please wait wile we connect to server, it may take few seconds
        </div>
      </>
    );

  if (!roomConfig.roomId)
    return (
      <>
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
      </>
    );
  return (
    <div className="max-w-[1500px] w-full mx-auto space-y-6 flex flex-col flex-1">
      <h1 className="text-4xl font-bold text-white text-center">Sync Tune</h1>
      <div className="flex max-md:flex-col gap-4 w-full flex-1">
        <div className="flex-1 space-y-4 md:max-w-[500px]">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
            <CardContent className="p-6 flex flex-col justify-center items-center">
              {syncWithHost ? (
                <div id="video-player" />
              ) : (
                <div className="aspect-video border w-full max-w-[300px] max-h-[180px] bg-white/20 rounded-md relative flex flex-col justify-center items-center p-3 gap-3">
                  <Music className="stroke-white" size={40} />
                  <p className="text-white font-bold text-center line-clamp-3 break-all">
                    {tracks[currentTrackIndex]?.title}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t w-full px-3">
                <div className="w-10" />
                <div className="flex gap-4 items-center">
                  <button
                    disabled={!roomConfig.allowMemberToPlay}
                    className={cn(
                      "size-10 flex justify-center items-center rounded-full transition-all disabled:opacity-50",
                      roomConfig.allowMemberToPlay && "hover:bg-white/20"
                    )}
                    onClick={() => selectTrack(currentTrackIndex - 1)}
                  >
                    <SkipBack className="stroke-white" size={18} />
                  </button>
                  <button
                    disabled={!roomConfig.allowMemberToPlay}
                    onClick={() => selectTrack(currentTrackIndex)}
                    className="bg-white/20 border border-white/30 size-14 flex justify-center items-center rounded-full disabled:opacity-50"
                  >
                    {isPlaying ? (
                      <Pause className="stroke-white" />
                    ) : (
                      <Play className="stroke-white" />
                    )}
                  </button>
                  <button
                    disabled={!roomConfig.allowMemberToPlay}
                    className={cn(
                      "size-10 flex justify-center items-center rounded-full transition-all disabled:opacity-50",
                      roomConfig.allowMemberToPlay && "hover:bg-white/20"
                    )}
                    onClick={() => selectTrack(currentTrackIndex + 1)}
                  >
                    <SkipForward className="stroke-white" size={18} />
                  </button>
                </div>
                <button onClick={() => shareRoom(roomConfig.roomId)}>
                  <Share2 className="stroke-white" />
                </button>
              </div>
              {roomConfig.allowMemberControlVolume && (
                <div className="mt-2.5 -mb-3 flex w-full gap-4 px-3">
                  <button
                    onClick={() => {
                      socket.current.emit(
                        "update-volume",
                        volume === 0 ? 50 : 0
                      );
                    }}
                  >
                    {volume === 0 ? (
                      <VolumeOff className="stroke-white" />
                    ) : (
                      <Volume2 className="stroke-white" />
                    )}
                  </button>
                  <Slider
                    step={1}
                    max={100}
                    value={[volume]}
                    onValueChange={(v) =>
                      socket.current.emit("update-volume", v[0])
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
          {roomConfig.allowMemberToSync && (
            <Button onClick={handelSync} className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              {syncWithHost ? "Pause Sync" : "Sync with Host"}
            </Button>
          )}
          <NewTrack onAdd={addTrack} />
        </div>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 flex-[2]">
          <CardHeader>
            <CardTitle className="text-white !flex justify-between">
              Playlist ({tracks.length} tracks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[calc(100vh-194px)] overflow-y-auto">
              <Reorder.Group
                axis="y"
                values={tracks}
                onReorder={(newOrder) => {
                  setTracks(newOrder);
                  socket.current.emit("update-tracks", {
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
  );
};

export default Member;
