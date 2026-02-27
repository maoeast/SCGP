/**
 * Word 文档导出工具
 * 基于 docx.js 库，统一导出真正的 .docx 格式文档
 */

import {
  Document, Paragraph, TextRun, Table, TableCell, TableRow,
  HeadingLevel, AlignmentType, BorderStyle, WidthType,
  convertInchesToTwip, Packer, Header, Footer, PageNumber
} from 'docx'
import { saveAs } from 'file-saver'

// ===== 类型定义 =====

export interface StudentInfo {
  name: string
  gender: string
  age: number
  birthday: string
}

export interface DimensionScore {
  name: string
  rawScore: number
  tScore?: number
  percentScore?: number
  level: string
  description?: string
  advice?: string
}

export interface SMExportData {
  student: StudentInfo
  assessment: {
    id: string
    date: string
    raw_score: number
    sq_score: number
    level: string
    age_stage: string
  }
  dimensions: {
    communication: { pass: number; total: number }
    work: { pass: number; total: number }
    movement: { pass: number; total: number }
    independent_life: { pass: number; total: number }
    self_management: { pass: number; total: number }
    group_activity: { pass: number; total: number }
  }
  suggestions: string[]
  guidance: string[]
}

export interface WeeFIMExportData {
  student: StudentInfo
  assessment: {
    id: string
    date: string
    total_score: number
    motor_score: number
    cognitive_score: number
    level: string
  }
  categories: Array<{
    name: string
    score: number
    maxScore: number
    items: Array<{ title: string; score: number; level: string }>
  }>
  suggestions: {
    shortTerm: string[]
    longTerm: string[]
    training: string[]
    environment: string[]
  }
}

export interface CSIRSExportData {
  student: StudentInfo
  assessment: {
    id: string
    date: string
    total_t_score: number
    level: string
  }
  dimensions: DimensionScore[]
  summary: string
  advice: string[]
}

export interface ConnersExportData {
  student: StudentInfo
  assessment: {
    id: string
    date: string
    scaleType: 'psq' | 'trs'
    pi_score: number
    ni_score: number
    is_valid: boolean
    invalid_reason?: string
  }
  dimensions: DimensionScore[]
  totalScore: number
  totalLevel: string
  summary: string
  advice: string[]
}

export interface EquipmentIEPExportData {
  student: StudentInfo
  reportDate: string
  records: Array<{
    equipmentName: string
    categoryName: string
    score: number
    promptLevel: string
    trainingDate: string
    notes?: string
    performance: string
    suggestions: string[]
  }>
  summary: {
    totalRecords: number
    categoryBreakdown: Record<string, number>
    averageScore: number
  }
}

// ===== 样式常量 =====

const STYLES = {
  title: {
    font: 'Microsoft YaHei',
    size: 32, // 16pt
    bold: true,
    color: '333333'
  },
  heading1: {
    font: 'Microsoft YaHei',
    size: 28, // 14pt
    bold: true,
    color: '333333'
  },
  heading2: {
    font: 'Microsoft YaHei',
    size: 24, // 12pt
    bold: true,
    color: '333333'
  },
  normal: {
    font: 'Microsoft YaHei',
    size: 21, // 10.5pt
    color: '333333'
  },
  small: {
    font: 'Microsoft YaHei',
    size: 18, // 9pt
    color: '666666'
  }
}

const BORDERS = {
  table: {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  }
}

// ===== 辅助函数 =====

function createTitle(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  })
}

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' }
    }
  })
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 }
  })
}

function createNormalParagraph(text: string, options?: { bold?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        color: options?.color,
        font: STYLES.normal.font,
        size: STYLES.normal.size
      })
    ],
    spacing: { after: 100 }
  })
}

function createInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
        })]
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: value, font: STYLES.normal.font, size: STYLES.normal.size })]
        })]
      })
    ]
  })
}

function createSignatureSection(): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      children: [
        new TextRun({ text: '评估师签名：', font: STYLES.normal.font, size: STYLES.normal.size }),
        new TextRun({ text: '__________________', font: STYLES.normal.font, size: STYLES.normal.size })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '日期：', font: STYLES.normal.font, size: STYLES.normal.size }),
        new TextRun({ text: '__________________', font: STYLES.normal.font, size: STYLES.normal.size })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '机构盖章：', font: STYLES.normal.font, size: STYLES.normal.size }),
        new TextRun({ text: '__________________', font: STYLES.normal.font, size: STYLES.normal.size })
      ]
    })
  ]
}

// ===== S-M 量表导出 =====

export async function exportSMToWord(data: SMExportData, filename: string): Promise<void> {
  const levelTextMap: Record<string, string> = {
    extremely_severe: '极重度',
    severe: '重度',
    moderate: '中度',
    mild: '轻度',
    borderline: '边缘',
    normal: '正常',
    good: '良好',
    excellent: '优秀',
    outstanding: '非常优秀'
  }

  const dimNameMap: Record<string, string> = {
    communication: '交往',
    work: '作业',
    movement: '运动能力',
    independent_life: '独立生活能力',
    self_management: '自我管理',
    group_activity: '集体活动'
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: [
        createTitle('婴儿-初中生社会生活能力量表评估报告'),

        createHeading1('一、基本信息'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('姓名', data.student.name),
            createInfoRow('性别', data.student.gender),
            createInfoRow('年龄', `${data.student.age}岁`),
            createInfoRow('评估日期', data.assessment.date)
          ]
        }),

        createHeading1('二、评估结果'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('粗分', data.assessment.raw_score.toString()),
            createInfoRow('标准分', data.assessment.sq_score.toString()),
            createInfoRow('评定等级', levelTextMap[data.assessment.level] || data.assessment.level)
          ]
        }),

        createHeading1('三、各维度得分'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: '维度', bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
                  })]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: '得分', bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
                  })]
                })
              ]
            }),
            ...Object.entries(data.dimensions).map(([key, dim]) => new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(dimNameMap[key] || key)]
                }),
                new TableCell({
                  children: [new Paragraph(`${dim.pass}/${dim.total}`)]
                })
              ]
            }))
          ]
        }),

        createHeading1('四、训练建议'),
        ...data.suggestions.map(s => createNormalParagraph(`• ${s}`)),

        createHeading1('五、家庭训练指导'),
        ...data.guidance.map(g => createNormalParagraph(`• ${g}`)),

        ...createSignatureSection()
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}

// ===== WeeFIM 量表导出 =====

export async function exportWeeFIMToWord(data: WeeFIMExportData, filename: string): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: [
        createTitle('改良儿童功能独立性评估量表报告'),

        createHeading1('一、基本信息'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('姓名', data.student.name),
            createInfoRow('性别', data.student.gender),
            createInfoRow('年龄', `${data.student.age}岁`),
            createInfoRow('评估日期', data.assessment.date)
          ]
        }),

        createHeading1('二、评估结果总览'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('总得分', `${data.assessment.total_score}/126`),
            createInfoRow('运动功能得分', `${data.assessment.motor_score}/91`),
            createInfoRow('认知功能得分', `${data.assessment.cognitive_score}/35`),
            createInfoRow('独立性等级', data.assessment.level)
          ]
        }),

        createHeading1('三、各领域得分详情'),
        ...data.categories.flatMap(cat => [
          createHeading2(cat.name),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDERS.table,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: '评估项目', bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
                    })]
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: '得分', bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
                    })]
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: '等级', bold: true, font: STYLES.normal.font, size: STYLES.normal.size })]
                    })]
                  })
                ]
              }),
              ...cat.items.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(item.title)] }),
                  new TableCell({ children: [new Paragraph(`${item.score}/7`)] }),
                  new TableCell({ children: [new Paragraph(item.level)] })
                ]
              }))
            ]
          })
        ]),

        createHeading1('四、康复建议'),
        createHeading2('短期目标（1-3个月）'),
        ...data.suggestions.shortTerm.map(s => createNormalParagraph(`• ${s}`)),

        createHeading2('长期目标（6-12个月）'),
        ...data.suggestions.longTerm.map(s => createNormalParagraph(`• ${s}`)),

        createHeading2('训练建议'),
        ...data.suggestions.training.map(s => createNormalParagraph(`• ${s}`)),

        createHeading2('环境改造建议'),
        ...data.suggestions.environment.map(s => createNormalParagraph(`• ${s}`)),

        ...createSignatureSection()
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}

// ===== CSIRS 量表导出 =====

export async function exportCSIRSToWord(data: CSIRSExportData, filename: string): Promise<void> {
  const levelColorMap: Record<string, string> = {
    '非常优秀': '67C23A',
    '优秀': '67C23A',
    '正常': '909399',
    '偏低': 'E6A23C',
    '严重偏低': 'F56C6C'
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: [
        createTitle('CSIRS 感觉统合评估报告'),

        createHeading1('一、基本信息'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('姓名', data.student.name),
            createInfoRow('性别', data.student.gender),
            createInfoRow('年龄', `${data.student.age}岁`),
            createInfoRow('评估日期', data.assessment.date)
          ]
        }),

        createHeading1('二、评估结果总览'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('总T分', data.assessment.total_t_score.toFixed(1)),
            createInfoRow('评定等级', data.assessment.level)
          ]
        }),
        createNormalParagraph(data.summary),

        createHeading1('三、各维度详细得分'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '维度', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '原始分', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'T分/百分制', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '等级', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '评估', bold: true })] })]
                })
              ]
            }),
            ...data.dimensions.map(dim => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(dim.name)] }),
                new TableCell({ children: [new Paragraph(dim.rawScore.toString())] }),
                new TableCell({
                  children: [new Paragraph(
                    dim.tScore ? dim.tScore.toFixed(1) : dim.percentScore?.toFixed(1) || '-'
                  )]
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: dim.level,
                      color: levelColorMap[dim.level] || '333333'
                    })]
                  })]
                }),
                new TableCell({ children: [new Paragraph(dim.description || '')] })
              ]
            }))
          ]
        }),

        createHeading1('四、专业建议'),
        ...data.advice.map(a => createNormalParagraph(`• ${a}`)),

        ...createSignatureSection()
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}

// ===== Conners 量表导出（PSQ/TRS） =====

export async function exportConnersToWord(data: ConnersExportData, filename: string): Promise<void> {
  const scaleTypeText = data.assessment.scaleType === 'psq' ? '父母问卷 (PSQ)' : '教师问卷 (TRS)'

  const levelColorMap: Record<string, string> = {
    normal: '67C23A',
    borderline: 'E6A23C',
    clinical: 'F56C6C'
  }

  const levelTextMap: Record<string, string> = {
    normal: '正常范围',
    borderline: '临界偏高',
    clinical: '临床显著'
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: [
        createTitle(`Conners 儿童行为问卷评估报告`),
        new Paragraph({
          text: scaleTypeText,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        createHeading1('一、基本信息'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('姓名', data.student.name),
            createInfoRow('性别', data.student.gender),
            createInfoRow('年龄', `${data.student.age}岁`),
            createInfoRow('评估日期', data.assessment.date)
          ]
        }),

        createHeading1('二、问卷质量检查'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('正向指标 (PI)', data.assessment.pi_score.toFixed(2)),
            createInfoRow('负向指标 (NI)', data.assessment.ni_score.toFixed(2)),
            createInfoRow('效度状态', data.assessment.is_valid ? '有效' : '需留意')
          ]
        }),
        ...(data.assessment.invalid_reason ? [createNormalParagraph(`注意：${data.assessment.invalid_reason}`, { color: 'E6A23C' })] : []),

        createHeading1('三、评估结果总览'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('多动指数 T分', data.totalScore.toFixed(1)),
            createInfoRow('评定等级', levelTextMap[data.totalLevel] || data.totalLevel)
          ]
        }),
        createNormalParagraph(data.summary),

        createHeading1('四、各维度详细得分'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '维度', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '原始分', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'T分', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '等级', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '评估', bold: true })] })]
                })
              ]
            }),
            ...data.dimensions.map(dim => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(dim.name)] }),
                new TableCell({ children: [new Paragraph(dim.rawScore.toFixed(2))] }),
                new TableCell({ children: [new Paragraph(dim.tScore?.toFixed(1) || '-')] }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: levelTextMap[dim.level] || dim.level,
                      color: levelColorMap[dim.level] || '333333'
                    })]
                  })]
                }),
                new TableCell({
                  children: [new Paragraph(dim.tScore && dim.tScore >= 60 ? '需关注' : '正常')]
                })
              ]
            }))
          ]
        }),

        ...(data.advice.length > 0 ? [
          createHeading1('五、专业建议'),
          ...data.advice.map(a => createNormalParagraph(`• ${a}`))
        ] : []),

        ...createSignatureSection()
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}

// ===== 器材训练 IEP 导出 =====

export async function exportEquipmentIEPToWord(data: EquipmentIEPExportData, filename: string): Promise<void> {
  const categoryNameMap: Record<string, string> = {
    tactile: '触觉系统',
    olfactory: '嗅觉系统',
    visual: '视觉系统',
    auditory: '听觉系统',
    gustatory: '味觉系统',
    proprioceptive: '本体觉系统',
    integration: '感官综合箱'
  }

  const promptLevelMap: Record<number, string> = {
    1: '独立完成',
    2: '口头提示',
    3: '视觉提示',
    4: '手触引导',
    5: '身体辅助'
  }

  // 辅助函数：创建星星评分显示
  function createStarRating(score: number): Paragraph {
    const stars = '★'.repeat(score) + '☆'.repeat(5 - score)
    return new Paragraph({
      children: [
        new TextRun({
          text: stars,
          color: 'FFB800',
          size: 28
        })
      ],
      spacing: { after: 100 }
    })
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: [
        createTitle('器材训练 IEP 评估报告'),

        createHeading1('一、基本信息'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('姓名', data.student.name),
            createInfoRow('性别', data.student.gender),
            createInfoRow('年龄', `${data.student.age}岁`),
            createInfoRow('报告日期', data.reportDate)
          ]
        }),

        createHeading1('二、训练统计'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            createInfoRow('总训练次数', `${data.summary.totalRecords}次`),
            createInfoRow('平均得分', data.summary.averageScore.toFixed(1)),
            createInfoRow('平均星级', `${'★'.repeat(Math.round(data.summary.averageScore))}${'☆'.repeat(5 - Math.round(data.summary.averageScore))}`)
          ]
        }),

        createHeading2('分类统计'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDERS.table,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '感官领域', bold: true })] })]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: '训练次数', bold: true })] })]
                })
              ]
            }),
            ...Object.entries(data.summary.categoryBreakdown).map(([cat, count]) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(categoryNameMap[cat] || cat)] }),
                new TableCell({ children: [new Paragraph(`${count}次`)] })
              ]
            }))
          ]
        }),

        createHeading1('三、训练记录详情'),
        ...data.records.flatMap((record, index) => [
          createHeading2(`记录 ${index + 1}：${record.equipmentName}`),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDERS.table,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph('器材名称')] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph('感官领域')] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph('评分')] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph('辅助等级')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(record.equipmentName)] }),
                  new TableCell({ children: [new Paragraph(record.categoryName)] }),
                  new TableCell({ children: [createStarRating(record.score)] }),
                  new TableCell({ children: [new Paragraph(record.promptLevel)] })
                ]
              })
            ]
          }),

          createHeading2('表现评估'),
          createNormalParagraph(record.performance),

          ...(record.notes ? [
            createHeading2('训练备注'),
            createNormalParagraph(record.notes)
          ] : []),

          createHeading2('训练建议'),
          ...record.suggestions.map(s => createNormalParagraph(`• ${s}`)),

          new Paragraph({ text: '', spacing: { after: 300 } })
        ]),

        createHeading1('四、综合评估'),
        createNormalParagraph(`本次训练共计 ${data.summary.totalRecords} 项，平均得分 ${data.summary.averageScore.toFixed(1)} 分。学生整体表现${data.summary.averageScore >= 4 ? '优异，各项能力发展良好' : data.summary.averageScore >= 3 ? '稳定，具有一定进步潜力' : '需要更多支持，建议加强针对性训练'}。`),

        createHeading1('五、后续训练建议'),
        createNormalParagraph('建议根据本次评估结果，制定个性化训练计划：'),
        createNormalParagraph('• 针对得分较低的领域增加训练频率'),
        createNormalParagraph('• 逐步降低辅助等级，提升学生独立完成能力'),
        createNormalParagraph('• 定期评估并调整训练方案，确保训练效果'),

        ...createSignatureSection()
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}
