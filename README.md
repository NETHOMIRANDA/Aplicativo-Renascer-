# RENASCRE Locações & Eventos — aplicativo de celular

Aplicativo (PWA) para **catálogo de locação, pedidos com homologação do administrador e pagamento PIX**, feito para rodar no celular e ser publicado **grátis** no GitHub Pages.

## O que tem aqui

| Arquivo | O que faz |
|---|---|
| `index.html` | Aplicativo do **cliente**: catálogo, carrinho, pedido, status, QR Code PIX |
| `admin.html` | **Painel do administrador** (caminho digital separado) |
| `css/styles.css` | Visual do app (mobile first) |
| `js/catalogo-seed.js` | Catálogo original recuperado do seu app antigo (**42 itens com preços**) — 38 deles já vêm com a foto do antigo app vinculada |
| `js/fotos-seed.js` | Lista das **24 fotos únicas** (44 arquivos) recuperadas do seu app antigo |
| `js/store.js` | Guarda itens, pedidos e ajustes no aparelho |
| `js/pix.js` | Gera o **PIX copia e cola** (BR Code) com a sua chave |
| `js/qrcode.js` | Gerador de **QR Code** (funciona sem internet) |
| `js/app.js` | Lógica do aplicativo do cliente |
| `js/admin.js` | Lógica do painel do administrador |
| `img/` | Fotos dos itens + ícones do app |
| `manifest.json` + `sw.js` | Deixam o app **instalável** e **offline** |
| `COMO_PUBLICAR.txt` | Passo a passo para publicar no GitHub |
| `SINCRONIZAR_NUVEM.txt` | Passo a passo da **ponte grátis** (Google Sheets) para celular e PC verem os mesmos pedidos |

## Como usar (resumo)

**Cliente**
1. Abre o app, escolhe os itens e toque em **Fazer pedido**.
2. Preenche nome, telefone e data do evento → **Enviar pedido**.
3. O pedido fica **aguardando homologação**.
4. Pedido **concluído**: **🔁 Fazer igual** repete o pedido (muda só a data e o local do evento) e **🗑️ Excluir** tira da sua lista (o administrador mantém o histórico).

**Administrador**
1. Acesso pelo endereço `admin.html` **ou** pelo pontinho discreto no rodapé do app do cliente (senha padrão `A103114`).
2. Aba **Pedidos**: aprova (com data/observação) ou recusa (com motivo).
3. Quando aprovado, o cliente vê a **tela de comemoração 🎉 com som** e o **QR Code PIX** é liberado.
4. Cliente toca em *Já efetuei o pagamento* → você confirma em **Pedidos**.
5. Aba **Itens**: cadastra, edita preço, estoque, **foto**, oculta ou exclui.
6. Aba **Fotos**: envia as fotos dos itens (o app reduz o tamanho automaticamente).
7. Aba **Ajustes**: senha, WhatsApp, chave PIX, **sincronização em nuvem** e textos.
8. Aba **Backup**: exporta/importa tudo em um arquivo `.json`.

Na aba **Pedidos** os filtros são: Pendentes, Todos, Aguardando, Aprovados,
Pagos, Recusados e **✅ Concluídos** (pedidos já efetivados/entregues, com a
data da efetivação no cartão).

## Sincronizar celular x computador (nuvem)

Sem uma ponte, cada aparelho guarda os dados no próprio navegador: o pedido
feito no celular só aparece no painel aberto naquele celular.

Para os dois conversarem, configure a ponte gratuita do Google (planilha +
Apps Script) seguindo o arquivo **`SINCRONIZAR_NUVEM.txt`** — dá 5 minutos e
não precisa de cartão.

- Painel → **Ajustes → 🔄 Sincronização**: cole o endereço da ponte, marque
  *automático* e clique em **🔌 Testar conexão**.
- Repita o mesmo endereço no outro aparelho (abra `admin.html` no celular e
  entre com a senha).
- Depois disso: pedido enviado no celular aparece no PC em até 30 s (ou na
  hora com **🔄 Sincronizar agora**). Ajustes de preço/item/também se propagam.
- Sem ponte configurada, o app continua funcionando exatamente como antes.

## Entrega, CEP e frete

- No pedido o cliente digita o **CEP**: o app consulta os Correios (ViaCEP), **recusa CEP inexistente** e
  preenche sozinho **rua, bairro e cidade/UF**.
- O frete é calculado na hora e entra no total (e no valor do QR Code PIX):
  - **Ajustes → Entrega e frete**: *Frete padrão*, *Frete grátis acima de R$ X* e *Tabela por cidade*
    (uma linha por cidade, no formato `GOIANIA/GO = 35`).
  - Se a cidade do cliente casar com a linha da tabela, vale o valor da linha; senão, vale o frete padrão.
  - Tudo zerado = não cobra frete.
- O pedido guarda **CEP, rua, bairro, cidade/UF, itens, frete e total**, e tudo aparece no painel e no WhatsApp.

## Fotos

- As **24 fotos antigas** estão em `img/` e já aparecem na galeria do painel (aba **Fotos**).
- **38 dos 42 itens** já estão com a foto certa vinculada. Os 4 sem foto são os que não tinham
  imagem equivalente (Lixeira 7 L, Freezer 400 L, Freezer 500 L e Tampão de Madeira c/ Cavalete) —
  é só vincular pelo painel se você tirar uma foto nova.
- As fotos de pessoas/logo que estão na galeria não ficam no catálogo; apague-as pelo painel se quiser.

## Atualizando o app depois de publicado

- Mudanças feitas **dentro do painel** (preço, item, foto, ajuste) ficam no aparelho: não precisam de upload.
- Se você editar arquivos do computador e enviar de novo, aumente o nome da cache em `sw.js`
  (ex.: `renascer-v1` → `renascer-v2`) para todos os celulares pegarem a versão nova.
- Se um aparelho já tinha a versão antiga do catálogo e você mudou o seed, use no painel
  **Backup → Manutenção → ♻️ Restaurar catálogo original** para recarregar itens e fotos
  (pedidos e fotos enviadas por você são mantidos).

## Segurança (importante)

- Este app é **estático** (não tem servidor). Os dados ficam gravados **no aparelho** onde o app é usado.
- **Isso significa:** pedido feito no **celular** só aparece no painel aberto **naquele mesmo celular**;
  o PC guarda os dados dele. Abas do mesmo navegador sincronizam em tempo real; navegadores/aparelhos
  diferentes (Chrome × Edge, celular × PC) **não** compartilham dados.
- Senha padrão: **A103114** (alterável em *Ajustes*). Ela protege a tela, mas **não é criptografia** — quem tiver acesso físico ao aparelho com os dados salvos pode ler os pedidos.
- Com a **ponte em nuvem** ligada, os dados passam a ficar também na **sua própria planilha do Google** (conta Google que você escolher). Ninguém mais tem acesso a ela, a não ser quem tiver sua conta.
- Por isso: use o **Backup** (aba 💾) com frequência, guardando o arquivo `.json` no computador ou na nuvem.

## Testado

- QR Code PIX gerado **byte a byte igual** à biblioteca oficial `qrcode` (Python), com CRC16 e estrutura EMV conferidos.
- Fluxo completo: catálogo → pedido → aprovação com som/emoji → PIX → pagamento → conclusão.
