' Script per creare collegamento desktop con icona personalizzata
Set WShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Percorsi
strFolder = FSO.GetParentFolderName(WScript.ScriptFullName)
strBat = strFolder & "\AVVIA_GESTIONALE.bat"
strIcon = strFolder & "\backend\assets\logo.ico"
strDesktop = WShell.SpecialFolders("Desktop")
strShortcut = strDesktop & "\SL Enterprise.lnk"

' Crea collegamento
Set oShortcut = WShell.CreateShortcut(strShortcut)
oShortcut.TargetPath = strBat
oShortcut.WorkingDirectory = strFolder
oShortcut.IconLocation = strIcon & ",0"
oShortcut.Description = "Avvia SL Enterprise Gestionale"
oShortcut.Save

WScript.Echo "Collegamento creato sul desktop: SL Enterprise.lnk"
