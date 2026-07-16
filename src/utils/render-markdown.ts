/**
 * AI 回复 Markdown → 安全 HTML 渲染。
 *
 * markdown-it 解析（GFM 表格/列表/链接/代码块，breaks 适配聊天的单换行），
 * DOMPurify 清洗防 XSS。仅用于渲染模型输出的 Markdown，配合 v-html 使用。
 * 渲染进程自带 DOM，DOMPurify 可直接工作。
 */
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false, // 禁原始 HTML（安全第一，DOMPurify 兜底）
  linkify: true, // 自动识别 URL
  breaks: true, // 单换行 → <br>（聊天场景）
  typographer: false,
})

// 链接强制新窗口 + 安全属性，避免在 Electron 窗口内导航到外部 URL
const defaultLinkOpen = md.renderer.rules.link_open
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token && token.attrIndex('target') < 0) {
    token.attrPush(['target', '_blank'])
    token.attrPush(['rel', 'noopener noreferrer'])
  }
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options)
}

/**
 * 把 Markdown 文本渲染为清洗后的安全 HTML；空输入返回空串。
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''
  const html = md.render(text)
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] })
}
