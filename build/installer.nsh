; 自定义 NSIS 安装脚本
; 用于保留 resources 文件夹中的用户数据

; 安装前初始化
!macro preInit
  ; 设置覆盖模式：尝试覆盖，但如果文件正在使用则跳过
  SetOverwrite try
!macroend

; 自定义安装步骤
!macro customInstall
  ; 确保 resources 目录存在
  CreateDirectory "$INSTDIR\resources"
!macroend

; 自定义卸载步骤
!macro customUnInstall
  ; 卸载时询问是否保留用户数据
  MessageBox MB_YESNO "是否保留用户数据文件（resources文件夹）？" IDNO NoKeep
    ; 用户选择保留，不做任何操作
    Goto Done
  NoKeep:
    ; 用户选择不保留，删除 resources 文件夹
    RMDir /r "$INSTDIR\resources"
  Done:
!macroend
