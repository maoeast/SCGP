/**
 * SCGP 产品使用说明书 — Word 文档生成脚本
 *
 * 读取 scripts/manual/part1.md ~ part3.md，转换为 .docx 文件。
 * 依赖：docx (^9.5.1)
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, ImageRun, AlignmentType,
  BorderStyle, PageBreak, Header, Footer, PageNumber,
  SectionType, convertInchesToTwip
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Helpers ─────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 200 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 160 },
  });
}

function p(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 21, font: '微软雅黑' })],
    spacing: { after: 160 },
  });
}

function bold(text) {
  return new TextRun({ text, bold: true, size: 21, font: '微软雅黑' });
}

function normal(text) {
  return new TextRun({ text, size: 21, font: '微软雅黑' });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 21, font: '微软雅黑' })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function noteBox(label, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}：`, bold: true, size: 21, font: '微软雅黑' }),
      new TextRun({ text, size: 21, font: '微软雅黑' }),
    ],
    spacing: { before: 120, after: 120 },
    indent: { left: convertInchesToTwip(0.2) },
  });
}

function note(text) { return noteBox('注意', text); }
function tip(text) { return noteBox('提示', text); }
function warning(text) { return noteBox('警告', text); }

function emptyLine() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

// ─── Table helpers ───────────────────────────────────────

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function createTable(headers, rows) {
  const headerCells = headers.map(h =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 20, font: '微软雅黑' })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { fill: 'F0F0F0' },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
    })
  );

  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, font: '微软雅黑' })],
          })],
          borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        })
      ),
    })
  );

  return new Table({
    rows: [
      new TableRow({ children: headerCells, tableHeader: true }),
      ...dataRows,
    ],
    width: { size: 100, type: 'pct' },
  });
}

// ─── Markdown parser (simplified) ───────────────────────

/**
 * Parse simplified markdown into docx elements.
 * Supports: # ## ### headings, **bold**, - bullets, |tables|, ![images], > notes, empty lines
 */
function parseMarkdown(md) {
  const elements = [];
  const lines = md.split('\n');
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip horizontal rules
    if (/^---+$/.test(line.trim())) {
      i++;
      continue;
    }

    // Tables
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHeaders = [];
        tableRows = [];
      }

      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());

      // Skip separator row (|---|---|)
      if (cells.every(c => /^[-:]+$/.test(c))) {
        i++;
        continue;
      }

      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }

      i++;
      // Check if next line is still table
      if (!lines[i]?.trim().startsWith('|')) {
        elements.push(createTable(tableHeaders, tableRows));
        elements.push(emptyLine());
        inTable = false;
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(h3(line.slice(4).trim()));
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(h2(line.slice(3).trim()));
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(h1(line.slice(2).trim()));
      i++; continue;
    }

    // Bullet lists
    if (line.match(/^[-*] /)) {
      const text = line.replace(/^[-*] /, '').trim();
      elements.push(bullet(text));
      i++; continue;
    }

    // Numbered lists (convert to bullet for simplicity)
    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, '').trim();
      elements.push(bullet(text));
      i++; continue;
    }

    // Note/Tip/Warning blocks (> text)
    if (line.startsWith('> ')) {
      const text = line.slice(2).trim();
      if (text.startsWith('注意') || text.startsWith('警告')) {
        elements.push(warning(text));
      } else if (text.startsWith('提示')) {
        elements.push(tip(text));
      } else {
        elements.push(note(text));
      }
      i++; continue;
    }

    // Image placeholders
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const imgPath = path.resolve(__dirname, imgMatch[2]);
      if (fs.existsSync(imgPath)) {
        const imgBuf = fs.readFileSync(imgPath);
        const ext = path.extname(imgPath).slice(1);
        elements.push(new Paragraph({
          children: [new ImageRun({
            data: imgBuf,
            transformation: { width: 580, height: 360 },
            type: ext === 'png' ? 'png' : 'jpg',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        }));
        elements.push(new Paragraph({
          children: [new TextRun({ text: alt, italics: true, size: 18, font: '微软雅黑', color: '888888' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }));
      } else {
        elements.push(new Paragraph({
          children: [
            new TextRun({ text: `[截图：${alt}]`, size: 21, font: '微软雅黑', color: '999999', italics: true }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 200 },
        }));
      }
      i++; continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++; continue;
    }

    // Regular paragraphs (with inline bold support)
    const richRuns = parseInlineFormatting(line.trim());
    elements.push(new Paragraph({
      children: richRuns,
      spacing: { after: 160 },
    }));
    i++;
  }

  return elements;
}

function parseInlineFormatting(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 21, font: '微软雅黑' }));
    } else if (part) {
      runs.push(new TextRun({ text: part, size: 21, font: '微软雅黑' }));
    }
  }
  return runs;
}

// ─── Cover page ─────────────────────────────────────────

function coverPage() {
  return {
    properties: {},
    children: [
      new Paragraph({ spacing: { before: 4000 }, children: [] }),
      new Paragraph({
        children: [new TextRun({
          text: 'SCGP',
          size: 72, bold: true, font: 'Arial',
          color: '1a5276',
        })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({
          text: '星愿能力发展平台',
          size: 52, bold: true, font: '微软雅黑',
          color: '2c3e50',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: '产品使用说明书',
          size: 36, font: '微软雅黑',
          color: '7f8c8d',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: '版本 1.0',
          size: 24, font: '微软雅黑',
          color: '95a5a6',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: new Date().toISOString().slice(0, 10),
          size: 24, font: '微软雅黑',
          color: '95a5a6',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 2000 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: '杭州炫灿科技有限公司',
          size: 22, font: '微软雅黑',
          color: '7f8c8d',
        })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({
          text: '服务热线：0571-86087889',
          size: 22, font: '微软雅黑',
          color: '7f8c8d',
        })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  };
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log('📖 开始生成 SCGP 产品使用说明书...');

  // Read markdown parts
  const parts = ['part1.md', 'part2a.md', 'part2b.md', 'part3.md'];
  let allContent = '';

  for (const part of parts) {
    const filePath = path.resolve(__dirname, part);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ 读取 ${part}`);
      allContent += fs.readFileSync(filePath, 'utf-8') + '\n\n';
    } else {
      console.log(`  ⚠️  缺少 ${part}，跳过`);
    }
  }

  if (!allContent.trim()) {
    console.error('❌ 没有找到任何内容文件！');
    process.exit(1);
  }

  // Parse markdown to docx elements
  console.log('  📝 转换 Markdown → DocX...');
  const bodyElements = parseMarkdown(allContent);

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: '微软雅黑', size: 21 },
        },
      },
    },
    sections: [
      coverPage(),
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({
                text: 'SCGP 星愿能力发展平台 · 产品使用说明书',
                size: 16, font: '微软雅黑', color: 'AAAAAA',
              })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new TextRun({ text: '第 ', size: 16, font: '微软雅黑', color: 'AAAAAA' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: '微软雅黑', color: 'AAAAAA' }),
                new TextRun({ text: ' 页', size: 16, font: '微软雅黑', color: 'AAAAAA' }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children: bodyElements,
      },
    ],
  });

  // Export
  const outputPath = path.resolve(__dirname, 'SCGP-产品使用说明书.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  console.log(`\n🎉 文档已生成: ${outputPath}`);
  console.log(`   文件大小: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
