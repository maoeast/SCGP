// S-M量表题目数据（132道题目）

export interface SMQuestion {
  id: number;
  dimension: string;  // 维度：交往、作业、运动能力、独立生活能力、自我管理、集体活动
  age_stage: number;  // 年龄阶段：1-7
  age_min: number;    // 最小月龄
  age_max: number;    // 最大月龄
  title: string;      // 题目描述
  audio?: string;     // 语音文件路径
}

// 年龄阶段映射
const ageStageMap: Record<string, { stage: number; min: number; max: number }> = {
  'I.6个月-1岁11个月': { stage: 1, min: 6, max: 23 },
  'II.2岁-3岁5个月': { stage: 2, min: 24, max: 41 },
  'III.3岁6个月-4岁11个月': { stage: 3, min: 42, max: 59 },
  'IV.5岁-6岁5个月': { stage: 4, min: 60, max: 77 },
  'V.6岁6个月-8岁5个月': { stage: 5, min: 78, max: 101 },
  'VI.8岁6个-10岁5个月': { stage: 6, min: 102, max: 125 },
  'VII.10岁6个月以上': { stage: 7, min: 126, max: 200 }
};

// S-M量表132道题目（基于CSV文件）
export const smQuestions: SMQuestion[] = [
  // I.6个月-1岁11个月（19题）
  { id: 1, dimension: '交往', age_stage: 1, age_min: 6, age_max: 23, title: '叫自己的名字，能知道是叫自己(自己名字被叫时，能把脸转向叫自己名字的人的方向)。' },
  { id: 2, dimension: '作业', age_stage: 1, age_min: 6, age_max: 23, title: '能传递东西(给小儿可握住的东西时，能从一手传递给另一只手)。' },
  { id: 3, dimension: '交往', age_stage: 1, age_min: 6, age_max: 23, title: '见生人有反应(能分辨陌生人和熟人，或见到生人出现害羞或拘谨的样子)。' },
  { id: 4, dimension: '集体活动', age_stage: 1, age_min: 6, age_max: 23, title: '会做躲猫猫的游戏(在游戏中，小儿能注视检查者原先露面的方向)。' },
  { id: 5, dimension: '独立生活能力', age_stage: 1, age_min: 6, age_max: 23, title: '能拿着奶瓶喝奶。' },
  { id: 6, dimension: '集体活动', age_stage: 1, age_min: 6, age_max: 23, title: '能模仿大人或兄弟姐妹的动作(如能挥着手说"再见"，或捂着脸说"没有了！没有了！")。' },
  { id: 7, dimension: '作业', age_stage: 1, age_min: 6, age_max: 23, title: '能用手指头抓东西(不是大把抓，而是用大拇指和食指抓起很小的东西)。' },
  { id: 8, dimension: '运动能力', age_stage: 1, age_min: 6, age_max: 23, title: '能回答"是"、"嗯"。' },
  { id: 9, dimension: '集体活动', age_stage: 1, age_min: 6, age_max: 23, title: '在孩子们当中，能高高兴兴地玩耍(在公园等处，想到其他正在玩耍的孩子们的旁边去，或想模仿着玩)。' },
  { id: 10, dimension: '运动能力', age_stage: 1, age_min: 6, age_max: 23, title: '能自己走路。' },
  { id: 11, dimension: '交往', age_stage: 1, age_min: 6, age_max: 23, title: '能说简单的词(能说"爸爸"、"妈妈"、"再见"等两、三个单词)。' },
  { id: 12, dimension: '独立生活能力', age_stage: 1, age_min: 6, age_max: 23, title: '能拿着杯子自己喝水(不用帮助。水也不怎么撒出来)。' },
  { id: 13, dimension: '集体活动', age_stage: 1, age_min: 6, age_max: 23, title: '能做出引起大人注意的行为(当家长表示"不可以"、"不行"、"喂喂"等禁止或制止时，特意表示出让人注意)。' },
  { id: 14, dimension: '独立生活能力', age_stage: 1, age_min: 6, age_max: 23, title: '别人给穿衣服时，能按照需要伸出手或脚。' },
  { id: 15, dimension: '交往', age_stage: 1, age_min: 6, age_max: 23, title: '能明白简单的命令(能听从"把XX拿来！"、"到XX地方去"之类的指示)。' },
  { id: 16, dimension: '作业', age_stage: 1, age_min: 6, age_max: 23, title: '能在纸上乱画(能用蜡笔或铅笔在纸上乱画)。' },
  { id: 17, dimension: '运动能力', age_stage: 1, age_min: 6, age_max: 23, title: '能抓住扶手自己上阶梯。' },
  { id: 18, dimension: '独立生活能力', age_stage: 1, age_min: 6, age_max: 23, title: '能使用勺子自己吃饭。' },
  { id: 19, dimension: '运动能力', age_stage: 1, age_min: 6, age_max: 23, title: '能和大人拉着手外出(基本上能自己走二、三十分钟的路)。' },

  // II.2岁-3岁5个月（22题）
  { id: 20, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '能脱袜子(不借助父母的手，只要提示就可以脱)。' },
  { id: 21, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '大便或小便后，能告诉别人(不单是哭闹，而是能用动作或语言表示)。' },
  { id: 22, dimension: '自我管理', age_stage: 2, age_min: 24, age_max: 41, title: '什么事都能自己独立干(不管会不会干，都要自己干)。' },
  { id: 23, dimension: '集体活动', age_stage: 2, age_min: 24, age_max: 41, title: '希望拥有兄弟姐妹或小朋友都拥有的相同或相似的东西。' },
  { id: 24, dimension: '集体活动', age_stage: 2, age_min: 24, age_max: 41, title: '当受到邀请时，能加入到游玩的伙伴中去(跟着伙伴一起玩)。' },
  { id: 25, dimension: '交往', age_stage: 2, age_min: 24, age_max: 41, title: '能说两个词组成的话(如"去外面！"、"吃饭"等)。' },
  { id: 26, dimension: '自我管理', age_stage: 2, age_min: 24, age_max: 41, title: '能区别自己的东西和别人的东西。不随便拿用别人的东西。' },
  { id: 27, dimension: '自我管理', age_stage: 2, age_min: 24, age_max: 41, title: '当别人说"以后…"、"明天…"之类的话时，能够等待。' },
  { id: 28, dimension: '交往', age_stage: 2, age_min: 24, age_max: 41, title: '会说日常的客气话(能正确运用"您早!","谢谢!"等两个或两个以上的词)。' },
  { id: 29, dimension: '运动能力', age_stage: 2, age_min: 24, age_max: 41, title: '不借助扶手或他人帮助，能够自己上、下阶梯，或能够双脚跳上或跳下一层阶梯。' },
  { id: 30, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '要上厕所时，能告诉别人，并能解下裤子。' },
  { id: 31, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '能自己洗手(不只是把手弄湿，而是能擦着洗)。' },
  { id: 32, dimension: '运动能力', age_stage: 2, age_min: 24, age_max: 41, title: '不拉着别人的手，自己也可以在人行道上走路(没有人行道时，则可以在马路边上走)。' },
  { id: 33, dimension: '作业', age_stage: 2, age_min: 24, age_max: 41, title: '能把水、牛奶、或桔汁倒入杯子里(从瓶子倒入杯中，或从一个杯子倒入另一杯子)。' },
  { id: 34, dimension: '集体活动', age_stage: 2, age_min: 24, age_max: 41, title: '懂得顺序(能按照大人的指示，等待按顺序轮到自己)。' },
  { id: 35, dimension: '作业', age_stage: 2, age_min: 24, age_max: 41, title: '能帮助做饭前准备或饭后收拾工作(按照别人的吩咐把筷子或碗摆在桌子上，或收拾吃完后的餐具)。' },
  { id: 36, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '能自己脱短裤。' },
  { id: 37, dimension: '交往', age_stage: 2, age_min: 24, age_max: 41, title: '能分别说出自己的姓和名(能把姓和名区分开)。' },
  { id: 38, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '如果上厕所，能自己料理(在白天基本上不会出问题)。' },
  { id: 39, dimension: '交往', age_stage: 2, age_min: 24, age_max: 41, title: '能自己说出所见所闻(能说明身边发生的事情)。' },
  { id: 40, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '吃饭时能使用筷子吃(能拿住筷子即可)。' },
  { id: 41, dimension: '独立生活能力', age_stage: 2, age_min: 24, age_max: 41, title: '吃饭时，不随便离席。' },

  // III.3岁6个月-4岁11个月（24题）
  { id: 42, dimension: '自我管理', age_stage: 3, age_min: 42, age_max: 59, title: '有想要的东西，经过说服，可以忍耐(如外出买东西时)。' },
  { id: 43, dimension: '集体活动', age_stage: 3, age_min: 42, age_max: 59, title: '能把玩具和小朋友轮流玩，能把玩具借给别人玩，或借别人的玩具玩。' },
  { id: 44, dimension: '自我管理', age_stage: 3, age_min: 42, age_max: 59, title: '在车子里或人多的地方不撒娇磨人。' },
  { id: 45, dimension: '运动能力', age_stage: 3, age_min: 42, age_max: 59, title: '能自己到附近的朋友家或游乐场所去(附近的朋友家是指本层楼或本院以外的人家)。' },
  { id: 46, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '能自己穿脱简单的衣服(如睡衣、毛衣或钮扣的外衣等)。' },
  { id: 47, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '能自己穿鞋(穿拖鞋不算，如鞋有带，不要求系带，亦不要求左右脚穿的正确)。' },
  { id: 48, dimension: '集体活动', age_stage: 3, age_min: 42, age_max: 59, title: '会玩"过家家"的游戏(如做模仿做饭或买东西等游戏时，能扮演其中的角色)。' },
  { id: 49, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '自己会穿、脱一般的衣服(如小钮扣的、带拉链的或有带子衣服)。' },
  { id: 50, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '会自己洗脸(不只是玩玩水，要能擦洗整个脸)。' },
  { id: 51, dimension: '作业', age_stage: 3, age_min: 42, age_max: 59, title: '会粘贴(能用浆糊或胶水粘贴纸)。' },
  { id: 52, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '能上公共厕所解手。' },
  { id: 53, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '便后能自己用手纸把大便擦干净。' },
  { id: 54, dimension: '集体活动', age_stage: 3, age_min: 42, age_max: 59, title: '懂得用手划拳决定输赢(如用手表示锤子、剪刀、包袱的游戏)。' },
  { id: 55, dimension: '运动能力', age_stage: 3, age_min: 42, age_max: 59, title: '能遵守交叉路口的交通信号过马路(没有交通信号的地方则注意来往的车辆过马路)。' },
  { id: 56, dimension: '作业', age_stage: 3, age_min: 42, age_max: 59, title: '能用剪刀剪出简单的图形。' },
  { id: 57, dimension: '交往', age_stage: 3, age_min: 42, age_max: 59, title: '能在电话中进行简单的对话(打来电话时，能拿起电话转交给父母，或告诉对方家里没人。如家中无电话，当家长不在时，能接待来人，说明家长不在，事后又能转告给家长)。' },
  { id: 58, dimension: '交往', age_stage: 3, age_min: 42, age_max: 59, title: '能识数字和挑读正楷的字(能识电视的频道或钟表上的数字，能挑读小人书上的一些字)。' },
  { id: 59, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '能按照吩咐，自己梳头或刷牙。' },
  { id: 60, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '洗澡时能自己洗身子。(不会洗头也可以)。' },
  { id: 61, dimension: '交往', age_stage: 3, age_min: 42, age_max: 59, title: '能和小朋友们交谈在电视中所看到的内容(不模仿主人公，而是交谈故事中的主要情节)。' },
  { id: 62, dimension: '作业', age_stage: 3, age_min: 42, age_max: 59, title: '能够看着样子画出圆形、三角形和正方形(○△□)。' },
  { id: 63, dimension: '集体活动', age_stage: 3, age_min: 42, age_max: 59, title: '能玩室内的竞赛游戏(在有年长的孩子或大人参加的情况下，会玩扑克、纸牌等游戏)。' },
  { id: 64, dimension: '独立生活能力', age_stage: 3, age_min: 42, age_max: 59, title: '穿鞋子时，不会把左右穿错。' },
  { id: 65, dimension: '作业', age_stage: 4, age_min: 60, age_max: 77, title: '能打开小瓶的螺旋样盖子。' },
  { id: 66, dimension: '交往', age_stage: 4, age_min: 60, age_max: 77, title: '能写自己的姓和名。' },
  { id: 67, dimension: '独立生活能力', age_stage: 4, age_min: 60, age_max: 77, title: '能熟练地使用筷子(熟练地夹起细小食物，吃时不会掉下来)。' },
  { id: 68, dimension: '独立生活能力', age_stage: 4, age_min: 60, age_max: 77, title: '衣服脏了或湿了，父母不说自己也会换下来。' },
  { id: 69, dimension: '集体活动', age_stage: 4, age_min: 60, age_max: 77, title: '能参加躲避球、攻阵等规则简单的集体游戏(如丢包游戏)。' },
  { id: 70, dimension: '自我管理', age_stage: 4, age_min: 60, age_max: 77, title: '能到指定的街上买回花钱不多的东西。' },
  { id: 71, dimension: '自我管理', age_stage: 4, age_min: 60, age_max: 77, title: '能一个人看家一小时左右。' },
  { id: 72, dimension: '交往', age_stage: 4, age_min: 60, age_max: 77, title: '能把别人(阿姨、老师)的话完整地传达给家里人。' },
  { id: 73, dimension: '作业', age_stage: 4, age_min: 60, age_max: 77, title: '会拧擦布或手巾(拧到不滴水的程度)。' },
  { id: 74, dimension: '交往', age_stage: 4, age_min: 60, age_max: 77, title: '能独立看并理解内容简单的书(以画为主的书)。' },
  { id: 75, dimension: '自我管理', age_stage: 4, age_min: 60, age_max: 77, title: '到规定的时间自己主动就寝(不是命令孩子"睡觉去"，但可以提醒他到睡觉的时间了)。' },
  { id: 76, dimension: '运动能力', age_stage: 4, age_min: 60, age_max: 77, title: '可以步行到距离一公里左右常去的地方。' },
  { id: 77, dimension: '作业', age_stage: 4, age_min: 60, age_max: 77, title: '能系、解带子(单结、复杂的结、活结或蝴蝶结等)。' },
  { id: 78, dimension: '集体活动', age_stage: 4, age_min: 60, age_max: 77, title: '不必由父母带着，可以和小朋友一起去参加地区的活动，如赶庙会，看电影等。' },
  { id: 79, dimension: '集体活动', age_stage: 4, age_min: 60, age_max: 77, title: '能够完成在班级所承担的任务，如值日，当委员等。' },
  { id: 80, dimension: '运动能力', age_stage: 4, age_min: 60, age_max: 77, title: '能自己一个人上学。' },
  { id: 81, dimension: '自我管理', age_stage: 5, age_min: 78, age_max: 101, title: '到别人家里很有礼貌(如在大人交谈时，能保持安静一个小时左右)。' },
  { id: 82, dimension: '独立生活能力', age_stage: 5, age_min: 78, age_max: 101, title: '不必父母吩咐，也会把脱下的衣服收拾好(不是脱下不管，而是放在规定的地方)。' },
  { id: 83, dimension: '独立生活能力', age_stage: 5, age_min: 78, age_max: 101, title: '能自己洗澡(也会自己洗头)。' },
  { id: 84, dimension: '交往', age_stage: 5, age_min: 78, age_max: 101, title: '能够根据需要自己打电话。' },
  { id: 85, dimension: '自我管理', age_stage: 5, age_min: 78, age_max: 101, title: '买书时，能自己选择内容适当的书。' },
  { id: 86, dimension: '独立生活能力', age_stage: 5, age_min: 78, age_max: 101, title: '能按照吩咐，自己把房间打扫干净(父母不帮助，也能尽力去干)。' },
  { id: 87, dimension: '自我管理', age_stage: 5, age_min: 78, age_max: 101, title: '能按时按计划行动(能遵守约定的时间，计算乘车所需要的时间)。' },
  { id: 88, dimension: '作业', age_stage: 5, age_min: 78, age_max: 101, title: '能小心使用小刀等刃具。' },
  { id: 89, dimension: '集体活动', age_stage: 5, age_min: 78, age_max: 101, title: '会玩象棋、扑克等规则复杂的游戏。' },
  { id: 90, dimension: '运动能力', age_stage: 5, age_min: 78, age_max: 101, title: '能识别"禁止横穿马路"、"危险"等标志，并遵守指示。' },
  { id: 91, dimension: '交往', age_stage: 5, age_min: 78, age_max: 101, title: '能主动给小朋友等人写贺年片或信，能写出收信人的地址。' },
  { id: 92, dimension: '集体活动', age_stage: 5, age_min: 78, age_max: 101, title: '能在班会上陈述自己的意见。' },
  { id: 93, dimension: '作业', age_stage: 5, age_min: 78, age_max: 101, title: '会使用锤子和螺丝刀。' },
  { id: 94, dimension: '交往', age_stage: 5, age_min: 78, age_max: 101, title: '能根据需要记下事情或要点(如外出留条，告诉要去的地方，或在记事本上写下必要的事项)。' },
  { id: 95, dimension: '交往', age_stage: 5, age_min: 78, age_max: 101, title: '能就身边的事情写成简单的文章(如日记、作文等，即使几行字的）。' },
  { id: 96, dimension: '集体活动', age_stage: 5, age_min: 78, age_max: 101, title: '能做为一名成员参加学校或地区的文体等方面的活动。' },
  { id: 97, dimension: '独立生活能力', age_stage: 6, age_min: 102, age_max: 125, title: '指甲长了自己会剪。' },
  { id: 98, dimension: '自我管理', age_stage: 6, age_min: 102, age_max: 125, title: '不必别人提醒，也能静静地把别人的谈话或说明听完。' },
  { id: 99, dimension: '独立生活能力', age_stage: 6, age_min: 102, age_max: 125, title: '能够根据天气或当天的活动，自己调换衣服。' },
  { id: 100, dimension: '自我管理', age_stage: 6, age_min: 102, age_max: 125, title: '能考虑到对方的立场或情绪，不增添麻烦，不提无理的要求。' },
  { id: 101, dimension: '交往', age_stage: 6, age_min: 102, age_max: 125, title: '会用辞典查找不懂的词句。' },
  { id: 102, dimension: '集体活动', age_stage: 6, age_min: 102, age_max: 125, title: '可以放心让其照顾或照管年幼的孩子。' },
  { id: 103, dimension: '作业', age_stage: 6, age_min: 102, age_max: 125, title: '会使用洗衣机、电视机、录音机等家用电器。' },
  { id: 104, dimension: '集体活动', age_stage: 6, age_min: 102, age_max: 125, title: '能遵守规则打垒球、篮球、足球或乒乓球等。' },
  { id: 105, dimension: '自我管理', age_stage: 6, age_min: 102, age_max: 125, title: '能储备零花钱，有计划地买东西。' },
  { id: 106, dimension: '运动能力', age_stage: 6, age_min: 102, age_max: 125, title: '自己能乘电车或公共汽车到常去的地方去(会买车票)。' },
  { id: 107, dimension: '交往', age_stage: 6, age_min: 102, age_max: 125, title: '对长辈说话会使用尊敬的词语。(如"叔叔、阿姨好"、"麻烦您了"、"请您"等，不使用平常伙伴之间使用的粗鲁的话)。' },
  { id: 108, dimension: '作业', age_stage: 6, age_min: 102, age_max: 125, title: '会使用煤气、煤(柴)灶、电器灶烧开水。' },
  { id: 109, dimension: '自我管理', age_stage: 6, age_min: 102, age_max: 125, title: '能关心幼儿或老人(如在车中自觉地让座等)。' },
  { id: 110, dimension: '运动能力', age_stage: 6, age_min: 102, age_max: 125, title: '即使没有去过的地方,如果能说明走法，也能步行到达(步行二十分钟左右的范围内)。' },
  { id: 111, dimension: '作业', age_stage: 6, age_min: 102, age_max: 125, title: '自己会烧水沏茶。' },
  { id: 112, dimension: '集体活动', age_stage: 6, age_min: 102, age_max: 125, title: '能承担学校的工作(如少先队、班委、班长等工作)。' },
  { id: 113, dimension: '运动能力', age_stage: 6, age_min: 102, age_max: 125, title: '到常去的地方，即使途中需要换车，也能自己乘电车、公共汽车或地铁去。' },
  { id: 114, dimension: '独立生活能力', age_stage: 7, age_min: 126, age_max: 200, title: '喜欢摆上花，贴上画，把自己的房间和教室装饰得很漂亮。' },
  { id: 115, dimension: '自我管理', age_stage: 7, age_min: 126, age_max: 200, title: '一次得到许多零花钱也不乱花(自己有计划地使用获得的压岁钱、贺礼钱等)。' },
  { id: 116, dimension: '作业', age_stage: 7, age_min: 126, age_max: 200, title: '会缝钮扣。' },
  { id: 117, dimension: '独立生活能力', age_stage: 7, age_min: 126, age_max: 200, title: '注意自己的容貌打扮，能根据时间、地点穿着打扮。' },
  { id: 118, dimension: '自我管理', age_stage: 7, age_min: 126, age_max: 200, title: '能控制自己以免生病(如注意不吃得过饱，稍有不舒服能尽早躺下，不吃不洁食物等)。' },
  { id: 119, dimension: '作业', age_stage: 7, age_min: 126, age_max: 200, title: '能用小刀或菜刀削去水果或蔬菜的皮。' },
  { id: 120, dimension: '独立生活能力', age_stage: 7, age_min: 126, age_max: 200, title: '能很好地遵守吃饭的礼节(如不发出响声，不做不礼貌的姿态，不给人留下不愉快的印象)。' },
  { id: 121, dimension: '作业', age_stage: 7, age_min: 126, age_max: 200, title: '会作简单的饭菜或加热已经做好的饭菜。' },
  { id: 122, dimension: '运动能力', age_stage: 7, age_min: 126, age_max: 200, title: '相当远的地方也能骑自行车来回。' },
  { id: 123, dimension: '交往', age_stage: 7, age_min: 126, age_max: 200, title: '说话时能考虑对方的立场。' },
  { id: 124, dimension: '交往', age_stage: 7, age_min: 126, age_max: 200, title: '能阅读并理解报纸和小说。' },
  { id: 125, dimension: '集体活动', age_stage: 7, age_min: 126, age_max: 200, title: '对日常接触的学校和当地小朋友以外的人事交往也很关心(如和友人通信，参加兴趣爱好相同的组织等)。' },
  { id: 126, dimension: '运动能力', age_stage: 7, age_min: 126, age_max: 200, title: '能根据需要，利用乘车的时间表和票价表(指长途汽车或火车时间表，票价表)。' },
  { id: 127, dimension: '自我管理', age_stage: 7, age_min: 126, age_max: 200, title: '不需要督促，自己也能制定学习计划，并能实施。' },
  { id: 128, dimension: '交往', age_stage: 7, age_min: 126, age_max: 200, title: '关心电视或报纸上报道的消息和新闻。' },
  { id: 129, dimension: '集体活动', age_stage: 7, age_min: 126, age_max: 200, title: '没有大人的指导，也能集体制定会议、郊游、体育活动等计划，并能付实行。' },
  { id: 130, dimension: '运动能力', age_stage: 7, age_min: 126, age_max: 200, title: '即使是没有去过的地方，也能通过问路或查找地图，独立到达目的地。' },
  { id: 131, dimension: '运动能力', age_stage: 7, age_min: 126, age_max: 200, title: '自己能恰当地利用交通工具，到达陌生的地方。' },
  { id: 132, dimension: '作业', age_stage: 7, age_min: 126, age_max: 200, title: '会修理简单的电器、家具等(如插口、插座、自行车等)。' }
];

// 导出题目数据初始化函数
export function initSMQuestions(db: any) {
  smQuestions.forEach(question => {
    db.run(`
      INSERT INTO sm_question (id, dimension, age_stage, age_min, age_max, title, audio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [question.id, question.dimension, question.age_stage, question.age_min, question.age_max, question.title, question.audio || null]);
  });
  console.log(`已插入 ${smQuestions.length} 道S-M量表题目`);
}