import type {
  Cnbsr2016DomainDefinition,
  Cnbsr2016PassFailOption,
  Cnbsr2016QuestionData,
} from '@/types/cnbsr2016'

export const CNBSR2016_DOMAIN_DEFINITIONS: Cnbsr2016DomainDefinition[] = [
  { code: 'gm', label: "大运动" },
  { code: 'fm', label: "精细动作" },
  { code: 'ad', label: "适应能力" },
  { code: 'la', label: "语言" },
  { code: 'sb', label: "社会行为" },
]

export const CNBSR2016_PASS_FAIL_OPTIONS: Cnbsr2016PassFailOption[] = [
  {
    value: 1,
    label: '通过',
    description: '达到题目通过标准',
    score: 1,
  },
  {
    value: 0,
    label: '不通过',
    description: '未达到题目通过标准',
    score: 0,
  },
]

export const CNBSR2016_QUESTIONS: Cnbsr2016QuestionData[] = [
  {
    "id": 1,
    "itemCode": "cnbsr2016_001",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "抬肩坐起头竖直片刻",
    "prompt": "婴儿仰卧，主试者面向婴儿站立，对婴儿微笑、说话，直到婴儿注视到主试者的脸。这时主试者轻轻握住婴儿双肩（四指并拢置于肩胛骨外侧，食指不能触碰颈部），将婴儿拉坐起来，观察婴儿控制头的能力",
    "passCriteria": "婴儿头可竖直保持2s或以上",
    "sourcePage": 6,
    "sourceOrder": 1,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 2,
    "itemCode": "cnbsr2016_002",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "俯卧头部翘动",
    "prompt": "婴儿俯卧，前臂屈曲支撑，用玩具逗引婴儿抬头，观察其反应",
    "passCriteria": "婴儿有头部翘动即可通过",
    "sourcePage": 6,
    "sourceOrder": 2,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 3,
    "itemCode": "cnbsr2016_003",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "触碰手掌紧握拳",
    "prompt": "婴儿仰卧，主试者将食指从尺侧放入婴儿手掌中",
    "passCriteria": "婴儿能将拳头握紧",
    "sourcePage": 6,
    "sourceOrder": 3,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 4,
    "itemCode": "cnbsr2016_004",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "手的自然状态",
    "prompt": "主试者观察婴儿清醒时手的自然状态",
    "passCriteria": "双手拇指内收不达掌心，无发紧即通过",
    "sourcePage": 6,
    "sourceOrder": 4,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 5,
    "itemCode": "cnbsr2016_005",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "看黑白靶*",
    "prompt": "婴儿仰卧，主试者将黑白靶拿在距婴儿脸部上方20cm处移动，吸引婴儿注意",
    "passCriteria": "婴儿眼睛可明确注视黑白靶",
    "sourcePage": 6,
    "sourceOrder": 5,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 6,
    "itemCode": "cnbsr2016_006",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "眼跟红球过中线",
    "prompt": "婴儿仰卧，主试者手提红球，在婴儿脸部上方20cm处轻轻晃动以引起婴儿注意，然后把红球慢慢移动，从头的一侧沿着弧形，移向中央，再移向头的另一侧，观察婴儿头部和眼睛的活动。",
    "passCriteria": "当主试者把红球移向中央时，婴儿用眼睛跟踪看着红球转过中线，三试一成",
    "sourcePage": 6,
    "sourceOrder": 6,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 7,
    "itemCode": "cnbsr2016_007",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "自发细小喉音",
    "prompt": "婴儿仰卧、清醒。注意其发音",
    "passCriteria": "观察或询问，小儿能发出任何一种细小柔和的喉音",
    "sourcePage": 6,
    "sourceOrder": 7,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 8,
    "itemCode": "cnbsr2016_008",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "听声音有反应*",
    "prompt": "婴儿仰卧，在其一侧耳上方10cm～15cm处轻摇铜铃，观察婴儿的反应。（双侧均做，一侧通过即可）",
    "passCriteria": "婴儿听到铃声有一种或多种反应",
    "sourcePage": 6,
    "sourceOrder": 8,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 9,
    "itemCode": "cnbsr2016_009",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "对发声的人有注视",
    "prompt": "主试者面对婴儿的脸微笑并对其说话。但不能触碰婴儿的面孔或身体",
    "passCriteria": "婴儿能注视主试者的脸",
    "sourcePage": 6,
    "sourceOrder": 9,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 10,
    "itemCode": "cnbsr2016_010",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 1,
    "ageBand": {
      "label": "1月龄",
      "minMonths": 1,
      "maxMonths": 1
    },
    "scoreWeight": 0.5,
    "title": "眼跟踪走动的人",
    "prompt": "婴儿横放在床上或斜躺在家长臂弯里，主试者站立（直立位，勿弯腰）逗引婴儿引起其注意后左右走动，观察婴儿眼睛是否追随主试者",
    "passCriteria": "眼睛随走动的人转动",
    "sourcePage": 6,
    "sourceOrder": 10,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 11,
    "itemCode": "cnbsr2016_011",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "拉腕坐起头竖直短时",
    "prompt": "婴儿仰卧，主试者将拇指置于婴儿掌心，余四指握住腕部轻拉婴儿坐起，观察婴儿控制头部的能力",
    "passCriteria": "当把婴儿拉起成坐位时婴儿头可自行竖直，保持5s或以上",
    "sourcePage": 6,
    "sourceOrder": 11,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 12,
    "itemCode": "cnbsr2016_012",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "俯卧头抬离床面",
    "prompt": "婴儿俯卧，前臂屈曲支撑，用玩具逗引婴儿抬头，观察其反应",
    "passCriteria": "婴儿可自行将头抬离床面达 2s或以上。",
    "sourcePage": 6,
    "sourceOrder": 12,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 13,
    "itemCode": "cnbsr2016_013",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "花铃棒留握片刻",
    "prompt": "婴儿仰卧，将花铃棒放在婴儿手中",
    "passCriteria": "握住花铃棒不松手达2s或以上",
    "sourcePage": 6,
    "sourceOrder": 13,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 14,
    "itemCode": "cnbsr2016_014",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "拇指轻叩可分开*",
    "prompt": "主试者分别轻叩婴儿双手手背，观察拇指自然放松的状态",
    "passCriteria": "婴儿双手握拳稍紧，拇指稍内收，但经轻叩即可打开",
    "sourcePage": 6,
    "sourceOrder": 14,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 15,
    "itemCode": "cnbsr2016_015",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "即刻注意大玩具",
    "prompt": "婴儿仰卧，用娃娃在婴儿脸部上方20cm处晃动，观察其反应。",
    "passCriteria": "可立刻注意到娃娃，三试一成",
    "sourcePage": 6,
    "sourceOrder": 15,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第12页"
  },
  {
    "id": 16,
    "itemCode": "cnbsr2016_016",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "眼跟红球上下移动*",
    "prompt": "婴儿仰卧，主试者提起红球，在婴儿脸部上方20cm处轻轻晃动以引起婴儿注意，先慢慢向上移动，然后再从头顶向下颏处移动",
    "passCriteria": "婴儿眼睛能上或下跟随红球",
    "sourcePage": 6,
    "sourceOrder": 16,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 17,
    "itemCode": "cnbsr2016_017",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "发a、o、e等母音",
    "prompt": "询问或逗引婴儿发音",
    "passCriteria": "能从喉部发出a、o、e等元音来",
    "sourcePage": 6,
    "sourceOrder": 17,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 18,
    "itemCode": "cnbsr2016_018",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "听声音有复杂反应",
    "prompt": "婴儿仰卧，在其一侧耳上方10cm～15cm处轻摇铜铃，观察婴儿的反应。（双侧均做，一侧通过即可）",
    "passCriteria": "婴儿听到声音有表情和肢体动作的变化",
    "sourcePage": 6,
    "sourceOrder": 18,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 19,
    "itemCode": "cnbsr2016_019",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "自发微笑",
    "prompt": "观察或询问婴儿在无外界逗引时是否有自发微笑的情况",
    "passCriteria": "婴儿能自发出现微笑，但不一定出声。睡眠时微笑不通过",
    "sourcePage": 6,
    "sourceOrder": 19,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 20,
    "itemCode": "cnbsr2016_020",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 2,
    "ageBand": {
      "label": "2月龄",
      "minMonths": 2,
      "maxMonths": 2
    },
    "scoreWeight": 0.5,
    "title": "逗引时有反应",
    "prompt": "婴儿仰卧，主试者弯腰，对婴儿点头微笑或说话进行逗引，观察其反应。但不能触碰婴儿的面孔或身体",
    "passCriteria": "经逗引，婴儿会出现微笑、发声、手脚乱动等一种或多种表现",
    "sourcePage": 6,
    "sourceOrder": 20,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 21,
    "itemCode": "cnbsr2016_021",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "抱直头稳",
    "prompt": "竖抱婴儿，观察婴儿控制头部的能力",
    "passCriteria": "能将头举正并稳定10s或以上",
    "sourcePage": 6,
    "sourceOrder": 21,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 22,
    "itemCode": "cnbsr2016_022",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "俯卧抬头45°",
    "prompt": "婴儿俯卧，前臂屈曲支撑，头正中位，用玩具逗引婴儿抬头，观察其反应",
    "passCriteria": "头可自行抬离床面，面部与床面成45°，持续5s或以上",
    "sourcePage": 6,
    "sourceOrder": 22,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 23,
    "itemCode": "cnbsr2016_023",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "花铃棒留握30s",
    "prompt": "婴儿仰卧或侧卧，将花铃棒放入婴儿手中",
    "passCriteria": "婴儿能握住花铃棒30s，不借助床面的支持",
    "sourcePage": 6,
    "sourceOrder": 23,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 24,
    "itemCode": "cnbsr2016_024",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "两手搭在一起",
    "prompt": "婴儿仰卧，主试者观察婴儿双手是否能够自发搭在一起，或主试者将其两手搭在一起，随即松手，观察婴儿双手状态。",
    "passCriteria": "婴儿能将双手搭在一起，保持 3s～4s",
    "sourcePage": 6,
    "sourceOrder": 24,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 25,
    "itemCode": "cnbsr2016_025",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "即刻注意胸前玩具",
    "prompt": "婴儿仰卧，主试者将娃娃在婴儿身体上方20cm处沿中线自下向上移动。当玩具到婴儿乳头连线至下颏之间时，观察婴儿反应",
    "passCriteria": "当娃娃移动至婴儿乳头连线至下颌之间时，立即注意即可通过",
    "sourcePage": 6,
    "sourceOrder": 25,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 26,
    "itemCode": "cnbsr2016_026",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "眼跟红球180°",
    "prompt": "婴儿仰卧，主试者手提红球，在婴儿脸部上方20cm处轻轻晃动以引起婴儿注意，然后把红球慢慢移动，从头的一侧沿着弧形，移向中央，再移向头的另一侧，观察婴儿头部和眼睛的活动",
    "passCriteria": "婴儿用眼及头跟随红球转动 180°，三试一成",
    "sourcePage": 6,
    "sourceOrder": 26,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 27,
    "itemCode": "cnbsr2016_027",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 1.0,
    "title": "笑出声",
    "prompt": "逗引婴儿笑，但不得接触身体",
    "passCriteria": "观察或询问，婴儿能发出“咯咯”笑声",
    "sourcePage": 6,
    "sourceOrder": 27,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 28,
    "itemCode": "cnbsr2016_028",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "见人会笑",
    "prompt": "主试者面对婴儿，不做出接近性的社交行为或动作，观察婴儿在无人逗引时的表情",
    "passCriteria": "婴儿见到人自行笑起来",
    "sourcePage": 6,
    "sourceOrder": 28,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 29,
    "itemCode": "cnbsr2016_029",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 3,
    "ageBand": {
      "label": "3月龄",
      "minMonths": 3,
      "maxMonths": 3
    },
    "scoreWeight": 0.5,
    "title": "灵敏模样",
    "prompt": "主试者观察婴儿在不经逗引的情况下，对周围人和环境的反应",
    "passCriteria": "婴儿不经逗引可观察周围环境，眼会东张西望",
    "sourcePage": 6,
    "sourceOrder": 29,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 30,
    "itemCode": "cnbsr2016_030",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "扶腋可站片刻",
    "prompt": "主试者扶婴儿腋下，置于立位后放松手的支持，观察其反应",
    "passCriteria": "婴儿可用自己双腿支持大部分体重达2s或以上",
    "sourcePage": 6,
    "sourceOrder": 30,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 31,
    "itemCode": "cnbsr2016_031",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "俯卧抬头90°",
    "prompt": "婴儿俯卧，前臂屈曲支撑，头正中位，用玩具逗引婴儿抬头，观察其反应",
    "passCriteria": "头可自行抬离床面，面部与床面呈90 ° ，持续5s或以上",
    "sourcePage": 6,
    "sourceOrder": 31,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 32,
    "itemCode": "cnbsr2016_032",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "摇动并注视花铃棒",
    "prompt": "抱坐，将花铃棒放入婴儿手中，鼓励婴儿摇动",
    "passCriteria": "婴儿能注视花铃棒，并摇动数下",
    "sourcePage": 6,
    "sourceOrder": 32,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 33,
    "itemCode": "cnbsr2016_033",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "试图抓物",
    "prompt": "婴儿仰卧，将花铃棒拿到婴儿可及的范围内，观察婴儿反应，但不能触碰婴儿",
    "passCriteria": "婴儿手臂试图抬起或有手抓动作即可通过",
    "sourcePage": 6,
    "sourceOrder": 33,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 34,
    "itemCode": "cnbsr2016_034",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "目光对视*",
    "prompt": "主试者或母亲对婴儿说话，观察婴儿是否与人对视",
    "passCriteria": "婴儿能与成人对视，并保持5s 或以上",
    "sourcePage": 6,
    "sourceOrder": 34,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第13页"
  },
  {
    "id": 35,
    "itemCode": "cnbsr2016_035",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "高声叫",
    "prompt": "观察或询问婴儿在高兴或不满时的发音",
    "passCriteria": "会高声叫（非高调尖叫）",
    "sourcePage": 6,
    "sourceOrder": 35,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 36,
    "itemCode": "cnbsr2016_036",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "伊语作声",
    "prompt": "观察婴儿安静时的发音",
    "passCriteria": "观察或询问，婴儿会类似自言自语，无音节、无意义",
    "sourcePage": 6,
    "sourceOrder": 36,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 37,
    "itemCode": "cnbsr2016_037",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "找到声源",
    "prompt": "抱坐，主试者在婴儿耳后上方15cm处轻摇铜铃，观察其反应",
    "passCriteria": "可回头找到声源，一侧耳通过即可",
    "sourcePage": 6,
    "sourceOrder": 37,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 38,
    "itemCode": "cnbsr2016_038",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "注视镜中人像",
    "prompt": "将无边镜子横放在婴儿面前约20cm处，主试者或母亲可在镜中逗引婴儿，观察婴儿反应",
    "passCriteria": "婴儿可经逗引或自发注视镜中人像",
    "sourcePage": 6,
    "sourceOrder": 38,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 39,
    "itemCode": "cnbsr2016_039",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 4,
    "ageBand": {
      "label": "4月龄",
      "minMonths": 4,
      "maxMonths": 4
    },
    "scoreWeight": 0.5,
    "title": "认亲人",
    "prompt": "观察婴儿在看到母亲或其他亲人或听到亲人声音后的表情变化",
    "passCriteria": "观察或询问，在见到母亲或其他亲人时，婴儿会变得高兴起来",
    "sourcePage": 6,
    "sourceOrder": 39,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 40,
    "itemCode": "cnbsr2016_040",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "轻拉腕部即坐起",
    "prompt": "婴儿仰卧，主试者握住腕部，轻拉到坐的位置",
    "passCriteria": "婴儿自己能主动用力坐起，拉坐过程中无头部后滞现象",
    "sourcePage": 6,
    "sourceOrder": 40,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 41,
    "itemCode": "cnbsr2016_041",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "独坐头身前倾",
    "prompt": "将婴儿以坐姿置于床上",
    "passCriteria": "独坐保持5s或以上，头身向前倾",
    "sourcePage": 6,
    "sourceOrder": 41,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 42,
    "itemCode": "cnbsr2016_042",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "抓住近处玩具",
    "prompt": "抱坐，婴儿手置于桌上。玩具（如花铃棒）放在距离婴儿手掌一侧2.5cm处，鼓励婴儿取玩具",
    "passCriteria": "婴儿可用一手或双手抓住玩具",
    "sourcePage": 6,
    "sourceOrder": 42,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 43,
    "itemCode": "cnbsr2016_043",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "玩手",
    "prompt": "观察婴儿能否把双手放在一起互相玩弄",
    "passCriteria": "婴儿会自发将双手抱到一起玩",
    "sourcePage": 6,
    "sourceOrder": 43,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 44,
    "itemCode": "cnbsr2016_044",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "注意小丸",
    "prompt": "桌面上放一小丸，主试者指点小丸或把小丸动来动去，以引起婴儿注意",
    "passCriteria": "婴儿明确地注意到小丸",
    "sourcePage": 6,
    "sourceOrder": 44,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 45,
    "itemCode": "cnbsr2016_045",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "拿住一积木注视另一积木",
    "prompt": "抱坐，婴儿手置于桌上，主试者先放一块积木在婴儿手中，再放另一块积木于桌上婴儿可及范围内，适当逗引，观察婴儿对第二块积木的反应",
    "passCriteria": "婴儿拿着放在手中的第一块积木，当第二块积木靠近时，目光明确地注视第二块积木",
    "sourcePage": 6,
    "sourceOrder": 45,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 46,
    "itemCode": "cnbsr2016_046",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 1.0,
    "title": "对人及物发声",
    "prompt": "观察或询问婴儿看到熟悉的人或玩具时的发音",
    "passCriteria": "观察或询问，婴儿会发出象说话般的声音，如伊伊呀呀、ma、 pa、ba等辅元结合音",
    "sourcePage": 6,
    "sourceOrder": 46,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 47,
    "itemCode": "cnbsr2016_047",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "对镜有游戏反应",
    "prompt": "将无边镜子竖放在婴儿面前约20cm处，主试者及家长影像不能在镜内出现，观察婴儿反应",
    "passCriteria": "对镜中自己的影像有面部表情变化或伴有肢体动作。",
    "sourcePage": 6,
    "sourceOrder": 47,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 48,
    "itemCode": "cnbsr2016_048",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 5,
    "ageBand": {
      "label": "5月龄",
      "minMonths": 5,
      "maxMonths": 5
    },
    "scoreWeight": 0.5,
    "title": "见食物兴奋",
    "prompt": "观察婴儿看到奶瓶、饼干、水等食物时的反应",
    "passCriteria": "观察或询问，当婴儿看到奶瓶或母亲乳房时，表现出高兴要吃的样子",
    "sourcePage": 6,
    "sourceOrder": 48,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6页；附录B表B.1，第14页"
  },
  {
    "id": 49,
    "itemCode": "cnbsr2016_049",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "仰卧翻身",
    "prompt": "婴儿仰卧，用玩具逗引其翻身",
    "passCriteria": "观察或询问，婴儿可从仰卧自行翻到俯卧位",
    "sourcePage": 6,
    "sourceOrder": 49,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第14页"
  },
  {
    "id": 50,
    "itemCode": "cnbsr2016_050",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "会拍桌子",
    "prompt": "抱坐，主试者示范拍打桌面，鼓励婴儿照样做",
    "passCriteria": "婴儿经示范后或自发拍打桌面，并拍响",
    "sourcePage": 6,
    "sourceOrder": 50,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第14页"
  },
  {
    "id": 51,
    "itemCode": "cnbsr2016_051",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "会撕揉纸张",
    "prompt": "将一张28g粉色打字纸放入婴儿手中，使婴儿能抓住纸，观察婴儿反应",
    "passCriteria": "能用双手反复揉搓纸张两次或以上，或将纸撕破",
    "sourcePage": 6,
    "sourceOrder": 51,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第14页"
  },
  {
    "id": 52,
    "itemCode": "cnbsr2016_052",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "耙弄到桌上一积木",
    "prompt": "抱坐，放一积木在婴儿容易够到的桌面上，观察婴儿反应",
    "passCriteria": "婴儿伸出手触碰到积木并抓握到",
    "sourcePage": 6,
    "sourceOrder": 52,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第14页"
  },
  {
    "id": 53,
    "itemCode": "cnbsr2016_053",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "两手拿住积木",
    "prompt": "抱坐，先后递给婴儿两块积木，婴儿自己拿或被动放在手中均可",
    "passCriteria": "婴儿一手拿一块积木，保持在手里10s或以上",
    "sourcePage": 6,
    "sourceOrder": 53,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 54,
    "itemCode": "cnbsr2016_054",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "寻找失落的玩具",
    "prompt": "以红球逗引婴儿注意，红球位置应与婴儿双眼在同一水平线上。主试者手提红球，当婴儿注意到红球后，立即松手使红球落地，此时主试者的手保持原姿势，观察婴儿反应",
    "passCriteria": "红球落地后，婴儿立即低下头寻找红球",
    "sourcePage": 6,
    "sourceOrder": 54,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 55,
    "itemCode": "cnbsr2016_055",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "叫名字转头",
    "prompt": "主试者或家长在婴儿背后呼唤其名字，观察其反应",
    "passCriteria": "婴儿会转头寻找呼唤的人",
    "sourcePage": 6,
    "sourceOrder": 55,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 56,
    "itemCode": "cnbsr2016_056",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "理解手势",
    "prompt": "主试者或妈妈（带养人）伸手表示要抱，不得出声提示，观察婴儿反应",
    "passCriteria": "婴儿理解并将手伸向主试者或妈妈（带养人），二试一成",
    "sourcePage": 6,
    "sourceOrder": 56,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 57,
    "itemCode": "cnbsr2016_057",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "自喂食物",
    "prompt": "观察或询问婴儿拿到一块饼干或其他能拿住的食物时，能否送至口中并咀嚼",
    "passCriteria": "能将饼干送入口中并咀嚼，有张嘴咬的动作而不是吸吮",
    "sourcePage": 6,
    "sourceOrder": 57,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 58,
    "itemCode": "cnbsr2016_058",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 6,
    "ageBand": {
      "label": "6月龄",
      "minMonths": 6,
      "maxMonths": 6
    },
    "scoreWeight": 0.5,
    "title": "会躲猫猫",
    "prompt": "主试者把自己的脸藏在一张中心有孔的A4纸后面（孔直径0.5cm），呼唤婴儿名字，婴儿听到声音，观望时，主试者沿纸边在纸的同一侧反复出现两次并逗引说“喵、喵”，第三次呼唤婴儿名字后从纸孔观察婴儿表情",
    "passCriteria": "第三次呼唤婴儿时，婴儿视线再次转向主试者刚才露脸的方向",
    "sourcePage": 6,
    "sourceOrder": 58,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 59,
    "itemCode": "cnbsr2016_059",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "悬垂落地姿势*",
    "prompt": "扶腋下使婴儿呈悬空位，足离床面20cm～30cm，立位瞬时落下，观察脚落地瞬时的姿势",
    "passCriteria": "婴儿能全脚掌着地",
    "sourcePage": 6,
    "sourceOrder": 59,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 60,
    "itemCode": "cnbsr2016_060",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "独坐直",
    "prompt": "将婴儿以坐姿置于床上",
    "passCriteria": "独坐时背直，无需手支撑床面，保持1min或以上",
    "sourcePage": 6,
    "sourceOrder": 60,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 61,
    "itemCode": "cnbsr2016_061",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "耙弄到小丸",
    "prompt": "抱坐，将一小丸放在桌上，鼓励婴儿取",
    "passCriteria": "婴儿用所有手指弯曲做耙弄、搔抓动作，最后成功地用全掌抓到小丸",
    "sourcePage": 6,
    "sourceOrder": 61,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 62,
    "itemCode": "cnbsr2016_062",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "自取一积木，再取另一块",
    "prompt": "抱坐，出示一积木给婴儿，抓住后，再出示另一块，观察其反应",
    "passCriteria": "婴儿主动伸手去抓桌上的积木，第一块积木握住并保留在手中后，又成功地用另一只手抓住第二块积木",
    "sourcePage": 6,
    "sourceOrder": 62,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 63,
    "itemCode": "cnbsr2016_063",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "积木换手",
    "prompt": "抱坐，出示一积木给婴儿，婴儿拿住后，再向拿积木的手前出示另一块积木，观察其反应",
    "passCriteria": "婴儿将第一块积木传到另一只手后，再去拿第二块积木",
    "sourcePage": 6,
    "sourceOrder": 63,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 64,
    "itemCode": "cnbsr2016_064",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "伸手够远处玩具",
    "prompt": "抱坐，将一玩具放于婴儿手恰好够不到的桌面上，观察其反应",
    "passCriteria": "欠身取，并能拿到玩具",
    "sourcePage": 6,
    "sourceOrder": 64,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 65,
    "itemCode": "cnbsr2016_065",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 1.0,
    "title": "发da-da、ma-ma 无所指",
    "prompt": "观察婴儿在清醒状态时的发声情况",
    "passCriteria": "观察或询问，婴儿会发 da-da、ma-ma的双唇音，但无所指",
    "sourcePage": 6,
    "sourceOrder": 65,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 66,
    "itemCode": "cnbsr2016_066",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "抱脚玩",
    "prompt": "婴儿仰卧，观察其是否会自发或在主试者协助下将脚放入手中后玩脚",
    "passCriteria": "婴儿能抱住脚玩或吸吮",
    "sourcePage": 6,
    "sourceOrder": 66,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 67,
    "itemCode": "cnbsr2016_067",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 7,
    "ageBand": {
      "label": "7月龄",
      "minMonths": 7,
      "maxMonths": 7
    },
    "scoreWeight": 0.5,
    "title": "能认生人",
    "prompt": "观察或询问婴儿对陌生人的反应",
    "passCriteria": "婴儿有拒抱、哭、不高兴或惊奇等表现",
    "sourcePage": 6,
    "sourceOrder": 67,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 68,
    "itemCode": "cnbsr2016_068",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "双手扶物可站立",
    "prompt": "将婴儿置于床上，协助婴儿双手抓握栏杆，胸部不靠栏杆，呈站立姿势观察",
    "passCriteria": "双手扶栏杆支撑全身重量，保持站立位5s或以上",
    "sourcePage": 6,
    "sourceOrder": 68,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 69,
    "itemCode": "cnbsr2016_069",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "独坐自如",
    "prompt": "婴儿坐位，用玩具逗引，婴儿上身可自由转动取物，或轻轻将婴儿肩头向对侧推，观察其侧平衡",
    "passCriteria": "独坐时无须手支撑，上身可自由转动取物或侧推后回正保持平衡不倒",
    "sourcePage": 6,
    "sourceOrder": 69,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第15页"
  },
  {
    "id": 70,
    "itemCode": "cnbsr2016_070",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "拇他指捏小丸",
    "prompt": "抱坐，将一小丸放在桌上，鼓励婴儿取",
    "passCriteria": "婴儿会用拇他指捏起小丸",
    "sourcePage": 6,
    "sourceOrder": 70,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 71,
    "itemCode": "cnbsr2016_071",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "试图取第三块积木",
    "prompt": "连续出示两块积木后婴儿均能拿到，再出示第三块积木鼓励婴儿取",
    "passCriteria": "有要取第三块积木的表现，不一定能取到，前两块仍保留在手中",
    "sourcePage": 6,
    "sourceOrder": 71,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 72,
    "itemCode": "cnbsr2016_072",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "有意识地摇铃",
    "prompt": "主试者示范摇铃，鼓励婴儿照样做",
    "passCriteria": "婴儿能够有意识地摇铃",
    "sourcePage": 6,
    "sourceOrder": 72,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 73,
    "itemCode": "cnbsr2016_073",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "持续用手追逐玩具",
    "prompt": "以玩具逗引婴儿来取，将要取到时，主试者将玩具移动到稍远的地方，观察其反应",
    "passCriteria": "婴儿持续追逐玩具，力图拿到，但不一定取到",
    "sourcePage": 6,
    "sourceOrder": 73,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 74,
    "itemCode": "cnbsr2016_074",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "模仿声音",
    "prompt": "观察或询问婴儿是否会模仿咳嗽、弄舌的声音",
    "passCriteria": "观察或询问，婴儿能模仿发出类似声音",
    "sourcePage": 6,
    "sourceOrder": 74,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 75,
    "itemCode": "cnbsr2016_075",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 0.5,
    "title": "可用动作手势表达(2/3)",
    "prompt": "主试者询问家长，婴儿是否常有主动伸手表示要抱；摊开手表示没有；咂咂嘴表示好吃等动作手势",
    "passCriteria": "三问中，有两项表现即可通过",
    "sourcePage": 6,
    "sourceOrder": 75,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 76,
    "itemCode": "cnbsr2016_076",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 8,
    "ageBand": {
      "label": "8月龄",
      "minMonths": 8,
      "maxMonths": 8
    },
    "scoreWeight": 1.0,
    "title": "懂得成人面部表情",
    "prompt": "主试者或家长对婴儿训斥或赞许，观察其反应",
    "passCriteria": "婴儿表现出委屈或兴奋等反应",
    "sourcePage": 6,
    "sourceOrder": 76,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 77,
    "itemCode": "cnbsr2016_077",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "拉双手会走",
    "prompt": "站立位，主试者牵婴儿双手，牵手时不过多给力，鼓励婴儿向前行走",
    "passCriteria": "婴儿可自己用力，较协调地移动双腿，向前行走三步或以上",
    "sourcePage": 6,
    "sourceOrder": 77,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 78,
    "itemCode": "cnbsr2016_078",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "会爬",
    "prompt": "婴儿俯卧，用玩具逗引婴儿爬",
    "passCriteria": "婴儿能将腹部抬离床面，四点支撑向前爬行（膝手爬）",
    "sourcePage": 6,
    "sourceOrder": 78,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 79,
    "itemCode": "cnbsr2016_079",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "拇食指捏小丸",
    "prompt": "抱坐，将一小丸放在桌上，鼓励婴儿取",
    "passCriteria": "婴儿会用拇食指捏起小丸",
    "sourcePage": 6,
    "sourceOrder": 79,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 80,
    "itemCode": "cnbsr2016_080",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "从杯中取出积木",
    "prompt": "主试者在婴儿注视下将积木放入杯中，鼓励婴儿取出",
    "passCriteria": "婴儿能自行将积木取出，不能倒出",
    "sourcePage": 6,
    "sourceOrder": 80,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 81,
    "itemCode": "cnbsr2016_081",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "积木对敲",
    "prompt": "主试者出示两块积木，示范积木对敲后，让婴儿一手拿一块，鼓励其照样做",
    "passCriteria": "婴儿能把双手合到中线，互敲积木，对击可不十分准确",
    "sourcePage": 6,
    "sourceOrder": 81,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 82,
    "itemCode": "cnbsr2016_082",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "拨弄铃舌",
    "prompt": "主试者轻摇铜铃以引起婴儿注意，然后将铜铃递给婴儿，观察其对铜铃的反应",
    "passCriteria": "婴儿有意识寻找并拨弄或拿捏铃舌",
    "sourcePage": 6,
    "sourceOrder": 82,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 83,
    "itemCode": "cnbsr2016_083",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "会欢迎",
    "prompt": "主试者只说欢迎，不做手势示范，鼓励婴儿以手势表示",
    "passCriteria": "观察或询问，婴儿能够做出欢迎的手势",
    "sourcePage": 6,
    "sourceOrder": 83,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 84,
    "itemCode": "cnbsr2016_084",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 0.5,
    "title": "会再见",
    "prompt": "主试者只说再见，不做手势示范，鼓励婴儿以手势表示",
    "passCriteria": "观察或询问，婴儿能够做出再见的手势",
    "sourcePage": 6,
    "sourceOrder": 84,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 85,
    "itemCode": "cnbsr2016_085",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 9,
    "ageBand": {
      "label": "9月龄",
      "minMonths": 9,
      "maxMonths": 9
    },
    "scoreWeight": 1.0,
    "title": "表示不要",
    "prompt": "观察或询问婴儿对不感兴趣的物品的反应",
    "passCriteria": "观察或询问，婴儿对不要之物有摇头或推开的动作",
    "sourcePage": 6,
    "sourceOrder": 85,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 86,
    "itemCode": "cnbsr2016_086",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "保护性支撑*",
    "prompt": "主试者站立在床或桌边，由婴儿背后扶持其腋下抱起，然后快速做俯冲动作，观察婴儿反应",
    "passCriteria": "婴儿出现双手张开，向前伸臂，类似保护自己的动作",
    "sourcePage": 6,
    "sourceOrder": 86,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 87,
    "itemCode": "cnbsr2016_087",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "自己坐起",
    "prompt": "将婴儿置于俯卧位，用玩具逗引，观察婴儿能否坐起",
    "passCriteria": "无需协助，婴儿能较协调地从俯卧位坐起，并坐稳",
    "sourcePage": 6,
    "sourceOrder": 87,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 88,
    "itemCode": "cnbsr2016_088",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 1.0,
    "title": "拇食指动作熟练",
    "prompt": "抱坐，将一小丸放在桌上，鼓励婴儿取",
    "passCriteria": "婴儿会用拇食指的指端协调、熟练且迅速地对捏起小丸",
    "sourcePage": 6,
    "sourceOrder": 88,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 89,
    "itemCode": "cnbsr2016_089",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "拿掉扣积木杯玩积木",
    "prompt": "积木放在桌上，在婴儿注视下用杯子盖住积木，杯子的把手对着婴儿，鼓励婴儿取积木",
    "passCriteria": "婴儿能主动拿掉杯子，取出藏在杯子里面的积木",
    "sourcePage": 6,
    "sourceOrder": 89,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 90,
    "itemCode": "cnbsr2016_090",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "寻找盒内东西",
    "prompt": "在婴儿面前摇响装有硬币的盒，然后避开婴儿将硬币取出，给婴儿空盒，观察其反应",
    "passCriteria": "婴儿能明确地寻找盒内的硬币",
    "sourcePage": 6,
    "sourceOrder": 90,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 91,
    "itemCode": "cnbsr2016_091",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "模仿发语声",
    "prompt": "观察或询问婴儿是否会模仿“妈妈”、“爸爸”、“拿”、 “走”等语音",
    "passCriteria": "观察或询问，婴儿能模仿发语声",
    "sourcePage": 6,
    "sourceOrder": 91,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第16页"
  },
  {
    "id": 92,
    "itemCode": "cnbsr2016_092",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 0.5,
    "title": "懂得常见物及人名称",
    "prompt": "主试者问婴儿“妈妈在哪里？”“灯在哪里？”“阿姨在哪里？”等人或物的名称，观察其反应",
    "passCriteria": "婴儿会用眼睛注视或指出2种或以上的人或物",
    "sourcePage": 6,
    "sourceOrder": 92,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第17页"
  },
  {
    "id": 93,
    "itemCode": "cnbsr2016_093",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 10,
    "ageBand": {
      "label": "10月龄",
      "minMonths": 10,
      "maxMonths": 10
    },
    "scoreWeight": 1.0,
    "title": "按指令取东西",
    "prompt": "将娃娃、球和杯子并排放在婴儿双手可及的桌面上，鼓励婴儿按指令取其中的一件。（每样东西交替问两次，不能连续问）",
    "passCriteria": "婴儿能理解指令并成功拿对其中一种或一种以上物品",
    "sourcePage": 6,
    "sourceOrder": 93,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第6-7页；附录B表B.1，第17页"
  },
  {
    "id": 94,
    "itemCode": "cnbsr2016_094",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "独站片刻",
    "prompt": "将婴儿置于立位，待婴儿站稳后松开双手，观察其站立情况",
    "passCriteria": "婴儿能独自站立2s或以上",
    "sourcePage": 7,
    "sourceOrder": 94,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 95,
    "itemCode": "cnbsr2016_095",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "扶物下蹲取物",
    "prompt": "婴儿手扶围栏站立，不得倚靠。将玩具放在其脚边，鼓励婴儿下蹲取物",
    "passCriteria": "一手扶栏杆蹲下，用另一只手捡玩具，并能再站起来",
    "sourcePage": 7,
    "sourceOrder": 95,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 96,
    "itemCode": "cnbsr2016_096",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 1.0,
    "title": "积木放入杯中",
    "prompt": "主试者示范将积木放入杯中，鼓励婴儿照样做",
    "passCriteria": "婴儿能有意识地将积木放入杯中并撒开手",
    "sourcePage": 7,
    "sourceOrder": 96,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 97,
    "itemCode": "cnbsr2016_097",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "打开包积木的方巾",
    "prompt": "在婴儿注视下用方巾包起一积木，然后打开，再包上，鼓励婴儿找",
    "passCriteria": "婴儿有意识地打开包积木的方巾，寻找积木，成功将积木拿到手",
    "sourcePage": 7,
    "sourceOrder": 97,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 98,
    "itemCode": "cnbsr2016_098",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "模仿拍娃娃",
    "prompt": "主试者示范拍娃娃，鼓励婴儿照样做",
    "passCriteria": "婴儿学大人样子轻拍娃娃",
    "sourcePage": 7,
    "sourceOrder": 98,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 99,
    "itemCode": "cnbsr2016_099",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "有意识地发一个字音",
    "prompt": "观察或询问婴儿有意识的发音情况",
    "passCriteria": "观察或询问，有意识并正确地发出相应的字音，如爸、妈、拿、走、姨、奶、汪汪等",
    "sourcePage": 7,
    "sourceOrder": 99,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 100,
    "itemCode": "cnbsr2016_100",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "懂得“不”",
    "prompt": "婴儿取一玩具玩时，主试者说“不动”、“不拿”，不要做手势，观察或询问其反应",
    "passCriteria": "观察或询问，婴儿会停止拿取玩具的动作",
    "sourcePage": 7,
    "sourceOrder": 100,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 101,
    "itemCode": "cnbsr2016_101",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "会从杯中喝水",
    "prompt": "观察或询问婴儿能否从成人拿的杯子里喝到水",
    "passCriteria": "观察或询问，婴儿能从杯中喝到水",
    "sourcePage": 7,
    "sourceOrder": 101,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 102,
    "itemCode": "cnbsr2016_102",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 11,
    "ageBand": {
      "label": "11月龄",
      "minMonths": 11,
      "maxMonths": 11
    },
    "scoreWeight": 0.5,
    "title": "会摘帽子",
    "prompt": "主试者将帽子戴在婴儿头上，观察其能否摘下帽子",
    "passCriteria": "婴儿能用单手或双手摘下帽子",
    "sourcePage": 7,
    "sourceOrder": 102,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 103,
    "itemCode": "cnbsr2016_103",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "独站稳",
    "prompt": "将小儿置于立位，待小儿站稳后松开双手，观察其站立情况",
    "passCriteria": "独自站立10s或以上，允许身体轻微晃动",
    "sourcePage": 7,
    "sourceOrder": 103,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 104,
    "itemCode": "cnbsr2016_104",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "牵一手可走",
    "prompt": "主试者牵小儿一只手行走，不要用力，观察其行走情况",
    "passCriteria": "小儿自己迈步，牵一手能协调地移动双腿，至少向前迈三步以上",
    "sourcePage": 7,
    "sourceOrder": 104,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 105,
    "itemCode": "cnbsr2016_105",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "全掌握笔留笔道",
    "prompt": "主试者示范用笔在纸上画道，鼓励小儿模仿",
    "passCriteria": "小儿握笔在纸上留下笔道即可",
    "sourcePage": 7,
    "sourceOrder": 105,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 106,
    "itemCode": "cnbsr2016_106",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "试把小丸投小瓶",
    "prompt": "出示一小丸及30ml广口试剂瓶，主试者拿瓶，示范并指点将小丸放入瓶内，鼓励小儿照样做",
    "passCriteria": "小儿捏住小丸试往瓶内投放，但不一定成功",
    "sourcePage": 7,
    "sourceOrder": 106,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 107,
    "itemCode": "cnbsr2016_107",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 1.0,
    "title": "盖瓶盖",
    "prompt": "瓶盖翻放在桌上，主试者示范将瓶盖盖在瓶上，鼓励小儿照样做",
    "passCriteria": "小儿会将瓶盖翻正后盖在瓶上",
    "sourcePage": 7,
    "sourceOrder": 107,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 108,
    "itemCode": "cnbsr2016_108",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "叫爸爸妈妈有所指",
    "prompt": "观察或询问小儿见到妈妈、爸爸时，是否会有意识并准确地叫出",
    "passCriteria": "小儿会主动地称呼爸爸或妈妈",
    "sourcePage": 7,
    "sourceOrder": 108,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 109,
    "itemCode": "cnbsr2016_109",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "向他/她要东西知道给",
    "prompt": "将一玩具放入小儿手中，然后主试者或家长对小儿说“把某某东西给我”，不要伸手去拿，观察小儿反应",
    "passCriteria": "经要求，小儿把玩具主动递给主试者或家长，并主动松手",
    "sourcePage": 7,
    "sourceOrder": 109,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 110,
    "itemCode": "cnbsr2016_110",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "穿衣知配合",
    "prompt": "观察或询问成人给小儿穿衣时的配合情况",
    "passCriteria": "穿衣时小儿合作，会有伸手、伸腿等配合动作，不一定穿进去",
    "sourcePage": 7,
    "sourceOrder": 110,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第17页"
  },
  {
    "id": 111,
    "itemCode": "cnbsr2016_111",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 12,
    "ageBand": {
      "label": "12月龄",
      "minMonths": 12,
      "maxMonths": 12
    },
    "scoreWeight": 0.5,
    "title": "共同注意",
    "prompt": "观察或询问，对家长指示的某一场景或过程，小儿能否与家长一起关注",
    "passCriteria": "小儿有共同注意过程",
    "sourcePage": 7,
    "sourceOrder": 111,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 112,
    "itemCode": "cnbsr2016_112",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 3.0,
    "title": "独走自如",
    "prompt": "观察小儿走路的情况",
    "passCriteria": "小儿行走自如，不左右摇摆，会控制步速，不惯性前冲",
    "sourcePage": 7,
    "sourceOrder": 112,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 113,
    "itemCode": "cnbsr2016_113",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "自发乱画",
    "prompt": "主试者出示纸和笔，鼓励小儿画画",
    "passCriteria": "小儿能用笔在纸上自行乱画",
    "sourcePage": 7,
    "sourceOrder": 113,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 114,
    "itemCode": "cnbsr2016_114",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "从瓶中拿到小丸",
    "prompt": "出示装有小丸的30ml广口试剂瓶，递给小儿，说“阿姨想要豆豆（小丸）怎么办？”或“把豆豆给妈妈”。鼓励小儿将小丸取出，但不能说倒出",
    "passCriteria": "小儿能将小丸拿出或倒出",
    "sourcePage": 7,
    "sourceOrder": 114,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 115,
    "itemCode": "cnbsr2016_115",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "翻书两次",
    "prompt": "主试者示范翻书，鼓励小儿照样做",
    "passCriteria": "做出翻书动作两次或以上",
    "sourcePage": 7,
    "sourceOrder": 115,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 116,
    "itemCode": "cnbsr2016_116",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "盖上圆盒",
    "prompt": "主试者示范将圆盒盖好，鼓励小儿照样做",
    "passCriteria": "小儿会将圆盒盖上，并盖严",
    "sourcePage": 7,
    "sourceOrder": 116,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 117,
    "itemCode": "cnbsr2016_117",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "会指眼耳口鼻手",
    "prompt": "主试者问小儿“眼在哪儿？”“耳在哪儿？”“鼻子在哪儿？”等，观察其反应",
    "passCriteria": "能正确指出3个或3个以上身体部位",
    "sourcePage": 7,
    "sourceOrder": 117,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 118,
    "itemCode": "cnbsr2016_118",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 1.5,
    "title": "说3～5个字",
    "prompt": "观察或询问小儿有意识讲话的情况",
    "passCriteria": "有意识地说3～5个字（妈、爸除外）",
    "sourcePage": 7,
    "sourceOrder": 118,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 119,
    "itemCode": "cnbsr2016_119",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 15,
    "ageBand": {
      "label": "15月龄",
      "minMonths": 15,
      "maxMonths": 15
    },
    "scoreWeight": 3.0,
    "title": "会脱袜子",
    "prompt": "观察或询问小儿脱袜子的方法",
    "passCriteria": "观察或询问，小儿能正确且有意识地脱下袜子",
    "sourcePage": 7,
    "sourceOrder": 119,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 120,
    "itemCode": "cnbsr2016_120",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 3.0,
    "title": "扔球无方向",
    "prompt": "主试者示范过肩扔球，鼓励小儿照样做",
    "passCriteria": "小儿举手过肩扔球，可无方向",
    "sourcePage": 7,
    "sourceOrder": 120,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 121,
    "itemCode": "cnbsr2016_121",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 3.0,
    "title": "模仿画道道",
    "prompt": "主试者示范用蜡笔画出一无方向道道，鼓励小儿模仿",
    "passCriteria": "小儿能画出道道，起止自如，方向不限",
    "sourcePage": 7,
    "sourceOrder": 121,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 122,
    "itemCode": "cnbsr2016_122",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "积木搭高四块",
    "prompt": "示范搭高两块积木，推倒后一块一块出示积木，鼓励小儿搭高",
    "passCriteria": "小儿搭高四块积木或以上，三试一成",
    "sourcePage": 7,
    "sourceOrder": 122,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 123,
    "itemCode": "cnbsr2016_123",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "正放圆积木入型板",
    "prompt": "在型板圆孔下方放一圆积木，圆孔靠近小儿身体。主试者对小儿说“这是小朋友的家（指型板面而不是圆孔），请帮这个小朋友（指圆积木）找到自己的家”，不示范",
    "passCriteria": "不经指点，能正确将圆积木一次性放入孔内",
    "sourcePage": 7,
    "sourceOrder": 123,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 124,
    "itemCode": "cnbsr2016_124",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "懂得三个投向",
    "prompt": "请小儿把三块积木分别递给妈妈、阿姨、放在桌子上，妈妈阿姨不能伸手要",
    "passCriteria": "小儿会正确地将积木送到要求的地方",
    "sourcePage": 7,
    "sourceOrder": 124,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 125,
    "itemCode": "cnbsr2016_125",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "说十个字词",
    "prompt": "观察或询问小儿有意识讲话的情况并记录",
    "passCriteria": "有意识说10个或以上单字或词（爸、妈除外）",
    "sourcePage": 7,
    "sourceOrder": 125,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 126,
    "itemCode": "cnbsr2016_126",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "白天能控制大小便",
    "prompt": "观察或询问小儿大小便控制情况，或询问白天是否尿湿裤子",
    "passCriteria": "经人提醒或主动示意大小便，白天基本不尿湿裤子",
    "sourcePage": 7,
    "sourceOrder": 126,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 127,
    "itemCode": "cnbsr2016_127",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 18,
    "ageBand": {
      "label": "18月龄",
      "minMonths": 18,
      "maxMonths": 18
    },
    "scoreWeight": 1.5,
    "title": "会用匙",
    "prompt": "观察或询问小儿是否会自己用匙",
    "passCriteria": "小儿能自己用匙吃饭，允许少量遗洒",
    "sourcePage": 7,
    "sourceOrder": 127,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 128,
    "itemCode": "cnbsr2016_128",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "脚尖走",
    "prompt": "主试者示范用脚尖行走，鼓励小儿照样做",
    "passCriteria": "小儿能用脚尖连续行走三步以上，脚跟不得着地",
    "sourcePage": 7,
    "sourceOrder": 128,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 129,
    "itemCode": "cnbsr2016_129",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "扶楼梯上楼",
    "prompt": "在楼梯上放一玩具，鼓励小儿上楼去取",
    "passCriteria": "小儿能扶楼梯扶手，熟练地上三阶以上台阶。",
    "sourcePage": 7,
    "sourceOrder": 129,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 130,
    "itemCode": "cnbsr2016_130",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "水晶线穿扣眼",
    "prompt": "主试者示范用水晶线穿过扣眼，鼓励小儿照样做",
    "passCriteria": "小儿能将水晶线穿过扣眼 0.5cm以上",
    "sourcePage": 7,
    "sourceOrder": 130,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第18页"
  },
  {
    "id": 131,
    "itemCode": "cnbsr2016_131",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "模仿拉拉锁",
    "prompt": "示范拉拉锁，拉上、拉下各一次。主试者固定拉锁两端，鼓励小儿照样做",
    "passCriteria": "小儿能双手配合将锁头来回移动，超过全拉锁的一半",
    "sourcePage": 7,
    "sourceOrder": 131,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 132,
    "itemCode": "cnbsr2016_132",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "积木搭高7～8块",
    "prompt": "示范搭高两块积木，推倒后一块一块出示积木，鼓励小儿搭高",
    "passCriteria": "小儿搭高7～8块积木，三试一成",
    "sourcePage": 7,
    "sourceOrder": 132,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 133,
    "itemCode": "cnbsr2016_133",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "知道红色",
    "prompt": "出示红、黄、蓝、绿四色图片，问小儿“哪个是红色？”",
    "passCriteria": "小儿能在四色图片中正确指出红色",
    "sourcePage": 7,
    "sourceOrder": 133,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 134,
    "itemCode": "cnbsr2016_134",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "回答简单问题",
    "prompt": "主试者问“这是什么（球）？”“那是谁（带小儿者）？” “爸爸干什么去了（上班）？”",
    "passCriteria": "小儿均能正确回答",
    "sourcePage": 7,
    "sourceOrder": 134,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 135,
    "itemCode": "cnbsr2016_135",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "说3～5个字的句子",
    "prompt": "观察或询问小儿有意识说话的情况",
    "passCriteria": "小儿能有意识地说出3～5个字的句子，有主谓语",
    "sourcePage": 7,
    "sourceOrder": 135,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 136,
    "itemCode": "cnbsr2016_136",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "能表示个人需要",
    "prompt": "观察或询问小儿是否会明确表示自己的需要",
    "passCriteria": "小儿会说出三种或以上的需要，如“吃饭、喝水、玩汽车、上街”等，可伴手势",
    "sourcePage": 7,
    "sourceOrder": 136,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 137,
    "itemCode": "cnbsr2016_137",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 21,
    "ageBand": {
      "label": "21月龄",
      "minMonths": 21,
      "maxMonths": 21
    },
    "scoreWeight": 1.5,
    "title": "想象性游戏",
    "prompt": "观察或询问小儿是否有想象性游戏，如假装给娃娃或动物玩具喂饭、盖被子、打针等",
    "passCriteria": "小儿有想象性游戏",
    "sourcePage": 7,
    "sourceOrder": 137,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 138,
    "itemCode": "cnbsr2016_138",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 3.0,
    "title": "双足跳离地面",
    "prompt": "主试者示范双足同时离地跳起，鼓励小儿照样做",
    "passCriteria": "小儿会双足同时跳离地面，同时落地，两次以上",
    "sourcePage": 7,
    "sourceOrder": 138,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 139,
    "itemCode": "cnbsr2016_139",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 3.0,
    "title": "穿过扣眼后拉线",
    "prompt": "主试者示范用水晶线穿过扣眼，并将线拉出，鼓励小儿照样做",
    "passCriteria": "小儿能将水晶线穿过扣眼，并能将线拉出",
    "sourcePage": 7,
    "sourceOrder": 139,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 140,
    "itemCode": "cnbsr2016_140",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "一页页翻书",
    "prompt": "主试者示范一页页翻书，鼓励小儿照样做",
    "passCriteria": "小儿会用手捻书页，每次一页，连续翻书三页或以上",
    "sourcePage": 7,
    "sourceOrder": 140,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 141,
    "itemCode": "cnbsr2016_141",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "倒放圆积木入型板",
    "prompt": "在小儿能正放圆积木入型板的基础上，将型板倒转 180°。圆积木仍在原处，主试者对小儿说“这是小朋友的家（指型板），请帮这个小朋友（指圆积木）找到自己的家”，不示范",
    "passCriteria": "型板倒转后，小儿能正确将圆积木一次性放入圆孔内",
    "sourcePage": 7,
    "sourceOrder": 141,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 142,
    "itemCode": "cnbsr2016_142",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "说两句以上诗或儿歌",
    "prompt": "鼓励小儿说唐诗或儿歌",
    "passCriteria": "小儿能自发或稍经提示开头后完整说出两句或以上唐诗或儿歌",
    "sourcePage": 7,
    "sourceOrder": 142,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 143,
    "itemCode": "cnbsr2016_143",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "说常见物用途（碗笔凳球）",
    "prompt": "",
    "passCriteria": "小儿会说出三种或以上物品的用途",
    "sourcePage": 7,
    "sourceOrder": 143,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 144,
    "itemCode": "cnbsr2016_144",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "会打招呼",
    "prompt": "示范或不示范小儿见人打招呼",
    "passCriteria": "小儿会自发或模仿说“你好”、 “再见”等",
    "sourcePage": 7,
    "sourceOrder": 144,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 145,
    "itemCode": "cnbsr2016_145",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 24,
    "ageBand": {
      "label": "24月龄",
      "minMonths": 24,
      "maxMonths": 24
    },
    "scoreWeight": 1.5,
    "title": "问“这是什么？”",
    "prompt": "观察或询问，小儿在见到某物时，是否能自发提问“这是什么？”",
    "passCriteria": "小儿会自发提出问题，主动问“这是什么？”",
    "sourcePage": 7,
    "sourceOrder": 145,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 146,
    "itemCode": "cnbsr2016_146",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "独自上楼",
    "prompt": "鼓励小儿不扶扶手上楼梯，可示范",
    "passCriteria": "不扶扶手，稳定地上楼梯三阶或以上",
    "sourcePage": 7,
    "sourceOrder": 146,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 147,
    "itemCode": "cnbsr2016_147",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "独自下楼",
    "prompt": "鼓励小儿不扶扶手下楼梯，可示范",
    "passCriteria": "不扶扶手，稳定地下楼梯三阶或以上",
    "sourcePage": 7,
    "sourceOrder": 147,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 148,
    "itemCode": "cnbsr2016_148",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "模仿画竖道",
    "prompt": "主试者与小儿同向，示范画一垂直线，注意测查纸张放正，鼓励小儿模仿",
    "passCriteria": "小儿能画竖线，长度＞2.5cm，所画线与垂直线的夹角应 ＜30°",
    "sourcePage": 7,
    "sourceOrder": 148,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 149,
    "itemCode": "cnbsr2016_149",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "对拉锁",
    "prompt": "出示打开的拉锁，示范将拉锁对好，鼓励小儿照样做",
    "passCriteria": "小儿能将拉锁头部分或全部插进锁孔",
    "sourcePage": 7,
    "sourceOrder": 149,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 150,
    "itemCode": "cnbsr2016_150",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "认识大小",
    "prompt": "主试者向小儿出示大小圆片，请小儿把大的给妈妈或阿姨",
    "passCriteria": "小儿会正确把大的给妈妈或阿姨，三试二成",
    "sourcePage": 7,
    "sourceOrder": 150,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第19页"
  },
  {
    "id": 151,
    "itemCode": "cnbsr2016_151",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "正放型板",
    "prompt": "将圆、方、三角形三块积木放在与型板相应的孔旁，主试者对小儿说“这是小朋友的家（指型板），请帮这些小朋友（指三块积木）找到自己的家”，不示范。放置三角型积木方向要与型板一致",
    "passCriteria": "小儿能一次性正确放入相应孔内，仅等腰三角形可提示",
    "sourcePage": 7,
    "sourceOrder": 151,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 152,
    "itemCode": "cnbsr2016_152",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "说7～10个字的句子",
    "prompt": "主试者说一句话“星期天妈妈带我去公园”，可重复一遍，鼓励小儿复述",
    "passCriteria": "小儿能复述出7个字及以上，不影响句意表达",
    "sourcePage": 7,
    "sourceOrder": 152,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 153,
    "itemCode": "cnbsr2016_153",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "理解指令",
    "prompt": "主试者对小儿说“请举举你的手”和“请抬抬你的脚”，可重复指令一遍，但不能有示范的动作，观察小儿反应",
    "passCriteria": "小儿能按指令做出举手或抬脚动作",
    "sourcePage": 7,
    "sourceOrder": 153,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 154,
    "itemCode": "cnbsr2016_154",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "脱单衣或裤",
    "prompt": "观察或询问小儿是否会自己脱上衣或裤子",
    "passCriteria": "小儿不用帮忙，自己脱掉单衣或单裤",
    "sourcePage": 7,
    "sourceOrder": 154,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 155,
    "itemCode": "cnbsr2016_155",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 27,
    "ageBand": {
      "label": "27月龄",
      "minMonths": 27,
      "maxMonths": 27
    },
    "scoreWeight": 1.5,
    "title": "开始有是非观念",
    "prompt": "主试者问小儿“打人对不对？”，观察小儿的反应或回答",
    "passCriteria": "小儿摇头或说出不对",
    "sourcePage": 7,
    "sourceOrder": 155,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 156,
    "itemCode": "cnbsr2016_156",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 3.0,
    "title": "独脚站2s",
    "prompt": "主试者示范用独脚站立，鼓励小儿照样做",
    "passCriteria": "小儿不扶任何物体可单脚站立2s或以上",
    "sourcePage": 7,
    "sourceOrder": 156,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 157,
    "itemCode": "cnbsr2016_157",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "穿扣子3～5个",
    "prompt": "主试者示范连续穿扣3～5个，鼓励小儿照样做",
    "passCriteria": "小儿能较熟练穿扣并拉过线3 个或以上",
    "sourcePage": 7,
    "sourceOrder": 157,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 158,
    "itemCode": "cnbsr2016_158",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "模仿搭桥",
    "prompt": "示范用下面二块，上面一块共三块积木搭成有孔的桥，并保留模型，鼓励小儿照样做。主试者不得提示桥孔",
    "passCriteria": "小儿能搭出有孔的桥",
    "sourcePage": 7,
    "sourceOrder": 158,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 159,
    "itemCode": "cnbsr2016_159",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "知道1与许多",
    "prompt": "一块和数块积木分放两边，请小儿指出哪边是多的，再指另一边问“这是几个？”",
    "passCriteria": "小儿先正确指出哪一边多，后回答“是1个”",
    "sourcePage": 7,
    "sourceOrder": 159,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 160,
    "itemCode": "cnbsr2016_160",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "倒放型板",
    "prompt": "在小儿正放三块积木入型板的基础上，将型板倒转 180°，三块积木仍在原处，主试者对小儿说“这是小朋友的家（指型板），请帮这些小朋友（指三块积木）找到自己的家”，不示范",
    "passCriteria": "小儿能一次性正确放入翻转后型板的相应孔内，仅等腰三角形可提示",
    "sourcePage": 7,
    "sourceOrder": 160,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 161,
    "itemCode": "cnbsr2016_161",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "说出图片10样",
    "prompt": "出示图片，依次指给小儿看，鼓励其说出图片名称",
    "passCriteria": "小儿能正确说出10样及以上。记录1.北极熊2.树叶3.小鸡 4.青蛙5.螳螂6.猕猴桃7.树 8.房子9.雨伞10.壶11.铅笔 12.钥匙13.打印机14.刀15. 电脑16.管钳17.轮船18.毛笔和砚台19.国旗20.脚21.嘴唇",
    "sourcePage": 7,
    "sourceOrder": 161,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 162,
    "itemCode": "cnbsr2016_162",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "说自己名字",
    "prompt": "主试者问小儿“你叫什么名字？”",
    "passCriteria": "22.步枪23.雪花24中国结小儿能正确回答自己的大名",
    "sourcePage": 7,
    "sourceOrder": 162,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 163,
    "itemCode": "cnbsr2016_163",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "来回倒水不洒",
    "prompt": "在一个无把儿的杯中注入1/3杯水，主试者示范将水倒入另一杯中，来回各倒一次，鼓励小儿照样做",
    "passCriteria": "小儿会将水来回倒两次，不洒水",
    "sourcePage": 7,
    "sourceOrder": 163,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 164,
    "itemCode": "cnbsr2016_164",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 30,
    "ageBand": {
      "label": "30月龄",
      "minMonths": 30,
      "maxMonths": 30
    },
    "scoreWeight": 1.5,
    "title": "女孩扔果皮",
    "prompt": "出示图片，问小儿“乱扔垃圾是不对的，你看这个小女孩吃完的果皮应该扔哪儿？”，鼓励小儿回答",
    "passCriteria": "小儿能正确回答或指出应该扔垃圾筐",
    "sourcePage": 7,
    "sourceOrder": 164,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 165,
    "itemCode": "cnbsr2016_165",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 3.0,
    "title": "立定跳远",
    "prompt": "主试者示范跳过16开白纸（20cm宽），鼓励小儿照样做",
    "passCriteria": "小儿双足同时离地跳起跃过纸，不得踩到纸",
    "sourcePage": 7,
    "sourceOrder": 165,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 166,
    "itemCode": "cnbsr2016_166",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "模仿画圆",
    "prompt": "主试者示范画一圆形，鼓励小儿模仿",
    "passCriteria": "小儿所画圆二头相交，为闭合圆形，不能明显成角",
    "sourcePage": 7,
    "sourceOrder": 166,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 167,
    "itemCode": "cnbsr2016_167",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "拉拉锁",
    "prompt": "出示打开的拉锁，示范将拉锁对好并拉上，鼓励小儿照样做",
    "passCriteria": "小儿能将拉锁头全部插进锁孔，并有拉的意识",
    "sourcePage": 7,
    "sourceOrder": 167,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第20页"
  },
  {
    "id": 168,
    "itemCode": "cnbsr2016_168",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "积木搭高10块",
    "prompt": "示范搭高二块积木，推倒后一块一块出示积木，鼓励小儿搭高。允许试三次",
    "passCriteria": "小儿能搭高积木10块。三试一成",
    "sourcePage": 7,
    "sourceOrder": 168,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 169,
    "itemCode": "cnbsr2016_169",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "连续执行三个命令",
    "prompt": "嘱小儿做三件事擦桌子、摇铃、把门打开，可再重复命令一遍。小儿开始做后，不能再提醒或给予暗示",
    "passCriteria": "小儿会做每件事情，没有遗忘任何一项，但顺序可颠倒",
    "sourcePage": 7,
    "sourceOrder": 169,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 170,
    "itemCode": "cnbsr2016_170",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "说出性别",
    "prompt": "主试者问小儿性别，若是女孩问“你是女孩还是男孩？”；若是男孩问“你是男孩还是女孩？”",
    "passCriteria": "小儿能正确说出自己的性别",
    "sourcePage": 7,
    "sourceOrder": 170,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 171,
    "itemCode": "cnbsr2016_171",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "分清“里”“外”",
    "prompt": "主试者将一小丸放入30毫升广口试剂瓶内问“小丸是在瓶里？还是在瓶外？”",
    "passCriteria": "小儿会正确说出是在里边",
    "sourcePage": 7,
    "sourceOrder": 171,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 172,
    "itemCode": "cnbsr2016_172",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "会穿鞋",
    "prompt": "主试者将小儿鞋脱下，鞋尖对着小儿，鼓励其穿上",
    "passCriteria": "小儿会穿进鞋并将鞋提上，不要求分左右",
    "sourcePage": 7,
    "sourceOrder": 172,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 173,
    "itemCode": "cnbsr2016_173",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 33,
    "ageBand": {
      "label": "33月龄",
      "minMonths": 33,
      "maxMonths": 33
    },
    "scoreWeight": 1.5,
    "title": "解扣子",
    "prompt": "出示娃娃，鼓励小儿解扣子，主试者应辅助小儿固定娃娃衣服",
    "passCriteria": "小儿会自己解开某一个扣子",
    "sourcePage": 7,
    "sourceOrder": 173,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 174,
    "itemCode": "cnbsr2016_174",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 3.0,
    "title": "双脚交替跳",
    "prompt": "主试者示范以高抬腿姿势原地交替跳起，鼓励小儿照样做",
    "passCriteria": "小儿可双足交替跳起，双脚离地5cm",
    "sourcePage": 7,
    "sourceOrder": 174,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 175,
    "itemCode": "cnbsr2016_175",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "模仿画交叉线",
    "prompt": "主试者与小儿同向示范画交叉线，鼓励小儿模仿",
    "passCriteria": "小儿能画出两直线并相交成角，直线线条较连续",
    "sourcePage": 7,
    "sourceOrder": 175,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 176,
    "itemCode": "cnbsr2016_176",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "会拧螺丝",
    "prompt": "主试者出示螺丝、螺母，嘱其拧上。如小儿不会，可示范",
    "passCriteria": "小儿能双手配合将螺丝、螺母组装起来",
    "sourcePage": 7,
    "sourceOrder": 176,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 177,
    "itemCode": "cnbsr2016_177",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "懂得“3”",
    "prompt": "主试者出示三块积木，问小儿“这是几块？”",
    "passCriteria": "小儿能正确说出“三块”",
    "sourcePage": 7,
    "sourceOrder": 177,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 178,
    "itemCode": "cnbsr2016_178",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "认识两种颜色",
    "prompt": "出示红、黄、蓝、绿四色图片，先从非红色开始问，避免顺口溜出，请小儿说出各为何种颜色",
    "passCriteria": "能正确说出两种或以上颜色小儿能正确说出14样及以上。",
    "sourcePage": 7,
    "sourceOrder": 178,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 179,
    "itemCode": "cnbsr2016_179",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "说出图片14样",
    "prompt": "出示图片，依次指给小儿看，鼓励其说出图片名称",
    "passCriteria": "记录1.北极熊2.树叶3.小鸡 4.青蛙5.螳螂6.猕猴桃7.树 8.房子9.雨伞10.壶11.铅笔 12.钥匙13.打印机14.刀15. 电脑16.管钳17.轮船18.毛笔和砚台19.国旗20.脚21.嘴唇",
    "sourcePage": 7,
    "sourceOrder": 179,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 180,
    "itemCode": "cnbsr2016_180",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "发音基本清楚",
    "prompt": "观察小儿在说话时的发音情况",
    "passCriteria": "22.步枪23.雪花24中国结小儿会发清楚大多数语音，不影响交流",
    "sourcePage": 7,
    "sourceOrder": 180,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 181,
    "itemCode": "cnbsr2016_181",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "懂得“饿了、冷了、累了”",
    "prompt": "主试者依次问“饿了怎么办？冷了怎么办？累了怎么办？”",
    "passCriteria": "小儿能正确回答两问或以上吃饭、穿衣、休息等",
    "sourcePage": 7,
    "sourceOrder": 181,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 182,
    "itemCode": "cnbsr2016_182",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 36,
    "ageBand": {
      "label": "36月龄",
      "minMonths": 36,
      "maxMonths": 36
    },
    "scoreWeight": 1.5,
    "title": "扣扣子",
    "prompt": "出示娃娃，鼓励小儿扣扣子，主试者应辅助小儿固定娃娃衣服",
    "passCriteria": "小儿能自己扣上娃娃的某一个扣子",
    "sourcePage": 7,
    "sourceOrder": 182,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第7页；附录B表B.1，第21页"
  },
  {
    "id": 183,
    "itemCode": "cnbsr2016_183",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "交替上楼",
    "prompt": "主试者示范不扶扶手，双足交替上楼，鼓励小儿照样做",
    "passCriteria": "小儿上台阶交替用脚，一步一台阶，可交替上楼三阶或以上",
    "sourcePage": 8,
    "sourceOrder": 183,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第21页"
  },
  {
    "id": 184,
    "itemCode": "cnbsr2016_184",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "并足从楼梯末级跳下",
    "prompt": "主试者示范站在楼梯末级，双足并拢跳至地面，鼓励小儿照样做",
    "passCriteria": "小儿双足并拢跳至地面，双足落地后两脚间距离小于10cm",
    "sourcePage": 8,
    "sourceOrder": 184,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第21页"
  },
  {
    "id": 185,
    "itemCode": "cnbsr2016_185",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "拼圆形、正方形",
    "prompt": "主试者让小儿用4块塑料板拼圆形，用2块等边三角形板拼正方形，共限时2min",
    "passCriteria": "两个图形均要拼对",
    "sourcePage": 8,
    "sourceOrder": 185,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 186,
    "itemCode": "cnbsr2016_186",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "会用剪刀",
    "prompt": "主试者示范用打印纸剪一直线，鼓励小儿照样做",
    "passCriteria": "小儿能够剪出直线，长度大于 10cm，与主剪方向角度小于 15°",
    "sourcePage": 8,
    "sourceOrder": 186,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 187,
    "itemCode": "cnbsr2016_187",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "懂得“5”",
    "prompt": "主试者出示五块积木，问小儿“这是几块？”",
    "passCriteria": "小儿能正确说出“五块”",
    "sourcePage": 8,
    "sourceOrder": 187,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 188,
    "itemCode": "cnbsr2016_188",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "认识四种颜色",
    "prompt": "主试者出示红、黄、蓝、绿四色图片，先从非红色开始问，避免顺口溜出，请小儿说出各为何种颜色",
    "passCriteria": "四种颜色全部答对",
    "sourcePage": 8,
    "sourceOrder": 188,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 189,
    "itemCode": "cnbsr2016_189",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "会说反义词",
    "prompt": "主试者分别问（1）火是热的，冰呢？（2）大象的鼻子是长的，小兔的尾巴呢？（3）头发是黑的，牙齿呢？（4）木头是硬的，棉花呢？",
    "passCriteria": "四题中答对两个或以上",
    "sourcePage": 8,
    "sourceOrder": 189,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 190,
    "itemCode": "cnbsr2016_190",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "说出图形（△○□）",
    "prompt": "主试者依次出示积木△〇□，问小儿“这是什么形状？”",
    "passCriteria": "小儿能正确回答三个图形的名称",
    "sourcePage": 8,
    "sourceOrder": 190,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 191,
    "itemCode": "cnbsr2016_191",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "会穿上衣",
    "prompt": "观察小儿是否会穿上衣",
    "passCriteria": "小儿无需大人帮忙，会穿上衣并将扣子扣好或拉锁拉好",
    "sourcePage": 8,
    "sourceOrder": 191,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 192,
    "itemCode": "cnbsr2016_192",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 42,
    "ageBand": {
      "label": "42月龄",
      "minMonths": 42,
      "maxMonths": 42
    },
    "scoreWeight": 3.0,
    "title": "吃饭之前为什么要洗手？",
    "prompt": "主试者问小儿“吃饭之前为什么要洗手”？",
    "passCriteria": "小儿能回答出原因“为避免生病”等",
    "sourcePage": 8,
    "sourceOrder": 192,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 193,
    "itemCode": "cnbsr2016_193",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "独脚站5s",
    "prompt": "主试者示范用独脚站立，鼓励小儿照样做",
    "passCriteria": "小儿独脚站立5s或以上，身体稳定",
    "sourcePage": 8,
    "sourceOrder": 193,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 194,
    "itemCode": "cnbsr2016_194",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "并足从楼梯末级跳下稳",
    "prompt": "主试者示范站在楼梯末级，双足并拢跳至地面，鼓励小儿照样做",
    "passCriteria": "小儿双足并拢跳至地面，双足落地后两脚间距离小于5cm，并站稳",
    "sourcePage": 8,
    "sourceOrder": 194,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 195,
    "itemCode": "cnbsr2016_195",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "模仿画方形",
    "prompt": "主试者示范画一正方形，鼓励小儿模仿",
    "passCriteria": "小儿能基本模仿画出，所画图形允许稍有倾斜，有一个角可以＜45°",
    "sourcePage": 8,
    "sourceOrder": 195,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 196,
    "itemCode": "cnbsr2016_196",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "照图组装螺丝",
    "prompt": "主试者出示组装好的螺丝图片5s后收起，将分开的螺丝、平垫和螺母交给小儿，请小儿凭记忆组装。主试者可针对落下的零件提示“还有呢？”",
    "passCriteria": "小儿无需提示或稍经提示后自行将螺丝、平垫、螺母按顺序组装起来",
    "sourcePage": 8,
    "sourceOrder": 196,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 197,
    "itemCode": "cnbsr2016_197",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "找不同（3个）",
    "prompt": "出示找不同图画，主试者问小儿两张图画有什么不同之处？小熊示教，限时2min",
    "passCriteria": "能找到包括示教内容的3处不同或以上",
    "sourcePage": 8,
    "sourceOrder": 197,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 198,
    "itemCode": "cnbsr2016_198",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "图画补缺（3/6）",
    "prompt": "出示补缺图片，主试者问小儿各图中缺什么？第一幅图示教",
    "passCriteria": "要求说对包括示教内容的三幅图或以上",
    "sourcePage": 8,
    "sourceOrder": 198,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 199,
    "itemCode": "cnbsr2016_199",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "模仿说复合句",
    "prompt": "主试者说一句话“妈妈叫我一定不要和小朋友打架”，可重复一遍，鼓励小儿复述",
    "passCriteria": "小儿能够复述较完整的复合句，偶尔漏字/错字",
    "sourcePage": 8,
    "sourceOrder": 199,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 200,
    "itemCode": "cnbsr2016_200",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "锅、手机、眼睛的用途",
    "prompt": "主试者问（1）锅是做什么用的？（2）手机是干什么用的？（3）眼睛有什么作用？",
    "passCriteria": "三问均正确。",
    "sourcePage": 8,
    "sourceOrder": 200,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 201,
    "itemCode": "cnbsr2016_201",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "会做集体游戏",
    "prompt": "观察或询问小儿能否做集体游戏",
    "passCriteria": "小儿能主动参加集体游戏，并能遵守游戏规则",
    "sourcePage": 8,
    "sourceOrder": 201,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 202,
    "itemCode": "cnbsr2016_202",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 48,
    "ageBand": {
      "label": "48月龄",
      "minMonths": 48,
      "maxMonths": 48
    },
    "scoreWeight": 3.0,
    "title": "分辨男女厕所",
    "prompt": "出示男女厕所标识图片，问小儿应该进哪个厕所，并提问“为什么”",
    "passCriteria": "小儿能正确识别标志并用语言表达出性别意义",
    "sourcePage": 8,
    "sourceOrder": 202,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第22页"
  },
  {
    "id": 203,
    "itemCode": "cnbsr2016_203",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "独脚站10s",
    "prompt": "主试者示范用独脚站立，鼓励小儿照样做",
    "passCriteria": "小儿独脚站立10s或以上，身体稳定",
    "sourcePage": 8,
    "sourceOrder": 203,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 204,
    "itemCode": "cnbsr2016_204",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "足尖对足跟向前走2m",
    "prompt": "主试者示范，脚跟对脚尖向前走直线，鼓励小儿照样做",
    "passCriteria": "小儿能脚跟对脚尖向前走2m（六步），允许身体有小幅晃动",
    "sourcePage": 8,
    "sourceOrder": 204,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 205,
    "itemCode": "cnbsr2016_205",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "折纸边角整齐",
    "prompt": "主试者示范用一长方形纸横竖对齐各折一次，鼓励小儿照样做",
    "passCriteria": "小儿折纸基本成长方形，折纸边差距 ＜ 1cm ，纸边夹角 ＜ 15°",
    "sourcePage": 8,
    "sourceOrder": 205,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 206,
    "itemCode": "cnbsr2016_206",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "筷子夹花生米",
    "prompt": "主试者鼓励小儿用筷子夹花生米，从桌子上夹到盒子里，连做三遍",
    "passCriteria": "小儿熟练地夹起三次以上，过程中无掉落",
    "sourcePage": 8,
    "sourceOrder": 206,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 207,
    "itemCode": "cnbsr2016_207",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "类同",
    "prompt": "主试者给小儿一个圆形扣子，然后出示第一组模板（包括圆型、方型、三角型），问“你手里的东西和我这些东西哪些是一类的？为什么？”然后收起，再出示第二组模版（包括方型钮扣、三角型、方型），提问同上",
    "passCriteria": "两问均答对",
    "sourcePage": 8,
    "sourceOrder": 207,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 208,
    "itemCode": "cnbsr2016_208",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "图画补缺（4/6）",
    "prompt": "出示补缺图片，主试者问小儿各图中缺什么？第一幅图示教",
    "passCriteria": "要求说对包括示教内容的四幅图或以上",
    "sourcePage": 8,
    "sourceOrder": 208,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 209,
    "itemCode": "cnbsr2016_209",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "会漱口",
    "prompt": "观察小儿是否会漱口",
    "passCriteria": "小儿能灵活左右漱口并将水吐出",
    "sourcePage": 8,
    "sourceOrder": 209,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 210,
    "itemCode": "cnbsr2016_210",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "会认识数字",
    "prompt": "主试者出示图片，随意指出10以内数字，让小儿认",
    "passCriteria": "小儿全部正确答出",
    "sourcePage": 8,
    "sourceOrder": 210,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 211,
    "itemCode": "cnbsr2016_211",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "懂得上午、下午",
    "prompt": "如在上午测试，主试者问（1）现在是上午还是下午？（2）太阳落山是在下午还是上午？如在下午测试，则主试者问（1）现在是下午还是上午？（2）太阳升起是在上午还是下午？",
    "passCriteria": "两问均回答正确",
    "sourcePage": 8,
    "sourceOrder": 211,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 212,
    "itemCode": "cnbsr2016_212",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 54,
    "ageBand": {
      "label": "54月龄",
      "minMonths": 54,
      "maxMonths": 54
    },
    "scoreWeight": 3.0,
    "title": "数手指",
    "prompt": "主试者问小儿一只手有几个手指，如答对，再问两只手有几个手指",
    "passCriteria": "小儿会心算出两手有十个手指",
    "sourcePage": 8,
    "sourceOrder": 212,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 213,
    "itemCode": "cnbsr2016_213",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "单脚跳",
    "prompt": "主试者示范原地单脚跳，鼓励小儿照样做",
    "passCriteria": "小儿能单脚连续跳 3 次或以上，可伸开双臂保持平衡，允许小儿在一脚范围内跳动",
    "sourcePage": 8,
    "sourceOrder": 213,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 214,
    "itemCode": "cnbsr2016_214",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "踩踏板",
    "prompt": "主试者示范在一级台阶上以同一只脚上下台阶，鼓励小儿照样做",
    "passCriteria": "小儿以同一只脚能稳当并较熟练地完成3组，可稍有停顿",
    "sourcePage": 8,
    "sourceOrder": 214,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 215,
    "itemCode": "cnbsr2016_215",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "照图拼椭圆形",
    "prompt": "将事先画好的椭圆形放在小儿面前，瞩其将6块塑料片按图分别放进去，不予提醒，限时2min",
    "passCriteria": "小儿全部拼对",
    "sourcePage": 8,
    "sourceOrder": 215,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 216,
    "itemCode": "cnbsr2016_216",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "试剪圆形",
    "prompt": "主试者给小儿出示一张已画好圆形（直径7.5cm米）的1/2A4打印纸，鼓励小儿将圆形剪下（附原图）",
    "passCriteria": "小儿能剪出大致圆形，允许出角",
    "sourcePage": 8,
    "sourceOrder": 216,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 217,
    "itemCode": "cnbsr2016_217",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "找不同5个",
    "prompt": "出示找不同图画，主试者问小儿两张图画有什么不同之处？小熊示教。限时2min",
    "passCriteria": "能找到包括示教内容的5处不同或以上",
    "sourcePage": 8,
    "sourceOrder": 217,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 218,
    "itemCode": "cnbsr2016_218",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "图画补缺（5/6）",
    "prompt": "出示补缺图片，主试者问小儿各图中缺什么？第一幅图示教",
    "passCriteria": "要求说对包括示教内容的五幅图或以上",
    "sourcePage": 8,
    "sourceOrder": 218,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 219,
    "itemCode": "cnbsr2016_219",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "你姓什么？",
    "prompt": "主试者问小儿“你姓什么？”",
    "passCriteria": "小儿正确回答出姓，连名带姓不能通过",
    "sourcePage": 8,
    "sourceOrder": 219,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 220,
    "itemCode": "cnbsr2016_220",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 3.0,
    "title": "说出两种圆形的东西",
    "prompt": "主试者让小儿说出两种圆形的东西",
    "passCriteria": "小儿能说出两种或以上圆形的东西",
    "sourcePage": 8,
    "sourceOrder": 220,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第23页"
  },
  {
    "id": 221,
    "itemCode": "cnbsr2016_221",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 60,
    "ageBand": {
      "label": "60月龄",
      "minMonths": 60,
      "maxMonths": 60
    },
    "scoreWeight": 6.0,
    "title": "你家住哪里？",
    "prompt": "主试者问小儿“你家住在哪里？”，或追问“你再说详细些，我怎么送你回家呢？”",
    "passCriteria": "小儿说出的住址可使他人较容易找到",
    "sourcePage": 8,
    "sourceOrder": 221,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 222,
    "itemCode": "cnbsr2016_222",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "接球",
    "prompt": "主试者示范用双手而非前胸接球，然后与小儿相距一米，将球拍给小儿，鼓励小儿用手接住球",
    "passCriteria": "小儿用手接住球，三次中接住一次即可，用双臂或用前胸接球不通过",
    "sourcePage": 8,
    "sourceOrder": 222,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 223,
    "itemCode": "cnbsr2016_223",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "足尖对足跟向后走2m",
    "prompt": "主试者示范，脚跟对脚尖向后走直线，鼓励小儿照样做",
    "passCriteria": "小儿能脚跟对脚尖向后走2m（六步），允许身体有小幅晃动",
    "sourcePage": 8,
    "sourceOrder": 223,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 224,
    "itemCode": "cnbsr2016_224",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "会写自己的名字",
    "prompt": "主试者让小儿写出自己的名字",
    "passCriteria": "小儿能正确写出自己的名字。",
    "sourcePage": 8,
    "sourceOrder": 224,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 225,
    "itemCode": "cnbsr2016_225",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "剪平滑圆形",
    "prompt": "主试者给小儿出示一张已画好圆形（直径7.5cm）的1/2A4 打印纸，鼓励小儿将圆形剪下（附原图）",
    "passCriteria": "小儿能剪出平滑的圆形，无成角、毛边",
    "sourcePage": 8,
    "sourceOrder": 225,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 226,
    "itemCode": "cnbsr2016_226",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "树间站人",
    "prompt": "主试者问小儿“两棵树之间站一个人，一排三棵树之间站几个人？”",
    "passCriteria": "小儿回答“两个人。”",
    "sourcePage": 8,
    "sourceOrder": 226,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 227,
    "itemCode": "cnbsr2016_227",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "十字切苹果",
    "prompt": "主试者问小儿“将一个苹果十字切开是几块？”如小儿不理解，主试者可用手势比划提示",
    "passCriteria": "不经提示或仅在主试者手势比划提示后答“四块”",
    "sourcePage": 8,
    "sourceOrder": 227,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 228,
    "itemCode": "cnbsr2016_228",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "知道自己属相",
    "prompt": "主试者问小儿“你是属什么的？”",
    "passCriteria": "小儿能正确说出自己的属相",
    "sourcePage": 8,
    "sourceOrder": 228,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 229,
    "itemCode": "cnbsr2016_229",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "倒数数字",
    "prompt": "主试者先示教“你会倒着数数吗?1、2、3倒数就是„„3、 2、1，现在请你从24开始倒数，24、23、22、21„„”，鼓励小儿完成倒数",
    "passCriteria": "小儿能较流利地正确数出 13～1",
    "sourcePage": 8,
    "sourceOrder": 229,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 230,
    "itemCode": "cnbsr2016_230",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "人为什么要走人行横道？",
    "prompt": "主试者问小儿:“过马路为什么要走人行横道?”",
    "passCriteria": "小儿能正确回答。为了安全，如怕被汽车撞了等",
    "sourcePage": 8,
    "sourceOrder": 230,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 231,
    "itemCode": "cnbsr2016_231",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 66,
    "ageBand": {
      "label": "66月龄",
      "minMonths": 66,
      "maxMonths": 66
    },
    "scoreWeight": 3.0,
    "title": "鸡在水中游",
    "prompt": "出示鸡在水中游图画，主试者问小儿画的对不对，如回答“不对”，问哪里画错了",
    "passCriteria": "小儿能正确回答鸡不能在水里游泳",
    "sourcePage": 8,
    "sourceOrder": 231,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 232,
    "itemCode": "cnbsr2016_232",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "抱肘连续跳",
    "prompt": "主试者示范原地抱肘单脚跳，鼓励小儿照样做",
    "passCriteria": "小儿抱肘单脚原地连续跳3次或以上，基本在原地跳动",
    "sourcePage": 8,
    "sourceOrder": 232,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 233,
    "itemCode": "cnbsr2016_233",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "拍球2个",
    "prompt": "主试者示范拍球，鼓励小儿照样做（向下扔落地的第一下不算拍球）。允许试三次",
    "passCriteria": "小儿连续拍球2个或以上",
    "sourcePage": 8,
    "sourceOrder": 233,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 234,
    "itemCode": "cnbsr2016_234",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "拼长方形",
    "prompt": "主试者让小儿用2块非等边三角形板拼长方形，出示时要求短边相对，限时2min",
    "passCriteria": "小儿拼对长方形",
    "sourcePage": 8,
    "sourceOrder": 234,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 235,
    "itemCode": "cnbsr2016_235",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "临摹组合图形",
    "prompt": "主试者出示正方形和圆形的组合图形，鼓励小儿临摹。",
    "passCriteria": "小儿能画出，无转向",
    "sourcePage": 8,
    "sourceOrder": 235,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 236,
    "itemCode": "cnbsr2016_236",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "找不同（7个）",
    "prompt": "出示找不同图画，主试者问小儿两张图画有什么不同之处？小熊示教。限时2min",
    "passCriteria": "能找到包括示教内容的7处不同或以上",
    "sourcePage": 8,
    "sourceOrder": 236,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 237,
    "itemCode": "cnbsr2016_237",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "知道左右",
    "prompt": "主试者让小儿用左手摸右耳朵，右手摸左耳朵，右手摸右腿",
    "passCriteria": "小儿全部做对",
    "sourcePage": 8,
    "sourceOrder": 237,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 238,
    "itemCode": "cnbsr2016_238",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "描述图画内容",
    "prompt": "主试者出示三幅连环画，然后对小儿说“这三幅图连起来讲了一个故事，请你给我讲一讲故事的内容是什么？小猴子为什么哭了？”若小儿回答第一问后不再答，可再追问“小猴子为什么哭了？”",
    "passCriteria": "能分别描述每张图画的基本内容",
    "sourcePage": 8,
    "sourceOrder": 238,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第24页"
  },
  {
    "id": 239,
    "itemCode": "cnbsr2016_239",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "上班，窗，苹果、香蕉（2/3）",
    "prompt": "主试者问（1）人为什么要上班？—挣钱或建设国家（2）房子为什么要有窗户？—透光或通风（3）苹果和香蕉有什么共同点？—水果",
    "passCriteria": "答对两题或以上。 （1）挣钱或建设国家；（2）透光或通风；（3）水果",
    "sourcePage": 8,
    "sourceOrder": 239,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 240,
    "itemCode": "cnbsr2016_240",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "一年有哪四个季节？",
    "prompt": "主试者问小儿一年有哪四个季节",
    "passCriteria": "春、夏、秋、冬，顺序可以颠倒",
    "sourcePage": 8,
    "sourceOrder": 240,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 241,
    "itemCode": "cnbsr2016_241",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 72,
    "ageBand": {
      "label": "72月龄",
      "minMonths": 72,
      "maxMonths": 72
    },
    "scoreWeight": 3.0,
    "title": "认识标识",
    "prompt": "依次出示两组标识图片，问“哪一个是代表危险的标志？为什么？”",
    "passCriteria": "两组图均正确指出危险的标志，并说对理由",
    "sourcePage": 8,
    "sourceOrder": 241,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 242,
    "itemCode": "cnbsr2016_242",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "踢带绳的球",
    "prompt": "主试者示范用一手提绳，将球停稳，以内踝及足弓内侧来踢球，鼓励小儿照样做。如小儿用足外侧踢，可示范更正一次姿势",
    "passCriteria": "小儿连续用足内踝踢球2个或以上",
    "sourcePage": 8,
    "sourceOrder": 242,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 243,
    "itemCode": "cnbsr2016_243",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "拍球（5个）",
    "prompt": "主试者示范拍球，鼓励小儿照样做（向下扔落地的第一下不算拍球）。允许试三次",
    "passCriteria": "小儿连续拍球5个或以上",
    "sourcePage": 8,
    "sourceOrder": 243,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 244,
    "itemCode": "cnbsr2016_244",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "临摹六边形",
    "prompt": "主试者出示六边形图形，鼓励小儿临摹",
    "passCriteria": "小儿可临摹出六边形，6个角均画得好，连接线平直",
    "sourcePage": 8,
    "sourceOrder": 244,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 245,
    "itemCode": "cnbsr2016_245",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "试打活结",
    "prompt": "出示一双筷子和一根绳，主试者示范用绳将筷子以活结方式捆上，鼓励小儿照样做。小儿打结时主试者应辅助固定筷子",
    "passCriteria": "经示范后，小儿能用活结将筷子捆上",
    "sourcePage": 8,
    "sourceOrder": 245,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 246,
    "itemCode": "cnbsr2016_246",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "图形类比",
    "prompt": "主试者出示图形，问右边的4幅图中哪一幅放在左边空白处合适。第一题示教",
    "passCriteria": "小儿能指对包括第一题在内的三道题或以上",
    "sourcePage": 8,
    "sourceOrder": 246,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 247,
    "itemCode": "cnbsr2016_247",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "面粉的用途",
    "prompt": "主试者问小儿“面粉能做哪些东西？”",
    "passCriteria": "小儿能回答两种或以上",
    "sourcePage": 8,
    "sourceOrder": 247,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 248,
    "itemCode": "cnbsr2016_248",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "归纳图画主题",
    "prompt": "主试者出示三幅连环画，然后对小儿说“这三幅图连起来讲了一个故事，请你给我讲一讲故事的内容是什么？小猴子为什么哭了？”若小儿回答第一问后不再答，可再追问“小猴子为什么哭了？”",
    "passCriteria": "能明确理解故事的主题",
    "sourcePage": 8,
    "sourceOrder": 248,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 249,
    "itemCode": "cnbsr2016_249",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "认识钟表",
    "prompt": "主试者请小儿看钟表图辨认时间",
    "passCriteria": "小儿能辨认两张图或以上所表示的时间",
    "sourcePage": 8,
    "sourceOrder": 249,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 250,
    "itemCode": "cnbsr2016_250",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "懂得星期几",
    "prompt": "主试者先告诉小儿今天是星期几，然后提问“请告诉我后天是星期几？明天是星期几？”",
    "passCriteria": "小儿均能正确说出",
    "sourcePage": 8,
    "sourceOrder": 250,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 251,
    "itemCode": "cnbsr2016_251",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 78,
    "ageBand": {
      "label": "78月龄",
      "minMonths": 78,
      "maxMonths": 78
    },
    "scoreWeight": 3.0,
    "title": "雨中看书",
    "prompt": "出示雨中看书图片，主试者问小儿画的对不对，如回答“不对”，问哪里画错了",
    "passCriteria": "小儿能正确回答下雨了，不能在雨里看书，会淋湿、生病、书湿了",
    "sourcePage": 8,
    "sourceOrder": 251,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 252,
    "itemCode": "cnbsr2016_252",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "连续踢带绳的球",
    "prompt": "主试者示范用一手提绳，将球停稳，以内踝及足弓内侧来踢球，鼓励小儿照样做。如小儿用足外侧踢，可示范更正一次姿势",
    "passCriteria": "小儿用足内踝踢球 3 个或以上，踢一下落地一下",
    "sourcePage": 8,
    "sourceOrder": 252,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 253,
    "itemCode": "cnbsr2016_253",
    "domain": "gm",
    "domainName": "大运动",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "交替踩踏板",
    "prompt": "主试者示范在一级台阶上交替换脚上下共3组（示范时主试者要边喊口号边示范），请小儿照样做，若小儿不会两脚交替可提醒小儿“换脚”",
    "passCriteria": "小儿能稳当并较熟练地两脚交替完成3组，可稍有停顿",
    "sourcePage": 8,
    "sourceOrder": 253,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 254,
    "itemCode": "cnbsr2016_254",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "学翻绳",
    "prompt": "主试者示范将一根绳子做翻绳最初级模式，鼓励小儿跟着做",
    "passCriteria": "小儿能跟着主试者一步一步，或在主试者示范后自行做到中指挑绳",
    "sourcePage": 8,
    "sourceOrder": 254,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第25页"
  },
  {
    "id": 255,
    "itemCode": "cnbsr2016_255",
    "domain": "fm",
    "domainName": "精细动作",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "打活结",
    "prompt": "出示一双筷子和一根绳，鼓励其用绳将筷子以活结方式捆上，小儿打结时主试者应辅助固定筷子",
    "passCriteria": "无需示范，小儿能用活结将筷子捆上",
    "sourcePage": 8,
    "sourceOrder": 255,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 256,
    "itemCode": "cnbsr2016_256",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "数字类比",
    "prompt": "主试者出示图形，问下边的4幅图中哪一幅放在上边空白处合适。第一题示教",
    "passCriteria": "小儿能指对包括第一题在内的三道题或以上",
    "sourcePage": 8,
    "sourceOrder": 256,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 257,
    "itemCode": "cnbsr2016_257",
    "domain": "ad",
    "domainName": "适应能力",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "什么动物没有脚？",
    "prompt": "主试者问小儿“什么动物没有脚？”（脚定义为走路用的）",
    "passCriteria": "小儿回答蛇、鱼等两类或以上没有脚的动物",
    "sourcePage": 8,
    "sourceOrder": 257,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 258,
    "itemCode": "cnbsr2016_258",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "为什么要进行预防接种",
    "prompt": "主试者问小儿“小朋友为什么要打预防针？”",
    "passCriteria": "小儿能表达出预防生病/感冒或打预防针可以不生病等",
    "sourcePage": 8,
    "sourceOrder": 258,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 259,
    "itemCode": "cnbsr2016_259",
    "domain": "la",
    "domainName": "语言",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "毛衣、裤、鞋共同点？",
    "prompt": "主试者问小儿“毛衣、长裤和鞋有什么共同之处？”",
    "passCriteria": "小儿回答都是穿的、能保暖",
    "sourcePage": 8,
    "sourceOrder": 259,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 260,
    "itemCode": "cnbsr2016_260",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "紧急电话",
    "prompt": "主试者分别问小儿火警、匪警（找警察帮助）、急救电话是多少？",
    "passCriteria": "小儿能正确回答出两种或以上电话号码",
    "sourcePage": 8,
    "sourceOrder": 260,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
  {
    "id": 261,
    "itemCode": "cnbsr2016_261",
    "domain": "sb",
    "domainName": "社会行为",
    "ageGroupMonths": 84,
    "ageBand": {
      "label": "84月龄",
      "minMonths": 84,
      "maxMonths": 84
    },
    "scoreWeight": 3.0,
    "title": "猫头鹰抓老鼠",
    "prompt": "出示猫头鹰抓老鼠图片，主试者问小儿画的对不对，如回答“不对”，问哪里画错了",
    "passCriteria": "小儿能正确回答猫头鹰白天睡觉，不会在白天出来抓老鼠",
    "sourcePage": 8,
    "sourceOrder": 261,
    "sourceStatus": "digitized",
    "sourceNotes": "附录A表A.1，第8页；附录B表B.1，第26页"
  },
]
