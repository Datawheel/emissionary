import type { ItemText } from './types';

/**
 * Simplified Chinese item text. In sentences names appear as "吹风机 10 分钟";
 * a space separates Chinese text from numbers and Latin units.
 */
export const ITEMS_ZH: ItemText = {
  electric_kettle: {
    name: '电热水壶',
    note: '将 1 L 20 °C 的水烧开需要 0.093 kWh 热量；浸入式加热元件的电热水壶能把约 85% 的电能传给水（范围 80–90%）。',
  },
  induction_hob: {
    name: '电磁炉（烧水）',
    note: '电磁炉烹饪效率约 84%（ENERGY STAR 家用电磁炉项目）。',
  },
  electric_hob: {
    name: '电热丝电炉（烧水）',
    note: '电热丝电炉的烹饪效率约 74%（美国能源部关于家用烹饪产品的技术支持文件）。',
  },
  gas_hob: {
    name: '燃气灶（烧水）',
    note: '燃气灶烹饪效率约 40%（美国能源部技术支持文件，高位热值口径）× 天然气燃烧排放因子 182.6 gCO₂/kWh（高位热值；DESNZ 2025，仅 CO₂）。各国相同。',
  },
  refrigerator: {
    name: '冰箱',
    note: '认证冰箱的中位数耗电量为每年 345 kWh（n=4,659，ENERGY STAR 数据集），全年平均约 39.4 W，已计入压缩机启停。',
  },
  chest_freezer: {
    name: '冰柜',
    note: '认证冰柜的中位数耗电量为每年 405 kWh（n=659，ENERGY STAR 数据集），全年平均约 46.2 W。',
  },
  dishwasher: {
    name: '洗碗机',
    note: '认证洗碗机中位数：按美国联邦标准每年 215 次的测试基准计，每年 239 kWh，约合每次 1.11 kWh（n=736，ENERGY STAR 数据集），含加热用水。',
    event: { other: '次' },
  },
  microwave: {
    name: '微波炉',
    note: '典型台式微波炉加热时功率约 1,100 W（产品类别额定输入功率，范围 900–1,500 W）。有待用认证数据核实。',
  },
  electric_oven: {
    name: '电烤箱',
    note: '电烤箱在约 200 °C 时，每使用一小时平均耗电约 2.0 kWh，已计入加热元件启停（产品类别惯例值）。有待用认证数据核实。',
  },
  gas_oven: {
    name: '燃气烤箱',
    note: '燃气烤箱在约 200 °C 时，每使用一小时燃烧约 3.0 kWh 燃气（热量，已计入燃烧器启停；产品类别惯例值）。各国相同。',
  },
  espresso_machine: {
    name: '意式咖啡机',
    note: '一杯意式浓缩咖啡约 0.02 kWh：加热约 40 mL 冲泡用水，加上锅炉损耗（物理估算；范围 0.01–0.05 kWh）。有待实测核实。',
    event: { other: '杯' },
  },
  toaster: {
    name: '烤面包机',
    note: '典型 2 片式烤面包机功率约 1,000 W（产品类别范围 800–1,500 W）。有待用认证数据核实。',
  },
  air_fryer: {
    name: '空气炸锅',
    note: '典型空气炸锅功率约 1,500 W，加热元件启停使平均功率略低（产品类别范围 1,200–1,800 W）。待核实。',
  },
  room_ac: {
    name: '空调（房间）',
    note: '10–14k BTU 认证房间空调的中位数制冷功率约 800 W（n=226，制冷量 ÷ CEER，ENERGY STAR 数据集）。',
  },
  space_heater: {
    name: '电暖器',
    note: '在北美，便携式电阻电暖器的额定功率为 1,500 W（欧洲通常为 2,000 W）；电阻加热在插座端的效率为 100%。',
  },
  heat_pump: {
    name: '热泵（供暖）',
    note: '一台热泵在季节性能效比（COP）约 3.5 时提供约 2.8 kW 热量，耗电约 800 W——每千瓦时热量约耗电 0.29 kWh。待核实。',
  },
  gas_boiler: {
    name: '燃气锅炉（供暖）',
    note: '家用燃气锅炉在供暖时燃烧约 12 kW 燃气（热功率；调节范围 8–24 kW）。各国相同。待核实。',
  },
  ceiling_fan: {
    name: '吊扇',
    note: '认证吊扇的中位数在高速档时功率为 29.8 W（n=1,384，ENERGY STAR 数据集）。',
  },
  dehumidifier: {
    name: '除湿机',
    note: '认证除湿机中位数：按 1,095 小时的测试基准计，每年 343 kWh，运行时约 313 W（n=523，ENERGY STAR 数据集）。',
  },
  electric_blanket: {
    name: '电热毯',
    note: '典型双人电热毯最高档功率约 150 W（产品类别范围 60–200 W）。待核实。',
  },
  hairdryer: {
    name: '吹风机',
    note: '典型家用吹风机最高档：约 1,800 W（产品类别范围 1,200–2,200 W）。有待用认证数据核实。',
  },
  electric_shower: {
    name: '淋浴（电热水器）',
    note: '使用即热式电热水器的淋浴在出水时功率约 9.5 kW（类别范围 7.5–10.5 kW）。',
  },
  hair_straightener: {
    name: '直发器',
    note: '直发器加热到温后平均功率约 120 W（范围 40–300 W）。待核实。',
  },
  electric_toothbrush: {
    name: '电动牙刷',
    note: '为约 1.4 Wh 的牙刷电池充满一次电，加上充电器损耗，约 0.002 kWh——几乎可以忽略不计，这正是重点。',
    event: { other: '次充电' },
  },
  washing_machine: {
    name: '洗衣机',
    note: '认证洗衣机中位数：按能效标签每年 234 次的基准计，每年 110 kWh，约合每次温水洗涤 0.47 kWh（n=393，ENERGY STAR 数据集；认证产品比平均水平更节能）。',
    event: { other: '次' },
  },
  tumble_dryer: {
    name: '干衣机',
    note: '认证电干衣机中位数：按每年 283 次的测试基准计，每年 608 kWh，约合每次 2.15 kWh（n=644，ENERGY STAR 数据集）。',
    event: { other: '次' },
  },
  iron: {
    name: '熨斗',
    note: '典型蒸汽熨斗额定功率约 1,400 W；恒温器启停使平均功率降低（范围 1,000–1,800 W）。待核实。',
  },
  vacuum_cleaner: {
    name: '吸尘器',
    note: '有线吸尘器功率约 1,200 W（范围 500–1,800 W；欧盟生态设计法规的上限为 900 W）。待核实。',
  },
  tv_55: {
    name: '55″ LED 电视',
    note: '认证 53–57″ 电视的中位数：按美国联邦测试程序，开机功率为 97.5 W（n=30，ENERGY STAR 数据集）。',
  },
  desktop_monitor: {
    name: '电脑显示器',
    note: '认证显示器的中位数开机功率为 28.7 W（n=2,789，ENERGY STAR 数据集）。',
  },
  laptop: {
    name: '笔记本电脑',
    note: '典型笔记本电脑在使用中功率约 50 W（视负载在 20–100 W 之间）。待核实。',
  },
  gaming_pc: {
    name: '游戏电脑',
    note: '中高端游戏台式机在游戏负载下功率约 350 W，不含显示器（范围 200–600 W）。有待实测核实。',
  },
  game_console: {
    name: '游戏机',
    note: '当代游戏机在游戏时功率约 160 W（范围 70–220 W）。有待实测核实。',
  },
  smartphone_charge: {
    name: '智能手机充电',
    note: '为约 13 Wh 的智能手机电池充满一次电，充电器效率约 85%，约 0.015 kWh。',
    event: { other: '次' },
  },
  tablet_charge: {
    name: '平板电脑充电',
    note: '为约 28 Wh 的平板电脑电池充满一次电，充电器效率约 85%，约 0.033 kWh。',
    event: { other: '次' },
  },
  wifi_router: {
    name: 'Wi-Fi 路由器',
    note: '家用 Wi-Fi 路由器持续耗电约 8 W（范围 5–20 W）。待核实。',
  },
  led_bulb: {
    name: '800 流明 LED 灯泡',
    note: '一只 800 流明的 LED 灯泡（亮度相当于传统 60 W 白炽灯）功率约 9 W（美国能源部 Energy Saver 照明指南，范围 8–10 W）。',
  },
  led_bulb_1600: {
    name: '1600 流明 LED 灯泡',
    note: '一只 1600 流明的明亮 LED 灯泡（相当于 100 W 级别）功率约 16 W（美国能源部 Energy Saver 照明指南，范围 14–20 W）。',
  },
  incandescent_bulb: {
    name: '800 流明白炽灯泡',
    note: '传统 60 W 白炽灯泡发出约 800 流明的光——与 9 W 的 LED 灯泡一样亮，却要消耗 6–7 倍的能量。',
  },
  incandescent_bulb_1600: {
    name: '1600 流明白炽灯泡',
    note: '100 W 白炽灯泡发出约 1600 流明的光——与 16 W 的 LED 灯泡一样亮。',
  },
  smart_speaker: {
    name: '智能音箱',
    note: '智能音箱待机或播放时功率约 3 W（范围 1.5–6 W）。有待实测核实。',
  },
  ereader_charge: {
    name: '电子阅读器充电',
    note: '为约 5 Wh 的电子阅读器电池充满一次电，充电器效率约 85%，约 0.006 kWh——够读好几周。',
    event: { other: '次' },
  },
  petrol_car: {
    name: '汽油车',
    note: '在已核实的情况下，采用你所在国家在用汽车每公里 CO₂ 排放的平均值（见换算表）；全球默认值为 160 g/km，约等于英国在用汽油车的平均水平（DESNZ 2025）。',
  },
  diesel_car: {
    name: '柴油车',
    note: '在用柴油车平均值：171.4 gCO₂/km（DESNZ 2025，仅 CO₂，英国车队——在所有国家均作为代表值使用）。',
  },
  ev_car: {
    name: '电动汽车',
    note: '最畅销电动汽车（2024 款 Tesla Model Y LR AWD）的 EPA 综合工况数据：从插座到车轮 28.7 kWh/100 英里，约合 0.178 kWh/km，含充电损耗。',
  },
  motor_scooter: {
    name: '踏板摩托车',
    note: '小型摩托车（≤125 cc）：80.9 gCO₂/km（DESNZ 2025，仅 CO₂）。',
  },
  city_bus: {
    name: '城市公交（人均）',
    note: '一辆平均载客约 12.7 人的普通城市公交：每人公里 103.1 gCO₂，仅 CO₂（DESNZ 2025／英国交通部公交统计）。公交越满，人均排放越少。',
  },
  coach: {
    name: '长途大巴（人均）',
    note: '一辆平均载客约 17.6 人的长途大巴：每人公里 27.3 gCO₂，仅 CO₂（DESNZ 2025）——是最清洁的机动出行方式之一。',
  },
  train_national: {
    name: '火车（人均）',
    note: '国家铁路平均值：每人公里 35.1 gCO₂，仅 CO₂——整个铁路网的能耗（电力和柴油列车）除以正常载客率下的全部人公里数（DESNZ 2025；全面电气化的铁路网有所不同）。',
  },
  flight_short_haul: {
    name: '短途航班（人均）',
    note: '经济舱短途航班，上座率约 83%（机队平均，CAA 2023）：每人公里 73.4 gCO₂，仅 CO₂，不含辐射强迫（DESNZ 2025；计入辐射强迫后气候影响约翻一番）。',
  },
  e_bike: {
    name: '电动自行车',
    note: '约 0.5 kWh 的电动自行车电池可提供约 45 km 的助力骑行，约合 0.011 kWh/km，含充电损耗。有待实测核实。',
  },
};
