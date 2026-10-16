import packageInfo from '../../package.json'

/** 仅用于激活页展示，更换产品时在此配置，不参与许可证校验或设备识别。 */
export const activationPageConfig = {
  product: {
    name: '星愿能力发展平台',
    logo: './xc.png',
    useSystemLogo: false,
    version: packageInfo.version,
  },
  support: {
    company: '杭州炫灿科技有限公司',
    phone: '0571-86087889',
    hours: '',
    wechat: 'xuancankefu',
    email: '',
  },
  faq: [
    '激活码只对当前电脑有效，换电脑需重新申请。',
    '支持永久激活和限时激活（如 1 年、3 年）。',
    '激活信息保存在本机。',
  ],
} as const
