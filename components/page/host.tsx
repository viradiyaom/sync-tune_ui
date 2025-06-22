"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { shareRoom } from "@/lib/utils";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Reorder } from "framer-motion";
import {
  GripVertical,
  MoreVertical,
  Pause,
  Play,
  Share2,
  Trash2,
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

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

const API_KEY = process.env.NEXT_PUBLIC_YT_API_KEY;

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("join-room", (data: any) => {
      setLoading(false);
      if (data.type === "SUCCESS") {
        setNewRoomId("");
        setRoomId(data.roomId);
      } else {
        toast.error(data.message || "Something went wrong");
      }
      setTimeout(setupPlayer, 1000);
    });

    socketRef.current.on("room-tracks", (tracks: Track[]) => {
      if (tracks) setTracks(tracks);
    });
    socketRef.current.on("update-playing-status", (value: boolean) => {
      if (value) {
        ytPlayer.current.playVideo();
      } else {
        ytPlayer.current.pauseVideo();
      }
      setIsPlaying(value);
    });

    socketRef.current.on(
      "update-current-playing",
      ({ index }: { index: number }) => {
        if (index && index >= 0) {
          setCurrentTrackIndex((e) => {
            if (e === index) {
              ytPlayer.current.pauseVideo();
            }
            return index;
          });
        }
      }
    );

    socketRef.current.on("sync-request", async () => {
      // let i = 0;
      // const interval = setInterval(async () => {
      //   if (i > 3) {
      //     return clearInterval(interval);
      //   }
      const player = ytPlayer.current;
      console.log("🚀 - //interval - player:", player);
      const time = +new Date();
      const currentTime = await player.getCurrentTime();
      const playerState = await player.getPlayerState();

      setActiveVideo((videoId) => {
        socketRef.current.emit("sync-response", {
          type: "TIME",
          playerState,
          time,
          currentTime,
          videoId,
        });
        return videoId;
      });

      //   i++;
      // }, 1000);
    });
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

  const setupPlayer = () => {
    const player = YouTubePlayer("video-player", { width: 300, height: 180 });
    player.on("stateChange", async (event: any) => {
      const currentTime = event.target.getCurrentTime();

      if (event.data === 0) {
        setCurrentTrackIndex((index) => index + 1);
      }

      if (event.data === 2 && currentTime > 0) {
        socketRef.current.emit("update-playing-status", {
          value: false,
        });
      }
      if (event.data === 1) {
        socketRef.current.emit("update-playing-status", {
          value: true,
        });
      }
    });
    ytPlayer.current = player;
  };

  const createRoom = () => {
    setLoading(true);
    socketRef.current.emit("create-room", newRoomId);
  };

  const addTrack = (newTrack: Track[]) => {
    socketRef.current.emit("add-track", {
      tracks: newTrack,
    });
    setTracks([...tracks, ...newTrack]);
  };

  const selectTrack = (index: number) => {
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
    socketRef.current.emit("update-tracks", {
      tracks: newTracks,
    });
  };

  //   const addRelativeVideos = async (videoId: string) => {
  //     // const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&relatedToVideoId=${videoId}&type=video&key=${API_KEY}`;

  //     const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&relatedToVideoId=jcAn44985E0&maxResults=10&key=${API_KEY}
  // `;
  //     fetch(url)
  //       .then((res) => res.json())
  //       .then((data) => {
  //         console.log("🚀 - .then - data:", data);
  //         const songs = data.items.map((item: any) => ({
  //           id: item.id.videoId,
  //           title: item.snippet.title,
  //           videoId: item.id.videoId,
  //           thumbnail: item.snippet.thumbnails?.medium?.url || "",
  //           channelTitle: item.snippet.channelTitle,
  //           url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  //         }));
  //       })
  //       .catch((err) => console.error("Failed to fetch related songs", err));
  //   };

  if (!roomId)
    return (
      <>
        <h1 className="text-3xl font-bold mb-6">Create Room Id</h1>
        <div className="flex gap-2">
          <Input
            id="roomId"
            placeholder="RoomId"
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") createRoom();
            }}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <Button onClick={createRoom} disabled={!newRoomId || loading}>
            Create Room
          </Button>
        </div>
      </>
    );

  return (
    <div className="max-w-[1500px] w-full mx-auto space-y-6">
      <h1 className="text-4xl font-bold text-white text-center mb-8">
        Sync Tune
      </h1>

      <div className="flex max-md:flex-col gap-4 w-full">
        <div className="flex-1 space-y-4 md:max-w-[500px]">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 ">
            <CardContent className="p-6 flex justify-between items-center">
              <p className="font-bold text-white">Joining Code : {roomId}</p>
              <button onClick={() => shareRoom(roomId)}>
                <Share2 className="stroke-white" />
              </button>
            </CardContent>
          </Card>
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
                        className="bg-black border border-white/10 rounded-md p-1 min-w-[140px] z-50"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            const newOrder = [...tracks];
                            newOrder.splice(index, 1);
                            newOrder.splice(currentTrackIndex + 1, 0, track);

                            setTracks(newOrder);
                            socketRef.current.emit("update-tracks", {
                              tracks: newOrder,
                            });
                          }}
                          className="px-2 py-1.5 text-sm text-white hover:bg-white/10 cursor-pointer"
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
                            socketRef.current.emit("update-tracks", {
                              tracks: newOrder,
                            });
                          }}
                          className="px-2 py-1.5 text-sm text-white hover:bg-white/10 cursor-pointer"
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
