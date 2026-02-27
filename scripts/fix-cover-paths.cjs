/**
 * 修复 sample-tasks.ts 中的封面图片路径
 * 从 /resources/tasks/xxx_cover.jpg 改为 tasks/XXX_XXX_cover.jpg
 */

const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../src/database/sample-tasks.ts')
let content = fs.readFileSync(filePath, 'utf-8')

// 旧路径到新路径的映射（小写到大写）
const pathMap = {
  '/resources/tasks/eat_spoon_cover.jpg': 'tasks/EAT_SPOON_001_cover.jpg',
  '/resources/tasks/eat_chopsticks_cover.jpg': 'tasks/EAT_CHOPSTICKS_001_cover.jpg',
  '/resources/tasks/drink_water_cover.jpg': 'tasks/DRINK_WATER_001_cover.jpg',
  '/resources/tasks/wash_hands_cover.jpg': 'tasks/WASH_HANDS_001_cover.jpg',
  '/resources/tasks/squeeze_toothpaste_cover.jpg': 'tasks/SQUEEZE_TOOTHPASTE_001_cover.jpg',
  '/resources/tasks/brush_teeth_cover.jpg': 'tasks/BRUSH_TEETH_001_cover.jpg',
  '/resources/tasks/wash_face_cover.jpg': 'tasks/WASH_FACE_001_cover.jpg',
  '/resources/tasks/comb_hair_cover.jpg': 'tasks/COMB_HAIR_001_cover.jpg',
  '/resources/tasks/blow_nose_cover.jpg': 'tasks/BLOW_NOSE_001_cover.jpg',
  '/resources/tasks/take_shower_cover.jpg': 'tasks/TAKE_SHOWER_001_cover.jpg',
  '/resources/tasks/wear_shirt_cover.jpg': 'tasks/WEAR_SHIRT_001_cover.jpg',
  '/resources/tasks/take_off_shirt_cover.jpg': 'tasks/TAKE_OFF_SHIRT_001_cover.jpg',
  '/resources/tasks/wear_pants_cover.jpg': 'tasks/WEAR_PANTS_001_cover.jpg',
  '/resources/tasks/take_off_pants_cover.jpg': 'tasks/TAKE_OFF_PANTS_001_cover.jpg',
  '/resources/tasks/wear_socks_cover.jpg': 'tasks/WEAR_SOCKS_001_cover.jpg',
  '/resources/tasks/wear_shoes_cover.jpg': 'tasks/WEAR_SHOES_001_cover.jpg',
  '/resources/tasks/tie_shoelaces_cover.jpg': 'tasks/TIE_SHOELACES_001_cover.jpg',
  '/resources/tasks/button_unbutton_cover.jpg': 'tasks/BUTTON_UNBUTTON_001_cover.jpg',
  '/resources/tasks/express_toilet_cover.jpg': 'tasks/EXPRESS_TOILET_001_cover.jpg',
  '/resources/tasks/boy_urinate_cover.jpg': 'tasks/BOY_URINATE_001_cover.jpg',
  '/resources/tasks/girl_urinate_cover.jpg': 'tasks/GIRL_URINATE_001_cover.jpg',
  '/resources/tasks/defecate_cover.jpg': 'tasks/DEFECATE_001_cover.jpg',
  '/resources/tasks/pack_schoolbag_cover.jpg': 'tasks/PACK_SCHOOLBAG_001_cover.jpg',
  '/resources/tasks/make_bed_cover.jpg': 'tasks/MAKE_BED_001_cover.jpg',
  '/resources/tasks/wipe_table_cover.jpg': 'tasks/WIPE_TABLE_001_cover.jpg',
  '/resources/tasks/sweep_floor_cover.jpg': 'tasks/SWEEP_FLOOR_001_cover.jpg',
  '/resources/tasks/fold_clothes_cover.jpg': 'tasks/FOLD_CLOTHES_001_cover.jpg',
  '/resources/tasks/supermarket_shopping_cover.jpg': 'tasks/SUPERMARKET_SHOPPING_001_cover.jpg',
  '/resources/tasks/take_bus_cover.jpg': 'tasks/TAKE_BUS_001_cover.jpg',
  '/resources/tasks/cross_road_cover.jpg': 'tasks/CROSS_ROAD_001_cover.jpg',
  '/resources/tasks/ask_directions_cover.jpg': 'tasks/ASK_DIRECTIONS_001_cover.jpg'
}

// 替换路径
for (const [oldPath, newPath] of Object.entries(pathMap)) {
  content = content.replaceAll(oldPath, newPath)
}

fs.writeFileSync(filePath, content, 'utf-8')
console.log('✅ 封面路径已更新')
console.log(`共替换了 ${Object.keys(pathMap).length} 个路径`)
