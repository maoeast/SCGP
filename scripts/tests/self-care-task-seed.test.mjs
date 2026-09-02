import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import createJiti from 'jiti';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
});

function loadSeedModule() {
  return jiti('../../src/data/self-care-task-seed.ts');
}

test('self-care task seed exports 31 built-in task resources with normalized metadata', () => {
  const {
    SELF_CARE_TASK_SEED_RESOURCES,
    SELF_CARE_TASK_SEED_SUMMARY,
  } = loadSeedModule();

  assert.equal(SELF_CARE_TASK_SEED_SUMMARY.totalTasks, 31);
  assert.equal(SELF_CARE_TASK_SEED_RESOURCES.length, 31);
  assert.equal(SELF_CARE_TASK_SEED_SUMMARY.totalSteps > 200, true);

  const spoonTask = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'EAT_SPOON_001');
  assert.ok(spoonTask);
  assert.equal(spoonTask.category, '使用勺子');
  assert.equal(spoonTask.coverImage, 'images/tasks/EAT_SPOON_001_cover.jpg');
  assert.equal(spoonTask.metadata.trainingEntryCode, 'life-skills');
  assert.equal(spoonTask.metadata.steps.length, 8);
  assert.equal(spoonTask.metadata.steps[0]?.imagePath, 'resource://images/tasks/EAT_SPOON_001/1.png');
  assert.deepEqual(spoonTask.metadata.abilityItem, {
    id: 'feed_01',
    name: '独立进食',
  });
});

test('self-care task seed mode validates explicit values and falls back to a supported mode', () => {
  const { resolveSelfCareTaskSeedMode } = loadSeedModule();

  assert.equal(resolveSelfCareTaskSeedMode('overwrite'), 'overwrite');
  assert.equal(resolveSelfCareTaskSeedMode('preserve'), 'preserve');
  assert.equal(resolveSelfCareTaskSeedMode('missing-only'), 'missing-only');
  assert.equal(['overwrite', 'missing-only'].includes(resolveSelfCareTaskSeedMode('unexpected-mode')), true);
});


test('upgradeSeedTaskStepsImagePaths upgrades cover placeholders only', () => {
  const { upgradeSeedTaskStepsImagePaths } = loadSeedModule();

  const seedMeta = {
    trainingMode: 'step_task',
    trainingEntryCode: 'life-skills',
    steps: [
      { id: 'step_1', seq: 1, text: '步骤一', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/1.png' },
      { id: 'step_2', seq: 2, text: '步骤二', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/2.png' },
      { id: 'step_3', seq: 3, text: '步骤三', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/3.png' },
    ],
  };

  // 1) 封面占位 → 升级为真图，其余字段保留
  const legacyMeta = JSON.stringify({
    trainingMode: 'step_task',
    trainingEntryCode: 'life-skills',
    steps: [
      { id: 'legacy_1', seq: 1, text: '步骤一（用户改动文案）', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'legacy_2', seq: 2, text: '步骤二', imagePath: '' },
      { id: 'legacy_3', seq: 3, text: '步骤三', imagePath: null },
    ],
  });
  const upgraded = upgradeSeedTaskStepsImagePaths(legacyMeta, seedMeta, 'FOLD_CLOTHES_001');
  assert.ok(upgraded);
  const parsed = JSON.parse(upgraded);
  assert.equal(parsed.steps[0].imagePath, 'resource://images/tasks/FOLD_CLOTHES_001/1.png');
  assert.equal(parsed.steps[0].text, '步骤一（用户改动文案）');
  assert.equal(parsed.steps[0].id, 'legacy_1');
  assert.equal(parsed.steps[1].imagePath, 'resource://images/tasks/FOLD_CLOTHES_001/2.png');
  assert.equal(parsed.steps[2].imagePath, 'resource://images/tasks/FOLD_CLOTHES_001/3.png');

  // 2) 步骤数相同且已有真实图像 → 不动
  const alreadyReal = JSON.stringify({
    steps: [
      { id: 'step_1', seq: 1, text: '步骤一', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/1.png' },
      { id: 'step_2', seq: 2, text: '步骤二', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/2.png' },
      { id: 'step_3', seq: 3, text: '步骤三', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/3.png' },
    ],
  });
  assert.equal(upgradeSeedTaskStepsImagePaths(alreadyReal, seedMeta, 'FOLD_CLOTHES_001'), null);

  // 2c) 步骤数不同但全部为 seed 编号路径（seed 写入布局）→ 可替换（旧布局重组）
  const numberedLayout = JSON.stringify({
    steps: [
      { id: 'step_1', seq: 1, text: '旧一', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/1.png' },
      { id: 'step_2', seq: 2, text: '旧二', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001/2.png' },
    ],
  });
  const numberedResult = upgradeSeedTaskStepsImagePaths(numberedLayout, seedMeta, 'FOLD_CLOTHES_001');
  assert.ok(numberedResult);
  assert.equal(JSON.parse(numberedResult).steps.length, 3);

  // 2b) 步骤数变化（旧 7 步 → seed 5 步）：整体替换为 seed 权威 steps
  const sevenSteps = JSON.stringify({
    trainingMode: 'step_task',
    trainingEntryCode: 'life-skills',
    legacyTaskCode: 'FOLD_CLOTHES_001',
    steps: [
      { id: 'old_1', seq: 1, text: '旧文案1', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_2', seq: 2, text: '旧文案2', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_3', seq: 3, text: '旧文案3', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_4', seq: 4, text: '旧文案4', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_5', seq: 5, text: '旧文案5', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_6', seq: 6, text: '旧文案6', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
      { id: 'old_7', seq: 7, text: '旧文案7', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
    ],
  });
  const replaced = upgradeSeedTaskStepsImagePaths(sevenSteps, seedMeta, 'FOLD_CLOTHES_001');
  assert.ok(replaced);
  const replacedParsed = JSON.parse(replaced);
  assert.equal(replacedParsed.steps.length, 3);
  assert.equal(replacedParsed.steps[0].text, '步骤一');
  assert.equal(replacedParsed.steps[0].imagePath, 'resource://images/tasks/FOLD_CLOTHES_001/1.png');

  // 3) seed 未提供编号真图（封面） → 不动
  const coverSeedMeta = {
    trainingMode: 'step_task',
    trainingEntryCode: 'life-skills',
    steps: [
      { id: 'step_1', seq: 1, text: '步骤一', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
    ],
  };
  const coverLegacy = JSON.stringify({
    steps: [
      { id: 'step_1', seq: 1, text: '步骤一', imagePath: 'resource://images/tasks/FOLD_CLOTHES_001_cover.jpg' },
    ],
  });
  assert.equal(upgradeSeedTaskStepsImagePaths(coverLegacy, coverSeedMeta, 'FOLD_CLOTHES_001'), null);

  // 4) 步骤数不同但含用户上传路径（uploaded）→ 不动（用户内容保护）
  const userEdited = JSON.stringify({
    steps: [
      { id: 'old_1', seq: 1, text: '旧文案1', imagePath: 'resource://uploaded/ai-scenes/mine.png' },
      { id: 'old_2', seq: 2, text: '旧文案2', imagePath: 'resource://uploaded/ai-scenes/mine2.png' },
    ],
  });
  assert.equal(upgradeSeedTaskStepsImagePaths(userEdited, seedMeta, 'FOLD_CLOTHES_001'), null);

  // 5) 非法 JSON / 空输入 → null
  assert.equal(upgradeSeedTaskStepsImagePaths('not-json', seedMeta, 'FOLD_CLOTHES_001'), null);
  assert.equal(upgradeSeedTaskStepsImagePaths(null, seedMeta, 'FOLD_CLOTHES_001'), null);
});

test('CROSS_ROAD / ASK_DIRECTIONS 步骤与老库图片对齐（8→6、7→5）', () => {
  const { SELF_CARE_TASK_SEED_RESOURCES } = loadSeedModule();

  const crossRoad = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'CROSS_ROAD_001');
  assert.ok(crossRoad);
  assert.equal(crossRoad.metadata.steps.length, 6);
  assert.equal(crossRoad.metadata.steps[3]?.text, '绿灯亮起，面向马路对面准备通行');
  assert.equal(crossRoad.metadata.steps[4]?.text, '举起一只手示意，快速走过斑马线');
  assert.equal(crossRoad.metadata.steps[5]?.text, '到达马路对面，安全通过');
  assert.equal(crossRoad.metadata.steps[4]?.imagePath, 'resource://images/tasks/CROSS_ROAD_001/5.png');
  assert.equal(crossRoad.metadata.steps[5]?.imagePath, 'resource://images/tasks/CROSS_ROAD_001/6.png');

  const askDirections = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'ASK_DIRECTIONS_001');
  assert.ok(askDirections);
  assert.equal(askDirections.metadata.steps.length, 5);
  assert.equal(askDirections.metadata.steps[0]?.text, '发现迷路后先走到安全处原地站好');
  assert.equal(askDirections.metadata.steps[2]?.text, '走上前去，看着警察的眼睛大声说出“请帮帮我”');
  assert.equal(askDirections.metadata.steps[4]?.text, '等待警察联系家人来接');
  assert.equal(askDirections.metadata.steps[4]?.imagePath, 'resource://images/tasks/ASK_DIRECTIONS_001/5.png');
});

test('DRINK_WATER / SUPERMARKET_SHOPPING 步骤与老库图片对齐', () => {
  const { SELF_CARE_TASK_SEED_RESOURCES } = loadSeedModule();

  const drink = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'DRINK_WATER_001');
  assert.ok(drink);
  assert.equal(drink.metadata.steps.length, 7);
  assert.equal(drink.metadata.steps[5]?.text, '小口啜饮，吞咽口水');
  assert.equal(drink.metadata.steps[6]?.text, '将杯身回正，平稳放回桌面');
  assert.equal(drink.metadata.steps[6]?.imagePath, 'resource://images/tasks/DRINK_WATER_001/7.png');

  const market = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'SUPERMARKET_SHOPPING_001');
  assert.ok(market);
  assert.equal(market.metadata.steps.length, 8);
  assert.equal(market.metadata.steps[3]?.text, '到称重台称重，看清楚价格标签');
  assert.equal(market.metadata.steps[6]?.text, '出示付款码，完成支付');
  assert.equal(market.metadata.steps[7]?.text, '提好购物袋，离开超市');
  assert.equal(market.metadata.steps[6]?.imagePath, 'resource://images/tasks/SUPERMARKET_SHOPPING_001/7.png');
});

test('EXPRESS_TOILET / WEAR_SHIRT / WEAR_PANTS / WEAR_SHOES 步骤与老库图片对齐', () => {
  const { SELF_CARE_TASK_SEED_RESOURCES } = loadSeedModule();

  const expr = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'EXPRESS_TOILET_001');
  assert.ok(expr);
  assert.equal(expr.metadata.steps.length, 5);
  assert.equal(expr.metadata.steps[2]?.text, '找到老师或家长，指一指厕所方向');
  assert.equal(expr.metadata.steps[4]?.text, '脱下裤子，坐在马桶上');
  assert.equal(expr.metadata.steps[4]?.imagePath, 'resource://images/tasks/EXPRESS_TOILET_001/5.png');

  const shirt = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'WEAR_SHIRT_001');
  assert.ok(shirt);
  assert.equal(shirt.metadata.steps.length, 4);
  assert.equal(shirt.metadata.steps[3]?.imagePath, 'resource://images/tasks/WEAR_SHIRT_001/4.png');

  const pants = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'WEAR_PANTS_001');
  assert.ok(pants);
  assert.equal(pants.metadata.steps.length, 4);
  assert.equal(pants.metadata.steps[2]?.text, '站起来，把裤腰拉到腰部');
  assert.equal(pants.metadata.steps[3]?.imagePath, 'resource://images/tasks/WEAR_PANTS_001/4.png');

  const shoes = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'WEAR_SHOES_001');
  assert.ok(shoes);
  assert.equal(shoes.metadata.steps.length, 5);
  assert.equal(shoes.metadata.steps[4]?.text, '站起来跺跺脚，检查穿好');
  assert.equal(shoes.metadata.steps[4]?.imagePath, 'resource://images/tasks/WEAR_SHOES_001/selfcare-shoes-m6-step6.png');
});

test('BRUSH_TEETH / BOY_URINATE / GIRL_URINATE 使用旧版拆步图', () => {
  const { SELF_CARE_TASK_SEED_RESOURCES } = loadSeedModule();

  const brush = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'BRUSH_TEETH_001');
  assert.ok(brush);
  assert.equal(brush.metadata.steps.length, 9);
  assert.equal(brush.metadata.steps[2]?.text, '刷上排牙齿外侧');
  assert.equal(brush.metadata.steps[7]?.text, '含水漱口鼓动腮部几次，吐出漱口水，清洗牙刷');
  assert.equal(brush.metadata.steps[7]?.imagePath, 'resource://images/tasks/BRUSH_TEETH_001/9.png');
  assert.equal(brush.metadata.steps[8]?.text, '把牙杯和牙刷放回原处');
  assert.equal(brush.metadata.steps[8]?.imagePath, 'resource://images/tasks/BRUSH_TEETH_001/10.png');

  const boy = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'BOY_URINATE_001');
  assert.ok(boy);
  assert.equal(boy.metadata.steps.length, 8);
  assert.equal(boy.metadata.steps[1]?.text, '掀起马桶座圈');
  assert.equal(boy.metadata.steps[6]?.text, '按压冲水按钮，把马桶冲干净');
  assert.equal(boy.metadata.steps[6]?.imagePath, 'resource://images/tasks/BOY_URINATE_001/7.png');
  assert.equal(boy.metadata.steps[7]?.text, '用洗手液把手洗干净');
  assert.equal(boy.metadata.steps[7]?.imagePath, 'resource://images/tasks/BOY_URINATE_001/8.png');

  const girl = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'GIRL_URINATE_001');
  assert.ok(girl);
  assert.equal(girl.metadata.steps.length, 10);
  assert.equal(girl.metadata.steps[2]?.text, '脱下裤子');
  assert.equal(girl.metadata.steps[7]?.text, '把手纸丢进马桶');
  assert.equal(girl.metadata.steps[7]?.imagePath, 'resource://images/tasks/GIRL_URINATE_001/8.png');
  assert.equal(girl.metadata.steps[8]?.imagePath, 'resource://images/tasks/GIRL_URINATE_001/9.png');
  assert.equal(girl.metadata.steps[9]?.imagePath, 'resource://images/tasks/GIRL_URINATE_001/10.png');
});

test('wave1 四任务步骤图入库对齐（书包6/扫地7/擦桌7/乘车8）', () => {
  const { SELF_CARE_TASK_SEED_RESOURCES } = loadSeedModule();

  const pack = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'PACK_SCHOOLBAG_001');
  assert.ok(pack);
  assert.equal(pack.metadata.steps.length, 6);
  assert.equal(pack.metadata.steps[4]?.text, '拉好所有拉链');
  assert.equal(pack.metadata.steps[4]?.imagePath, 'resource://images/tasks/PACK_SCHOOLBAG_001/5.png');

  const sweep = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'SWEEP_FLOOR_001');
  assert.ok(sweep);
  assert.equal(sweep.metadata.steps.length, 7);
  assert.equal(sweep.metadata.steps[6]?.text, '将扫把和簸箕放回墙角归位');
  assert.equal(sweep.metadata.steps[6]?.imagePath, 'resource://images/tasks/SWEEP_FLOOR_001/7.png');

  const wipe = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'WIPE_TABLE_001');
  assert.ok(wipe);
  assert.equal(wipe.metadata.steps.length, 7);
  assert.equal(wipe.metadata.steps[6]?.imagePath, 'resource://images/tasks/WIPE_TABLE_001/7.png');

  const bus = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'TAKE_BUS_001');
  assert.ok(bus);
  assert.equal(bus.metadata.steps.length, 8);
  assert.equal(bus.metadata.steps[2]?.imagePath, 'resource://images/tasks/TAKE_BUS_001/3.png');
  assert.equal(bus.metadata.steps[7]?.imagePath, 'resource://images/tasks/TAKE_BUS_001/8.png');
});






