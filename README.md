# petehome

this is for me not you

```
notepad $PROFILE
```

```
function petehome {
    $peteDir = "C:\dev\petehome\apps\cli"
    if (Test-Path $peteDir) {
        Push-Location $peteDir
        try {
            python -m petehome_cli @args
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "petehome-cli repo not found at $peteDir" -ForegroundColor Red
    }
}
```
