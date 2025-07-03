"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";
import { shareRoom } from "@/lib/utils";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Reorder } from "framer-motion";
import {
  GripVertical,
  MoreVertical,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Trash2,
  Volume,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import io from "socket.io-client";
import YouTubePlayer from "youtube-player";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import NewTrack from "./new-track";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Checkbox } from "../ui/checkbox";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

interface Track {
  id: string;
  title: string;
  url: string;
  videoId?: string;
}

const initialRoomConfig = {
  roomId: "",
  password: "",
  allowMemberToPlay: true,
  allowMemberControlVolume: true,
  allowMemberToSync: true,
};

const Host = () => {
  const ytPlayer = useRef<any>(null);
  console.log("🚀 - Host - ytPlayer:", ytPlayer);
  const { socket } = useAppContext();
  const [roomId, setRoomId] = useState("");
  const [volume, setVolume] = useState(100);
  const [loading, setLoading] = useState(false);
  const [roomConfig, setRoomConfig] = useState(initialRoomConfig);

  // const [newRoomId, setNewRoomId] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeVideo, setActiveVideo] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);

  useEffect(() => {
    socket.current = io(SOCKET_URL);
    socket.current.on("join-room", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setRoomConfig(structuredClone(initialRoomConfig));
        setRoomId(data.roomId);
      } else {
        toast.error(data.message || "Something went wrong");
      }
      setTimeout(setupPlayer, 1000);
    });

    socket.current.on("room-tracks", (tracks: Track[]) => {
      if (tracks) setTracks(tracks);
    });

    socket.current.on("update-volume", (value: number) => {
      ytPlayer.current.setVolume(value);
      setVolume(value);
    });

    socket.current.on("update-playing-status", (value: boolean) => {
      if (value) {
        ytPlayer.current.playVideo();
      } else {
        ytPlayer.current.pauseVideo();
      }
      setIsPlaying(value);
    });

    socket.current.on(
      "update-current-playing",
      ({ index }: { index: number }) => {
        if (index !== undefined && index >= 0) {
          setCurrentTrackIndex((e) => {
            if (e === index) {
              ytPlayer.current?.pauseVideo();
            }
            return index;
          });
        }
      }
    );

    socket.current.on("sync-request", async () => {
      const player = ytPlayer.current;
      const time = +new Date();
      const currentTime = await player.getCurrentTime();
      const playerState = await player.getPlayerState();

      setActiveVideo((videoId) => {
        socket.current.emit("sync-response", {
          type: "TIME",
          playerState,
          time,
          currentTime,
          videoId,
        });
        return videoId;
      });
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    document.getElementById("roomId")?.focus();

    const interval = setInterval(() => {
      fetch(`${SOCKET_URL}/ping`).then((res) => {});
    }, 1000 * 60 * 10); // 10 min

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (currentTrackIndex < 0 || !roomId) return;
    socket.current.emit("update-current-playing", {
      index: currentTrackIndex,
    });
  }, [currentTrackIndex, roomId]);

  useEffect(() => {
    if (!ytPlayer.current || currentTrackIndex < 0) return;
    const currentTrack = tracks[currentTrackIndex];
    if (!currentTrack) {
      setCurrentTrackIndex(0);
      return;
    }
    setActiveVideo(currentTrack.videoId!);
    (async () => {
      ytPlayer.current.playVideo();
      ytPlayer.current.loadVideoById(currentTrack.videoId);
    })();
  }, [currentTrackIndex]);

  const setupPlayer = async () => {
    const player = YouTubePlayer("video-player", {
      width: 300,
      height: 180,
    });
    player.on("stateChange", async (event: any) => {
      const currentTime = event.target.getCurrentTime();

      if (event.data === 0) {
        setCurrentTrackIndex((index) => index + 1);
      }

      if (event.data === 2 && currentTime > 0) {
        socket.current.emit("update-playing-status", {
          value: false,
        });
      }
      if (event.data === 1) {
        socket.current.emit("update-playing-status", {
          value: true,
        });
      }
    });
    // player.on("volumeChange", ({ data }: any) => {
    //   const v = data.muted ? 0 : data.volume;
    //   setVolume(v);
    //   socket.current.emit("update-volume", v);
    // });
    ytPlayer.current = player;
    const v = await player.getVolume();
    socket.current.emit("update-volume", v);
  };

  const createRoom = () => {
    setLoading(true);
    socket.current.emit("create-room", roomConfig);
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

  const selectTrack = (index: number) => {
    if (index < 0 || index > tracks.length - 1) return;
    setIsPlaying(true);
    setCurrentTrackIndex((e) => {
      if (!isPlaying) {
        ytPlayer.current.playVideo();
        setIsPlaying(true);
      } else if (e === index) {
        ytPlayer.current.pauseVideo();
        setIsPlaying(false);
      }

      return index;
    });
  };

  const removeTrack = (id: string) => {
    const newTracks = tracks.filter((track) => track.id !== id);
    setTracks(newTracks);
    socket.current.emit("update-tracks", {
      tracks: newTracks,
    });
  };

  const clearAllTrack = () => {
    setTracks([]);
    socket.current.emit("update-tracks", {
      tracks: [],
    });
  };

  const handleChange = (key: keyof typeof roomConfig, value: any) => {
    setRoomConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (!roomId)
    return (
      <>
        <h1 className="text-3xl font-bold mb-6">Create Room</h1>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
          <CardContent className="p-6 flex flex-col gap-3 min-w-[400px] justify-center items-center">
            <Input
              id="roomId"
              placeholder="Room ID"
              value={roomConfig.roomId}
              onChange={(e) =>
                handleChange("roomId", e.target.value.toUpperCase())
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") createRoom();
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />

            {/* <Input
              id="password"
              placeholder="Password (optional)"
              type="password"
              value={roomConfig.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            /> */}

            <div className="w-full flex items-start space-x-2 mt-2">
              <Checkbox
                id="allow-play"
                checked={roomConfig.allowMemberToPlay}
                onCheckedChange={(checked) =>
                  handleChange("allowMemberToPlay", checked)
                }
              />
              <label htmlFor="allow-play" className="text-white -mt-1">
                Allow members to play
              </label>
            </div>

            <div className="w-full flex items-start space-x-2">
              <Checkbox
                id="allow-volume"
                checked={roomConfig.allowMemberControlVolume}
                onCheckedChange={(checked) =>
                  handleChange("allowMemberControlVolume", checked)
                }
              />
              <label htmlFor="allow-volume" className="text-white -mt-1">
                Allow members to control volume
              </label>
            </div>
            <div className="w-full flex items-start space-x-2">
              <Checkbox
                id="allow-volume"
                checked={roomConfig.allowMemberToSync}
                onCheckedChange={(checked) =>
                  handleChange("allowMemberToSync", checked)
                }
              />
              <label htmlFor="allow-volume" className="text-white -mt-1">
                Allow members to sync with host
              </label>
            </div>

            <Button
              onClick={createRoom}
              disabled={!roomConfig.roomId || loading}
            >
              Create Room
            </Button>
          </CardContent>
        </Card>
      </>
    );

  return (
    <div className="max-w-[1500px] w-full mx-auto space-y-6 flex flex-col flex-1">
      <h1 className="text-4xl font-bold text-white text-center">Sync Tune</h1>

      <div className="flex max-md:flex-col gap-4 w-full flex-1">
        <div className="flex-1 space-y-4 md:max-w-[500px]">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
            <CardContent className="p-6 flex flex-col justify-center items-center">
              <div id="video-player" />
              <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t w-full px-3">
                <div className="w-10" />
                <div className="flex gap-4 items-center">
                  <button
                    className="hover:bg-white/20 size-10 flex justify-center items-center rounded-full transition-all"
                    onClick={() => selectTrack(currentTrackIndex - 1)}
                  >
                    <SkipBack className="stroke-white" size={18} />
                  </button>
                  <button
                    onClick={() => selectTrack(currentTrackIndex)}
                    className="bg-white/20 border border-white/30 size-14 flex justify-center items-center rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="stroke-white" />
                    ) : (
                      <Play className="stroke-white" />
                    )}
                  </button>
                  <button
                    className="hover:bg-white/10 size-10 flex justify-center items-center rounded-full transition-all"
                    onClick={() => selectTrack(currentTrackIndex + 1)}
                  >
                    <SkipForward className="stroke-white" size={18} />
                  </button>
                </div>
                <button onClick={() => shareRoom(roomId)}>
                  <Share2 className="stroke-white" />
                </button>
              </div>
              <div className="mt-2.5 -mb-3 flex w-full gap-4 px-3">
                <button
                  onClick={() => {
                    socket.current.emit("update-volume", volume === 0 ? 50 : 0);
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
            </CardContent>
          </Card>
          <NewTrack onAdd={addTrack} />
        </div>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 flex-[2]">
          <CardHeader className="!py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">
                Playlist ({tracks.length} tracks)
              </CardTitle>
              <Button onClick={clearAllTrack}>Clear All</Button>
            </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-white/10"
                          onClick={(e) => e.stopPropagation()} // prevent click from selecting the item
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        className="bg-white border border-white/10 rounded-md p-1 min-w-[140px] z-50"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            const newOrder = [...tracks];
                            newOrder.splice(index, 1);
                            newOrder.splice(currentTrackIndex + 1, 0, track);

                            setTracks(newOrder);
                            socket.current.emit("update-tracks", {
                              tracks: newOrder,
                            });
                          }}
                          className="px-2 py-1.5 text-sm  hover:bg-white/10 cursor-pointer"
                        >
                          Play Next
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const newOrder = [...tracks];
                            newOrder.splice(index, 1);
                            newOrder.splice(currentTrackIndex + 1, 0, track);
                            setCurrentTrackIndex(currentTrackIndex + 1);
                            setTracks(newOrder);
                            socket.current.emit("update-tracks", {
                              tracks: newOrder,
                            });
                          }}
                          className="px-2 py-1.5 text-sm  hover:bg-white/10 cursor-pointer"
                        >
                          Stop and Play
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem
                            onClick={() => addRelativeVideos(track.videoId!)}
                            className="px-2 py-1.5 text-sm text-white hover:bg-white/10 cursor-pointer"
                          >
                            Add Relative Songs
                          </DropdownMenuItem> */}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default Host;
