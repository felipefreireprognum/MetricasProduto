@echo off
chcp 65001 > nul
title Setup Projetos - Felipe Freire

:: Caminhos Confirmados
set "SIM_PATH=C:\Users\Felipe.Freire\Documents\Documentos\Sites\Simulador"
set "MET_PATH=C:\Users\Felipe.Freire\Documents\Documentos\Tarefas\Metricas"

:: Execu��o
:: Aba 1 e 2: Claudes Simulador
:: Aba 3 e 4: Claudes Metricas
:: Aba 5: Backend na porta 8001 | Frontend na porta 3001
wt cmd /k "cd /d %SIM_PATH% && npx -y @anthropic-ai/claude-code" ; ^
new-tab cmd /k "cd /d %SIM_PATH% && npx -y @anthropic-ai/claude-code" ; ^
new-tab cmd /k "cd /d %MET_PATH% && npx -y @anthropic-ai/claude-code" ; ^
new-tab cmd /k "cd /d %MET_PATH% && npx -y @anthropic-ai/claude-code" ; ^
new-tab cmd /k "cd /d %MET_PATH%\backend && conda activate metrics && uvicorn api:app --reload --port 8001" ; ^
split-pane -V cmd /k "cd /d %MET_PATH%\frontend && set PORT=3001 && npm run dev -- --port 3001"

exit