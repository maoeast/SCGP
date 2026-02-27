// WebGazer.js 类型声明

declare module 'webgazer' {
  interface WebGazer {
    setGazeListener(callback: (data: { x: number; y: number } | null, elapsedTime: number) => void): WebGazer
    begin(): Promise<WebGazer>
    end(): void
    showPredictionPoints(show: boolean): WebGazer
    showVideo(show: boolean): WebGazer
    showFaceOverlay(show: boolean): WebGazer
    showFaceFeedbackBox(show: boolean): WebGazer
    recordScreenPosition(x: number, y: number, eventType: string): void
  }

  const webgazer: WebGazer
  export default webgazer
}
