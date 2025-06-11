"use client"

import { useEffect, useRef, useState } from "react"
import YouTubePlayerLib from "youtube-player"

interface YouTubePlayerProps {
  videoId: string
  onReady?: (player: any) => void
  onStateChange?: (event: any) => void
  onProgress?: (currentTime: number, duration: number) => void
  isPlaying?: boolean
}

export default function YouTubePlayer({ videoId, onReady, onStateChange, onProgress, isPlaying }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const playerInstanceRef = useRef<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  // Initialize player
  useEffect(() => {
    if (!playerRef.current) return

    const player = YouTubePlayerLib(playerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
    })

    player.on("ready", () => {
      setIsPlayerReady(true)
      if (onReady) onReady(player)
    })

    player.on("stateChange", (event) => {
      if (onStateChange) onStateChange(event)
    })

    playerInstanceRef.current = player

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy()
      }
    }
  }, [videoId, onReady, onStateChange])

  // Handle video ID changes
  useEffect(() => {
    if (playerInstanceRef.current && isPlayerReady) {
      playerInstanceRef.current.loadVideoById(videoId)
    }
  }, [videoId, isPlayerReady])

  // Handle play/pause
  useEffect(() => {
    if (!playerInstanceRef.current || !isPlayerReady) return

    if (isPlaying) {
      playerInstanceRef.current.playVideo()
    } else {
      playerInstanceRef.current.pauseVideo()
    }
  }, [isPlaying, isPlayerReady])

  // Update progress
  useEffect(() => {
    if (!playerInstanceRef.current || !isPlayerReady || !onProgress) return

    const interval = setInterval(async () => {
      try {
        const currentTime = await playerInstanceRef.current.getCurrentTime()
        const duration = await playerInstanceRef.current.getDuration()
        onProgress(currentTime, duration)
      } catch (error) {
        console.error("Error getting player time:", error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlayerReady, onProgress])

  return <div ref={playerRef} className="w-full h-full" />
}
