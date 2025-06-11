"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Track } from "@/lib/type";
import { Reorder } from "framer-motion";
import { GripVertical, Play, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import NewTrack from "./new-track";
import { toast } from "react-toastify";
import YouTubePlayer from "youtube-player";
import { set } from "date-fns";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

const Member = () => {
  const ytPlayer = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeVideo, setActiveVideo] = useState("");
  const [roomConfig, setRoomConfig] = useState<any>({ roomId: "" });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [syncWithHost, setSyncWithHost] = useState(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("join-room-response", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setRoomConfig(data);
        setTracks((e) => {
          setActiveVideo(e[data.currentPlaying]?.videoId!);
          return e;
        });
      } else {
        toast.error(data.message || "Something went wrong");
      }
    });

    socketRef.current.on("room-tracks", (tracks: Track[]) => {
      setTracks(tracks);
    });

    socketRef.current.on("sync-response-from-host", (data: any) => {
      console.log("wdasxz", data);
      if (data.type === "TIME") {
        if (data.playerState === 1) {
          if (ytPlayer.current) {
            ytPlayer.current.loadVideoById(data.videoId);
            ytPlayer.current.seekTo(data.currentTime, true);
            ytPlayer.current.playVideo();
            return;
          }
          setTimeout(async () => {
            setActiveVideo(data.videoId!);
            ytPlayer.current.loadVideoById(data.videoId);
            await ytPlayer.current.playVideo();
            setTimeout(() => {
              ytPlayer.current.seekTo(data.currentTime + 4, true);
            }, 3000);
          }, 4000);
        }
      }
    });

    socketRef.current.on(
      "current-playing-change",
      ({ index }: { index: number }) => {
        setCurrentTrackIndex(index);
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
    document.getElementById("roomId")?.focus();
  }, []);

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

  const joinRoom = () => {
    setLoading(true);
    socketRef.current.emit("join-room", newRoomId);
  };

  const addTrack = (newTrack: Track[]) => {
    socketRef.current.emit("add-track", {
      roomId: roomConfig.roomId,
      tracks: newTrack,
    });
    setTracks([...tracks, ...newTrack]);
  };

  const removeTrack = (id: string) => {
    const newTracks = tracks.filter((track) => track.id !== id);
    setTracks(newTracks);
    socketRef.current.emit("update-tracks", {
      roomId: roomConfig.roomId,
      tracks: newTracks,
    });
  };

  const selectTrack = (index: number) => {
    socketRef.current.emit("update-current-playing", {
      index,
      roomId: roomConfig.roomId,
    });
  };

  const handelSync = () => {
    setSyncWithHost((e) => !e);
    if (syncWithHost) {
      return;
    }
    socketRef.current.emit("sync-request-with-host", {
      roomId: roomConfig.roomId,
    });

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
          <Button onClick={joinRoom} disabled={!newRoomId || loading}>
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
            <NewTrack onAdd={addTrack} />
          </div>
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 flex-[2]">
            <CardHeader>
              <CardTitle className="text-white !flex justify-between">
                <p>Playlist ({tracks.length} tracks) </p>
                <p className="text-base">Joining Code : {roomConfig.roomId}</p>
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
                      roomId: roomConfig.roomId,
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
                          <Play className="w-4 h-4" />
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
