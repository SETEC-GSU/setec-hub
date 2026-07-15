PACOTE DE IDENTIDADE — SETEC HUB
================================

Este pacote foi criado a partir da logo escolhida por você.
O fundo quadriculado foi removido de verdade e os arquivos PNG possuem transparência real.

ESTRUTURA
---------
public/
├── icon.png
├── favicon.ico
├── apple-touch-icon.png
└── brand/
    ├── setec-hub-icon.png
    ├── setec-hub-icon-512.png
    ├── setec-hub-icon-192.png
    ├── setec-hub-logo-horizontal-dark.png
    └── setec-hub-logo-horizontal-light.png

APLICAÇÃO SEGURA
----------------
1. Faça uma cópia de segurança dos arquivos atuais da pasta public.
2. Extraia este ZIP na raiz do projeto.
3. Quando o Windows perguntar, confirme a mesclagem da pasta public.
4. A extração não altera nenhum arquivo de código.
5. Os arquivos antigos só serão substituídos se possuírem exatamente o mesmo nome:
   - public/icon.png
   - public/favicon.ico
   - public/apple-touch-icon.png

REFERÊNCIAS PARA O CÓDIGO
-------------------------
Ícone principal:
  /brand/setec-hub-icon.png

Ícone 512 px:
  /brand/setec-hub-icon-512.png

Ícone 192 px:
  /brand/setec-hub-icon-192.png

Logo horizontal para fundo escuro:
  /brand/setec-hub-logo-horizontal-dark.png

Logo horizontal para fundo claro ou PDF:
  /brand/setec-hub-logo-horizontal-light.png

IMPORTANTE
----------
Copiar os arquivos para public não altera automaticamente os blocos que hoje
desenham as letras “SH” com HTML/CSS. A tela de login, a sidebar e o gerador de
PDF precisarão apontar para os novos caminhos acima.

O próximo passo seguro é enviar:
- app/layout.tsx
- page da tela de login
- SidebarClient.tsx
- page atual do relatório técnico

Assim as referências serão atualizadas sem quebrar o layout atual.

TESTE
-----
Execute:
  npm run dev

Abra no navegador:
  http://localhost:3000/brand/setec-hub-icon.png

Depois execute:
  npm run build

CACHE DO FAVICON
----------------
Se o favicon antigo continuar aparecendo:
- use Ctrl + Shift + R;
- teste em uma janela anônima;
- ou limpe os dados do site no navegador.
