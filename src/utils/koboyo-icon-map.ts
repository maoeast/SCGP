/**
 * koboyo 手绘图标映射表。
 *
 * 资产来源：https://koboyo.com/icons （免费个人与商用、无需署名，单色 currentColor SVG）
 * 下载脚本：scripts/fetch-koboyo-icons.mjs（可复现，slug 与文件一一对应）
 * 渲染组件：src/components/common/KoboyoIcon.vue（CSS mask 着色）
 *
 * 注意：以下 import 一律使用 `?no-inline` 后缀——强制 Vite 输出独立 SVG 文件
 * （Vite 7 的 `?url` 不再强制不内联），避免内联为百分号编码 data URL 后
 * CSS mask 渲染失败（详见 KoboyoIcon.vue 注释）。
 *
 * 说明：
 * - 入口图标（7 个）以 TrainingEntryCode 为 key，渲染时用入口 themeColor 着色；
 * - 游戏图标（38 个）以 CustomGameCode 为 key，渲染时在游戏卡片彩色渐变背景上用白色；
 * - 未收录的 gameCode（如 DB 资源型游戏）调用 getGameIconSvg 返回 undefined，
 *   调用方应回退到原有 emoji 展示。
 */
import type { TrainingEntryCode } from '@/utils/training-entry'

import sensoryIntegrationIcon from '@/assets/icons/entries/sensory-integration.svg?no-inline'
import emotionalRegulationIcon from '@/assets/icons/entries/emotional-regulation.svg?no-inline'
import socialCommunicationIcon from '@/assets/icons/entries/social-communication.svg?no-inline'
import fineMotorIcon from '@/assets/icons/entries/fine-motor.svg?no-inline'
import soothingAidsIcon from '@/assets/icons/entries/soothing-aids.svg?no-inline'
import lifeSkillsIcon from '@/assets/icons/entries/life-skills.svg?no-inline'
import cognitiveIcon from '@/assets/icons/entries/cognitive.svg?no-inline'

import G01BalloonIcon from '@/assets/icons/games/G01_BALLOON.svg?no-inline'
import G03ForestIcon from '@/assets/icons/games/G03_FOREST.svg?no-inline'
import G04WipeIceIcon from '@/assets/icons/games/G04_WIPE_ICE.svg?no-inline'
import G07MonsterIcon from '@/assets/icons/games/G07_MONSTER.svg?no-inline'
import G08EnergyBallIcon from '@/assets/icons/games/G08_ENERGY_BALL.svg?no-inline'
import G09ExpressionDetectiveIcon from '@/assets/icons/games/G09_EXPRESSION_DETECTIVE.svg?no-inline'
import F01CloudEraseIcon from '@/assets/icons/games/F01_CLOUD_ERASE.svg?no-inline'
import F02StarTraceIcon from '@/assets/icons/games/F02_STAR_TRACE.svg?no-inline'
import F03RecyclingIcon from '@/assets/icons/games/F03_RECYCLING.svg?no-inline'
import F04TrackBuildIcon from '@/assets/icons/games/F04_TRACK_BUILD.svg?no-inline'
import F05BalloonsIcon from '@/assets/icons/games/F05_BALLOONS.svg?no-inline'
import S01BurgerIcon from '@/assets/icons/games/S01_BURGER.svg?no-inline'
import S02EmotionMirrorIcon from '@/assets/icons/games/S02_EMOTION_MIRROR.svg?no-inline'
import S03StorySeqIcon from '@/assets/icons/games/S03_STORY_SEQ.svg?no-inline'
import S04GiftMatchIcon from '@/assets/icons/games/S04_GIFT_MATCH.svg?no-inline'
import S05EchoParrotIcon from '@/assets/icons/games/S05_ECHO_PARROT.svg?no-inline'
import S06ExpressionDuelIcon from '@/assets/icons/games/S06_EXPRESSION_DUEL.svg?no-inline'
import C01DandelionIcon from '@/assets/icons/games/C01_DANDELION.svg?no-inline'
import C02PuddleIcon from '@/assets/icons/games/C02_PUDDLE.svg?no-inline'
import C03XylophoneIcon from '@/assets/icons/games/C03_XYLOPHONE.svg?no-inline'
import C04HourglassIcon from '@/assets/icons/games/C04_HOURGLASS.svg?no-inline'
import C05MoodMeterIcon from '@/assets/icons/games/C05_MOOD_METER.svg?no-inline'
import L06SteadySpoonIcon from '@/assets/icons/games/L06_STEADY_SPOON.svg?no-inline'
import L07BodySignalIcon from '@/assets/icons/games/L07_BODY_SIGNAL.svg?no-inline'
import L08TowelTwistIcon from '@/assets/icons/games/L08_TOWEL_TWIST.svg?no-inline'
import L09HomeSoundIcon from '@/assets/icons/games/L09_HOME_SOUND.svg?no-inline'
import L10MarketPayIcon from '@/assets/icons/games/L10_MARKET_PAY.svg?no-inline'
import L12PourWaterIcon from '@/assets/icons/games/L12_POUR_WATER.svg?no-inline'
import K01MemoryMatchIcon from '@/assets/icons/games/K01_MEMORY_MATCH.svg?no-inline'
import K02MissingItemIcon from '@/assets/icons/games/K02_MISSING_ITEM.svg?no-inline'
import K03PatternNextIcon from '@/assets/icons/games/K03_PATTERN_NEXT.svg?no-inline'
import K04OddOneOutIcon from '@/assets/icons/games/K04_ODD_ONE_OUT.svg?no-inline'
import K05NumberSenseIcon from '@/assets/icons/games/K05_NUMBER_SENSE.svg?no-inline'
import K06SizeOrderIcon from '@/assets/icons/games/K06_SIZE_ORDER.svg?no-inline'
import K07SpotDiffIcon from '@/assets/icons/games/K07_SPOT_DIFF.svg?no-inline'
import K08MazeRunIcon from '@/assets/icons/games/K08_MAZE_RUN.svg?no-inline'
import K09EchoSeqIcon from '@/assets/icons/games/K09_ECHO_SEQ.svg?no-inline'
import K10StoryOrderIcon from '@/assets/icons/games/K10_STORY_ORDER.svg?no-inline'

import SensoryColorIcon from '@/assets/icons/games/SENSORY_color.svg?no-inline'
import SensoryShapeIcon from '@/assets/icons/games/SENSORY_shape.svg?no-inline'
import SensoryIconItemIcon from '@/assets/icons/games/SENSORY_icon.svg?no-inline'
import SensoryTrackIcon from '@/assets/icons/games/SENSORY_track.svg?no-inline'
import SensoryDiffIcon from '@/assets/icons/games/SENSORY_diff.svg?no-inline'
import SensoryCommandIcon from '@/assets/icons/games/SENSORY_command.svg?no-inline'
import SensoryRhythmIcon from '@/assets/icons/games/SENSORY_rhythm.svg?no-inline'
import SensoryHandXylophoneIcon from '@/assets/icons/games/SENSORY_hand-xylophone.svg?no-inline'
import SensoryWoodBlocksIcon from '@/assets/icons/games/SENSORY_wood-blocks.svg?no-inline'
import SensoryBubblePopIcon from '@/assets/icons/games/SENSORY_bubble-pop.svg?no-inline'
import SensoryAirConductorIcon from '@/assets/icons/games/SENSORY_air-conductor.svg?no-inline'

/** 入口图标（渲染时用 entry.themeColor 着色） */
export const ENTRY_ICON_SVGS: Record<TrainingEntryCode, string> = {
  'sensory-integration': sensoryIntegrationIcon,
  'emotional-regulation': emotionalRegulationIcon,
  'social-communication': socialCommunicationIcon,
  'fine-motor': fineMotorIcon,
  'soothing-aids': soothingAidsIcon,
  'life-skills': lifeSkillsIcon,
  'cognitive': cognitiveIcon,
}

/** 游戏图标（渲染时在游戏卡片彩色渐变背景上用白色） */
export const GAME_ICON_SVGS: Record<string, string> = {
  G01_BALLOON: G01BalloonIcon,
  G03_FOREST: G03ForestIcon,
  G04_WIPE_ICE: G04WipeIceIcon,
  G07_MONSTER: G07MonsterIcon,
  G08_ENERGY_BALL: G08EnergyBallIcon,
  G09_EXPRESSION_DETECTIVE: G09ExpressionDetectiveIcon,
  F01_CLOUD_ERASE: F01CloudEraseIcon,
  F02_STAR_TRACE: F02StarTraceIcon,
  F03_RECYCLING: F03RecyclingIcon,
  F04_TRACK_BUILD: F04TrackBuildIcon,
  F05_BALLOONS: F05BalloonsIcon,
  S01_BURGER: S01BurgerIcon,
  S02_EMOTION_MIRROR: S02EmotionMirrorIcon,
  S03_STORY_SEQ: S03StorySeqIcon,
  S04_GIFT_MATCH: S04GiftMatchIcon,
  S05_ECHO_PARROT: S05EchoParrotIcon,
  S06_EXPRESSION_DUEL: S06ExpressionDuelIcon,
  C01_DANDELION: C01DandelionIcon,
  C02_PUDDLE: C02PuddleIcon,
  C03_XYLOPHONE: C03XylophoneIcon,
  C04_HOURGLASS: C04HourglassIcon,
  C05_MOOD_METER: C05MoodMeterIcon,
  L06_STEADY_SPOON: L06SteadySpoonIcon,
  L07_BODY_SIGNAL: L07BodySignalIcon,
  L08_TOWEL_TWIST: L08TowelTwistIcon,
  L09_HOME_SOUND: L09HomeSoundIcon,
  L10_MARKET_PAY: L10MarketPayIcon,
  L12_POUR_WATER: L12PourWaterIcon,
  K01_MEMORY_MATCH: K01MemoryMatchIcon,
  K02_MISSING_ITEM: K02MissingItemIcon,
  K03_PATTERN_NEXT: K03PatternNextIcon,
  K04_ODD_ONE_OUT: K04OddOneOutIcon,
  K05_NUMBER_SENSE: K05NumberSenseIcon,
  K06_SIZE_ORDER: K06SizeOrderIcon,
  K07_SPOT_DIFF: K07SpotDiffIcon,
  K08_MAZE_RUN: K08MazeRunIcon,
  K09_ECHO_SEQ: K09EchoSeqIcon,
  K10_STORY_ORDER: K10StoryOrderIcon,
}

/**
 * 感官统合 DB 资源型游戏图标：以 SensoryGameSeed.mode 为 key。
 * 这些游戏存于 sys_training_resource（resourceType='game'、moduleCode='sensory'），
 * metadata 无 gameCode，渲染时以 metadata.mode 匹配本表。
 */
export const SENSORY_GAME_ICON_SVGS: Record<string, string> = {
  color: SensoryColorIcon,
  shape: SensoryShapeIcon,
  icon: SensoryIconItemIcon,
  track: SensoryTrackIcon,
  diff: SensoryDiffIcon,
  command: SensoryCommandIcon,
  rhythm: SensoryRhythmIcon,
  'hand-xylophone': SensoryHandXylophoneIcon,
  'wood-blocks': SensoryWoodBlocksIcon,
  'bubble-pop': SensoryBubblePopIcon,
  'air-conductor': SensoryAirConductorIcon,
}

/**
 * 取游戏图标 SVG；未收录时返回 undefined（调用方回退 emoji）。
 * 优先级：gameCode（registry 游戏）→ mode（感官 DB 资源型游戏）。
 */
export function getGameIconSvg(
  gameCode?: string | null,
  sensoryMode?: string | null,
): string | undefined {
  if (gameCode) {
    return GAME_ICON_SVGS[gameCode]
  }
  if (sensoryMode) {
    return SENSORY_GAME_ICON_SVGS[sensoryMode]
  }
  return undefined
}
