// convert_scenes.ts
import * as fs from 'fs';

// 映射字典
const EMOTION_MAP: Record<string, string> = {
  '开心': 'happy', '难过': 'sad', '生气': 'angry', '害怕': 'scared', '尴尬': 'embarrassed', '平静': 'happy', '自豪': 'happy', '害羞': 'embarrassed', '孤独': 'sad', '嫉妒': 'angry', '焦虑/紧张': 'scared', '焦虑/急躁': 'angry', '焦虑/不耐烦': 'angry'
};
const RANK_MAP: Record<string, string> = {
  'BEST': 'optimal', 'ACCEPTABLE': 'acceptable', 'UNACCEPTABLE': 'inappropriate'
};

const oldData = JSON.parse(fs.readFileSync('old_80_scenes.json', 'utf-8'));
const newData =[];

for (const old of oldData) {
  const meta: any = {
    sceneCode: old.id,
    title: old.emotionCategory + '场景练习',
    imageUrl: old.scenePresentation.imageUrl,
    difficultyLevel: parseInt(old.level.replace('L', '')),
    targetEmotion: EMOTION_MAP[old.emotionTask.options.find(o => o.isCorrect)?.emotionName] || 'happy',
    emotionOptions: old.emotionTask.options.map(o => EMOTION_MAP[o.emotionName] || 'happy'),
    // 从第一级提示中提取视觉线索
    emotionClues:[old.emotionTask.promptingLevels.level1.audioText],
    prompts: [],
    solutions:[],
    emotionColorToken: old.emotionTask.options.find(o => o.isCorrect)?.zone.toLowerCase(),
    abilityLevel: old.level === 'L1' ? 'primary' : (old.level === 'L2' ? 'middle' : 'advanced')
  };

  // 映射推理题 (Reasoning Prompts)
  if (old.reasoningTask.causeQuestion) {
    meta.prompts.push({
      questionId: `${old.id}-cause`,
      questionType: 'cause',
      questionText: old.reasoningTask.causeQuestion.question,
      options: old.reasoningTask.causeQuestion.options.map(o => ({
        id: o.id, text: o.text, imageUrl: o.iconUrl, isCorrect: o.isCorrect, feedbackText: o.feedbackAudio
      }))
    });
  }
  if (old.reasoningTask.needQuestion) {
    meta.prompts.push({
      questionId: `${old.id}-need`,
      questionType: 'need',
      questionText: old.reasoningTask.needQuestion.question,
      options: old.reasoningTask.needQuestion.options.map(o => ({
        id: o.id, text: o.text, imageUrl: o.iconUrl, isCorrect: o.isCorrect, feedbackText: o.feedbackAudio
      }))
    });
  }

  // 映射解决题 (Solutions)
  meta.solutions = old.problemSolvingTask.options.map(o => ({
    id: o.id,
    text: o.text,
    imageUrl: o.iconUrl,
    suitability: RANK_MAP[o.suitability],
    explanation: `${o.consequenceExplanation} ${o.feedbackAudio}`
  }));

  newData.push(meta);
}

fs.writeFileSync('final_emotion_scenes.json', JSON.stringify(newData, null, 2));
console.log('数据清洗完成！已完美适配 EmotionSceneResourceMeta。');