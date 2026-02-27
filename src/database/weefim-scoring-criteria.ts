// WeeFIM量表详细评分标准（基于官方CSV数据）

export interface WeeFIMScoringCriteria {
  id: number;
  title: string;
  criteria: {
    score: number;
    description: string;
  }[];
}

export const weefimScoringCriteria: WeeFIMScoringCriteria[] = [
  {
    id: 1,
    title: '进食',
    criteria: [
      {
        score: 7,
        description: '能独立进食各种食物，包括使用餐具（如勺子、叉子），自主咀嚼和吞咽，无需他人协助，且进食过程符合正常进食习惯和速度。'
      },
      {
        score: 6,
        description: '能独立进食，但需使用辅助设备（如特殊的勺子、筷子），或进食某些特定食物时需要较小的协助（如帮忙打开食品包装）。'
      },
      {
        score: 5,
        description: '在大部分情况下能独立进食，但在进食过程中偶尔需要他人提醒或少量身体辅助（如帮忙扶正餐具），以保证进食顺利进行。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成进食，例如他人帮忙将食物送到嘴边，自己咀嚼和吞咽。'
      },
      {
        score: 3,
        description: '需要大量协助进食，他人不仅要将食物送到嘴边，还需帮助咀嚼或控制进食速度。'
      },
      {
        score: 2,
        description: '只能进行少量的自主进食动作，大部分进食过程依赖他人完全喂食。'
      },
      {
        score: 1,
        description: '完全不能自主进食，完全依赖他人喂食。'
      }
    ]
  },
  {
    id: 2,
    title: '梳洗修饰',
    criteria: [
      {
        score: 7,
        description: '能独立完成洗脸、洗手、刷牙、梳头、剃须（适用于青春期）等梳洗修饰活动，包括准备用品、完成动作和清理。'
      },
      {
        score: 6,
        description: '能独立完成大部分梳洗修饰活动，但在准备用品（如挤牙膏）或清理方面需要较小的协助。'
      },
      {
        score: 5,
        description: '在梳洗修饰过程中偶尔需要他人提醒或少量身体辅助（如帮忙扶住洗脸盆）。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成梳洗修饰，例如他人帮忙挤牙膏、递毛巾等，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分梳洗修饰动作，仅能完成少量简单动作（如伸手配合洗手）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主梳洗修饰动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主进行梳洗修饰活动，完全依赖他人。'
      }
    ]
  },
  {
    id: 3,
    title: '洗澡',
    criteria: [
      {
        score: 7,
        description: '能独立完成洗澡全过程，包括调节水温、涂抹沐浴露、清洗身体各部位、擦干身体等，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立完成大部分洗澡动作，但在调节水温或某些身体部位（如背部）清洗时需要较小的协助。'
      },
      {
        score: 5,
        description: '在洗澡过程中偶尔需要他人提醒或少量身体辅助（如帮忙递沐浴球）。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成洗澡，例如他人帮忙调节水温、清洗部分身体部位，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分洗澡动作，仅能完成少量简单动作（如自己冲洗手臂）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主洗澡动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主洗澡，完全依赖他人。'
      }
    ]
  },
  {
    id: 4,
    title: '穿上衣',
    criteria: [
      {
        score: 7,
        description: '能独立穿上各种类型的上衣（如 T 恤、衬衫、外套等），包括辨别前后、扣子或拉链的操作等，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立穿上大部分上衣，但在辨别复杂图案的前后或操作较难的扣子、拉链时需要较小的协助。'
      },
      {
        score: 5,
        description: '在穿上衣过程中偶尔需要他人提醒或少量身体辅助（如帮忙扶正衣服）。'
      },
      {
        score: 4,
        description: '需要中度协助才能穿上上衣，例如他人帮忙撑开袖口、对齐扣子，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分穿上衣动作，仅能完成少量简单动作（如伸手进袖子）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主穿上衣动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主穿上衣，完全依赖他人。'
      }
    ]
  },
  {
    id: 5,
    title: '穿裤子',
    criteria: [
      {
        score: 7,
        description: '能独立穿上各种类型的下衣（如裤子、裙子等），包括辨别前后、提裤子等动作，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立穿上大部分下衣，但在辨别较复杂裤子的前后或提较紧裤子时需要较小的协助。'
      },
      {
        score: 5,
        description: '在穿下衣过程中偶尔需要他人提醒或少量身体辅助（如帮忙拉一下裤子）。'
      },
      {
        score: 4,
        description: '需要中度协助才能穿下衣，例如他人帮忙撑开裤腿、对齐裤子，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分穿下衣动作，仅能完成少量简单动作（如抬腿进裤腿）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主穿下衣动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主穿下衣，完全依赖他人。'
      }
    ]
  },
  {
    id: 6,
    title: '上厕所',
    criteria: [
      {
        score: 7,
        description: '能独立完成如厕全过程，包括去厕所、脱裤子、擦拭、提裤子、冲水等，无需他人协助，且能表达如厕需求。'
      },
      {
        score: 6,
        description: '能独立完成大部分如厕动作，但在擦拭或冲水方面需要较小的协助，或在表达如厕需求方面稍有延迟。'
      },
      {
        score: 5,
        description: '在如厕过程中偶尔需要他人提醒（如忘记冲水）或少量身体辅助（如帮忙脱较紧的裤子）。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成如厕，例如他人帮忙擦拭、提裤子，自己完成部分动作，且能表达如厕需求。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分如厕动作，仅能完成少量简单动作（如走到厕所），且能表达部分如厕需求。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主如厕动作，大部分依赖他人完成，且如厕需求表达不清。'
      },
      {
        score: 1,
        description: '完全不能自主如厕，完全依赖他人，且不能表达如厕需求。'
      }
    ]
  },
  {
    id: 7,
    title: '排尿控制',
    criteria: [
      {
        score: 7,
        description: '能完全自主控制排尿，白天和晚上都不会尿床，能及时表达排尿需求并自行去厕所排尿。'
      },
      {
        score: 6,
        description: '白天能自主控制排尿，偶尔晚上尿床，或能表达排尿需求但有时来不及去厕所。'
      },
      {
        score: 5,
        description: '白天基本能控制排尿，但偶尔会有尿失禁情况，晚上尿床较频繁，需要他人提醒排尿。'
      },
      {
        score: 4,
        description: '需要中度协助控制排尿，如需要定时提醒去厕所，仍会有较多尿失禁情况。'
      },
      {
        score: 3,
        description: '需要大量协助控制排尿，如需要使用尿布或导尿管，或经常出现尿失禁且不能表达排尿需求。'
      },
      {
        score: 2,
        description: '几乎没有排尿控制能力，完全依赖尿布或他人帮助排尿。'
      },
      {
        score: 1,
        description: '完全不能控制排尿，无排尿意识。'
      }
    ]
  },
  {
    id: 8,
    title: '排便控制',
    criteria: [
      {
        score: 7,
        description: '能完全自主控制排便，每天定时排便，不会出现大便失禁情况，能表达排便需求并自行去厕所排便。'
      },
      {
        score: 6,
        description: '基本能自主控制排便，但偶尔会有大便失禁情况，或能表达排便需求但有时来不及去厕所。'
      },
      {
        score: 5,
        description: '需要他人提醒才能排便，偶尔会出现大便失禁情况。'
      },
      {
        score: 4,
        description: '需要中度协助控制排便，如需要定时提醒去厕所，仍会有较多大便失禁情况。'
      },
      {
        score: 3,
        description: '需要大量协助控制排便，如需要使用开塞露等辅助排便，或经常出现大便失禁且不能表达排便需求。'
      },
      {
        score: 2,
        description: '几乎没有排便控制能力，完全依赖他人帮助排便。'
      },
      {
        score: 1,
        description: '完全不能控制排便，无排便意识。'
      }
    ]
  },
  {
    id: 9,
    title: '床椅转移',
    criteria: [
      {
        score: 7,
        description: '能独立完成从床到椅子（或轮椅）的转移，包括起身、移动身体、坐下等动作，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立完成大部分床椅转移动作，但在起身或坐下时需要较小的身体辅助（如轻扶一下）。'
      },
      {
        score: 5,
        description: '在床椅转移过程中偶尔需要他人提醒或少量身体辅助（如帮忙调整椅子位置）。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成床椅转移，例如他人帮忙起身、引导身体移动方向，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分床椅转移动作，仅能完成少量简单动作（如配合抬腿）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主床椅转移动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主进行床椅转移，完全依赖他人。'
      }
    ]
  },
  {
    id: 10,
    title: '轮椅转移',
    criteria: [
      {
        score: 7,
        description: '能独立完成轮椅到其他平面（如马桶、浴盆等）的转移，包括操作轮椅刹车、移动身体等动作，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立完成大部分轮椅转移动作，但在操作轮椅刹车或移动身体较困难时需要较小的协助。'
      },
      {
        score: 5,
        description: '在轮椅转移过程中偶尔需要他人提醒或少量身体辅助（如帮忙固定轮椅）。'
      },
      {
        score: 4,
        description: '需要中度协助才能完成轮椅转移，例如他人帮忙操作轮椅刹车、引导身体移动，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分轮椅转移动作，仅能完成少量简单动作（如配合身体移动）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主轮椅转移动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主进行轮椅转移，完全依赖他人。'
      }
    ]
  },
  {
    id: 11,
    title: '进出浴盆/淋浴间',
    criteria: [
      {
        score: 7,
        description: '能独立进出浴盆或淋浴间，包括打开门、移动身体进入、调整姿势等动作，无需他人协助。'
      },
      {
        score: 6,
        description: '能独立完成大部分进出动作，但在打开较紧的门或调整身体姿势较困难时需要较小的协助。'
      },
      {
        score: 5,
        description: '在进出过程中偶尔需要他人提醒或少量身体辅助（如帮忙防滑）。'
      },
      {
        score: 4,
        description: '需要中度协助才能进出，例如他人帮忙打开门、引导身体进入，自己完成部分动作。'
      },
      {
        score: 3,
        description: '需要大量协助，他人完成大部分进出动作，仅能完成少量简单动作（如抬腿进入）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主进出动作，大部分依赖他人完成。'
      },
      {
        score: 1,
        description: '完全不能自主进出浴盆/淋浴间，完全依赖他人。'
      }
    ]
  },
  {
    id: 12,
    title: '步行/上下楼梯',
    criteria: [
      {
        score: 7,
        description: '能独立在平地上行走至少 50 米，能跨越障碍物，上下楼梯无需他人协助，行走姿势正常。'
      },
      {
        score: 6,
        description: '能独立在平地上行走至少 50 米，但在跨越障碍物或上下楼梯时需要较小的协助（如扶手），行走姿势基本正常。'
      },
      {
        score: 5,
        description: '在平地上行走偶尔需要他人提醒或少量身体辅助（如防止摔倒），能上下楼梯但需要较多时间和努力。'
      },
      {
        score: 4,
        description: '需要中度协助才能行走，例如他人帮忙扶持，行走距离较短（小于 50 米），上下楼梯困难。'
      },
      {
        score: 3,
        description: '需要大量协助行走，如使用助行器且需要他人密切监护，行走距离短且不稳定。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主行走动作，大部分依赖他人抱或使用轮椅。'
      },
      {
        score: 1,
        description: '完全不能自主行走，完全依赖他人移动。'
      }
    ]
  },
  {
    id: 13,
    title: '使用轮椅',
    criteria: [
      {
        score: 7,
        description: '能独立操作轮椅在平地上移动至少 50 米，能转弯、避开障碍物，操作轮椅刹车等功能正常。'
      },
      {
        score: 6,
        description: '能独立操作轮椅在平地上移动至少 50 米，但在转弯或避开较复杂障碍物时需要较小的协助，操作轮椅刹车基本正常。'
      },
      {
        score: 5,
        description: '在操作轮椅过程中偶尔需要他人提醒或少量身体辅助（如帮忙调整轮椅方向）。'
      },
      {
        score: 4,
        description: '需要中度协助才能操作轮椅，例如他人帮忙转弯、避开障碍物，自己操作部分功能（如前进、后退）。'
      },
      {
        score: 3,
        description: '需要大量协助操作轮椅，如他人控制大部分操作，仅能进行少量简单操作（如推动轮椅前进一点）。'
      },
      {
        score: 2,
        description: '只能进行极少量的自主轮椅操作动作，大部分依赖他人推动。'
      },
      {
        score: 1,
        description: '完全不能自主操作轮椅，完全依赖他人推动。'
      }
    ]
  },
  {
    id: 14,
    title: '理解（听觉/视觉/两者）',
    criteria: [
      {
        score: 7,
        description: '能理解各种复杂的语言指令和信息，包括抽象概念、多步骤指令等，理解能力与同龄人相当。'
      },
      {
        score: 6,
        description: '能理解大部分日常语言指令和简单的抽象概念，但对于非常复杂的信息理解稍有困难。'
      },
      {
        score: 5,
        description: '能理解简单的日常语言指令，但对于稍复杂的指令或概念需要重复讲解或辅助手势才能理解。'
      },
      {
        score: 4,
        description: '只能理解基本的、常用的简单指令，对于稍微复杂一点的内容理解困难。'
      },
      {
        score: 3,
        description: '仅能理解非常简单、具体的指令，如"坐下""过来"等，对其他指令理解能力有限。'
      },
      {
        score: 2,
        description: '对语言指令的理解非常有限，只能通过简单的手势或动作来理解少量基本需求。'
      },
      {
        score: 1,
        description: '几乎不能理解任何语言指令，对沟通毫无反应。'
      }
    ]
  },
  {
    id: 15,
    title: '表达（言语/非言语/两者）',
    criteria: [
      {
        score: 7,
        description: '能清晰、准确地表达自己的想法、需求和感受，语言表达流畅，语法正确，能使用丰富的词汇和语句结构。'
      },
      {
        score: 6,
        description: '能表达大部分想法和需求，但在表达复杂的情感或使用较高级的词汇和语法时稍有困难。'
      },
      {
        score: 5,
        description: '能表达基本的需求和简单的想法，但语言表达较简单，偶尔会出现语法错误或词汇使用不当。'
      },
      {
        score: 4,
        description: '只能用简单的词语或短语表达需求，表达不够清晰，需要他人猜测意思。'
      },
      {
        score: 3,
        description: '只能用单个词语或简单的声音来表达最基本的需求，如"要""吃"等。'
      },
      {
        score: 2,
        description: '的表达非常有限，仅能用简单的声音或手势来示意基本需求。'
      },
      {
        score: 1,
        description: '几乎不能用语言或其他方式表达自己的需求和想法。'
      }
    ]
  },
  {
    id: 16,
    title: '社会交往',
    criteria: [
      {
        score: 7,
        description: '能主动与他人进行良好的互动，能理解并遵守社交规则，能与不同年龄段的人建立良好的关系，参与各种社交活动。'
      },
      {
        score: 6,
        description: '能主动与他人互动，基本能遵守社交规则，但在复杂社交情境中可能需要他人提醒。'
      },
      {
        score: 5,
        description: '能参与简单的社交互动，但在发起互动、理解社交暗示方面需要他人指导，偶尔会违反社交规则。'
      },
      {
        score: 4,
        description: '在他人引导下能进行有限的社交互动，对社交规则理解有限，需要经常提醒。'
      },
      {
        score: 3,
        description: '只能进行极少量的社交互动，如简单的打招呼，对社交规则基本不理解。'
      },
      {
        score: 2,
        description: '很少主动参与社交互动，对他人的社交邀请反应淡漠。'
      },
      {
        score: 1,
        description: '完全不参与社交互动，对他人无社交反应。'
      }
    ]
  },
  {
    id: 17,
    title: '解决问题',
    criteria: [
      {
        score: 7,
        description: '能独立解决各种日常生活和学习中的问题，能运用逻辑思维和多种方法解决复杂问题，解决问题能力与同龄人相当。'
      },
      {
        score: 6,
        description: '能解决大部分常见问题，但在解决较复杂问题时需要一些提示或引导。'
      },
      {
        score: 5,
        description: '能解决简单的问题，但在面对稍微复杂的问题时需要他人较多的指导和帮助。'
      },
      {
        score: 4,
        description: '只能在他人详细指导下解决非常简单的问题，独立解决问题能力较差。'
      },
      {
        score: 3,
        description: '几乎不能独立解决问题，需要他人全程协助才能完成简单任务。'
      },
      {
        score: 2,
        description: '在解决问题方面几乎没有能力，对问题无反应。'
      },
      {
        score: 1,
        description: '完全不具备解决问题的能力。'
      }
    ]
  },
  {
    id: 18,
    title: '记忆',
    criteria: [
      {
        score: 7,
        description: '能完全记住日常活动和重要信息，无需任何提醒。'
      },
      {
        score: 6,
        description: '有轻度困难，能记住大部分信息，仅在复杂事项时需要偶尔提醒。'
      },
      {
        score: 5,
        description: '在他人监护或指导下进行记忆活动，或在使用辅助设备后能自主记忆。'
      },
      {
        score: 4,
        description: '需要他人中度帮助进行记忆，经常需要他人提醒。'
      },
      {
        score: 3,
        description: '需要他人重度帮助进行记忆，只能记住极少信息。'
      },
      {
        score: 2,
        description: '基本依赖他人进行记忆，记忆力极差，只能记住眼前的事物。'
      },
      {
        score: 1,
        description: '完全依赖他人进行记忆，完全没有记忆能力。'
      }
    ]
  }
];

// 根据题目ID获取评分标准
export function getWeeFIMScoringCriteria(questionId: number): WeeFIMScoringCriteria | undefined {
  return weefimScoringCriteria.find(criteria => criteria.id === questionId);
}