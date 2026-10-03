@echo off
setlocal
REM Kit da loja. No Windows isto so monta o pendrive.
REM Na loja o arquivo que vale e o INSTALAR.sh no Linux do MWPOS.

set "KIT=%~dp0"
if not exist "%KIT%azimut_caixa.env" (
  echo.
  echo Falta azimut_caixa.env ao lado deste INSTALAR.bat
  echo Copie azimut_caixa.env.example para azimut_caixa.env
  echo e coloque AZIMUT_URL e AZIMUT_TOKEN uma vez.
  echo O mesmo arquivo serve nas 20 lojas.
  echo.
  pause
  exit /b 1
)

echo.
echo Kit pronto em:
echo   %KIT%
echo.
echo Na loja, no Linux do PDV, rode:
echo   cd /media/PENDRIVE/agentes
echo   sh INSTALAR.sh
echo.
echo Isso descobre o BK, testa um dia, instala o cron e manda o mes.
echo Nao edite nada por loja.
echo.
pause
