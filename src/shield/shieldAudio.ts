import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

type ShieldAudioHandle = {
  stop: () => Promise<void>;
};

type ShieldAudioDebug = (message: string) => void;

const TARGET_VOLUME = 0.2;
const FADE_IN_MS = 1200;
const FADE_OUT_MS = 900;
const FADE_STEP_MS = 75;
const SHIELD_SOUND_SOURCES = [
  require("../../assets/audio/QuitlyShield.aac"),  
];

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fadeVolume(sound: Audio.Sound, from: number, to: number, durationMs: number) {
  const steps = Math.max(1, Math.floor(durationMs / FADE_STEP_MS));
  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    const volume = from + (to - from) * ratio;
    await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    await sleep(FADE_STEP_MS);
  }
}

export async function playShieldSound(onDebug?: ShieldAudioDebug): Promise<ShieldAudioHandle> {
  let sound: Audio.Sound | null = null;
  let stopped = false;

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (!sound) return;

    try {
      await fadeVolume(sound, TARGET_VOLUME, 0, FADE_OUT_MS);
    } catch {
      // Ignore fade errors and continue cleanup.
    }

    try {
      await sound.stopAsync();
    } catch {
      // Ignore stop errors and continue cleanup.
    }

    try {
      await sound.unloadAsync();
    } catch {
      // Ignore unload errors.
    }

    sound = null;
    onDebug?.("Audio stopped and unloaded");
  };

  try {
    onDebug?.("Configuring audio mode");
    const iosMixWithOthers = InterruptionModeIOS?.MixWithOthers ?? 0;
    const androidDuckOthers = InterruptionModeAndroid?.DuckOthers ?? 2;
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      interruptionModeIOS: iosMixWithOthers,
      interruptionModeAndroid: androidDuckOthers,
      shouldDuckAndroid: false,
      staysActiveInBackground: false,
    });

    let created: { sound: Audio.Sound } | null = null;
    let lastError: unknown = null;
    for (const source of SHIELD_SOUND_SOURCES) {
      try {
        onDebug?.("Loading shield sound source");
        created = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          volume: 0,
          isLooping: false,
        });
        onDebug?.("Shield sound source loaded");
        break;
      } catch (error) {
        console.warn("[ShieldAudio] Source load failed", error);
        onDebug?.(`Source load failed: ${error instanceof Error ? error.message : String(error)}`);
        lastError = error;
      }
    }

    if (!created) {
      throw lastError ?? new Error("No shield audio source could be loaded.");
    }

    sound = created.sound;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      throw new Error("Shield sound is not loaded after createAsync.");
    }
    if (!status.isPlaying) {
      onDebug?.("Sound loaded but not yet playing, retrying playAsync");
      await sound.playAsync();
    }
    onDebug?.("Shield sound is playing");
    await fadeVolume(sound, 0, TARGET_VOLUME, FADE_IN_MS);
    return { stop };
  } catch (error) {
    console.warn("[ShieldAudio] Failed to start shield sound", error);
    onDebug?.(`Audio error: ${error instanceof Error ? error.message : String(error)}`);
    await stop();
    return { stop };
  }
}
