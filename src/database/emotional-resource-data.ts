import type {
  CareSceneResourceMeta,
  EmotionSceneResourceMeta,
  EmotionalResourceType,
} from '@/types/emotional'

type EmotionalSeedMetadata = EmotionSceneResourceMeta | CareSceneResourceMeta

export interface EmotionalSeedResource {
  resourceType: EmotionalResourceType
  name: string
  category: string
  description: string
  coverImage?: string
  tags: string[]
  metadata: EmotionalSeedMetadata
}

const HAPPY_COLOR = {
  emotionColorToken: 'green',
  emotionColorHex: '#67C23A',
  emotionColorLabel: '绿色区',
}

const SAD_COLOR = {
  emotionColorToken: 'blue',
  emotionColorHex: '#409EFF',
  emotionColorLabel: '蓝色区',
}

const SCARED_COLOR = {
  emotionColorToken: 'red',
  emotionColorHex: '#F56C6C',
  emotionColorLabel: '红色区',
}

export const EMOTIONAL_DEMO_RESOURCES: EmotionalSeedResource[] = [
  {
    resourceType: 'emotion_scene',
    name: '生日派对上的开心',
    category: 'peer_interaction',
    description: '识别生日场景中的开心情绪，并完成原因推理与回应选择。',
    coverImage: '🎂',
    tags: ['情绪识别', '开心', '同伴互动'],
    metadata: {
      sceneCode: 'emotion_scene_birthday_001',
      title: '生日派对上的开心',
      imageUrl: '',
      difficultyLevel: 1,
      targetEmotion: 'happy',
      emotionOptions: ['happy', 'sad', 'embarrassed', 'angry', 'scared'],
      emotionClues: ['桌上有蛋糕和礼物', '小朋友面带笑容', '大家在一起唱生日歌'],
      prompts: [
        {
          questionId: 'birthday_cause_1',
          questionType: 'cause',
          questionText: '他为什么会这么开心？',
          options: [
            {
              id: 'a1',
              text: '因为今天是他的生日',
              isCorrect: true,
              feedbackText: '对，他在被庆祝生日，所以会开心。',
            },
            {
              id: 'a2',
              text: '因为他和朋友吵架了',
              isCorrect: false,
              feedbackText: '再看看场景线索，这里更像是在庆祝。',
            },
            {
              id: 'a3',
              text: '因为他摔倒了',
              isCorrect: false,
              feedbackText: '摔倒通常不会让人这么开心。',
            },
          ],
        },
        {
          questionId: 'birthday_need_1',
          questionType: 'need',
          questionText: '这时他最需要什么？',
          options: [
            {
              id: 'n1',
              text: '收到祝福和陪伴',
              isCorrect: true,
              feedbackText: '对，开心的时候也希望别人一起分享。',
            },
            {
              id: 'n2',
              text: '一个人躲起来',
              isCorrect: false,
              feedbackText: '这个场景更适合一起庆祝。',
            },
          ],
        },
      ],
      solutions: [
        {
          id: 's1',
          text: '对他说“生日快乐”并一起鼓掌',
          suitability: 'optimal',
          explanation: '这是最直接的祝福方式，能让对方感受到被关注和被庆祝。',
        },
        {
          id: 's2',
          text: '把蛋糕拿走不让别人吃',
          suitability: 'inappropriate',
          explanation: '这样会破坏庆祝氛围，也会让别人不舒服。',
        },
      ],
      ageRange: '6-9',
      abilityLevel: 'primary',
      tags: ['生日', '开心', '祝福'],
      ...HAPPY_COLOR,
    } as EmotionSceneResourceMeta & Record<string, string>,
  },
  {
    resourceType: 'emotion_scene',
    name: '医院探望时的害怕',
    category: 'daily_life',
    description: '识别医院探望场景中的害怕情绪，并学习合适的安抚回应。',
    coverImage: '🏥',
    tags: ['情绪识别', '害怕', '生活场景'],
    metadata: {
      sceneCode: 'emotion_scene_hospital_001',
      title: '医院探望时的害怕',
      imageUrl: '',
      difficultyLevel: 2,
      targetEmotion: 'scared',
      emotionOptions: ['happy', 'sad', 'embarrassed', 'angry', 'scared'],
      emotionClues: ['小朋友抓着大人的衣角', '周围有医院床位和仪器', '表情紧张，身体靠后'],
      prompts: [
        {
          questionId: 'hospital_cause_1',
          questionType: 'cause',
          questionText: '他为什么会害怕？',
          options: [
            {
              id: 'h1',
              text: '因为医院环境让他紧张',
              isCorrect: true,
              feedbackText: '对，陌生环境和医疗仪器容易让人害怕。',
            },
            {
              id: 'h2',
              text: '因为他在开生日派对',
              isCorrect: false,
              feedbackText: '再看看环境，这里不是庆祝场景。',
            },
          ],
        },
        {
          questionId: 'hospital_empathy_1',
          questionType: 'empathy',
          questionText: '如果是你，你最希望别人怎么做？',
          options: [
            {
              id: 'e1',
              text: '有人安静陪着我，并告诉我会发生什么',
              isCorrect: true,
              feedbackText: '对，陪伴和提前说明能帮助减少害怕。',
            },
            {
              id: 'e2',
              text: '别人一直大声笑我',
              isCorrect: false,
              feedbackText: '这会让对方更紧张。',
            },
          ],
        },
      ],
      solutions: [
        {
          id: 's1',
          text: '轻声告诉他接下来会发生什么，并陪他一起等',
          suitability: 'optimal',
          explanation: '先说明和陪伴可以帮助对方建立安全感。',
        },
        {
          id: 's2',
          text: '催他不要怕，赶快自己进去',
          suitability: 'acceptable',
          explanation: '虽然想帮忙，但缺少安抚和陪伴，效果有限。',
        },
      ],
      ageRange: '7-10',
      abilityLevel: 'middle',
      tags: ['医院', '害怕', '安抚'],
      ...SCARED_COLOR,
    } as EmotionSceneResourceMeta & Record<string, string>,
  },
  {
    resourceType: 'care_scene',
    name: '朋友考试失利后的安慰',
    category: 'peer_support',
    description: '学习在朋友考试失利后使用共情、建议和陪伴表达关心。',
    coverImage: '📝',
    tags: ['表达关心', '共情', '考试'],
    metadata: {
      sceneCode: 'care_scene_exam_fail_001',
      title: '朋友考试失利后的安慰',
      imageUrl: '',
      difficultyLevel: 2,
      careType: 'empathy',
      speakerPerspectiveText: '朋友考试没考好，看起来很难过。',
      receiverPerspectiveText: '如果是你没考好，你更希望别人怎样安慰你？',
      utterances: [
        {
          id: 'u1',
          type: 'empathy',
          text: '我知道你现在很难过，我可以陪你一起缓一缓。',
          effect: '先接住情绪，让对方感到被理解。',
          receiverReactionText: '听到后会觉得被理解，没有那么孤单。',
          receiverReactionEmoji: '😌',
        },
        {
          id: 'u2',
          type: 'advice',
          text: '我们可以一起看看错题，下次会更有把握。',
          effect: '在共情之后给出具体帮助，能增强对方的掌控感。',
          receiverReactionText: '会觉得有人愿意帮忙。',
          receiverReactionEmoji: '🙂',
        },
        {
          id: 'u3',
          type: 'action',
          text: '别想了，快点去玩吧。',
          effect: '想转移注意力，但可能会让对方感觉情绪没被看见。',
          receiverReactionText: '可能会觉得自己的难过被忽略。',
          receiverReactionEmoji: '😕',
        },
      ],
      receiverOptions: [
        {
          id: 'r1',
          text: '“我知道你现在很难过，我可以陪你。”',
          isComforting: true,
          reasonText: '先共情，再陪伴，更容易让人感到安全。',
        },
        {
          id: 'r2',
          text: '“别难过了，这没什么。”',
          isComforting: false,
          reasonText: '太快否定情绪，会让对方感觉不被理解。',
        },
      ],
      preferredUtteranceIds: ['u1', 'u2'],
      ageRange: '8-12',
      abilityLevel: 'middle',
      tags: ['考试', '安慰', '共情'],
      receiverEmotion: 'sad',
      ...SAD_COLOR,
    } as CareSceneResourceMeta & Record<string, string>,
  },
  {
    resourceType: 'care_scene',
    name: '同伴哭泣时的陪伴',
    category: 'peer_support',
    description: '学习在同伴哭泣时使用陪伴和行动型表达关心。',
    coverImage: '🧻',
    tags: ['表达关心', '陪伴', '同伴互动'],
    metadata: {
      sceneCode: 'care_scene_crying_001',
      title: '同伴哭泣时的陪伴',
      imageUrl: '',
      difficultyLevel: 1,
      careType: 'action',
      speakerPerspectiveText: '同伴在角落哭泣，看起来需要帮助。',
      receiverPerspectiveText: '如果你在哭，你希望别人怎么靠近你？',
      utterances: [
        {
          id: 'u1',
          type: 'action',
          text: '我给你递纸巾，也会安静陪着你。',
          effect: '先提供具体帮助，再给陪伴，比较容易被接受。',
          receiverReactionText: '会感觉对方愿意照顾我的需要。',
          receiverReactionEmoji: '🥹',
        },
        {
          id: 'u2',
          type: 'empathy',
          text: '你现在一定很难受，我在这里。',
          effect: '用简单的话接住情绪，能帮助对方稳定下来。',
          receiverReactionText: '会觉得有人在理解我。',
          receiverReactionEmoji: '😌',
        },
        {
          id: 'u3',
          type: 'advice',
          text: '你别哭了，赶快去找老师。',
          effect: '信息直接，但如果太着急，可能会让对方更紧张。',
          receiverReactionText: '可能会觉得被催促。',
          receiverReactionEmoji: '😟',
        },
      ],
      receiverOptions: [
        {
          id: 'r1',
          text: '对方先递纸巾，再轻声陪伴你。',
          isComforting: true,
          reasonText: '行动和陪伴结合，更容易让人放松。',
        },
        {
          id: 'r2',
          text: '对方一直追问“你为什么哭？”',
          isComforting: false,
          reasonText: '在情绪还很强时不断追问，可能增加压力。',
        },
      ],
      preferredUtteranceIds: ['u1', 'u2'],
      ageRange: '6-9',
      abilityLevel: 'primary',
      tags: ['哭泣', '陪伴', '行动支持'],
      receiverEmotion: 'sad',
      ...SAD_COLOR,
    } as CareSceneResourceMeta & Record<string, string>,
  },
]
