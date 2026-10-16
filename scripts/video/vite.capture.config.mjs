/** 视频制作专用配置：生成中的视频和下载文件不应触发开发服务器监听。 */
import { mergeConfig } from 'vite'
import projectConfig from '../../vite.config.ts'

export default async (environment) => mergeConfig(await (typeof projectConfig === 'function' ? projectConfig(environment) : projectConfig), {
  server: { watch: { ignored: ['**/output/**'] } },
})
